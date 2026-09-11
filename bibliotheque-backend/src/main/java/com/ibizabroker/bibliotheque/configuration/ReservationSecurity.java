package com.ibizabroker.bibliotheque.configuration;

import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Reservation;
import com.ibizabroker.bibliotheque.entity.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Point central de la sécurité des réservations.
 *
 * <p>Règle fondamentale (RS-04) : l'identité de l'appelant est toujours dérivée du
 * token JWT, jamais du corps ni des paramètres de la requête. Le token ne portant
 * que le <em>username</em>, on retrouve l'identifiant technique en base.</p>
 *
 * <p>Ce bean est référencé par son nom dans les expressions {@code @PreAuthorize}
 * du {@code ReservationController}, par exemple :
 * {@code @PreAuthorize("hasRole('BIBLIOTHECAIRE') or @reservationSecurity.estProprietaire(#id, authentication)")}.</p>
 */
@Component("reservationSecurity")
public class ReservationSecurity {

    public static final String ROLE_ADHERENT = "ADHERENT";
    public static final String ROLE_BIBLIOTHECAIRE = "BIBLIOTHECAIRE";

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    /**
     * Identifiant de l'utilisateur authentifié, déduit du token.
     */
    public Integer utilisateurCourantId(Authentication authentication) {
        Users utilisateur = usersRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Utilisateur '" + authentication.getName() + "' introuvable."));
        return utilisateur.getUserId();
    }

    /**
     * Indique si l'appelant possède le rôle BIBLIOTHECAIRE.
     */
    public boolean estBibliothecaire(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(("ROLE_" + ROLE_BIBLIOTHECAIRE)::equals);
    }

    /**
     * RS-03 : la réservation appartient-elle à l'appelant ?
     *
     * <p>Si la réservation n'existe pas, on renvoie {@code true} volontairement :
     * l'autorisation passe, le service lève alors sa {@code NotFoundException} et
     * l'API répond 404 (et non 403) sur un identifiant inexistant.</p>
     */
    public boolean estProprietaire(Integer reservationId, Authentication authentication) {
        Optional<Reservation> reservation = reservationRepository.findById(reservationId);
        if (reservation.isEmpty()) {
            return true;
        }
        return reservation.get().getAdherent().getUserId().equals(utilisateurCourantId(authentication));
    }
}
