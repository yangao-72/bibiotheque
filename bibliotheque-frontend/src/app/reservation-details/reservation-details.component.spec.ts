import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ReservationDetailsComponent } from './reservation-details.component';
import { ReservationService } from '../_service/reservation.service';
import { UsersService } from '../_service/users.service';
import { ToastService } from '../_ui/toast/toast.service';
import { ConfirmService } from '../_ui/confirm-dialog/confirm.service';
import { Reservation } from '../_model/reservation';

describe('ReservationDetailsComponent', () => {
  let component: ReservationDetailsComponent;
  let fixture: ComponentFixture<ReservationDetailsComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;
  let router: Router;

  /** Données neuves : le composant remplace la réservation après une annulation. */
  function buildReservation(statut = 'EN_ATTENTE'): Reservation {
    return {
      reservationId: 7,
      livreId: 3,
      livreNom: 'Dune',
      adherentId: 11,
      adherentNom: 'Adhérent A1',
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut
    };
  }

  beforeEach(async () => {
    reservationServiceSpy = jasmine.createSpyObj('ReservationService', [
      'getReservationById', 'annulerReservation', 'supprimerReservation'
    ]);
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['roleMatch']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'showText']);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['ask']);

    reservationServiceSpy.getReservationById.and.returnValue(of(buildReservation()));
    reservationServiceSpy.annulerReservation.and.returnValue(of(buildReservation('ANNULEE')));
    reservationServiceSpy.supprimerReservation.and.returnValue(of(undefined));
    usersServiceSpy.roleMatch.and.returnValue(true);
    confirmServiceSpy.ask.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      declarations: [ReservationDetailsComponent],
      providers: [
        { provide: ReservationService, useValue: reservationServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { reservationId: 7 } } } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationDetailsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should read the id from the route and load the reservation', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.reservationId).toBe(7);
    expect(reservationServiceSpy.getReservationById).toHaveBeenCalledWith(7);
    expect(component.reservation).toEqual(buildReservation());
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('');
  }));

  it('should expose a translation key when the reservation is unknown', fakeAsync(() => {
    reservationServiceSpy.getReservationById.and.returnValue(
      throwError(() => ({ status: 404, error: {} }))
    );

    component.ngOnInit();
    tick();

    expect(component.errorMessage).toBe('errors.notFound');
    expect(component.reservation).toBeNull();
  }));

  // --- Rôles ---------------------------------------------------------------

  it('should tell a librarian from a member', fakeAsync(() => {
    usersServiceSpy.roleMatch.and.returnValue(false);
    component.ngOnInit();
    tick();

    expect(usersServiceSpy.roleMatch).toHaveBeenCalledWith(['BIBLIOTHECAIRE']);
    expect(component.estBibliothecaire).toBeFalse();
  }));

  // --- Annulation ----------------------------------------------------------

  it('should only allow cancelling an active reservation', fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(component.canCancel).toBeTrue();

    component.reservation = buildReservation('ANNULEE');
    expect(component.canCancel).toBeFalse();
  }));

  it('should ask for confirmation before cancelling', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.onAnnuler();
    tick();

    expect(confirmServiceSpy.ask).toHaveBeenCalled();
    expect(reservationServiceSpy.annulerReservation).toHaveBeenCalledWith(7);
    expect(toastServiceSpy.success).toHaveBeenCalledWith('reservations.cancelled');
  }));

  it('should do nothing when the cancellation is declined', fakeAsync(() => {
    confirmServiceSpy.ask.and.returnValue(Promise.resolve(false));
    component.ngOnInit();
    tick();

    component.onAnnuler();
    tick();

    expect(reservationServiceSpy.annulerReservation).not.toHaveBeenCalled();
  }));

  // --- Suppression ---------------------------------------------------------

  it('should delete the reservation and go back to the list', fakeAsync(() => {
    spyOn(router, 'navigate');
    component.ngOnInit();
    tick();

    component.onSupprimer();
    tick();

    expect(reservationServiceSpy.supprimerReservation).toHaveBeenCalledWith(7);
    expect(toastServiceSpy.success).toHaveBeenCalledWith('reservations.deleted');
    expect(router.navigate).toHaveBeenCalledWith(['/reservations']);
  }));

  it('should surface the business message when deletion is refused', fakeAsync(() => {
    reservationServiceSpy.supprimerReservation.and.returnValue(
      throwError(() => ({ status: 403, error: { message: 'Action réservée au BIBLIOTHECAIRE' } }))
    );
    component.ngOnInit();
    tick();

    component.onSupprimer();
    tick();

    expect(toastServiceSpy.showText).toHaveBeenCalledWith('error', 'Action réservée au BIBLIOTHECAIRE');
  }));
});
