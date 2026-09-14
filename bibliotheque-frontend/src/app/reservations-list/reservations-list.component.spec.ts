import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ReservationsListComponent } from './reservations-list.component';
import { Reservation } from '../_model/reservation';

describe('ReservationsListComponent', () => {
  let component: ReservationsListComponent;
  let fixture: ComponentFixture<ReservationsListComponent>;

  function reservation(id: number, livre: string, adherent: string, statut: string): Reservation {
    return {
      reservationId: id,
      livreId: id + 9,
      livreNom: livre,
      adherentId: 11,
      adherentNom: adherent,
      dateReservation: '21-08-2026',
      dateExpiration: '28-08-2026',
      statut
    };
  }

  const mockReservations: Reservation[] = [
    reservation(1, 'L1 - Livre disponible', 'Adhérent principal (A1)', 'EN_ATTENTE'),
    reservation(2, 'L2 - Livre emprunté 1', 'Emprunteur (A3)', 'DISPONIBLE'),
    reservation(3, 'L3 - Livre emprunté 2', 'Emprunteur (A3)', 'ANNULEE'),
    reservation(4, 'L4 - Livre emprunté 3', 'Emprunteur (A3)', 'EXPIREE'),
    reservation(5, 'L5 - Livre emprunté 4', 'Emprunteur (A3)', 'HONOREE')
  ];

  /** Alimente le composant comme le ferait une liaison @Input, puis rend le DOM. */
  function load(reservations: Reservation[], role = 'BIBLIOTHECAIRE'): void {
    component.reservations = reservations;
    component.currentUserRole = role;
    component.ngOnChanges();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, TranslateModule.forRoot()],
      declarations: [ReservationsListComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Rendu ---------------------------------------------------------------

  it('should show the empty state when there is no reservation', () => {
    load([]);

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('should render one row per reservation', () => {
    load(mockReservations);

    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('should display the book and the member of a reservation', () => {
    load(mockReservations);

    const firstRow = fixture.nativeElement.querySelector('tbody tr');
    expect(firstRow.textContent).toContain('L1 - Livre disponible');
    expect(firstRow.textContent).toContain('Adhérent principal (A1)');
  });

  it('should hide the member column for an ADHERENT', () => {
    // Un adhérent ne voit que ses propres réservations : la colonne est redondante.
    load(mockReservations, 'ADHERENT');

    const firstRow = fixture.nativeElement.querySelector('tbody tr');
    expect(firstRow.textContent).not.toContain('Adhérent principal (A1)');
  });

  // --- Action d'annulation -------------------------------------------------

  it('should only offer cancellation on EN_ATTENTE and DISPONIBLE rows', () => {
    load(mockReservations);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[0].querySelector('.res-action-cancel')).toBeTruthy();  // EN_ATTENTE
    expect(rows[1].querySelector('.res-action-cancel')).toBeTruthy();  // DISPONIBLE
    expect(rows[2].querySelector('.res-action-cancel')).toBeNull();    // ANNULEE
    expect(rows[3].querySelector('.res-action-cancel')).toBeNull();    // EXPIREE
    expect(rows[4].querySelector('.res-action-cancel')).toBeNull();    // HONOREE
  });

  // --- Action de suppression -----------------------------------------------

  it('should offer deletion to a BIBLIOTHECAIRE on every row', () => {
    load(mockReservations);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    rows.forEach((row: HTMLElement) =>
      expect(row.querySelector('.res-action-delete')).toBeTruthy());
  });

  it('should not offer deletion to an ADHERENT', () => {
    // RS-02 : DELETE /api/reservations/{id} est réservé au bibliothécaire ;
    // l'interface ne doit pas exposer l'action à un adhérent.
    load(mockReservations, 'ADHERENT');

    expect(fixture.nativeElement.querySelector('.res-action-delete')).toBeNull();
  });

  it('should emit the reservation when deletion is requested', () => {
    spyOn(component.supprimer, 'emit');
    load(mockReservations);

    component.onSupprimer(mockReservations[0]);

    expect(component.supprimer.emit).toHaveBeenCalledWith(mockReservations[0]);
  });

  // --- Action de consultation ----------------------------------------------

  it('should offer the details action on every row, to both roles', () => {
    load(mockReservations, 'ADHERENT');

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    rows.forEach((row: HTMLElement) =>
      expect(row.querySelector('.res-action-details')).toBeTruthy());
  });

  it('should emit the reservation when details are requested', () => {
    spyOn(component.details, 'emit');
    load(mockReservations);

    component.onDetails(mockReservations[0]);

    expect(component.details.emit).toHaveBeenCalledWith(mockReservations[0]);
  });

  it('should emit the reservation when cancellation is requested', () => {
    spyOn(component.annuler, 'emit');
    load(mockReservations);

    component.onAnnuler(mockReservations[0]);

    expect(component.annuler.emit).toHaveBeenCalledWith(mockReservations[0]);
  });

  it('should expose canCancel per statut', () => {
    expect(component.canCancel('EN_ATTENTE')).toBeTrue();
    expect(component.canCancel('DISPONIBLE')).toBeTrue();
    expect(component.canCancel('ANNULEE')).toBeFalse();
    expect(component.canCancel('EXPIREE')).toBeFalse();
    expect(component.canCancel('HONOREE')).toBeFalse();
  });

  // --- Statuts -------------------------------------------------------------

  it('should map each statut to its translation key', () => {
    // Le libellé n'est plus figé en français : il est résolu par ngx-translate.
    expect(component.statutKey('EN_ATTENTE')).toBe('reservations.status.EN_ATTENTE');
    expect(component.statutKey('HONOREE')).toBe('reservations.status.HONOREE');
  });

  it('should give each statut its own badge style', () => {
    expect(component.getStatutClass('EN_ATTENTE')).toContain('ds-badge--warning');
    expect(component.getStatutClass('DISPONIBLE')).toContain('ds-badge--success');
    expect(component.getStatutClass('ANNULEE')).toContain('ds-badge--danger');
    expect(component.getStatutClass('EXPIREE')).toContain('ds-badge--neutral');
    expect(component.getStatutClass('HONOREE')).toContain('ds-badge--info');
  });

  // --- Recherche, tri, pagination ------------------------------------------

  it('should filter rows on the search query', () => {
    load(mockReservations);

    component.onQueryChange('L1');

    expect(component.visible.length).toBe(1);
    expect(component.visible[0].livreNom).toContain('L1');
  });

  it('should show the no-result state when the search matches nothing', () => {
    load(mockReservations);

    component.onQueryChange('zzz-introuvable');
    fixture.detectChanges();

    expect(component.visible.length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should toggle the sort direction when the same column is clicked twice', () => {
    load(mockReservations);

    component.sortBy('livreNom');
    expect(component.sortDirection).toBe('asc');

    component.sortBy('livreNom');
    expect(component.sortDirection).toBe('desc');
  });

  it('should sort rows by the chosen column', () => {
    load(mockReservations);

    component.sortBy('livreNom');

    expect(component.visible[0].livreNom).toBe('L1 - Livre disponible');
    expect(component.visible[4].livreNom).toBe('L5 - Livre emprunté 4');
  });

  it('should reset to the first page when the input list changes', () => {
    component.page = 3;
    load(mockReservations);

    expect(component.page).toBe(1);
  });

  it('should keep everything on a single page below the page size', () => {
    load(mockReservations);

    expect(component.totalPages).toBe(1);
    expect(component.pageItems.length).toBe(5);
  });

  it('should paginate beyond the page size', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      reservation(i + 1, `Livre ${i + 1}`, 'Emprunteur (A3)', 'EN_ATTENTE'));
    load(many);

    expect(component.totalPages).toBe(3);
    expect(component.pageItems.length).toBe(8);

    component.goToPage(3);
    expect(component.pageItems.length).toBe(4);
  });

  it('should clamp page navigation to the available range', () => {
    load(mockReservations);

    component.goToPage(99);
    expect(component.page).toBe(1);

    component.goToPage(-5);
    expect(component.page).toBe(1);
  });
});
