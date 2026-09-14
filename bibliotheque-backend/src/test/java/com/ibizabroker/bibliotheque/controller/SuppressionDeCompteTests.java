package com.ibizabroker.bibliotheque.controller;

import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.BorrowRepository;
import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Books;
import com.ibizabroker.bibliotheque.entity.Borrow;
import com.ibizabroker.bibliotheque.entity.Reservation;
import com.ibizabroker.bibliotheque.entity.ReservationStatus;
import com.ibizabroker.bibliotheque.entity.Role;
import com.ibizabroker.bibliotheque.entity.Users;
import com.ibizabroker.bibliotheque.service.JwtService;
import com.ibizabroker.bibliotheque.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Retrait d'un compte par un administrateur ({@code DELETE /admin/users/{id}}),
 * mis en œuvre en <b>suppression logique</b>.
 *
 * <p>Attendu : l'endpoint est réservé au rôle Admin, désactive le compte au lieu
 * de l'effacer, conserve ses réservations, et refuse de retirer un compte qui
 * porte encore un emprunt ou le compte de l'appelant lui-même.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Administration — retrait d'un compte (soft delete)")
class SuppressionDeCompteTests {

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

    @Autowired
    private BorrowRepository borrowRepository;

    private Users administrateur;
    private Users adherent;
    private String tokenAdmin;
    private String tokenAdherent;

    @BeforeEach
    void preparerLesComptes() {
        borrowRepository.deleteAll();
        reservationRepository.deleteAll();
        booksRepository.deleteAll();
        usersRepository.deleteAll();

        administrateur = creerUtilisateur("root", "Administrateur", "Admin");
        adherent = creerUtilisateur("marie", "Marie Durand", "ADHERENT");

        tokenAdmin = jwtUtil.generateToken(jwtService.loadUserByUsername("root"));
        tokenAdherent = jwtUtil.generateToken(jwtService.loadUserByUsername("marie"));
    }

    @Nested
    @DisplayName("Autorisations")
    class Autorisations {

        @Test
        @DisplayName("Un ADMIN retire un adhérent → 204, le compte est désactivé et non effacé")
        void adminRetireUnAdherent() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .param("motif", "Départ de l'établissement")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            Users conserve = usersRepository.findByUsername("marie")
                    .orElseThrow(() -> new AssertionError("Le compte doit rester en base (soft delete)."));
            assertFalse(conserve.estActif(), "Le compte doit être marqué inactif.");
        }

        @Test
        @DisplayName("Un ADHERENT ne peut pas retirer un compte → 403")
        void adherentNePeutPasRetirer() throws Exception {
            mockMvc.perform(delete("/admin/users/" + administrateur.getUserId())
                            .header("Authorization", "Bearer " + tokenAdherent))
                    .andExpect(status().isForbidden());

            assertTrue(usersRepository.findByUsername("root").isPresent());
        }

