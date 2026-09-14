package com.ibizabroker.bibliotheque.configuration;

import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

/**
 * Identité de l'appelant — <b>point de passage unique</b> pour tout ce qui touche
 * aux droits (réservations, emprunts).
 *
 * <p>Le token JWT ne porte que le <em>username</em> : on retrouve l'identifiant
 * technique en base. C'est la règle qui donne son sens à RS-04 — l'identité d'un
 * adhérent ne vient jamais du corps ni des paramètres de la requête, qui sont
 * sous le contrôle du client.</p>
 *
 * <p>Le nom des rôles est celui du projet : {@code ROLE_} est préfixé par
 * {@link com.ibizabroker.bibliotheque.service.JwtService} au moment de construire
 * les autorités, et {@code hasRole('X')} compare {@code ROLE_X}.</p>
 *
 * <p>« Personnel » regroupe les deux rôles qui gèrent la bibliothèque,
 * {@code BIBLIOTHECAIRE} et {@code Admin} : le projet ajoute les rôles du module
 * réservation <em>à côté</em> des rôles historiques, un compte peut donc porter
 * les deux (le compte admin du seed porte {@code Admin} + {@code BIBLIOTHECAIRE}).</p>
 */
@Component("identiteCourante")
public class IdentiteCourante {

    public static final String ROLE_ADHERENT = "ADHERENT";
    public static final String ROLE_BIBLIOTHECAIRE = "BIBLIOTHECAIRE";
    public static final String ROLE_ADMIN = "Admin";
    public static final String ROLE_USER = "User";

    @Autowired
    private UsersRepository usersRepository;

    /** Compte correspondant au porteur du token. */
    public Users utilisateurCourant(Authentication authentication) {
        return usersRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Utilisateur '" + authentication.getName() + "' introuvable."));
    }

    /** Identifiant technique du porteur du token. */
    public Integer utilisateurCourantId(Authentication authentication) {
        return utilisateurCourant(authentication).getUserId();
    }

    /** L'appelant porte-t-il ce rôle ? */
    public boolean aLeRole(Authentication authentication, String role) {
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(("ROLE_" + role)::equals);
    }

    /** Bibliothécaire ou administrateur : les deux rôles « personnel ». */
    public boolean estPersonnel(Authentication authentication) {
        return aLeRole(authentication, ROLE_BIBLIOTHECAIRE) || aLeRole(authentication, ROLE_ADMIN);
    }
}
