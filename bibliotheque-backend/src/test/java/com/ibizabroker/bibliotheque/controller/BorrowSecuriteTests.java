package com.ibizabroker.bibliotheque.controller;

import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.BorrowRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Books;
import com.ibizabroker.bibliotheque.entity.Borrow;
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
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de sécurité du module emprunt.
 *
 * <p>Ce module était la porte ouverte de l'application : {@code /borrow/**} figurait
 * dans les {@code permitAll} de {@code WebSecurityConfiguration} et le contrôleur
 * ne portait aucun {@code @PreAuthorize}. Sans token, {@code POST /borrow} créait
 * un emprunt au nom d'un {@code userId} arbitraire et {@code GET /borrow} livrait
 * l'historique complet de la bibliothèque. Ces tests verrouillent la matrice
 * décrite dans {@code BorrowController} : identité issue du token, propriété de
 * l'emprunt, et lecture globale réservée au personnel.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Sécurité de l'API /borrow")
class BorrowSecuriteTests {

    private static final String URL = "/borrow";

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
    private BorrowRepository borrowRepository;

    private Users adherent1;
    private Users adherent2;
    private Users bibliothecaire;
    private Users adminPur;
    private Users sansRole;

    private Books livreDisponible;

    private Borrow empruntDeAdherent1;
    private Borrow empruntDeAdherent2;

    private String tokenAdherent1;
    private String tokenAdherent2;
    private String tokenBibliothecaire;
    private String tokenAdminPur;
    private String tokenSansRole;

    @BeforeEach
    void preparerLesDonnees() {
        borrowRepository.deleteAll();
        booksRepository.deleteAll();
        usersRepository.deleteAll();

        // « User » + « ADHERENT » : la combinaison réelle des comptes du seed.
        adherent1 = creerUtilisateur("adherent1", "Adhérent 1", "User", "ADHERENT");
        adherent2 = creerUtilisateur("adherent2", "Adhérent 2", "User", "ADHERENT");
        bibliothecaire = creerUtilisateur("biblio", "Bibliothécaire", "BIBLIOTHECAIRE");
        adminPur = creerUtilisateur("admin", "Administrateur", "Admin");
        sansRole = creerUtilisateur("autre", "Compte sans rôle de gestion", "Autre");

        livreDisponible = creerLivre("Livre disponible", 3);
        Books livre1 = creerLivre("Livre d'adhérent 1", 1);
        Books livre2 = creerLivre("Livre d'adhérent 2", 1);

        empruntDeAdherent1 = creerEmprunt(adherent1, livre1);
        empruntDeAdherent2 = creerEmprunt(adherent2, livre2);

        tokenAdherent1 = tokenValidePour("adherent1");
        tokenAdherent2 = tokenValidePour("adherent2");
        tokenBibliothecaire = tokenValidePour("biblio");
        tokenAdminPur = tokenValidePour("admin");
        tokenSansRole = tokenValidePour("autre");
    }

    // =========================================================================
    // RS-01 — sans token, les cinq endpoints renvoient 401
    // =========================================================================

    @Nested
    @DisplayName("Anonyme — 401 sur tout le module")
    class Anonyme {

