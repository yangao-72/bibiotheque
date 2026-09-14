package com.ibizabroker.bibliotheque.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import javax.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;

/**
 * Rend le message des erreurs métier explicite dans le corps de la réponse.
 *
 * <p>Sans ce gestionnaire, une exception annotée {@link
 * org.springframework.web.bind.annotation.ResponseStatus} fixe bien le code HTTP,
 * mais le corps est produit par la page d'erreur du conteneur — un mécanisme dont
 * dépendre s'est révélé fragile : mesuré sur l'application réelle, un 400, 404 ou
 * 409 renvoyait le JSON avec son message, un <b>403 renvoyait un corps vide</b>.
 * Or c'est précisément le message qui porte l'explication côté client (RS-04 :
 * « vous n'avez pas le droit »).</p>
 *
 * <p>Écrire le corps ici rend la réponse indépendante du conteneur : une réponse
 * déjà écrite ne déclenche plus de page d'erreur, donc plus de substitution
 * silencieuse. Les exceptions de sécurité levées <em>avant</em> le contrôleur
 * (@PreAuthorize, token absent) gardent leur réponse vide : elles ne sont pas du
 * ressort de Spring MVC, et le client leur applique un message générique.</p>
 *
 * <p>Le corps reprend la forme par défaut de Spring Boot
 * ({@code timestamp}, {@code status}, {@code error}, {@code message}, {@code path})
 * afin que les clients existants, qui lisent {@code message}, ne voient aucune
 * différence sur les cas qui fonctionnaient déjà.</p>
 */
@RestControllerAdvice
public class GestionnaireExceptionsRest {

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErreurRest> requeteInvalide(BadRequestException ex, HttpServletRequest request) {
        return corps(HttpStatus.BAD_REQUEST, ex, request);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErreurRest> accesRefuse(ForbiddenException ex, HttpServletRequest request) {
        return corps(HttpStatus.FORBIDDEN, ex, request);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErreurRest> ressourceIntrouvable(NotFoundException ex, HttpServletRequest request) {
        return corps(HttpStatus.NOT_FOUND, ex, request);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErreurRest> regleDeGestionViolee(ConflictException ex, HttpServletRequest request) {
        return corps(HttpStatus.CONFLICT, ex, request);
    }

    private ResponseEntity<ErreurRest> corps(HttpStatus statut, RuntimeException ex, HttpServletRequest request) {
        return ResponseEntity.status(statut).body(new ErreurRest(
                OffsetDateTime.now(),
                statut.value(),
                statut.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()));
    }

    /** Corps d'erreur métier, aligné sur la forme par défaut de Spring Boot. */
    public record ErreurRest(OffsetDateTime timestamp, int status, String error, String message, String path) {
    }
}
