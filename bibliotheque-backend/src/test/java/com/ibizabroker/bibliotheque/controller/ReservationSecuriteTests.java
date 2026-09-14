package com.ibizabroker.bibliotheque.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Books;
import com.ibizabroker.bibliotheque.entity.Reservation;
import com.ibizabroker.bibliotheque.entity.ReservationRequest;
import com.ibizabroker.bibliotheque.entity.ReservationStatus;
import com.ibizabroker.bibliotheque.entity.Role;
import com.ibizabroker.bibliotheque.entity.Users;
import com.ibizabroker.bibliotheque.service.JwtService;
import com.ibizabroker.bibliotheque.util.JwtUtil;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de sécurité de l'API de réservation.
 *
 * <p>Couvre la matrice d'autorisations (anonyme / ADHERENT / BIBLIOTHECAIRE sur les
 * 5 endpoints) et les règles RS-01 à RS-05.</p>
 *
 * <p>Les requêtes passent par la chaîne de filtres complète et utilisent de <b>vrais
 * tokens JWT</b> : c'est la seule façon de prouver RS-01 (token absent, falsifié ou
 * expiré), qu'un {@code @WithMockUser} court-circuiterait.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Sécurité de l'API /api/reservations")
class ReservationSecuriteTests {

    /** Même secret que {@link JwtUtil}, pour forger des tokens expirés dans les tests. */
    private static final String SECRET_KEY = "learn_programming_yourself";
    private static final String AUTRE_SECRET_KEY = "cle_d_un_attaquant";

    private static final String URL = "/api/reservations";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    private Users adherent1;
    private Users adherent2;
    private Users bibliothecaire;
    /** Compte strictement « Admin », sans le rôle BIBLIOTHECAIRE. */
    private Users adminPur;
    private Users sansRoleReservation;

    private Books livreLibreDeReservation;

    private Reservation reservationDeAdherent1;
    private Reservation reservationDeAdherent2;

    private String tokenAdherent1;
    private String tokenAdherent2;
    private String tokenBibliothecaire;
    private String tokenAdminPur;
    private String tokenSansRoleReservation;

    @BeforeEach
    void preparerLesDonnees() {
        reservationRepository.deleteAll();
        booksRepository.deleteAll();
        usersRepository.deleteAll();

        adherent1 = creerUtilisateur("adherent1", "Adhérent 1", "ADHERENT");
        adherent2 = creerUtilisateur("adherent2", "Adhérent 2", "ADHERENT");
        bibliothecaire = creerUtilisateur("biblio", "Bibliothécaire", "BIBLIOTHECAIRE");
        adminPur = creerUtilisateur("admin", "Administrateur", "Admin");
        // Compte authentifié mais sans rôle du module réservation (ex. ancien rôle « User ») :
        // il permet de vérifier qu'on répond bien 403 et non 401.
        sansRoleReservation = creerUtilisateur("ancien", "Ancien compte", "User");

        // RG-01 : seuls les livres à 0 exemplaire sont réservables.
        livreLibreDeReservation = creerLivreIndisponible("Livre libre de réservation");
        Books livreDeAdherent1 = creerLivreIndisponible("Livre réservé par adherent1");
        Books livreDeAdherent2 = creerLivreIndisponible("Livre réservé par adherent2");

        reservationDeAdherent1 = creerReservation(adherent1, livreDeAdherent1);
        reservationDeAdherent2 = creerReservation(adherent2, livreDeAdherent2);

        tokenAdherent1 = tokenValidePour("adherent1");
        tokenAdherent2 = tokenValidePour("adherent2");
        tokenBibliothecaire = tokenValidePour("biblio");
        tokenAdminPur = tokenValidePour("admin");
        tokenSansRoleReservation = tokenValidePour("ancien");
    }

    // =========================================================================
    // RS-01 — Sans token (ou avec un token invalide), tout endpoint renvoie 401
    // =========================================================================

    @Nested
    @DisplayName("RS-01 — anonyme")
    class RS01 {

