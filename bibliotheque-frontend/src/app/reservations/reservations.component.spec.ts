import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ReservationsComponent } from './reservations.component';
import { ReservationService } from '../_service/reservation.service';
import { BooksService } from '../_service/books.service';
import { UsersService } from '../_service/users.service';
import { ToastService } from '../_ui/toast/toast.service';
import { ConfirmService } from '../_ui/confirm-dialog/confirm.service';
import { Reservation } from '../_model/reservation';
import { Books } from '../_model/books';
import { Users } from '../_model/users';

describe('ReservationsComponent', () => {
  let component: ReservationsComponent;
  let fixture: ComponentFixture<ReservationsComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;
  let booksServiceSpy: jasmine.SpyObj<BooksService>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;

  /**
   * Données neuves à chaque test : le composant écrit `reservation.statut` lors
   * d'une annulation, une constante partagée serait donc polluée d'un test à
   * l'autre.
   */
  function buildReservations(): Reservation[] {
    return [
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
  }

  let mockReservations: Reservation[];

  const mockBooks: Books[] = [
    { bookId: 10, bookName: 'L1', bookAuthor: 'Auteur', bookGenre: 'Test', noOfCopies: 0 }
  ];

  const mockUsers: Users[] = [
    { userId: 11, username: 'a1', name: 'Adhérent A1', password: '', role: [] }
  ];

  beforeEach(async () => {
    mockReservations = buildReservations();

    reservationServiceSpy = jasmine.createSpyObj('ReservationService', [
      'getReservations', 'createReservation', 'annulerReservation', 'supprimerReservation'
    ]);
    booksServiceSpy = jasmine.createSpyObj('BooksService', ['getBooksList']);
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['getUsersList', 'roleMatch']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'showText']);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['ask']);

    reservationServiceSpy.getReservations.and.returnValue(of(mockReservations));
    booksServiceSpy.getBooksList.and.returnValue(of(mockBooks));
    usersServiceSpy.getUsersList.and.returnValue(of(mockUsers));
    // Par défaut les tests se placent dans le cas du BIBLIOTHECAIRE ;
    // les tests dédiés à l'ADHERENT renvoient false explicitement.
    usersServiceSpy.roleMatch.and.returnValue(true);
    confirmServiceSpy.ask.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [FormsModule, TranslateModule.forRoot(), RouterTestingModule],
      declarations: [ReservationsComponent],
      providers: [
        { provide: ReservationService, useValue: reservationServiceSpy },
        { provide: BooksService, useValue: booksServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Chargement ----------------------------------------------------------

  it('should load reservations, books and users on init', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.reservations.length).toBe(2);
    expect(component.books.length).toBe(1);
    expect(component.users.length).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('');
  }));

  it('should not request the members list when the user is not a BIBLIOTHECAIRE', fakeAsync(() => {
    usersServiceSpy.roleMatch.and.returnValue(false);

    component.ngOnInit();
    tick();

    // /admin/users est réservé aux administrateurs : l'appeler renverrait un 403.
    expect(usersServiceSpy.getUsersList).not.toHaveBeenCalled();
    expect(component.users).toEqual([]);
    expect(component.reservations.length).toBe(2);
    expect(component.errorMessage).toBe('');
  }));

  it('should show a skeleton placeholder while loading', () => {
    spyOn(component, 'loadData');
    component.loading = true;
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('.ds-skeleton');
    expect(skeleton).toBeTruthy();
  });

  // --- Erreurs -------------------------------------------------------------

  it('should expose a translation key when the API fails', fakeAsync(() => {
    reservationServiceSpy.getReservations.and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Erreur serveur' } }))
    );

    component.ngOnInit();
    tick();

    expect(component.errorMessage).toBe('errors.server');
    expect(component.loading).toBeFalse();
  }));

  it('should expose the network error key when the server is unreachable', fakeAsync(() => {
    reservationServiceSpy.getReservations.and.returnValue(throwError(() => ({ status: 0 })));

    component.ngOnInit();
    tick();

    expect(component.errorMessage).toBe('errors.network');
  }));

  it('should show a retry button on error', fakeAsync(() => {
    reservationServiceSpy.getReservations.and.returnValue(
      throwError(() => ({ status: 500, error: {} }))
    );

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    const retryBtn = fixture.nativeElement.querySelector('.load-error .ds-btn');
    expect(retryBtn).toBeTruthy();
  }));

  // --- Filtre --------------------------------------------------------------

  it('should filter by statut', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.onFilterChange('EN_ATTENTE');
    tick();

    expect(reservationServiceSpy.getReservations).toHaveBeenCalledWith('EN_ATTENTE');
  }));

  it('should clear the statut filter when "all" is selected', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.onFilterChange('');
    tick();

    expect(reservationServiceSpy.getReservations).toHaveBeenCalledWith(undefined);
  }));

  // --- Création ------------------------------------------------------------

  it('should create a reservation and raise a success toast', fakeAsync(() => {
    reservationServiceSpy.createReservation.and.returnValue(of(mockReservations[0]));

    component.ngOnInit();
    tick();

    component.newReservation.livreId = 10;
    component.newReservation.adherentId = 11;
    component.onCreateReservation();
    tick();

    expect(reservationServiceSpy.createReservation).toHaveBeenCalled();
    expect(toastServiceSpy.success).toHaveBeenCalledWith('reservations.created');
    expect(component.newReservation.livreId).toBeNull();
  }));

  it('should surface the business message returned on a 409 conflict', fakeAsync(() => {
    reservationServiceSpy.createReservation.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'RG-01 : livre disponible' } }))
    );

    component.newReservation.livreId = 10;
    component.onCreateReservation();
    tick();

    // Les règles RG-01..RG-06 sont rédigées par le serveur : on les affiche telles quelles.
    expect(toastServiceSpy.showText).toHaveBeenCalledWith('error', 'RG-01 : livre disponible');
  }));

  it('should fall back to a translated message when the server gives none', fakeAsync(() => {
    reservationServiceSpy.createReservation.and.returnValue(
      throwError(() => ({ status: 403, error: null }))
    );

    component.newReservation.livreId = 10;
    component.onCreateReservation();
    tick();

    expect(toastServiceSpy.error).toHaveBeenCalledWith('errors.forbidden', { status: 403 });
  }));

  // --- Annulation ----------------------------------------------------------

  it('should ask for confirmation before cancelling', fakeAsync(() => {
    reservationServiceSpy.annulerReservation.and.returnValue(of(mockReservations[0]));

    component.onAnnulerReservation(mockReservations[0]);
    tick();

    expect(confirmServiceSpy.ask).toHaveBeenCalled();
  }));

  it('should cancel a reservation without sending any identifier', fakeAsync(() => {
    reservationServiceSpy.annulerReservation.and.returnValue(of(mockReservations[0]));

    component.onAnnulerReservation(mockReservations[0]);
    tick();

    // RS-04 : l'identité vient du token, aucun userId ne transite.
    expect(reservationServiceSpy.annulerReservation).toHaveBeenCalledWith(1);
    expect(toastServiceSpy.success).toHaveBeenCalledWith('reservations.cancelled');
  }));

  it('should do nothing when the confirmation is declined', fakeAsync(() => {
    confirmServiceSpy.ask.and.returnValue(Promise.resolve(false));

    component.onAnnulerReservation(mockReservations[0]);
    tick();

    expect(reservationServiceSpy.annulerReservation).not.toHaveBeenCalled();
  }));

  it('should surface the business message when cancelling is refused', fakeAsync(() => {
    reservationServiceSpy.annulerReservation.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'RG-06 : ne peut plus changer' } }))
    );

    component.onAnnulerReservation(mockReservations[0]);
    tick();

    expect(toastServiceSpy.showText).toHaveBeenCalledWith('error', 'RG-06 : ne peut plus changer');
  }));

  // --- Suppression (bibliothécaire / admin) --------------------------------

  it('should ask for confirmation before deleting a reservation', fakeAsync(() => {
    reservationServiceSpy.supprimerReservation.and.returnValue(of(undefined));

    component.onSupprimerReservation(mockReservations[0]);
    tick();

    expect(confirmServiceSpy.ask).toHaveBeenCalled();
  }));

  it('should delete a reservation and reload the list', fakeAsync(() => {
    reservationServiceSpy.supprimerReservation.and.returnValue(of(undefined));
    spyOn(component, 'loadData');

    component.onSupprimerReservation(mockReservations[0]);
    tick();

    expect(reservationServiceSpy.supprimerReservation).toHaveBeenCalledWith(1);
    expect(toastServiceSpy.success).toHaveBeenCalledWith('reservations.deleted');
    expect(component.loadData).toHaveBeenCalled();
  }));

  it('should do nothing when the deletion confirmation is declined', fakeAsync(() => {
    confirmServiceSpy.ask.and.returnValue(Promise.resolve(false));

    component.onSupprimerReservation(mockReservations[0]);
    tick();

    expect(reservationServiceSpy.supprimerReservation).not.toHaveBeenCalled();
  }));

  // --- Navigation vers la fiche détaillée ----------------------------------

  it('should open the details screen by reservation id', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    component.onVoirReservation(mockReservations[0]);

    expect(router.navigate).toHaveBeenCalledWith(['/reservation-details', 1]);
  });

  it('should surface the business message when deletion is refused', fakeAsync(() => {
    reservationServiceSpy.supprimerReservation.and.returnValue(
      throwError(() => ({ status: 403, error: { message: 'Action réservée au BIBLIOTHECAIRE' } }))
    );

    component.onSupprimerReservation(mockReservations[0]);
    tick();

    expect(toastServiceSpy.showText).toHaveBeenCalledWith('error', 'Action réservée au BIBLIOTHECAIRE');
  }));

  // --- Validation du formulaire -------------------------------------------

  it('should compute isFormValid correctly for a BIBLIOTHECAIRE', () => {
    component.estBibliothecaire = true;
    component.newReservation = { livreId: null, adherentId: null } as any;
    expect(component.isFormValid).toBeFalse();

    component.newReservation.livreId = 10;
    expect(component.isFormValid).toBeFalse();

    component.newReservation.adherentId = 11;
    expect(component.isFormValid).toBeTrue();
  });

  it('should only require a book for an ADHERENT (identity comes from the token)', () => {
    component.estBibliothecaire = false;
    component.newReservation = { livreId: null, adherentId: null } as any;
    expect(component.isFormValid).toBeFalse();

    component.newReservation.livreId = 10;
    expect(component.isFormValid).toBeTrue();
  });

  // --- Statistiques --------------------------------------------------------

  it('should build a seven-day series', () => {
    component.reservations = mockReservations;
    component.calculerStatistiques();

    expect(component.reservationsParJour.length).toBe(7);
  });

  it('should count a reservation on the day it was created', () => {
    const aujourdhui = new Date();
    const jj = String(aujourdhui.getDate()).padStart(2, '0');
    const mm = String(aujourdhui.getMonth() + 1).padStart(2, '0');
    const aaaa = aujourdhui.getFullYear();

    // Le serveur sérialise les dates en `dd-MM-yyyy`, que `new Date()` ne sait pas lire.
    component.reservations = [{ ...mockReservations[0], dateReservation: `${jj}-${mm}-${aaaa}` }];
    component.calculerStatistiques();

    const dernierJour = component.reservationsParJour[component.reservationsParJour.length - 1];
    expect(dernierJour.value).toBe(1);
  });

  it('should ignore a malformed date rather than throwing', () => {
    component.reservations = [{ ...mockReservations[0], dateReservation: 'pas-une-date' }];

    expect(() => component.calculerStatistiques()).not.toThrow();
    expect(component.reservationsParJour.every(j => j.value === 0)).toBeTrue();
  });

  it('should measure the fulfilment rate on finished reservations only', () => {
    // Rapporter les honorées au total ferait chuter le taux à chaque création,
    // ce qui ne mesurerait rien.
    component.reservations = [
      { ...mockReservations[0], statut: 'HONOREE' },
      { ...mockReservations[0], statut: 'ANNULEE' },
      { ...mockReservations[0], statut: 'EN_ATTENTE' }
    ];
    component.calculerStatistiques();

    expect(component.honorees).toBe(1);
    expect(component.terminees).toBe(2);
  });

  // --- Compteurs -----------------------------------------------------------

  it('should count reservations by statut', () => {
    component.reservations = mockReservations;

    expect(component.getCountByStatut('EN_ATTENTE')).toBe(1);
    expect(component.getCountByStatut('ANNULEE')).toBe(1);
    expect(component.getCountByStatut('HONOREE')).toBe(0);
  });
});
