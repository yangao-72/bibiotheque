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
        if (err.status === 0) {
          this.errorMessage = 'Le serveur est injoignable. Veuillez réessayer plus tard.';
        } else {
          this.errorMessage = `Erreur ${err.status} : ${err.error?.message || 'Une erreur inattendue est survenue.'}`;
        }
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
        if (err.status === 0) {
          this.errorMessage = 'Le serveur est injoignable. Veuillez réessayer plus tard.';
        } else {
          this.errorMessage = `Erreur ${err.status} : ${err.error?.message || 'Une erreur inattendue est survenue.'}`;
        }
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
      },
      error: (err) => {
        if (err.status === 0) {
          this.formError = 'Le serveur est injoignable. Veuillez réessayer plus tard.';
        } else if (err.status === 400) {
          this.formError = err.error?.message || 'Champ obligatoire manquant.';
        } else if (err.status === 404) {
          this.formError = err.error?.message || 'Livre ou adhérent introuvable.';
        } else if (err.status === 409) {
          this.formError = err.error?.message || 'Règle de gestion violée.';
        } else {
          this.formError = `Erreur ${err.status} : ${err.error?.message || 'Une erreur inattendue est survenue.'}`;
        }
      }
    });
  }

  onAnnulerReservation(reservation: Reservation): void {
    const userId = reservation.adherentId;

    this.reservationService.annulerReservation(reservation.reservationId, userId).subscribe({
      next: () => {
        reservation.statut = 'ANNULEE';
      },
      error: (err) => {
        if (err.status === 0) {
          alert('Le serveur est injoignable. Veuillez réessayer plus tard.');
        } else {
          alert(err.error?.message || `Erreur ${err.status} : impossible d'annuler cette réservation.`);
        }
      }
    });
  }

  get isFormValid(): boolean {
    return this.newReservation.livreId != null && this.newReservation.adherentId != null;
  }
}