        @Test
        @DisplayName("POST sans token → 401")
        void postSansToken() throws Exception {
            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsReservation(livreLibreDeReservation.getBookId(), adherent1.getUserId())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET liste sans token → 401")
        void getListeSansToken() throws Exception {
            mockMvc.perform(get(URL))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /{id} sans token → 401")
        void getParIdSansToken() throws Exception {
            mockMvc.perform(get(URL + "/" + reservationDeAdherent1.getReservationId()))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("PATCH /{id}/annuler sans token → 401")
        void annulerSansToken() throws Exception {
            mockMvc.perform(patch(URL + "/" + reservationDeAdherent1.getReservationId() + "/annuler"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("DELETE /{id} sans token → 401")
        void supprimerSansToken() throws Exception {
            mockMvc.perform(delete(URL + "/" + reservationDeAdherent1.getReservationId()))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Token falsifié (signé avec une autre clé) → 401")
        void tokenFalsifie() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenFalsifiePour("adherent1")))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Token expiré → 401")
        void tokenExpire() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenExpirePour("adherent1")))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // RS-02 — Un ADHERENT qui tente une action réservée au bibliothécaire → 403
    // =========================================================================

    @Nested
    @DisplayName("RS-02 — action réservée au bibliothécaire")
    class RS02 {

        @Test
        @DisplayName("DELETE par un ADHERENT, même sur sa propre réservation → 403")
        void suppressionParAdherent() throws Exception {
            mockMvc.perform(delete(URL + "/" + reservationDeAdherent1.getReservationId())
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("DELETE par le BIBLIOTHECAIRE → 204")
        void suppressionParBibliothecaire() throws Exception {
            mockMvc.perform(delete(URL + "/" + reservationDeAdherent1.getReservationId())
                            .header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("DELETE par un compte strictement Admin (sans BIBLIOTHECAIRE) → 204")
        void suppressionParAdminPur() throws Exception {
            mockMvc.perform(delete(URL + "/" + reservationDeAdherent1.getReservationId())
                            .header("Authorization", "Bearer " + tokenAdminPur))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("Authentifié mais sans rôle du module réservation → 403 (et non 401)")
        void authentifieSansRole() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenSansRoleReservation))
                    .andExpect(status().isForbidden());
        }
    }

    // =========================================================================
    // RS-03 — Un ADHERENT qui accède à la réservation d'un autre → 403
    // =========================================================================

    @Nested
    @DisplayName("RS-03 — réservation d'un autre adhérent")
    class RS03 {

        @Test
        @DisplayName("GET /{id} sur la réservation d'un autre → 403")
        void consulterCelleDunAutre() throws Exception {
            mockMvc.perform(get(URL + "/" + reservationDeAdherent2.getReservationId())
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /{id} sur sa propre réservation → 200")
        void consulterLaSienne() throws Exception {
            mockMvc.perform(get(URL + "/" + reservationDeAdherent1.getReservationId())
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.adherentId").value(adherent1.getUserId()));
        }

        @Test
        @DisplayName("PATCH /{id}/annuler sur la réservation d'un autre → 403")
        void annulerCelleDunAutre() throws Exception {
            mockMvc.perform(patch(URL + "/" + reservationDeAdherent2.getReservationId() + "/annuler")
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("PATCH /{id}/annuler sur sa propre réservation → 200")
        void annulerLaSienne() throws Exception {
            mockMvc.perform(patch(URL + "/" + reservationDeAdherent1.getReservationId() + "/annuler")
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statut").value(ReservationStatus.ANNULEE.name()));
        }

        @Test
        @DisplayName("Le BIBLIOTHECAIRE consulte n'importe quelle réservation → 200")
        void bibliothecaireConsulteToutes() throws Exception {
            mockMvc.perform(get(URL + "/" + reservationDeAdherent1.getReservationId())
                            .header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.adherentId").value(adherent1.getUserId()));
        }

        @Test
        @DisplayName("Le BIBLIOTHECAIRE annule n'importe quelle réservation → 200")
        void bibliothecaireAnnuleToutes() throws Exception {
            mockMvc.perform(patch(URL + "/" + reservationDeAdherent2.getReservationId() + "/annuler")
                            .header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statut").value(ReservationStatus.ANNULEE.name()));
        }

        @Test
        @DisplayName("GET /{id} sur une réservation inexistante → 404 (et non 403)")
        void reservationInexistante() throws Exception {
            mockMvc.perform(get(URL + "/999999")
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isNotFound());
        }

        /**
         * IDOR / Broken Object Level Authorization : un adhérent ne doit pas pouvoir
         * parcourir les identifiants pour tomber sur la réservation d'un autre. Ce
         * test balaie une fenêtre d'identifiants autour de celle d'autrui et vérifie
         * qu'aucune réponse n'est 200 — ni en lecture, ni en écriture.
         */
        @Test
        @DisplayName("IDOR : énumérer les identifiants ne donne jamais accès à la réservation d'un autre")
        void enumerationDesIdentifiants() throws Exception {
            int cible = reservationDeAdherent2.getReservationId();
            int laSienne = reservationDeAdherent1.getReservationId();

            for (int id = Math.max(1, cible - 5); id <= cible + 5; id++) {
                if (id == laSienne) {
                    continue; // sa propre réservation est couverte par les tests ci-dessus
                }

                int statutLecture = mockMvc.perform(get(URL + "/" + id)
                                .header("Authorization", "Bearer " + tokenAdherent1))
                        .andReturn().getResponse().getStatus();
                int statutAnnulation = mockMvc.perform(patch(URL + "/" + id + "/annuler")
                                .header("Authorization", "Bearer " + tokenAdherent1))
                        .andReturn().getResponse().getStatus();

                org.junit.jupiter.api.Assertions.assertTrue(
                        statutLecture == 403 || statutLecture == 404,
                        "GET sur l'identifiant " + id + " a répondu " + statutLecture
                                + " : un ADHERENT ne doit jamais lire la réservation d'un autre.");
                org.junit.jupiter.api.Assertions.assertTrue(
                        statutAnnulation == 403 || statutAnnulation == 404,
                        "PATCH sur l'identifiant " + id + " a répondu " + statutAnnulation
                                + " : un ADHERENT ne doit jamais annuler la réservation d'un autre.");
            }
        }
    }

    // =========================================================================
    // RS-04 — Un ADHERENT ne peut pas créer une réservation au nom d'un autre
    // =========================================================================

    @Nested
    @DisplayName("RS-04 — création au nom d'un autre")
    class RS04 {

        @Test
        @DisplayName("L'adherentId du corps est ignoré : la réservation est créée pour le porteur du token")
        void adherentIdDuCorpsIgnore() throws Exception {
            // adherent1 envoie volontairement l'identifiant d'adherent2 dans le corps.
            mockMvc.perform(post(URL)
                            .header("Authorization", "Bearer " + tokenAdherent1)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsReservation(livreLibreDeReservation.getBookId(), adherent2.getUserId())))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.adherentId").value(adherent1.getUserId()));

            // Aucune réservation supplémentaire n'a été créée au nom d'adherent2.
            org.junit.jupiter.api.Assertions.assertEquals(
                    1, reservationRepository.findByAdherentUserId(adherent2.getUserId()).size());
        }

        @Test
        @DisplayName("Sans adherentId dans le corps, un ADHERENT réserve quand même pour lui-même")
        void adherentIdAbsent() throws Exception {
            mockMvc.perform(post(URL)
                            .header("Authorization", "Bearer " + tokenAdherent1)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsReservation(livreLibreDeReservation.getBookId(), null)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.adherentId").value(adherent1.getUserId()));
        }

        @Test
        @DisplayName("Le BIBLIOTHECAIRE peut réserver pour n'importe quel adhérent")
        void bibliothecaireReservePourAutrui() throws Exception {
            mockMvc.perform(post(URL)
                            .header("Authorization", "Bearer " + tokenBibliothecaire)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsReservation(livreLibreDeReservation.getBookId(), adherent2.getUserId())))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.adherentId").value(adherent2.getUserId()));
        }
    }

    // =========================================================================
    // RS-05 — GET /api/reservations par un ADHERENT ne retourne que les siennes
    // =========================================================================

    @Nested
    @DisplayName("RS-05 — filtrage de la liste")
    class RS05 {

        @Test
        @DisplayName("Un ADHERENT ne reçoit que ses propres réservations")
        void adherentNeVoitQueLesSiennes() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].adherentId").value(adherent1.getUserId()));
        }

        @Test
        @DisplayName("Le paramètre adherentId d'un autre est ignoré pour un ADHERENT")
        void parametreAdherentIdIgnore() throws Exception {
            mockMvc.perform(get(URL)
                            .param("adherentId", String.valueOf(adherent2.getUserId()))
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].adherentId").value(adherent1.getUserId()));
        }

        @Test
        @DisplayName("Le BIBLIOTHECAIRE reçoit toutes les réservations")
        void bibliothecaireVoitTout() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2));
        }

        @Test
        @DisplayName("Le BIBLIOTHECAIRE peut filtrer sur un adhérent précis")
        void bibliothecaireFiltreParAdherent() throws Exception {
            mockMvc.perform(get(URL)
                            .param("adherentId", String.valueOf(adherent2.getUserId()))
                            .header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].adherentId").value(adherent2.getUserId()));
        }
    }

    // =========================================================================
    // Fabriques de données et de tokens
    // =========================================================================

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

    private String corpsReservation(Integer livreId, Integer adherentId) throws Exception {
        ReservationRequest request = new ReservationRequest();
        request.setLivreId(livreId);
        request.setAdherentId(adherentId);
        return objectMapper.writeValueAsString(request);
    }

    private String tokenValidePour(String username) {
        return jwtUtil.generateToken(jwtService.loadUserByUsername(username));
    }

    private String tokenExpirePour(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis() - 7_200_000L))
                .setExpiration(new Date(System.currentTimeMillis() - 3_600_000L))
                .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
                .compact();
    }

    private String tokenFalsifiePour(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 3_600_000L))
                .signWith(SignatureAlgorithm.HS512, AUTRE_SECRET_KEY)
                .compact();
    }
}
