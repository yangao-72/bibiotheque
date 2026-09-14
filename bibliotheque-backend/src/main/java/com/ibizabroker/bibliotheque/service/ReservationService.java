package com.ibizabroker.bibliotheque.service;

import com.ibizabroker.bibliotheque.configuration.ReservationSecurity;
import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.*;
import com.ibizabroker.bibliotheque.exceptions.BadRequestException;
import com.ibizabroker.bibliotheque.exceptions.ConflictException;
import com.ibizabroker.bibliotheque.exceptions.ForbiddenException;
import com.ibizabroker.bibliotheque.exceptions.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReservationService {

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private BooksRepository booksRepository;

    @Autowired
    private UsersRepository usersRepository;

    /**
     * Sert à déduire le propriétaire d'une réservation du token, et non du corps
     * de la requête (RS-04).
     */
    @Autowired
    private ReservationSecurity reservationSecurity;

    /**
     * Message renvoyé (HTTP 403) à un ADHERENT qui vise le compte d'un autre.
     * Volontairement public : c'est le libellé contractuel de RS-04, partagé avec
     * les tests et repérable d'un seul endroit si la formulation évolue.
     */
    public static final String MESSAGE_RESERVATION_POUR_AUTRUI = "403 Forbidden = vous n'avez pas le droit";

    private static final int MAX_RESERVATIONS_ACTIVES = 3;
    private static final int DUREE_VALIDITE_JOURS = 7;

    /**
     * Crée une réservation pour un livre indisponible.
     * RG-01 : On ne peut réserver qu'un livre indisponible (noOfCopies == 0).
     * RG-02 : Un adhérent ne peut avoir qu'une seule réservation active sur un même livre.
     * RG-03 : Un adhérent ne peut pas dépasser 3 réservations actives simultanées.
     * RG-04 : dateExpiration = dateReservation + 7 jours.
     * RS-04 : le propriétaire est déduit du token, jamais du corps de la requête ;
     * un ADHERENT qui vise un autre compte obtient un 403 explicite.
     *
     * <p>Le contrôle de RS-04 vit ici, et non seulement dans le contrôleur : le
     * service est le point de passage obligé de toute création de réservation,
     * donc un second chemin d'appel (nouveau contrôleur, traitement planifié,
     * appel interne) ne peut pas le contourner.</p>
     */
    public ReservationResponse creerReservation(ReservationRequest request, Authentication authentication) {
        // Validation du seul champ obligatoire pour tout le monde : le livre.
        // Celle d'`adherentId` vit dans `proprietaireId`, car le champ n'est lu que
        // pour un BIBLIOTHECAIRE (RS-04).
        if (request.getLivreId() == null) {
            throw new BadRequestException("Le champ 'livreId' est obligatoire.");
        }

        // RS-04 : l'identité du propriétaire vient du token, pas du corps.
        Integer adherentId = proprietaireId(request, authentication);

        // Recherche du livre
        Books livre = booksRepository.findById(request.getLivreId())
                .orElseThrow(() -> new NotFoundException("Livre avec l'id " + request.getLivreId() + " introuvable."));

        // Recherche de l'adhérent
        Users adherent = usersRepository.findById(adherentId)
                .orElseThrow(() -> new NotFoundException("Utilisateur avec l'id " + adherentId + " introuvable."));

        // RG-01 : On ne peut réserver qu'un livre indisponible (noOfCopies == 0)
        if (livre.getNoOfCopies() > 0) {
            throw new ConflictException("RG-01 : On ne peut réserver qu'un livre indisponible. Le livre \"" + livre.getBookName() + "\" est encore disponible.");
        }

        // RG-02 : Un adhérent ne peut avoir qu'une seule réservation active sur un même livre
        List<Reservation> reservationsExistantes = reservationRepository
                .findByLivreBookIdAndStatutIn(livre.getBookId(), Arrays.asList(ReservationStatus.EN_ATTENTE, ReservationStatus.DISPONIBLE));
        boolean dejaReserve = reservationsExistantes.stream()
                .anyMatch(r -> r.getAdherent().getUserId().equals(adherent.getUserId()));
        if (dejaReserve) {
            throw new ConflictException("RG-02 : Vous avez déjà une réservation active pour ce livre.");
        }

        // RG-03 : Un adhérent ne peut pas dépasser 3 réservations actives simultanées
        long nbReservationsActives = reservationRepository
                .countByAdherentUserIdAndStatutIn(adherent.getUserId(), Arrays.asList(ReservationStatus.EN_ATTENTE, ReservationStatus.DISPONIBLE));
        if (nbReservationsActives >= MAX_RESERVATIONS_ACTIVES) {
            throw new ConflictException("RG-03 : Vous ne pouvez pas dépasser " + MAX_RESERVATIONS_ACTIVES + " réservations actives simultanées.");
        }

        // RG-04 : dateExpiration = dateReservation + 7 jours
        Date dateReservation = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(dateReservation);
        cal.add(Calendar.DATE, DUREE_VALIDITE_JOURS);
        Date dateExpiration = cal.getTime();

        // Création de la réservation
        Reservation reservation = new Reservation();
        reservation.setLivre(livre);
        reservation.setAdherent(adherent);
        reservation.setDateReservation(dateReservation);
        reservation.setDateExpiration(dateExpiration);
        reservation.setStatut(ReservationStatus.EN_ATTENTE);

        Reservation savedReservation = reservationRepository.save(reservation);
        return new ReservationResponse(savedReservation);
    }

    /**
     * RS-04 — identifiant de l'adhérent pour qui la réservation est créée.
     *
     * <p>Le {@code adherentId} du corps de la requête est une donnée fournie par
     * le client : il ne peut donc pas déterminer le propriétaire. Un ADHERENT
     * réserve toujours pour lui-même, l'identité étant lue dans le token. Le seul
     * appelant autorisé à viser un autre adhérent est le BIBLIOTHECAIRE — c'est le
     * seul cas où le corps est lu, et le champ y est alors obligatoire.</p>
     *
     * <p>Viser un autre compte est refusé par un 403 explicite, et non absorbé en
     * créant la réservation au nom de l'appelant : une usurpation silencieusement
     * convertie en réservation personnelle ferait croire à une réussite, laisserait
     * l'attaque indistinguable d'un usage normal dans les journaux, et masquerait
     * le besoin d'un compte ou d'un chemin d'appel légitime.</p>
     *
     * <p>Répéter son propre identifiant reste accepté : l'appelant ne décide alors
     * de rien, la valeur coïncide avec le token.</p>
     *
     * <p>Le test de rôle passe par {@link ReservationSecurity#estBibliothecaire} et
     * non par un « est-ce du personnel ? » plus large : un compte qui porte un
     * autre rôle de gestion ne doit pas conserver la main sur ce champ.</p>
     */
    private Integer proprietaireId(ReservationRequest request, Authentication authentication) {
        if (!reservationSecurity.estBibliothecaire(authentication)) {
            // RS-04 : le porteur du token est la seule source d'identité valable.
            Integer idDuToken = reservationSecurity.utilisateurCourantId(authentication);

            Integer idDemande = request.getAdherentId();
            if (idDemande != null && !idDemande.equals(idDuToken)) {
                throw new ForbiddenException(MESSAGE_RESERVATION_POUR_AUTRUI);
            }
            return idDuToken;
        }
        if (request.getAdherentId() == null) {
            throw new BadRequestException("Le champ 'adherentId' est obligatoire.");
        }
        return request.getAdherentId();
    }

    /**
     * Liste les réservations, filtrables par statut et par adhérent.
     */
    public List<ReservationResponse> listerReservations(ReservationStatus statut, Integer adherentId) {
        List<Reservation> reservations;

        if (statut != null && adherentId != null) {
            reservations = reservationRepository.findByAdherentUserIdAndStatut(adherentId, statut);
        } else if (statut != null) {
            reservations = reservationRepository.findByStatut(statut);
        } else if (adherentId != null) {
            reservations = reservationRepository.findByAdherentUserId(adherentId);
        } else {
            reservations = reservationRepository.findAll();
        }

        return reservations.stream()
                .map(ReservationResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Consulter une réservation par son ID.
     */
    public ReservationResponse consulterReservation(Integer id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Réservation avec l'id " + id + " introuvable."));
        return new ReservationResponse(reservation);
    }

    /**
     * Annuler une réservation.
     * RG-05 : Une réservation ne peut être annulée que si son statut est EN_ATTENTE ou DISPONIBLE.
     * RG-06 : Une réservation ANNULEE, EXPIREE ou HONOREE ne peut plus changer d'état.
     *
     * RS-03 : le contrôle « la réservation m'appartient » n'est plus fait ici mais dans la
     * couche sécurité (@PreAuthorize + ReservationSecurity), afin de répondre 403 et non 409,
     * et pour permettre au BIBLIOTHECAIRE d'annuler la réservation de n'importe quel adhérent.
     */
    public ReservationResponse annulerReservation(Integer id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Réservation avec l'id " + id + " introuvable."));

        // RG-06 : Une réservation ANNULEE, EXPIREE ou HONOREE ne peut plus changer d'état
        if (reservation.getStatut() == ReservationStatus.ANNULEE
                || reservation.getStatut() == ReservationStatus.EXPIREE
                || reservation.getStatut() == ReservationStatus.HONOREE) {
            throw new ConflictException("RG-06 : Une réservation " + reservation.getStatut() + " ne peut plus changer d'état.");
        }

        // RG-05 : Une réservation ne peut être annulée que si son statut est EN_ATTENTE ou DISPONIBLE
        if (reservation.getStatut() != ReservationStatus.EN_ATTENTE
                && reservation.getStatut() != ReservationStatus.DISPONIBLE) {
            throw new ConflictException("RG-05 : Une réservation ne peut être annulée que si son statut est EN_ATTENTE ou DISPONIBLE.");
        }

        reservation.setStatut(ReservationStatus.ANNULEE);
        Reservation updatedReservation = reservationRepository.save(reservation);
        return new ReservationResponse(updatedReservation);
    }

    /**
     * Supprimer une réservation.
     */
    public void supprimerReservation(Integer id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Réservation avec l'id " + id + " introuvable."));
        reservationRepository.delete(reservation);
    }
}
