import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Books } from '../_model/books';
import { Reservation, ReservationRequest } from '../_model/reservation';
import { Users } from '../_model/users';
import { BooksService } from '../_service/books.service';
import { ReservationService } from '../_service/reservation.service';
import { UsersService } from '../_service/users.service';

@Component({
  selector: 'app-reservations',
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.css']
})
export class ReservationsComponent implements OnInit {

  reservations: Reservation[] = [];
  books: Books[] = [];
  users: Users[] = [];

  loading = true;
  errorMessage = '';
  cancelError = '';

  selectedStatut = '';
  statuts = ['EN_ATTENTE', 'DISPONIBLE', 'ANNULEE', 'EXPIREE', 'HONOREE'];

  newReservation: ReservationRequest = new ReservationRequest();
  formError = '';
  formSuccess = '';

  constructor(
    private reservationService: ReservationService,
    private booksService: BooksService,
    private usersService: UsersService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cancelError = '';

    forkJoin({
      reservations: this.reservationService.getReservations(this.selectedStatut || undefined),
      books: this.booksService.getBooksList(),
      users: this.usersService.getUsersList()
    }).subscribe({
      next: (data) => {
        this.reservations = data.reservations;
        this.books = data.books;
        this.users = data.users;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  onFilterChange(statut: string): void {
    this.selectedStatut = statut;
    this.loading = true;
    this.errorMessage = '';

    this.reservationService.getReservations(statut || undefined).subscribe({
      next: (data) => {
        this.reservations = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  onCreateReservation(): void {
    this.formError = '';
    this.formSuccess = '';

    this.reservationService.createReservation(this.newReservation).subscribe({
      next: () => {
        this.formSuccess = 'Réservation créée avec succès.';
        this.newReservation = new ReservationRequest();
        this.loadData();
        // Auto-masquer le message de succès après 5 secondes
        setTimeout(() => this.formSuccess = '', 5000);
      },
      error: (err) => {
        this.formError = this.extractErrorMessage(err);
      }
    });
  }

  onAnnulerReservation(reservation: Reservation): void {
    this.cancelError = '';
    const userId = reservation.adherentId;

    this.reservationService.annulerReservation(reservation.reservationId, userId).subscribe({
      next: () => {
        reservation.statut = 'ANNULEE';
        this.formSuccess = 'Réservation annulée avec succès.';
        setTimeout(() => this.formSuccess = '', 5000);
      },
      error: (err) => {
        this.cancelError = this.extractErrorMessage(err);
      }
    });
  }

  /**
   * Extrait un message lisible depuis une erreur HTTP.
   * Gère les erreurs réseau (status 0), les erreurs métier (400, 404, 409)
   * et les erreurs inattendues.
   */
  private extractErrorMessage(err: any): string {
    if (err.status === 0) {
      return 'Le serveur est injoignable. Vérifiez que le backend est démarré et réessayez.';
    }
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return `Erreur ${err.status} : une erreur inattendue est survenue.`;
  }

  get isFormValid(): boolean {
    return this.newReservation.livreId != null && this.newReservation.adherentId != null;
  }
}
