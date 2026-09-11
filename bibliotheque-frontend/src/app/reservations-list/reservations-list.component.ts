import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Reservation } from '../_model/reservation';

type SortColumn = 'livreNom' | 'adherentNom' | 'dateReservation' | 'dateExpiration' | 'statut';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-reservations-list',
  templateUrl: './reservations-list.component.html',
  styleUrls: ['./reservations-list.component.css']
})
export class ReservationsListComponent implements OnChanges {

  @Input() reservations: Reservation[] = [];
  @Input() currentUserRole = '';
  @Output() annuler = new EventEmitter<Reservation>();

  /** Nombre de lignes par page. Au-delà, la pagination prend le relais. */
  static readonly PAGE_SIZE = 8;

  query = '';
  sortColumn: SortColumn = 'dateReservation';
  sortDirection: SortDirection = 'desc';
  page = 1;

  /** Résultat du filtre + tri, recalculé à chaque changement. */
  visible: Reservation[] = [];

  get estBibliothecaire(): boolean {
    return this.currentUserRole === 'BIBLIOTHECAIRE';
  }

  ngOnChanges(): void {
    this.page = 1;
    this.refresh();
  }

  // --- Recherche -----------------------------------------------------------

  onQueryChange(value: string): void {
    this.query = value;
    this.page = 1;
    this.refresh();
  }

  // --- Tri -----------------------------------------------------------------

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.refresh();
  }

  isSorted(column: SortColumn): boolean {
    return this.sortColumn === column;
  }

  sortIcon(column: SortColumn): string {
    if (!this.isSorted(column)) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // --- Pagination ----------------------------------------------------------

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.visible.length / ReservationsListComponent.PAGE_SIZE));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pageItems(): Reservation[] {
    const start = (this.page - 1) * ReservationsListComponent.PAGE_SIZE;
    return this.visible.slice(start, start + ReservationsListComponent.PAGE_SIZE);
  }

  goToPage(page: number): void {
    this.page = Math.min(Math.max(1, page), this.totalPages);
  }

  // --- Actions -------------------------------------------------------------

  canCancel(statut: string): boolean {
    return statut === 'EN_ATTENTE' || statut === 'DISPONIBLE';
  }

  onAnnuler(reservation: Reservation): void {
    // La demande de confirmation est portée par l'écran parent, qui dispose du
    // service de modale : ce composant se contente de signaler l'intention.
    this.annuler.emit(reservation);
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'ds-badge ds-badge--warning';
      case 'DISPONIBLE': return 'ds-badge ds-badge--success';
      case 'ANNULEE': return 'ds-badge ds-badge--danger';
      case 'EXPIREE': return 'ds-badge ds-badge--neutral';
      case 'HONOREE': return 'ds-badge ds-badge--info';
      default: return 'ds-badge ds-badge--neutral';
    }
  }

  /** Clé de traduction du statut : le libellé suit la langue de l'interface. */
  statutKey(statut: string): string {
    return `reservations.status.${statut}`;
  }

  trackById(_index: number, reservation: Reservation): number {
    return reservation.reservationId;
  }

  // --- Interne -------------------------------------------------------------

  private refresh(): void {
    const needle = this.query.trim().toLowerCase();

    const filtered = needle
      ? this.reservations.filter(r =>
          `${r.livreNom} ${r.adherentNom} ${r.statut}`.toLowerCase().includes(needle))
      : [...this.reservations];

    const direction = this.sortDirection === 'asc' ? 1 : -1;
    const column = this.sortColumn;

    this.visible = filtered.sort((a, b) => {
      const left = (a as any)[column];
      const right = (b as any)[column];
      if (left === right) { return 0; }
      if (left == null) { return 1; }
      if (right == null) { return -1; }
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction;
    });

    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }
  }
}
