import { Reservation, ReservationRequest } from './reservation';

describe('Reservation', () => {
  it('should create an instance', () => {
    const reservation = new Reservation();
    expect(reservation).toBeTruthy();
  });

  it('should have expected properties', () => {
    const reservation = new Reservation();
    expect(reservation.reservationId).toBeUndefined();
    expect(reservation.livreId).toBeUndefined();
    expect(reservation.livreNom).toBeUndefined();
    expect(reservation.adherentId).toBeUndefined();
    expect(reservation.adherentNom).toBeUndefined();
    expect(reservation.dateReservation).toBeUndefined();
    expect(reservation.dateExpiration).toBeUndefined();
    expect(reservation.statut).toBeUndefined();
  });

  it('should allow setting all properties', () => {
    const reservation = new Reservation();
    reservation.reservationId = 1;
    reservation.livreId = 10;
    reservation.livreNom = 'Le Petit Prince';
    reservation.adherentId = 11;
    reservation.adherentNom = 'Marie Dupont';
    reservation.dateReservation = new Date();
    reservation.dateExpiration = new Date();
    reservation.statut = 'EN_ATTENTE';

    expect(reservation.reservationId).toBe(1);
    expect(reservation.livreId).toBe(10);
    expect(reservation.livreNom).toBe('Le Petit Prince');
    expect(reservation.adherentId).toBe(11);
    expect(reservation.adherentNom).toBe('Marie Dupont');
    expect(reservation.statut).toBe('EN_ATTENTE');
  });
});

describe('ReservationRequest', () => {
  it('should create an instance', () => {
    const request = new ReservationRequest();
    expect(request).toBeTruthy();
  });

  it('should have expected properties', () => {
    const request = new ReservationRequest();
    expect(request.livreId).toBeNull();
    expect(request.adherentId).toBeNull();
  });

  it('should allow setting properties', () => {
    const request = new ReservationRequest();
    request.livreId = 10;
    request.adherentId = 11;

    expect(request.livreId).toBe(10);
    expect(request.adherentId).toBe(11);
  });
});
