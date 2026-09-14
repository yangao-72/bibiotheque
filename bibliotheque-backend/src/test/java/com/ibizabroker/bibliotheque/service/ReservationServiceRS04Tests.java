package com.ibizabroker.bibliotheque.service;

import com.ibizabroker.bibliotheque.configuration.ReservationSecurity;
import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Books;
import com.ibizabroker.bibliotheque.entity.Reservation;
import com.ibizabroker.bibliotheque.entity.ReservationRequest;
import com.ibizabroker.bibliotheque.entity.ReservationResponse;
import com.ibizabroker.bibliotheque.entity.Users;
import com.ibizabroker.bibliotheque.exceptions.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test unitaire de RS-04 au niveau <b>service</b> : un ADHERENT ne peut pas créer
 * une réservation au nom d'un autre, même s'il envoie l'identifiant d'autrui.
 *
 * <p>C'est le pendant interne des tests HTTP de {@code ReservationSecuriteTests} :
 * ceux-ci prouvent la règle de bout en bout à travers le contrôleur, celui-là
 * prouve qu'elle tient dans {@link ReservationService} lui-même. Un contrôle
 * posé uniquement dans le contrôleur protège un chemin d'appel ; un contrôle posé
 * dans le service protège la création de réservation tout court — c'est la
 * différence entre obéir à la règle et l'imposer.</p>
 *
 * <p>Le corps de la requête désigne volontairement l'adhérent {@code 25} alors que
 * le porteur du token est l'adhérent {@code 10}. On vérifie que la réservation
 * enregistrée appartient à 10, et que le service ne va même pas chercher le compte
 * usurpé en base : la valeur du corps n'est pas seulement ignorée après coup, elle
 * n'est jamais exploitée.</p>
 *
 * <p>L'identité est simulée par {@code reservationSecurity} : ces tests portent
 * sur la décision du service, pas sur la lecture du token, déjà couverte par
 * {@code ReservationSecuriteTests}. Les stubs partagés sont {@code lenient} car
 * chaque test n'exerce qu'un seul chemin.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RS-04 — création au nom d'un autre (niveau service)")
class ReservationServiceRS04Tests {

    /** Adhérent connecté : porteur du token. */
    private static final Integer ID_ADHERENT_CONNECTE = 10;

    /** Adhérent visé par le corps de la requête : l'usurpation tentée. */
    private static final Integer ID_ADHERENT_USURPE = 25;

    private static final Integer ID_LIVRE = 7;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private BooksRepository booksRepository;

    @Mock
    private UsersRepository usersRepository;

    @Mock
    private ReservationSecurity reservationSecurity;

    @InjectMocks
    private ReservationService reservationService;

    private ReservationRequest demande;
    private Authentication tokenAdherent;
    private Authentication tokenBibliothecaire;

