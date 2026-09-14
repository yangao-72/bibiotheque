package com.ibizabroker.bibliotheque.controller;

import com.ibizabroker.bibliotheque.configuration.ReservationSecurity;
import com.ibizabroker.bibliotheque.entity.ReservationRequest;
import com.ibizabroker.bibliotheque.entity.ReservationResponse;
import com.ibizabroker.bibliotheque.entity.ReservationStatus;
import com.ibizabroker.bibliotheque.service.ReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin("http://localhost:4200/")
@RestController
@RequestMapping("/api/reservations")
@Tag(name = "Réservations", description = "Gestion des réservations de livres")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private ReservationSecurity reservationSecurity;

    @PreAuthorize("hasAnyRole('ADHERENT', 'BIBLIOTHECAIRE')")
    @PostMapping
    @Operation(summary = "Créer une réservation", description = "Crée une nouvelle réservation pour un livre indisponible. "
            + "Un ADHERENT réserve toujours pour lui-même ; un BIBLIOTHECAIRE réserve pour l'adhérent indiqué.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Réservation créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Champs obligatoires manquants"),
            @ApiResponse(responseCode = "401", description = "Token absent, invalide ou expiré"),
            @ApiResponse(responseCode = "403", description = "Rôle insuffisant"),
            @ApiResponse(responseCode = "404", description = "Livre ou utilisateur introuvable"),
            @ApiResponse(responseCode = "409", description = "Règle de gestion violée")
    })
    public ResponseEntity<ReservationResponse> creerReservation(@RequestBody ReservationRequest request,
                                                                Authentication authentication) {
        // RS-04 : un ADHERENT ne peut pas réserver au nom d'un autre. L'identité du
        // propriétaire est résolue dans le service, à partir du token — le contrôle
        // n'est donc pas seulement ici, mais sur le chemin obligé de toute création.
        ReservationResponse response = reservationService.creerReservation(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasAnyRole('ADHERENT', 'BIBLIOTHECAIRE')")
    @GetMapping
    @Operation(summary = "Lister les réservations", description = "Un BIBLIOTHECAIRE voit toutes les réservations "
            + "(filtrables par statut et par adhérent) ; un ADHERENT ne voit que les siennes.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des réservations retournée"),
            @ApiResponse(responseCode = "401", description = "Token absent, invalide ou expiré"),
            @ApiResponse(responseCode = "403", description = "Rôle insuffisant")
    })
    public ResponseEntity<List<ReservationResponse>> listerReservations(
            @RequestParam(required = false) ReservationStatus statut,
            @RequestParam(required = false) Integer adherentId,
            Authentication authentication) {
        // RS-05 : un ADHERENT ne reçoit que ses propres réservations, quel que soit
        // l'`adherentId` demandé. Le filtre est imposé à partir du token.
        Integer filtreAdherentId = reservationSecurity.estBibliothecaire(authentication)
                ? adherentId
                : reservationSecurity.utilisateurCourantId(authentication);
        List<ReservationResponse> reservations = reservationService.listerReservations(statut, filtreAdherentId);
        return ResponseEntity.ok(reservations);
    }

    @PreAuthorize("hasRole('BIBLIOTHECAIRE') or @reservationSecurity.estProprietaire(#id, authentication)")
    @GetMapping("/{id}")
    @Operation(summary = "Consulter une réservation", description = "Retourne les détails d'une réservation par son ID. "
            + "Un ADHERENT ne peut consulter que ses propres réservations.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réservation trouvée"),
            @ApiResponse(responseCode = "401", description = "Token absent, invalide ou expiré"),
            @ApiResponse(responseCode = "403", description = "La réservation appartient à un autre adhérent"),
            @ApiResponse(responseCode = "404", description = "Réservation introuvable")
    })
    public ResponseEntity<ReservationResponse> consulterReservation(@PathVariable Integer id) {
        ReservationResponse response = reservationService.consulterReservation(id);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('BIBLIOTHECAIRE') or @reservationSecurity.estProprietaire(#id, authentication)")
    @PatchMapping("/{id}/annuler")
    @Operation(summary = "Annuler une réservation", description = "Annule une réservation si elle est EN_ATTENTE ou DISPONIBLE. "
            + "Un ADHERENT ne peut annuler que ses propres réservations ; l'identité est déduite du token.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réservation annulée avec succès"),
            @ApiResponse(responseCode = "401", description = "Token absent, invalide ou expiré"),
            @ApiResponse(responseCode = "403", description = "La réservation appartient à un autre adhérent"),
            @ApiResponse(responseCode = "404", description = "Réservation introuvable"),
            @ApiResponse(responseCode = "409", description = "Règle de gestion violée")
    })
    public ResponseEntity<ReservationResponse> annulerReservation(@PathVariable Integer id) {
        ReservationResponse response = reservationService.annulerReservation(id);
        return ResponseEntity.ok(response);
    }

    // L'Admin est admis explicitement : dans le seed comme à l'inscription il
    // porte déjà BIBLIOTHECAIRE, mais un compte strictement « Admin » (créé à la
    // main, ou avant l'ajout du rôle réservation) doit lui aussi pouvoir purger
    // une réservation — c'est ce que demande la règle métier.
    @PreAuthorize("hasAnyRole('BIBLIOTHECAIRE', 'Admin')")
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une réservation", description = "Supprime définitivement une réservation. "
            + "Réservé au BIBLIOTHECAIRE et à l'Admin.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Réservation supprimée avec succès"),
            @ApiResponse(responseCode = "401", description = "Token absent, invalide ou expiré"),
            @ApiResponse(responseCode = "403", description = "Action réservée au BIBLIOTHECAIRE"),
            @ApiResponse(responseCode = "404", description = "Réservation introuvable")
    })
    public ResponseEntity<Void> supprimerReservation(@PathVariable Integer id) {
        reservationService.supprimerReservation(id);
        return ResponseEntity.noContent().build();
    }
}
