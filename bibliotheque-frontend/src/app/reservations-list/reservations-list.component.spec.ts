import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReservationsListComponent } from './reservations-list.component';
import { Reservation } from '../_model/reservation';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ReservationsListComponent', () => {
  let component: ReservationsListComponent;
  let fixture: ComponentFixture<ReservationsListComponent>;

  const mockReservations: Reservation[] = [
    {
      reservationId: 1,
      livreId: 10,
      livreNom: 'L1 - Livre disponible',
      adherentId: 11,
      adherentNom: 'Adhérent principal (A1)',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut: 'EN_ATTENTE'
    },
    {
      reservationId: 2,
      livreId: 11,
      livreNom: 'L2 - Livre emprunté 1',
      adherentId: 13,
      adherentNom: 'Emprunteur (A3)',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut: 'DISPONIBLE'
    },
    {
      reservationId: 3,
      livreId: 12,
      livreNom: 'L3 - Livre emprunté 2',
      adherentId: 13,
      adherentNom: 'Emprunteur (A3)',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut: 'ANNULEE'
    },
    {
      reservationId: 4,
      livreId: 13,
      livreNom: 'L4 - Livre emprunté 3',
      adherentId: 13,
      adherentNom: 'Emprunteur (A3)',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut: 'EXPIREE'
    },
    {
      reservationId: 5,
      livreId: 14,
      livreNom: 'L5 - Livre emprunté 4',
      adherentId: 13,
      adherentNom: 'Emprunteur (A3)',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut: 'HONOREE'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReservationsListComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty message when no reservations', () => {
    component.reservations = [];
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.alert-info');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Aucune réservation');
  });

  it('should not display table when reservations is empty', () => {
    component.reservations = [];
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table');
    expect(table).toBeNull();
  });

  it('should display table when reservations exist', () => {
    component.reservations = mockReservations;
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table');
    expect(table).toBeTruthy();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });

  it('should display reservation data in table rows', () => {
    component.reservations = mockReservations;
    fixture.detectChanges();

    const firstRow = fixture.nativeElement.querySelector('tbody tr');
    expect(firstRow.textContent).toContain('L1 - Livre disponible');
    expect(firstRow.textContent).toContain('Adhérent principal (A1)');
    expect(firstRow.textContent).toContain('EN_ATTENTE');
  });

  it('should show cancel button only for EN_ATTENTE and DISPONIBLE', () => {
    component.reservations = mockReservations;
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    // EN_ATTENTE: has cancel button
    expect(rows[0].querySelector('button')).toBeTruthy();
    // DISPONIBLE: has cancel button
    expect(rows[1].querySelector('button')).toBeTruthy();
    // ANNULEE: no cancel button
    expect(rows[2].querySelector('button')).toBeNull();
    // EXPIREE: no cancel button
    expect(rows[3].querySelector('button')).toBeNull();
    // HONOREE: no cancel button
    expect(rows[4].querySelector('button')).toBeNull();
  });

  it('should return true for canCancel with EN_ATTENTE', () => {
    expect(component.canCancel('EN_ATTENTE')).toBeTrue();
  });

  it('should return true for canCancel with DISPONIBLE', () => {
    expect(component.canCancel('DISPONIBLE')).toBeTrue();
  });

  it('should return false for canCancel with ANNULEE', () => {
    expect(component.canCancel('ANNULEE')).toBeFalse();
  });

  it('should return false for canCancel with EXPIREE', () => {
    expect(component.canCancel('EXPIREE')).toBeFalse();
  });

  it('should return false for canCancel with HONOREE', () => {
    expect(component.canCancel('HONOREE')).toBeFalse();
  });

  it('should return correct badge class for EN_ATTENTE', () => {
    expect(component.getStatutClass('EN_ATTENTE')).toContain('bg-warning');
  });

  it('should return correct badge class for DISPONIBLE', () => {
    expect(component.getStatutClass('DISPONIBLE')).toContain('bg-success');
  });

  it('should return correct badge class for ANNULEE', () => {
    expect(component.getStatutClass('ANNULEE')).toContain('bg-secondary');
  });

  it('should return correct badge class for EXPIREE', () => {
    expect(component.getStatutClass('EXPIREE')).toContain('bg-danger');
  });

  it('should return correct badge class for HONOREE', () => {
    expect(component.getStatutClass('HONOREE')).toContain('bg-info');
  });

  it('should emit annuler event on confirmAnnuler', () => {
    spyOn(component.annuler, 'emit');
    spyOn(window, 'confirm').and.returnValue(true);

    component.confirmAnnuler(mockReservations[0]);

    expect(component.annuler.emit).toHaveBeenCalledWith(mockReservations[0]);
  });

  it('should not emit annuler event when user cancels confirmation', () => {
    spyOn(component.annuler, 'emit');
    spyOn(window, 'confirm').and.returnValue(false);

    component.confirmAnnuler(mockReservations[0]);

    expect(component.annuler.emit).not.toHaveBeenCalled();
  });

  it('should display all 6 columns in header', () => {
    component.reservations = mockReservations;
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('thead th');
    expect(headers.length).toBe(6);
    expect(headers[0].textContent).toContain('Livre');
    expect(headers[1].textContent).toContain('Adhérent');
    expect(headers[2].textContent).toContain('Statut');
    expect(headers[3].textContent).toContain('Date de réservation');
    expect(headers[4].textContent).toContain("Date d'expiration");
    expect(headers[5].textContent).toContain('Action');
  });

  it('should display statut badge with correct text', () => {
    component.reservations = mockReservations;
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('.badge');
    expect(badges.length).toBe(5);
    expect(badges[0].textContent.trim()).toBe('EN_ATTENTE');
    expect(badges[1].textContent.trim()).toBe('DISPONIBLE');
    expect(badges[2].textContent.trim()).toBe('ANNULEE');
  });
});
