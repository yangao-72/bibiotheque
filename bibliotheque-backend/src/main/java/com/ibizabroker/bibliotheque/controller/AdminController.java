package com.ibizabroker.bibliotheque.controller;

import com.ibizabroker.bibliotheque.dao.BorrowRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Borrow;
import com.ibizabroker.bibliotheque.entity.Users;
import com.ibizabroker.bibliotheque.exceptions.ConflictException;
import com.ibizabroker.bibliotheque.exceptions.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;

@CrossOrigin("http://localhost:4200/")
@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private BorrowRepository borrowRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Création d'un compte.
     *
     * <p>Cet endpoint était ouvert à tout utilisateur authentifié : le contrôle
     * de rôle avait été commenté. Un simple ADHERENT pouvait donc se créer un
     * compte BIBLIOTHECAIRE puis, en s'y connectant, lire les réservations de
     * tout le monde — ce qui vidait de leur sens RS-02, RS-03 et RS-05.
     * Fermer l'API de réservation sans fermer la fabrique de comptes ne fermait
     * rien du tout.</p>
     */
    @PreAuthorize("hasAnyRole('Admin', 'BIBLIOTHECAIRE')")
    @PostMapping("/users")
    public Users addUserByAdmin(@RequestBody Users user) {
//        Role role = new Role();
////        role.setRoleName(UserConstant.DEFAULT_ROLE);
//        role.setRoleName(role.getRoleName());
//        Set<Role> setRole = new HashSet<>();
//        setRole.add(role);
//        user.setRole(setRole);
        String password = user.getPassword();
        String encryptPassword = passwordEncoder.encode(password);
        user.setPassword(encryptPassword);
        usersRepository.save(user);
        return user;
    }

    /**
     * Liste des comptes.
     *
     * <p>Par défaut, seuls les comptes actifs sont renvoyés : c'est cette liste
     * que le bibliothécaire utilise pour choisir l'adhérent d'une nouvelle
     * réservation, et un compte supprimé ne doit pas y figurer. L'écran
     * « Adhérents » demande {@code ?inclureDesactives=true} pour afficher aussi
     * les comptes retirés et permettre de rouvrir leur fiche.</p>
     */
    @GetMapping("/users")
    @PreAuthorize("hasRole('Admin')")
    public List<Users> getAllUsers(
            @RequestParam(name = "inclureDesactives", required = false, defaultValue = "false")
            boolean inclureDesactives) {
        return inclureDesactives ? usersRepository.findAll() : usersRepository.findAllActifs();
    }

    @PreAuthorize("hasRole('Admin')")
    @GetMapping("/users/{id}")
    public ResponseEntity<Users> getUserById(@PathVariable Integer id) {
        Users user = usersRepository.findById(id).orElseThrow(() -> new NotFoundException("User with id "+ id +" does not exist."));
        return ResponseEntity.ok(user);
    }

    @PreAuthorize("hasRole('Admin')")
    @PutMapping("/users/{id}")
    public ResponseEntity<Users> updateUser(@PathVariable Integer id, @RequestBody Users userDetails) {
        Users user = usersRepository.findById(id).orElseThrow(() -> new NotFoundException("User with id "+ id +" does not exist."));

        user.setName(userDetails.getName());
        user.setRole(userDetails.getRole());
        user.setUsername(userDetails.getUsername());

        Users updatedUser = usersRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Retrait d'un compte par un administrateur — <b>suppression logique</b>.
     *
     * <p>Le compte n'est pas effacé mais désactivé ({@code actif = false}) : il ne
     * se connecte plus et disparaît de la liste des adhérents, tandis que ses
     * réservations et ses emprunts restent en base. C'est la seule façon de
     * satisfaire à la fois « l'admin supprime un adhérent » et la conservation de
     * l'historique : une suppression physique effacerait des réservations sans
     * lesquelles le passé des livres n'est plus lisible.</p>
     *
     * <p>Deux garde-fous demeurent :</p>
     * <ul>
     *   <li>un adhérent qui détient encore un exemplaire (emprunt non rendu) ne
     *       peut pas être retiré : le livre resterait sorti sans porteur ;</li>
     *   <li>un administrateur ne peut pas retirer son propre compte, ce qui le
     *       verrouillerait hors de l'application.</li>
     * </ul>
     *
     * <p>Le motif et la date du retrait sont enregistrés pour l'audit. Le motif
     * passe par un paramètre de requête ({@code ?motif=…}) et non par un corps :
     * beaucoup d'intermédiaires HTTP suppriment le corps d'un {@code DELETE}.</p>
     */
    @PreAuthorize("hasRole('Admin')")
    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(
            @PathVariable Integer id,
            @RequestParam(name = "motif", required = false) String motif,
            Authentication authentication) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User with id " + id + " does not exist."));

        if (authentication != null && user.getUsername().equals(authentication.getName())) {
            throw new ConflictException("Vous ne pouvez pas supprimer votre propre compte.");
        }

        boolean aUnEmpruntEnCours = borrowRepository.findByUserId(id).stream()
                .anyMatch((Borrow emprunt) -> emprunt.getReturnDate() == null);
        if (aUnEmpruntEnCours) {
            throw new ConflictException("Cet adhérent a un emprunt en cours : enregistrez le retour "
                    + "avant de supprimer son compte.");
        }

        user.setActif(false);
        user.setDateDesactivation(new Date());
        user.setMotifDesactivation(normaliserMotif(motif));
        usersRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    /** Un motif vide ou fait d'espaces vaut « non renseigné ». */
    private String normaliserMotif(String motif) {
        if (motif == null || motif.trim().isEmpty()) {
            return null;
        }
        return motif.trim();
    }

    /**
     * Réintégration d'un compte désactivé.
     *
     * <p>Opération idempotente : réactiver un compte déjà actif renvoie simplement
     * la fiche. Le compte retrouve immédiatement ses droits, puisqu'il n'a jamais
     * perdu ni ses rôles ni ses réservations.</p>
     *
     * <p>La trace d'audit de la désactivation est effacée : elle décrivait un
     * état qui n'a plus cours. Conserver l'historique des allers-retours
     * demanderait un journal append-only, pas des colonnes sur le compte.</p>
     */
    @PreAuthorize("hasRole('Admin')")
    @PatchMapping("/users/{id}/reactiver")
    @Transactional
    public ResponseEntity<Users> reactiverUser(@PathVariable Integer id) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User with id " + id + " does not exist."));

        user.setActif(true);
        user.setDateDesactivation(null);
        user.setMotifDesactivation(null);
        return ResponseEntity.ok(usersRepository.save(user));
    }
}
