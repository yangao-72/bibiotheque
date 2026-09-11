package com.ibizabroker.bibliotheque.controller;

import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Books;
import com.ibizabroker.bibliotheque.entity.Reservation;
import com.ibizabroker.bibliotheque.entity.ReservationStatus;
import com.ibizabroker.bibliotheque.entity.Role;
import com.ibizabroker.bibliotheque.entity.Users;
import com.ibizabroker.bibliotheque.service.JwtService;
import com.ibizabroker.bibliotheque.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test d'intégration de l'endpoint sécurisé {@code GET /api/reservations}.
 *
 * <p>L'application démarre réellement (contexte Spring complet, base H2 en mémoire)
 * et les requêtes traversent toute la chaîne de filtres de sécurité avec de vrais
 * tokens JWT. Aucune base externe n'est nécessaire.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Intégration — GET /api/reservations")
class ReservationEndpointIntegrationTests {

    private static final String URL = "/api/reservations";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private BooksRepository booksRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    private Users adherentConnecte;
    private Reservation reservationDunAutreAdherent;
    private String tokenAdherentConnecte;

    @BeforeEach
    void preparerDeuxAdherentsAyantChacunUneReservation() {
        reservationRepository.deleteAll();
        booksRepository.deleteAll();
        usersRepository.deleteAll();

        adherentConnecte = creerAdherent("marie", "Marie Durand");
        Users autreAdherent = creerAdherent("paul", "Paul Martin");

        creerReservation(adherentConnecte, creerLivreIndisponible("Le Petit Prince"));
        reservationDunAutreAdherent = creerReservation(autreAdherent, creerLivreIndisponible("1984"));

        tokenAdherentConnecte = jwtUtil.generateToken(jwtService.loadUserByUsername("marie"));
    }

    @Test
    @DisplayName("Sans token, GET /api/reservations renvoie 401")
    void sansTokenLaListeDesReservationsRenvoie401() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Avec un token ADHERENT, GET /api/reservations renvoie 200 et ses seules réservations")
    void avecUnTokenAdherentLaListeDesReservationsRenvoie200() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenAdherentConnecte))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].adherentId").value(adherentConnecte.getUserId()));
    }

    @Test
    @DisplayName("Avec un token ADHERENT, accéder à la réservation d'un autre renvoie 403")
    void avecUnTokenAdherentLaReservationDunAutreRenvoie403() throws Exception {
        mockMvc.perform(get(URL + "/" + reservationDunAutreAdherent.getReservationId())
                        .header("Authorization", "Bearer " + tokenAdherentConnecte))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------ fixtures

    private Users creerAdherent(String username, String nom) {
        Role role = new Role();
        role.setRoleName("ADHERENT");

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        Users adherent = new Users();
        adherent.setUsername(username);
        adherent.setName(nom);
        adherent.setPassword("{noop}test");
        adherent.setRole(roles);

        return usersRepository.save(adherent);
    }

    private Books creerLivreIndisponible(String titre) {
        Books livre = new Books();
        livre.setBookName(titre);
        livre.setBookAuthor("Auteur de test");
        livre.setBookGenre("Test");
        livre.setNoOfCopies(0);
        return booksRepository.save(livre);
    }

    private Reservation creerReservation(Users adherent, Books livre) {
        Calendar calendrier = Calendar.getInstance();
        Date dateReservation = calendrier.getTime();
        calendrier.add(Calendar.DATE, 7);

        Reservation reservation = new Reservation();
        reservation.setAdherent(adherent);
        reservation.setLivre(livre);
        reservation.setDateReservation(dateReservation);
        reservation.setDateExpiration(calendrier.getTime());
        reservation.setStatut(ReservationStatus.EN_ATTENTE);
        return reservationRepository.save(reservation);
    }
}
