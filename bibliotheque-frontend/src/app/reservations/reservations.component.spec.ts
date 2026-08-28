import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReservationsComponent } from './reservations.component';
import { ReservationService } from '../_service/reservation.service';
import { BooksService } from '../_service/books.service';
import { UsersService } from '../_service/users.service';
import { Reservation } from '../_model/reservation';
import { Books } from '../_model/books';
import { Users } from '../_model/users';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ReservationsComponent', () => {
  let component: ReservationsComponent;
  let fixture: ComponentFixture<ReservationsComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;
  let booksServiceSpy: jasmine.SpyObj<BooksService>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

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
      statut: 'ANNULEE'
    }
  ];

  const mockBooks: Books[] = [
    { bookId: 10, bookName: 'L1', bookAuthor: 'Auteur', bookGenre: 'Test', noOfCopies: 0 }
  ];

  const mockUsers: Users[] = [
    { userId: 11, username: 'a1', name: 'Adhérent A1', password: '', role: [] }
  ];

  beforeEach(async () => {
    reservationServiceSpy = jasmine.createSpyObj('ReservationService', [
      'getReservations', 'createReservation', 'annulerReservation'
    ]);
    booksServiceSpy = jasmine.createSpyObj('BooksService', ['getBooksList']);
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['getUsersList']);

    reservationServiceSpy.getReservations.and.returnValue(of(mockReservations));
    booksServiceSpy.getBooksList.and.returnValue(of(mockBooks));
    usersServiceSpy.getUsersList.and.returnValue(of(mockUsers));

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [ReservationsComponent],
      providers: [
        { provide: ReservationService, useValue: reservationServiceSpy },
        { provide: BooksService, useValue: booksServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load reservations, books and users on init', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.reservations.length).toBe(2);
    expect(component.books.length).toBe(1);
    expect(component.users.length).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('');
  }));

  it('should display spinner when loading is true', () => {
    // Spy on loadData to prevent it from overriding loading state
    spyOn(component, 'loadData');
    component.loading = true;
    component.reservations = [];
    component.errorMessage = '';
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.spinner-border');
    expect(spinner).toBeTruthy();

    const loadingText = fixture.nativeElement.querySelector('.text-muted');
    expect(loadingText.textContent).toContain('Chargement');
  });

  it('should display error message when API fails', fakeAsync(() => {
    reservationServiceSpy.getReservations.and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Erreur serveur' } }))
    );
    booksServiceSpy.getBooksList.and.returnValue(of(mockBooks));
    usersServiceSpy.getUsersList.and.returnValue(of(mockUsers));

    component.ngOnInit();
    tick();

    expect(component.errorMessage).toContain('Erreur serveur');
    expect(component.loading).toBeFalse();
  }));

  it('should display server unreachable message on network error', fakeAsync(() => {
    reservationServiceSpy.getReservations.and.returnValue(
      throwError(() => ({ status: 0 }))
    );
    booksServiceSpy.getBooksList.and.returnValue(of([]));
    usersServiceSpy.getUsersList.and.returnValue(of([]));

    component.ngOnInit();
    tick();

    expect(component.errorMessage).toContain('Le serveur est injoignable');
  }));

  it('should filter by statut', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.onFilterChange('EN_ATTENTE');
    tick();

    expect(reservationServiceSpy.getReservations).toHaveBeenCalledWith('EN_ATTENTE');
  }));

  it('should clear statut filter when "all" selected', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.onFilterChange('');
    tick();

    expect(reservationServiceSpy.getReservations).toHaveBeenCalledWith(undefined);
  }));

  it('should show retry button on error', fakeAsync(() => {
    reservationServiceSpy.getReservations.and.returnValue(
      throwError(() => ({ status: 500, error: {} }))
    );
    booksServiceSpy.getBooksList.and.returnValue(of([]));
    usersServiceSpy.getUsersList.and.returnValue(of([]));

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    const retryBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.textContent).toContain('Réessayer');
  }));

  it('should call createReservation on form submit', fakeAsync(() => {
    const newRes: Reservation = {
      reservationId: 3,
      livreId: 10,
      livreNom: 'L1',
      adherentId: 11,
      adherentNom: 'A1',
      dateReservation: '28-08-2026',
      dateExpiration: '04-09-2026',
      statut: 'EN_ATTENTE'
    };
    reservationServiceSpy.createReservation.and.returnValue(of(newRes));
    reservationServiceSpy.getReservations.and.returnValue(of(mockReservations));
    booksServiceSpy.getBooksList.and.returnValue(of(mockBooks));
    usersServiceSpy.getUsersList.and.returnValue(of(mockUsers));

    component.ngOnInit();
    tick();

    component.newReservation.livreId = 10;
    component.newReservation.adherentId = 11;
    component.onCreateReservation();
    tick();

    expect(reservationServiceSpy.createReservation).toHaveBeenCalled();
    expect(component.formSuccess).toContain('succès');
    expect(component.newReservation.livreId).toBeNull();

    // Vider le setTimeout pour éviter "timer still in queue"
    tick(5000);
  }));

  it('should show form error on 409 conflict', fakeAsync(() => {
    reservationServiceSpy.createReservation.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'RG-01 : livre disponible' }
      }))
    );

    component.newReservation.livreId = 10;
    component.newReservation.adherentId = 11;
    component.onCreateReservation();
    tick();

    expect(component.formError).toContain('RG-01');
  }));

  it('should show form error on 404 not found', fakeAsync(() => {
    reservationServiceSpy.createReservation.and.returnValue(
      throwError(() => ({
        status: 404,
        error: { message: 'Livre introuvable' }
      }))
    );

    component.newReservation.livreId = 999;
    component.newReservation.adherentId = 11;
    component.onCreateReservation();
    tick();

    expect(component.formError).toContain('Livre introuvable');
  }));

  it('should show form error on 400 bad request', fakeAsync(() => {
    reservationServiceSpy.createReservation.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { message: 'Champ manquant' }
      }))
    );

    component.newReservation.livreId = 10;
    component.newReservation.adherentId = 11;
    component.onCreateReservation();
    tick();

    expect(component.formError).toContain('Champ manquant');
  }));

  it('should update reservation statut after cancel', fakeAsync(() => {
    const updatedRes = { ...mockReservations[0], statut: 'ANNULEE' };
    reservationServiceSpy.annulerReservation.and.returnValue(of(updatedRes));
    reservationServiceSpy.getReservations.and.returnValue(of(mockReservations));
    booksServiceSpy.getBooksList.and.returnValue(of(mockBooks));
    usersServiceSpy.getUsersList.and.returnValue(of(mockUsers));

    component.ngOnInit();
    tick();

    component.onAnnulerReservation(component.reservations[0]);
    tick();

    expect(component.reservations[0].statut).toBe('ANNULEE');
    expect(component.formSuccess).toContain('annulée');

    // Vider le setTimeout pour éviter "timer still in queue"
    tick(5000);
  }));

  it('should show cancel error message on 409 conflict', fakeAsync(() => {
    reservationServiceSpy.annulerReservation.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'RG-06 : ne peut plus changer' }
      }))
    );

    const reservation = { ...mockReservations[0] };
    component.onAnnulerReservation(reservation);
    tick();

    expect(component.cancelError).toContain('RG-06');
  }));

  it('should show cancel error message on network error', fakeAsync(() => {
    reservationServiceSpy.annulerReservation.and.returnValue(
      throwError(() => ({ status: 0 }))
    );

    component.onAnnulerReservation(mockReservations[0]);
    tick();

    expect(component.cancelError).toContain('injoignable');
  }));

  it('should compute isFormValid correctly', () => {
    component.newReservation = { livreId: null, adherentId: null } as any;
    expect(component.isFormValid).toBeFalse();

    component.newReservation.livreId = 10;
    expect(component.isFormValid).toBeFalse();

    component.newReservation.adherentId = 11;
    expect(component.isFormValid).toBeTrue();
  });
});
