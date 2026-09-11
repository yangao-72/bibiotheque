package com.ibizabroker.bibliotheque.controller;

import com.ibizabroker.bibliotheque.dao.UsersRepository;
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
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fermer l'API de réservation ne suffit pas si le reste de l'application permet
 * de se fabriquer les droits qui l'ouvrent.
 *
 * <p>Ces tests verrouillent le chemin d'escalade qui vidait RS-02, RS-03 et RS-05
 * de leur sens : un simple ADHERENT créait un compte BIBLIOTHECAIRE via
 * {@code POST /admin/users}, s'y connectait, et lisait toutes les réservations.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Escalade de privilèges — la fabrique de comptes")
class EscaladeDePrivilegesTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsersRepository usersRepository;

    private String tokenAdherent;
    private String tokenBibliothecaire;

    /** Corps d'une demande de création de compte avec le rôle le plus puissant. */
    private static final String COMPTE_BIBLIOTHECAIRE = """
            {
              "username": "pirate",
              "name": "Compte fabriqué",
              "password": "pirate123",
              "role": [{ "roleName": "BIBLIOTHECAIRE" }]
            }
            """;

    @BeforeEach
    void preparerLesComptes() {
        usersRepository.deleteAll();

        creerUtilisateur("adherent", "Adhérent", "ADHERENT");
        creerUtilisateur("biblio", "Bibliothécaire", "BIBLIOTHECAIRE");

        tokenAdherent = jwtUtil.generateToken(jwtService.loadUserByUsername("adherent"));
        tokenBibliothecaire = jwtUtil.generateToken(jwtService.loadUserByUsername("biblio"));
    }

    @Test
    @DisplayName("Un ADHERENT ne peut pas créer de compte → 403")
    void unAdherentNePeutPasCreerDeCompte() throws Exception {
        mockMvc.perform(post("/admin/users")
                        .header("Authorization", "Bearer " + tokenAdherent)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPTE_BIBLIOTHECAIRE))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un ADHERENT ne peut donc pas se fabriquer un compte BIBLIOTHECAIRE")
    void unAdherentNePeutPasSeFabriquerUnCompteBibliothecaire() throws Exception {
        mockMvc.perform(post("/admin/users")
                        .header("Authorization", "Bearer " + tokenAdherent)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPTE_BIBLIOTHECAIRE))
                .andExpect(status().isForbidden());

        // Le compte ne doit pas exister : sans cette vérification, un 403 renvoyé
        // après l'enregistrement passerait inaperçu.
        org.junit.jupiter.api.Assertions.assertTrue(
                usersRepository.findByUsername("pirate").isEmpty(),
                "Le compte n'aurait pas dû être créé.");
    }

    @Test
    @DisplayName("Sans token, créer un compte renvoie 401")
    void sansTokenLaCreationDeCompteRenvoie401() throws Exception {
        mockMvc.perform(post("/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPTE_BIBLIOTHECAIRE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un BIBLIOTHECAIRE peut toujours créer un compte")
    void unBibliothecairePeutCreerUnCompte() throws Exception {
        mockMvc.perform(post("/admin/users")
                        .header("Authorization", "Bearer " + tokenBibliothecaire)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPTE_BIBLIOTHECAIRE))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Un token dont le porteur n'existe plus renvoie 401, pas 500")
    void unTokenOrphelinRenvoie401() throws Exception {
        // Le token reste valablement signé, mais son sujet a disparu de la base.
        usersRepository.deleteAll();

        mockMvc.perform(get("/api/reservations")
                        .header("Authorization", "Bearer " + tokenAdherent))
                .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ fixtures

    private void creerUtilisateur(String username, String nom, String roleName) {
        Role role = new Role();
        role.setRoleName(roleName);

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        Users utilisateur = new Users();
        utilisateur.setUsername(username);
        utilisateur.setName(nom);
        utilisateur.setPassword("{noop}test");
        utilisateur.setRole(roles);

        usersRepository.save(utilisateur);
    }
}
