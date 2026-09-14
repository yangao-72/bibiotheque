package com.ibizabroker.bibliotheque.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Accès refusé (403) pour un utilisateur <b>authentifié</b> dont la demande
 * contredit une règle de sécurité — par opposition au 401, qui sanctionne une
 * absence d'authentification.
 *
 * <p>Utilisée notamment par RS-04 : un ADHERENT qui vise le compte d'un autre
 * adhérent est identifié, mais n'a pas le droit d'agir ainsi. Le message porte
 * l'explication affichée au client (le projet active
 * {@code server.error.include-message=always}).</p>
 */
@ResponseStatus(value = HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public ForbiddenException(String message) {
        super(message);
    }
}
