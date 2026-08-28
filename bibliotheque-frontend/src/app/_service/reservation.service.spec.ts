import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReservationService } from './reservation.service';
import { Reservation, ReservationRequest } from '../_model/reservation';
import { environment } from '../../environments/environment';

describe('ReservationService', () => {
  let service: ReservationService;
  let httpMock: HttpTestingController;
  const baseURL = `${environment.apiUrl}/api/reservations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReservationService]
    });
    service = TestBed.inject(ReservationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get reservations list', () => {
    const mockData: Reservation[] = [
      {
        reservationId: 1,
        livreId: 10,
        livreNom: 'L1',
        adherentId: 11,
        adherentNom: 'A1',
        dateReservation: '21-08-2026',
        dateExpiration: '28-08-2026',
        statut: 'EN_ATTENTE'
      }
    ];

    service.getReservations().subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].reservationId).toBe(1);
    });

    const req = httpMock.expectOne(baseURL);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should get reservations with statut filter', () => {
    service.getReservations('EN_ATTENTE').subscribe();

    const req = httpMock.expectOne(r => r.url === baseURL);
    expect(req.request.params.get('statut')).toBe('EN_ATTENTE');
    req.flush([]);
  });

  it('should not send statut param when undefined', () => {
    service.getReservations(undefined).subscribe();

    const req = httpMock.expectOne(r => r.url === baseURL);
    expect(req.request.params.has('statut')).toBeFalse();
    req.flush([]);
  });

  it('should get reservation by id', () => {
    const mockRes: Reservation = {
      reservationId: 1,
      livreId: 10,
      livreNom: 'L1',
      adherentId: 11,
      adherentNom: 'A1',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut: 'EN_ATTENTE'
    };

    service.getReservationById(1).subscribe(data => {
      expect(data.reservationId).toBe(1);
      expect(data.livreNom).toBe('L1');
    });

    const req = httpMock.expectOne(`${baseURL}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should create reservation', () => {
    const request: ReservationRequest = { livreId: 10, adherentId: 11 };
    const mockResponse: Reservation = {
      reservationId: 1,
      livreId: 10,
      livreNom: 'L1',
      adherentId: 11,
      adherentNom: 'A1',
      dateReservation: '28-08-2026',
      dateExpiration: '04-09-2026',
      statut: 'EN_ATTENTE'
    };

    service.createReservation(request).subscribe(data => {
      expect(data.reservationId).toBe(1);
      expect(data.statut).toBe('EN_ATTENTE');
    });

    const req = httpMock.expectOne(baseURL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should cancel reservation with userId param', () => {
    const mockResponse: Reservation = {
      reservationId: 1,
      livreId: 10,
      livreNom: 'L1',
      adherentId: 11,
      adherentNom: 'A1',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut: 'ANNULEE'
    };

    service.annulerReservation(1, 11).subscribe(data => {
      expect(data.statut).toBe('ANNULEE');
    });

    const req = httpMock.expectOne(r =>
      r.url === `${baseURL}/1/annuler` &&
      r.params.get('userId') === '11'
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush(mockResponse);
  });

  it('should delete reservation', () => {
    service.supprimerReservation(1).subscribe();

    const req = httpMock.expectOne(`${baseURL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
