package com.ibizabroker.bibliotheque.configuration;

import com.ibizabroker.bibliotheque.dao.BorrowRepository;
import com.ibizabroker.bibliotheque.entity.Borrow;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Contrôles d'autorisation du module emprunt, pendant de
 * {@link ReservationSecurity} pour les réservations.
 *
 * <p>Les emprunts n'étaient protégés par <b>rien</b> : {@code /borrow/**} était en
 * {@code permitAll} et le contrôleur ne portait aucun {@code @PreAuthorize}. Sans
 * token, on pouvait donc emprunter un exemplaire au nom d'un {@code userId}
 * arbitraire et lire l'historique de toute la bibliothèque. Ce bean centralise ce
 * qui manquait : identité issue du token, propriété de l'emprunt, et statut de
 * personnel.</p>
 *
 * <p>Référencé par son nom dans les expressions SpEL du {@code BorrowController},
 * par exemple
 * {@code @PreAuthorize("hasAnyRole('Admin', 'BIBLIOTHECAIRE') or @borrowSecurity.estProprietaire(#borrow.borrowId, authentication)")}.</p>
 */
@Component("borrowSecurity")
public class BorrowSecurity {

    @Autowired
    private IdentiteCourante identite;

    @Autowired
    private BorrowRepository borrowRepository;

    /** Identifiant du porteur du token. */
    public Integer utilisateurCourantId(Authentication authentication) {
        return identite.utilisateurCourantId(authentication);
    }

    /** Bibliothécaire ou administrateur : peut agir pour n'importe quel adhérent. */
    public boolean estPersonnel(Authentication authentication) {
        return identite.estPersonnel(authentication);
    }

    /**
     * L'emprunt appartient-il à l'appelant ?
     *
     * <p>Si l'emprunt n'existe pas, on renvoie {@code true} volontairement :
     * l'autorisation passe, le contrôleur lève alors sa {@code NotFoundException}
     * et l'API répond 404 (et non 403) sur un identifiant inexistant.</p>
     */
    public boolean estProprietaire(Integer borrowId, Authentication authentication) {
        if (borrowId == null) {
            return false;
        }
        Optional<Borrow> emprunt = borrowRepository.findById(borrowId);
        if (emprunt.isEmpty()) {
            return true;
        }
        return emprunt.get().getUserId().equals(utilisateurCourantId(authentication));
    }

    /**
     * L'appelant est-il l'utilisateur visé par le chemin ? Sert à interdire à un
     * adhérent la lecture de l'historique d'un autre
     * ({@code GET /borrow/user/{id}}).
     */
    public boolean estUtilisateur(Integer userId, Authentication authentication) {
        return userId != null && userId.equals(utilisateurCourantId(authentication));
    }
}
