export class Reservation {
    reservationId: number;
    livreId: number;
    livreNom: string;
    adherentId: number;
    adherentNom: string;
    dateReservation: Date | string;
    dateExpiration: Date | string;
    statut: string;
}

export class ReservationRequest {
    livreId: number | null = null;
    adherentId: number | null = null;
}
