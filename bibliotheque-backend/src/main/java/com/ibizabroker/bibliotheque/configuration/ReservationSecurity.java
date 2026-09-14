package com.ibizabroker.bibliotheque.configuration;

import com.ibizabroker.bibliotheque.dao.ReservationRepository;
import com.ibizabroker.bibliotheque.entity.Reservation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Point central de la sécurité des réservations.
 *
 * <p>Règle fondamentale (RS-04) : l'identité de l'appelant est toujours dérivée du
 * token JWT, jamais du corps ni des paramètres de la requête. La résolution du
 * compte à partir du token est partagée avec le module emprunt et vit dans
 * {@link IdentiteCourante} — un seul mécanisme, pas deux.</p>
 *
 * <p>Ce bean est référencé par son nom dans les expressions {@code @PreAuthorize}
 * du {@code ReservationController}, par exemple :
 * {@code @PreAuthorize("hasRole('BIBLIOTHECAIRE') or @reservationSecurity.estProprietaire(#id, authentication)")}.</p>
 */
@Component("reservationSecurity")
public class ReservationSecurity {

    public static final String ROLE_ADHERENT = IdentiteCourante.ROLE_ADHERENT;
    public static final String ROLE_BIBLIOTHECAIRE = IdentiteCourante.ROLE_BIBLIOTHECAIRE;

    @Autowired
    private IdentiteCourante identite;

    @Autowired
    private ReservationRepository reservationRepository;

    /**
     * Identifiant de l'utilisateur authentifié, déduit du token.
     */
    public Integer utilisateurCourantId(Authentication authentication) {
        return identite.utilisateurCourantId(authentication);
    }

    /**
     * Indique si l'appelant possède le rôle BIBLIOTHECAIRE.
     *
     * <p>Volontairement limité à ce rôle : la matrice d'autorisation des
     * réservations distingue ADHERENT et BIBLIOTHECAIRE, et un ADHERENT ne doit
     * pas voir son `adherentId` conservé sous prétexte qu'il porte un autre rôle
     * de gestion.</p>
     */
    public boolean estBibliothecaire(Authentication authentication) {
        return identite.aLeRole(authentication, ROLE_BIBLIOTHECAIRE);
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