        @Test
        @DisplayName("POST /borrow sans token → 401")
        void postSansToken() throws Exception {
            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(livreDisponible.getBookId(), adherent1.getUserId())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("PUT /borrow sans token → 401")
        void putSansToken() throws Exception {
            mockMvc.perform(put(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(empruntDeAdherent1.getBorrowId())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /borrow sans token → 401 (c'était 200 avec tout l'historique)")
        void listeSansToken() throws Exception {
            mockMvc.perform(get(URL))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /borrow/user/{id} sans token → 401")
        void empruntsDunUtilisateurSansToken() throws Exception {
            mockMvc.perform(get(URL + "/user/" + adherent1.getUserId()))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /borrow/book/{id} sans token → 401")
        void historiqueDunLivreSansToken() throws Exception {
            mockMvc.perform(get(URL + "/book/" + livreDisponible.getBookId()))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // ADHERENT — il agit sur lui-même, et sur rien d'autre
    // =========================================================================

    @Nested
    @DisplayName("ADHERENT — périmètre limité à ses propres emprunts")
    class Adherent {

        @Test
        @DisplayName("GET /borrow (tous les emprunts) → 403")
        void listeGlobaleInterdite() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /borrow/book/{id} (qui a emprunté ce livre) → 403")
        void historiqueDuLivreInterdit() throws Exception {
            mockMvc.perform(get(URL + "/book/" + livreDisponible.getBookId())
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /borrow/user/{un autre} → 403")
        void empruntsDunAutreInterdits() throws Exception {
            mockMvc.perform(get(URL + "/user/" + adherent2.getUserId())
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /borrow/user/{lui-même} → 200")
        void sesPropresEmprunts() throws Exception {
            mockMvc.perform(get(URL + "/user/" + adherent1.getUserId())
                            .header("Authorization", "Bearer " + tokenAdherent1))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /borrow avec le userId d'un autre : l'emprunt est créé pour le porteur du token")
        void userIdDuCorpsIgnore() throws Exception {
            mockMvc.perform(post(URL)
                            .header("Authorization", "Bearer " + tokenAdherent1)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(livreDisponible.getBookId(), adherent2.getUserId())))
                    .andExpect(status().isOk());

            // adherent1 avait déjà un emprunt : le nouveau porte le total à 2.
            assertEquals(2, borrowRepository.findByUserId(adherent1.getUserId()).size(),
                    "L'emprunt doit être rattaché au porteur du token.");
            // adherent2 en avait un : son total ne doit pas bouger.
            assertEquals(1, borrowRepository.findByUserId(adherent2.getUserId()).size(),
                    "Aucun emprunt supplémentaire ne doit être créé au nom d'un autre adhérent.");
        }

        @Test
        @DisplayName("PUT /borrow sur l'emprunt d'un autre → 403")
        void rendreLempruntDunAutre() throws Exception {
            mockMvc.perform(put(URL)
                            .header("Authorization", "Bearer " + tokenAdherent1)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(empruntDeAdherent2.getBorrowId())))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("PUT /borrow sur son propre emprunt → 200 et date de retour posée")
        void rendreSonPropreEmprunt() throws Exception {
            mockMvc.perform(put(URL)
                            .header("Authorization", "Bearer " + tokenAdherent1)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(empruntDeAdherent1.getBorrowId())))
                    .andExpect(status().isOk());

            assertNotNull(borrowRepository.findById(empruntDeAdherent1.getBorrowId()).get().getReturnDate(),
                    "Le retour doit être enregistré.");
        }
    }

    // =========================================================================
    // BIBLIOTHECAIRE / Admin — accès complet
    // =========================================================================

    @Nested
    @DisplayName("Personnel — accès complet")
    class Personnel {

        @Test
        @DisplayName("GET /borrow → 200 et tous les emprunts")
        void listeGlobale() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /borrow/user/{n'importe quel adhérent} → 200")
        void empruntsDunAdherent() throws Exception {
            mockMvc.perform(get(URL + "/user/" + adherent2.getUserId())
                            .header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /borrow/book/{id} → 200")
        void historiqueDunLivre() throws Exception {
            mockMvc.perform(get(URL + "/book/" + livreDisponible.getBookId())
                            .header("Authorization", "Bearer " + tokenBibliothecaire))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /borrow pour un adhérent désigné : le userId est respecté")
        void emprunterPourAutrui() throws Exception {
            mockMvc.perform(post(URL)
                            .header("Authorization", "Bearer " + tokenBibliothecaire)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(livreDisponible.getBookId(), adherent2.getUserId())))
                    .andExpect(status().isOk());

            assertEquals(2, borrowRepository.findByUserId(adherent2.getUserId()).size(),
                    "Le bibliothécaire doit pouvoir emprunter au nom de l'adhérent choisi.");
        }

        @Test
        @DisplayName("PUT /borrow sur l'emprunt d'un adhérent → 200")
        void rendrePourAutrui() throws Exception {
            mockMvc.perform(put(URL)
                            .header("Authorization", "Bearer " + tokenBibliothecaire)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(empruntDeAdherent2.getBorrowId())))
                    .andExpect(status().isOk());

            assertNotNull(borrowRepository.findById(empruntDeAdherent2.getBorrowId()).get().getReturnDate());
        }

        @Test
        @DisplayName("Un compte strictement Admin fait aussi partie du personnel → 200")
        void adminPurEstDuPersonnel() throws Exception {
            mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenAdminPur))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /borrow sans userId (personnel) → 400, le champ reste obligatoire")
        void emprunterSansDesignerAdherent() throws Exception {
            mockMvc.perform(post(URL)
                            .header("Authorization", "Bearer " + tokenBibliothecaire)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpsEmprunt(livreDisponible.getBookId(), null)))
                    .andExpect(status().isBadRequest());
        }
    }

    // =========================================================================
    // Cas limites : rôle absent, identifiants inconnus
    // =========================================================================

    @Test
    @DisplayName("Authentifié mais sans rôle du module → 403 sur la liste (et non 401)")
    void authentifieSansRole() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", "Bearer " + tokenSansRole))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT sur un emprunt inexistant → 404 (et non 403 ni 500)")
    void retourDunEmpruntInexistant() throws Exception {
        mockMvc.perform(put(URL)
                        .header("Authorization", "Bearer " + tokenAdherent1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsEmprunt(999999)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST sur un livre inexistant → 404 (et non 500)")
    void empruntDunLivreInexistant() throws Exception {
        mockMvc.perform(post(URL)
                        .header("Authorization", "Bearer " + tokenAdherent1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsEmprunt(999999, null)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Un livre sans exemplaire disponible n'est pas empruntable")
    void empruntDunLivreEnRupture() throws Exception {
        Books livreEnRupture = creerLivre("Livre épuisé", 0);

        mockMvc.perform(post(URL)
                        .header("Authorization", "Bearer " + tokenAdherent1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsEmprunt(livreEnRupture.getBookId(), null)))
                .andExpect(status().isOk());

        assertTrue(borrowRepository.findByUserId(adherent1.getUserId()).size() == 1,
                "Aucun emprunt ne doit être enregistré pour un livre à 0 exemplaire.");
    }

    // =========================================================================
    // Fabriques de données et de tokens
    // =========================================================================

    private Users creerUtilisateur(String username, String nom, String... nomsDeRole) {
        Set<Role> roles = new HashSet<>();
        for (String nomDeRole : nomsDeRole) {
            Role role = new Role();
            role.setRoleName(nomDeRole);
            roles.add(role);
        }

        Users utilisateur = new Users();
        utilisateur.setUsername(username);
        utilisateur.setName(nom);
        utilisateur.setPassword("{noop}test");
        utilisateur.setRole(roles);

        return usersRepository.save(utilisateur);
    }

    private Books creerLivre(String titre, int nbExemplaires) {
        Books livre = new Books();
        livre.setBookName(titre);
        livre.setBookAuthor("Auteur de test");
        livre.setBookGenre("Test");
        livre.setNoOfCopies(nbExemplaires);
        return booksRepository.save(livre);
    }

    private Borrow creerEmprunt(Users emprunteur, Books livre) {
        Calendar calendrier = Calendar.getInstance();
        Date issueDate = calendrier.getTime();
        calendrier.add(Calendar.DATE, 7);

        Borrow emprunt = new Borrow();
        emprunt.setUserId(emprunteur.getUserId());
        emprunt.setBookId(livre.getBookId());
        emprunt.setIssueDate(issueDate);
        emprunt.setDueDate(calendrier.getTime());
        return borrowRepository.save(emprunt);
    }

    /**
     * Corps d'un emprunt : le livre et, si le personnel choisit l'adhérent, son
     * identifiant.
     *
     * <p>JSON écrit à la main plutôt qu'une sérialisation d'entité :
     * {@code JsonDataSerializer} écrit les dates en {@code dd-MM-yyyy}, un format
     * que Jackson ne sait pas relire — un corps construit à partir d'un objet
     * {@code Borrow} serait rejeté en 400 avant même d'atteindre le contrôleur.</p>
     */
    private String corpsEmprunt(Integer bookId, Integer userId) {
        return "{\"bookId\":" + bookId + ",\"userId\":" + userId + "}";
    }

    /** Corps d'un retour : le contrôleur ne lit que le {@code borrowId}. */
    private String corpsEmprunt(Integer borrowId) {
        return "{\"borrowId\":" + borrowId + "}";
    }

    private String tokenValidePour(String username) {
        return jwtUtil.generateToken(jwtService.loadUserByUsername(username));
    }
}
