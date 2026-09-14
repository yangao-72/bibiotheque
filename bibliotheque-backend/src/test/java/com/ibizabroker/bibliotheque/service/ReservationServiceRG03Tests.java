package com.ibizabroker.bibliotheque.service;

import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Books;
import com.ibizabroker.bibliotheque.entity.Reservation;
import com.ibizabroker.bibliotheque.entity.ReservationRequest;
import com.ibizabroker.bibliotheque.entity.ReservationResponse;
import com.ibizabroker.bibliotheque.entity.ReservationStatus;
import com.ibizabroker.bibliotheque.entity.Users;
import com.ibizabroker.bibliotheque.exceptions.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test unitaire de la règle RG-03 : un adhérent ne peut pas dépasser
 * 3 réservations actives simultanées.
 *
 * <p>Aucune base de données n'est nécessaire : les repositories sont simulés
 * (mocks Mockito), seule la logique de {@link ReservationService} est exercée, et
 * aucun contexte Spring n'est démarré — la classe n'est pas annotée
 * {@code @SpringBootTest}.</p>
 *
 * <p>Les stubs de comptage visent explicitement {@code ID_ADHERENT} via
 * {@code eq(…)} plutôt que {@code anyInt()} : si le service comptait les
 * réservations d'un autre adhérent — ou de tout le monde — le mock ne
 * correspondrait pas, renverrait 0 et les cas de refus échoueraient. Le test
 * distingue donc un comptage par adhérent d'un comptage global.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RG-03 — limite de 3 réservations actives")
class ReservationServiceRG03Tests {

    private static final Integer ID_ADHERENT = 42;
    private static final Integer ID_LIVRE = 7;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private BooksRepository booksRepository;

    @Mock
    private UsersRepository usersRepository;

    @InjectMocks
    private ReservationService reservationService;

    private ReservationRequest demande;

    @BeforeEach
    void preparerLeContexteCommun() {
        Books livreIndisponible = new Books();
        livreIndisponible.setBookId(ID_LIVRE);
        livreIndisponible.setBookName("Dune");
        livreIndisponible.setNoOfCopies(0); // RG-01 : livre indisponible, donc réservable

        Users adherent = new Users();
        adherent.setUserId(ID_ADHERENT);
        adherent.setName("Adhérent de test");

        demande = new ReservationRequest();
        demande.setLivreId(ID_LIVRE);
        demande.setAdherentId(ID_ADHERENT);

        when(booksRepository.findById(ID_LIVRE)).thenReturn(Optional.of(livreIndisponible));
        when(usersRepository.findById(ID_ADHERENT)).thenReturn(Optional.of(adherent));
        // RG-02 : aucune réservation active de cet adhérent sur ce livre
        when(reservationRepository.findByLivreBookIdAndStatutIn(eq(ID_LIVRE), anyList()))
                .thenReturn(Collections.emptyList());
    }

    @Test
    @DisplayName("Un adhérent ayant 2 réservations actives peut en créer une troisième")
    void unAdherentAvecDeuxReservationsActivesPeutEnCreerUneTroisieme() {
        when(reservationRepository.countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT), anyList())).thenReturn(2L);
        when(reservationRepository.save(any(Reservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ReservationResponse reservationCreee = reservationService.creerReservation(demande);

        assertNotNull(reservationCreee);
        assertEquals(ID_ADHERENT, reservationCreee.getAdherentId());
        assertEquals(ID_LIVRE, reservationCreee.getLivreId());
        assertEquals(ReservationStatus.EN_ATTENTE, reservationCreee.getStatut());
        verify(reservationRepository).save(any(Reservation.class));
    }

    @Test
    @DisplayName("Un adhérent ayant 3 réservations actives reçoit un refus")
    void unAdherentAvecTroisReservationsActivesEstRefuse() {
        when(reservationRepository.countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT), anyList())).thenReturn(3L);

        ConflictException refus = assertThrows(ConflictException.class,
                () -> reservationService.creerReservation(demande));

        assertTrue(refus.getMessage().contains("RG-03"),
                "Le message de refus doit mentionner la règle RG-03, reçu : " + refus.getMessage());
        // Aucune réservation ne doit être enregistrée quand la limite est atteinte.
        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    @DisplayName("Un adhérent ayant plus de 3 réservations actives reçoit également un refus")
    void unAdherentAuDelaDeTroisReservationsActivesEstRefuse() {
        when(reservationRepository.countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT), anyList())).thenReturn(5L);

        assertThrows(ConflictException.class, () -> reservationService.creerReservation(demande));
        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    @DisplayName("La limite porte uniquement sur les statuts EN_ATTENTE et DISPONIBLE")
    void laLimiteNeCompteQueLesReservationsActives() {
        when(reservationRepository.countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT), anyList())).thenReturn(0L);
        when(reservationRepository.save(any(Reservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        reservationService.creerReservation(demande);

        ArgumentCaptor<List<ReservationStatus>> statutsComptes = ArgumentCaptor.forClass(List.class);
        verify(reservationRepository).countByAdherentUserIdAndStatutIn(eq(ID_ADHERENT), statutsComptes.capture());

        assertEquals(List.of(ReservationStatus.EN_ATTENTE, ReservationStatus.DISPONIBLE),
                statutsComptes.getValue());
    }
}
