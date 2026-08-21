package com.ibizabroker.bibliotheque.service;

import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.*;
import com.ibizabroker.bibliotheque.exceptions.BadRequestException;
import com.ibizabroker.bibliotheque.exceptions.ConflictException;
import com.ibizabroker.bibliotheque.exceptions.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
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

    private static final int MAX_RESERVATIONS_ACTIVES = 3;
    private static final int DUREE_VALIDITE_JOURS = 7;

    /**
     * Crée une réservation pour un livre indisponible.
     * RG-01 : On ne peut réserver qu'un livre indisponible (noOfCopies == 0).
     * RG-02 : Un adhérent ne peut avoir qu'une seule réservation active sur un même livre.
     * RG-03 : Un adhérent ne peut pas dépasser 3 réservations actives simultanées.
     * RG-04 : dateExpiration = dateReservation + 7 jours.
     */
    public ReservationResponse creerReservation(ReservationRequest request) {
        // Validation des champs obligatoires
        if (request.getLivreId() == null && request.getAdherentId() == null) {
            throw new BadRequestException("Les champs 'livreId' et 'adherentId' sont obligatoires.");
        }
        if (request.getLivreId() == null) {
            throw new BadRequestException("Le champ 'livreId' est obligatoire.");
        }
        if (request.getAdherentId() == null) {
            throw new BadRequestException("Le champ 'adherentId' est obligatoire.");
        }

        // Recherche du livre
        Books livre = booksRepository.findById(request.getLivreId())
                .orElseThrow(() -> new NotFoundException("Livre avec l'id " + request.getLivreId() + " introuvable."));

        // Recherche de l'adhérent
        Users adherent = usersRepository.findById(request.getAdherentId())
                .orElseThrow(() -> new NotFoundException("Utilisateur avec l'id " + request.getAdherentId() + " introuvable."));

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
     */
    public ReservationResponse annulerReservation(Integer id, Integer userId) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Réservation avec l'id " + id + " introuvable."));

        // Vérification que l'utilisateur ne peut annuler que ses propres réservations
        if (!reservation.getAdherent().getUserId().equals(userId)) {
            throw new ConflictException("Vous ne pouvez annuler que vos propres réservations.");
        }

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
