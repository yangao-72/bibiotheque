package com.ibizabroker.bibliotheque.controller;

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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin("http://localhost:4200/")
@RestController
@RequestMapping("/api/reservations")
@Tag(name = "Réservations", description = "Gestion des réservations de livres")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    @PostMapping
    @Operation(summary = "Créer une réservation", description = "Crée une nouvelle réservation pour un livre indisponible")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Réservation créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Champs obligatoires manquants"),
            @ApiResponse(responseCode = "404", description = "Livre ou utilisateur introuvable"),
            @ApiResponse(responseCode = "409", description = "Règle de gestion violée")
    })
    public ResponseEntity<ReservationResponse> creerReservation(@RequestBody ReservationRequest request) {
        ReservationResponse response = reservationService.creerReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Lister les réservations", description = "Liste toutes les réservations, filtrables par statut et par adhérent")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des réservations retournée")
    })
    public ResponseEntity<List<ReservationResponse>> listerReservations(
            @RequestParam(required = false) ReservationStatus statut,
            @RequestParam(required = false) Integer adherentId) {
        List<ReservationResponse> reservations = reservationService.listerReservations(statut, adherentId);
        return ResponseEntity.ok(reservations);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulter une réservation", description = "Retourne les détails d'une réservation par son ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réservation trouvée"),
            @ApiResponse(responseCode = "404", description = "Réservation introuvable")
    })
    public ResponseEntity<ReservationResponse> consulterReservation(@PathVariable Integer id) {
        ReservationResponse response = reservationService.consulterReservation(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/annuler")
    @Operation(summary = "Annuler une réservation", description = "Annule une réservation si elle est EN_ATTENTE ou DISPONIBLE")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réservation annulée avec succès"),
            @ApiResponse(responseCode = "404", description = "Réservation introuvable"),
            @ApiResponse(responseCode = "409", description = "Règle de gestion violée")
    })
    public ResponseEntity<ReservationResponse> annulerReservation(
            @PathVariable Integer id,
            @RequestParam Integer userId) {
        ReservationResponse response = reservationService.annulerReservation(id, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une réservation", description = "Supprime définitivement une réservation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Réservation supprimée avec succès"),
            @ApiResponse(responseCode = "404", description = "Réservation introuvable")
    })
    public ResponseEntity<Void> supprimerReservation(@PathVariable Integer id) {
        reservationService.supprimerReservation(id);
        return ResponseEntity.noContent().build();
    }
}
