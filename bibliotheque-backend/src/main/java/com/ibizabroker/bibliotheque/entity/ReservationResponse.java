package com.ibizabroker.bibliotheque.entity;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.Data;

import java.util.Date;

@Data
public class ReservationResponse {

    private Integer reservationId;
    private Integer livreId;
    private String livreNom;
    private Integer adherentId;
    private String adherentNom;

    @JsonSerialize(using = JsonDataSerializer.class)
    private Date dateReservation;

    @JsonSerialize(using = JsonDataSerializer.class)
    private Date dateExpiration;

    private ReservationStatus statut;

    public ReservationResponse(Reservation reservation) {
        this.reservationId = reservation.getReservationId();
        this.livreId = reservation.getLivre().getBookId();
        this.livreNom = reservation.getLivre().getBookName();
        this.adherentId = reservation.getAdherent().getUserId();
        this.adherentNom = reservation.getAdherent().getName();
        this.dateReservation = reservation.getDateReservation();
        this.dateExpiration = reservation.getDateExpiration();
        this.statut = reservation.getStatut();
    }
}