    @BeforeEach
    void preparerLeContexteCommun() {
        Books livreIndisponible = new Books();
        livreIndisponible.setBookId(ID_LIVRE);
        livreIndisponible.setBookName("Dune");
        livreIndisponible.setNoOfCopies(0); // RG-01 : livre indisponible, donc réservable

        demande = new ReservationRequest();
        demande.setLivreId(ID_LIVRE);
        demande.setAdherentId(ID_ADHERENT_USURPE); // valeur hostile : celle d'un autre adhérent

        tokenAdherent = new UsernamePasswordAuthenticationToken("adherent", null);
        tokenBibliothecaire = new UsernamePasswordAuthenticationToken("biblio", null);

        lenient().when(reservationSecurity.estBibliothecaire(tokenAdherent)).thenReturn(false);
        lenient().when(reservationSecurity.estBibliothecaire(tokenBibliothecaire)).thenReturn(true);

        lenient().when(booksRepository.findById(ID_LIVRE)).thenReturn(Optional.of(livreIndisponible));
        // RG-02 : aucune réservation active sur ce livre
        lenient().when(reservationRepository.findByLivreBookIdAndStatutIn(eq(ID_LIVRE), anyList()))
                .thenReturn(Collections.emptyList());
        lenient().when(reservationRepository.save(any(Reservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("L'adherentId du corps est ignoré : la réservation appartient au porteur du token")
    void lAdherentIdDuCorpsEstIgnore() {
        when(reservationSecurity.utilisateurCourantId(tokenAdherent)).thenReturn(ID_ADHERENT_CONNECTE);
        when(usersRepository.findById(ID_ADHERENT_CONNECTE)).thenReturn(Optional.of(adherent(ID_ADHERENT_CONNECTE)));
        when(reservationRepository.countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT_CONNECTE), anyList())).thenReturn(0L);

        // Le corps réclame l'adhérent 25, le token désigne l'adhérent 10.
        ReservationResponse reponse = reservationService.creerReservation(demande, tokenAdherent);

        assertNotNull(reponse);
        assertEquals(ID_ADHERENT_CONNECTE, reponse.getAdherentId(),
                "Le propriétaire doit être le porteur du token, jamais l'adhérent du corps.");

        // Le compte visé par le corps n'est pas seulement écarté : il n'est jamais lu.
        verify(usersRepository, never()).findById(ID_ADHERENT_USURPE);

        ArgumentCaptor<Reservation> enregistree = ArgumentCaptor.forClass(Reservation.class);
        verify(reservationRepository).save(enregistree.capture());
        assertEquals(ID_ADHERENT_CONNECTE, enregistree.getValue().getAdherent().getUserId());
    }

    @Test
    @DisplayName("Sans adherentId dans le corps, un ADHERENT réserve quand même pour lui-même")
    void lAdherentSansAdherentIdDansLeCorps() {
        demande.setAdherentId(null);
        when(reservationSecurity.utilisateurCourantId(tokenAdherent)).thenReturn(ID_ADHERENT_CONNECTE);
        when(usersRepository.findById(ID_ADHERENT_CONNECTE)).thenReturn(Optional.of(adherent(ID_ADHERENT_CONNECTE)));
        when(reservationRepository.countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT_CONNECTE), anyList())).thenReturn(0L);

        // Le champ n'est pas obligatoire pour un ADHERENT : l'identité vient du token.
        ReservationResponse reponse = reservationService.creerReservation(demande, tokenAdherent);

        assertEquals(ID_ADHERENT_CONNECTE, reponse.getAdherentId());
    }

    @Test
    @DisplayName("Le BIBLIOTHECAIRE peut réserver pour l'adhérent de son choix")
    void leBibliothecaireReservePourUnAutre() {
        when(usersRepository.findById(ID_ADHERENT_USURPE)).thenReturn(Optional.of(adherent(ID_ADHERENT_USURPE)));
        when(reservationRepository.countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT_USURPE), anyList())).thenReturn(0L);

        ReservationResponse reponse = reservationService.creerReservation(demande, tokenBibliothecaire);

        assertEquals(ID_ADHERENT_USURPE, reponse.getAdherentId());
        // L'identité du porteur du token n'est pas utilisée : le bibliothécaire n'est
        // pas l'adhérent pour qui il réserve.
        verify(reservationSecurity, never()).utilisateurCourantId(any(Authentication.class));
    }

    @Test
    @DisplayName("Le BIBLIOTHECAIRE sans adherentId est refusé : ce champ reste obligatoire pour lui")
    void leBibliothecaireDoitPreciserLAdherent() {
        demande.setAdherentId(null);

        BadRequestException refus = assertThrows(BadRequestException.class,
                () -> reservationService.creerReservation(demande, tokenBibliothecaire));

        assertTrue(refus.getMessage().contains("adherentId"),
                "Le message doit désigner le champ manquant, reçu : " + refus.getMessage());
        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    private Users adherent(Integer id) {
        Users utilisateur = new Users();
        utilisateur.setUserId(id);
        utilisateur.setName("Adhérent " + id);
        return utilisateur;
    }
}