        @Test
        @DisplayName("Sans token → 401")
        void sansToken() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId()))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Trace d'audit")
    class Audit {

        @Test
        @DisplayName("Le motif et la date du retrait sont enregistrés")
        void motifEtDateEnregistres() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .param("motif", "  Départ de l'établissement  ")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            Users conserve = usersRepository.findByUsername("marie")
                    .orElseThrow(() -> new AssertionError("Compte attendu en base."));
            assertNotNull(conserve.getDateDesactivation(), "La date de désactivation doit être posée.");
            assertEquals("Départ de l'établissement", conserve.getMotifDesactivation(),
                    "Le motif doit être conservé, espaces de bord retirés.");
        }

        @Test
        @DisplayName("Sans motif, la date est tout de même enregistrée")
        void dateSeuleSansMotif() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            Users conserve = usersRepository.findByUsername("marie")
                    .orElseThrow(() -> new AssertionError("Compte attendu en base."));
            assertNotNull(conserve.getDateDesactivation());
            assertNull(conserve.getMotifDesactivation());
        }

        @Test
        @DisplayName("Un motif fait d'espaces est considéré comme absent")
        void motifVideIgnore() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .param("motif", "   ")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            Users conserve = usersRepository.findByUsername("marie")
                    .orElseThrow(() -> new AssertionError("Compte attendu en base."));
            assertNull(conserve.getMotifDesactivation());
        }

        @Test
        @DisplayName("Les archives exposent le motif et la date")
        void lesArchivesExposentLaTrace() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .param("motif", "Départ de l'établissement")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            mockMvc.perform(get("/admin/users")
                            .param("inclureDesactives", "true")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.username == 'marie')].motifDesactivation")
                            .value("Départ de l'établissement"))
                    .andExpect(jsonPath("$[?(@.username == 'marie')].dateDesactivation")
                            .isNotEmpty());
        }

        @Test
        @DisplayName("La réactivation efface la trace : elle décrivait un état révolu")
        void laReactivationEffaceLaTrace() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .param("motif", "Erreur de saisie")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            mockMvc.perform(patch("/admin/users/" + adherent.getUserId() + "/reactiver")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isOk());

            Users reactive = usersRepository.findByUsername("marie")
                    .orElseThrow(() -> new AssertionError("Compte attendu en base."));
            assertTrue(reactive.estActif());
            assertNull(reactive.getDateDesactivation());
            assertNull(reactive.getMotifDesactivation());
        }
    }

    @Nested
    @DisplayName("Conservation de l'historique")
    class Historique {

        @Test
        @DisplayName("Les réservations de l'adhérent sont conservées")
        void lesReservationsSontConservees() throws Exception {
            Books livre = creerLivreIndisponible();
            creerReservation(adherent, livre);

            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            assertEquals(1, reservationRepository.findByAdherentUserId(adherent.getUserId()).size(),
                    "La réservation doit survivre au retrait du compte.");
        }

        @Test
        @DisplayName("Le compte désactivé disparaît de la liste des adhérents")
        void leCompteDesactiveQuitteLaListe() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            List<Users> actifs = usersRepository.findAllActifs();
            assertTrue(actifs.stream().anyMatch((Users u) -> "root".equals(u.getUsername())));
            assertTrue(actifs.stream().noneMatch((Users u) -> "marie".equals(u.getUsername())),
                    "Un compte désactivé ne doit plus être proposé.");
        }

        @Test
        @DisplayName("?inclureDesactives=true expose le compte retiré, la liste par défaut non")
        void lOptionInclureDesactivesExposeLeCompte() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            mockMvc.perform(get("/admin/users")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.username == 'marie')]").isEmpty());

            mockMvc.perform(get("/admin/users")
                            .param("inclureDesactives", "true")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.username == 'marie')]").isNotEmpty());
        }

        @Test
        @DisplayName("Un token émis avant la désactivation ne donne plus accès → 401")
        void leTokenDuCompteDesactiveEstRefuse() throws Exception {
            // Preuve que le compte est réellement verrouillé : le token reste
            // valablement signé, c'est `loadUserByUsername` qui le rejette.
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            mockMvc.perform(get("/api/reservations")
                            .header("Authorization", "Bearer " + tokenAdherent))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Réactivation")
    class Reactivation {

        @Test
        @DisplayName("Un ADMIN réactive un compte désactivé → 200 et le compte repasse actif")
        void adminReactiveUnCompte() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());

            mockMvc.perform(patch("/admin/users/" + adherent.getUserId() + "/reactiver")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.actif").value(true));

            assertTrue(usersRepository.findByUsername("marie")
                    .orElseThrow(() -> new AssertionError("Compte attendu en base.")).estActif());
            assertTrue(usersRepository.findAllActifs().stream()
                            .anyMatch((Users u) -> "marie".equals(u.getUsername())),
                    "Le compte réactivé doit réapparaître dans la liste.");
        }

        @Test
        @DisplayName("Le compte réactivé retrouve immédiatement l'accès → 200")
        void leCompteReactiveRetrouveLAcces() throws Exception {
            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNoContent());
            mockMvc.perform(get("/api/reservations")
                            .header("Authorization", "Bearer " + tokenAdherent))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(patch("/admin/users/" + adherent.getUserId() + "/reactiver")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isOk());

            // Ses rôles n'ont jamais été modifiés : le même token est de nouveau accepté.
            mockMvc.perform(get("/api/reservations")
                            .header("Authorization", "Bearer " + tokenAdherent))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Un ADHERENT ne peut pas réactiver un compte → 403")
        void adherentNePeutPasReactiver() throws Exception {
            mockMvc.perform(patch("/admin/users/" + administrateur.getUserId() + "/reactiver")
                            .header("Authorization", "Bearer " + tokenAdherent))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Sans token → 401")
        void sansToken() throws Exception {
            mockMvc.perform(patch("/admin/users/" + adherent.getUserId() + "/reactiver"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Réactiver un identifiant inexistant → 404")
        void identifiantInexistant() throws Exception {
            mockMvc.perform(patch("/admin/users/999999/reactiver")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Garde-fous")
    class GardeFous {

        @Test
        @DisplayName("Un adhérent qui a un emprunt en cours n'est pas retirable → 409")
        void empruntEnCoursBloqueLeRetrait() throws Exception {
            Books livre = creerLivreIndisponible();
            Borrow emprunt = new Borrow();
            emprunt.setUserId(adherent.getUserId());
            emprunt.setBookId(livre.getBookId());
            emprunt.setIssueDate(new Date());
            emprunt.setDueDate(new Date());
            emprunt.setReturnDate(null); // non rendu
            borrowRepository.save(emprunt);

            mockMvc.perform(delete("/admin/users/" + adherent.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isConflict());

            assertTrue(usersRepository.findByUsername("marie")
                    .orElseThrow(() -> new AssertionError("Compte attendu en base.")).estActif(),
                    "Le compte doit rester actif tant que l'emprunt n'est pas rendu.");
        }

        @Test
        @DisplayName("Un administrateur ne peut pas retirer son propre compte → 409")
        void autoRetraitRefuse() throws Exception {
            mockMvc.perform(delete("/admin/users/" + administrateur.getUserId())
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isConflict());

            assertTrue(usersRepository.findByUsername("root")
                    .orElseThrow(() -> new AssertionError("Compte attendu en base.")).estActif());
        }

        @Test
        @DisplayName("Retirer un identifiant inexistant → 404")
        void identifiantInexistant() throws Exception {
            mockMvc.perform(delete("/admin/users/999999")
                            .header("Authorization", "Bearer " + tokenAdmin))
                    .andExpect(status().isNotFound());
        }
    }

    // ------------------------------------------------------------------ fixtures

    private Users creerUtilisateur(String username, String nom, String roleName) {
        Role role = new Role();
        role.setRoleName(roleName);

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        Users utilisateur = new Users();
        utilisateur.setUsername(username);
        utilisateur.setName(nom);
        utilisateur.setPassword("{noop}test");
        utilisateur.setRole(roles);

        return usersRepository.save(utilisateur);
    }

    private Books creerLivreIndisponible() {
        Books livre = new Books();
        livre.setBookName("Livre de test");
        livre.setBookAuthor("Auteur");
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
