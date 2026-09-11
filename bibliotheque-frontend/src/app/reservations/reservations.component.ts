import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { Books } from '../_model/books';
import { Reservation, ReservationRequest } from '../_model/reservation';
import { Users } from '../_model/users';
import { BooksService } from '../_service/books.service';
import { ReservationService } from '../_service/reservation.service';
import { UsersService } from '../_service/users.service';
import { ToastService } from '../_ui/toast/toast.service';
import { ConfirmService } from '../_ui/confirm-dialog/confirm.service';

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
  /** Clé de traduction de l'erreur de chargement, ou chaîne vide. */
  errorMessage = '';
  errorParams: Record<string, unknown> = {};
  cancelError = '';

  selectedStatut = '';
  statuts = ['EN_ATTENTE', 'DISPONIBLE', 'ANNULEE', 'EXPIREE', 'HONOREE'];

  newReservation: ReservationRequest = new ReservationRequest();
  formError = '';
  formSuccess = '';

  /** Nombre de lignes de squelette affichées pendant le chargement. */
  readonly skeletonRows = Array.from({ length: 5 });

  /** Vrai si l'utilisateur connecté porte le rôle BIBLIOTHECAIRE. */
  estBibliothecaire = false;

  constructor(
    private reservationService: ReservationService,
    private booksService: BooksService,
    private usersService: UsersService,
    private toast: ToastService,
    private confirm: ConfirmService
  ) { }

  ngOnInit(): void {
    this.estBibliothecaire = this.usersService.roleMatch(['BIBLIOTHECAIRE']);
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cancelError = '';

    forkJoin({
      reservations: this.reservationService.getReservations(this.selectedStatut || undefined),
      books: this.booksService.getBooksList(),
      // La liste des adhérents vient de /admin/users, réservé aux administrateurs.
      // Un ADHERENT ne la demande pas : il réserve toujours pour lui-même (RS-04).
      users: this.estBibliothecaire ? this.usersService.getUsersList() : of([] as Users[])
    }).subscribe({
      next: (data) => {
        this.reservations = data.reservations;
        this.books = data.books;
        this.users = data.users;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.setError(err);
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
        this.setError(err);
      }
    });
  }

  onCreateReservation(): void {
    this.reservationService.createReservation(this.newReservation).subscribe({
      next: () => {
        this.newReservation = new ReservationRequest();
        this.toast.success('reservations.created');
        this.loadData();
      },
      error: (err) => {
        // Les règles de gestion (RG-01…RG-06) remontent un message métier rédigé
        // par le serveur : on l'affiche tel quel plutôt qu'un message générique.
        const serverMessage = this.serverMessage(err);
        if (serverMessage) {
          this.toast.showText('error', serverMessage);
        } else {
          this.toast.error(this.errorKey(err), { status: err.status });
        }
      }
    });
  }

  async onAnnulerReservation(reservation: Reservation): Promise<void> {
    const confirmed = await this.confirm.ask({
      titleKey: 'reservations.cancelConfirmTitle',
      textKey: 'reservations.cancelConfirmText',
      params: { book: reservation.livreNom },
      confirmKey: 'reservations.cancelAction',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    this.reservationService.annulerReservation(reservation.reservationId).subscribe({
      next: () => {
        reservation.statut = 'ANNULEE';
        this.toast.success('reservations.cancelled');
      },
      error: (err) => {
        const serverMessage = this.serverMessage(err);
        if (serverMessage) {
          this.toast.showText('error', serverMessage);
        } else {
          this.toast.error(this.errorKey(err), { status: err.status });
        }
      }
    });
  }

  /**
   * Un BIBLIOTHECAIRE doit désigner l'adhérent pour lequel il réserve.
   * Un ADHERENT n'a que le livre à choisir : le serveur déduit son identité du token.
   */
  get isFormValid(): boolean {
    if (this.newReservation.livreId == null) {
      return false;
    }
    return this.estBibliothecaire ? this.newReservation.adherentId != null : true;
  }

  getCountByStatut(statut: string): number {
    return this.reservations.filter(r => r.statut === statut).length;
  }

  // --- Gestion des erreurs -------------------------------------------------

  private setError(err: any): void {
    this.errorMessage = this.errorKey(err);
    this.errorParams = { status: err?.status };
  }

  /** Message métier renvoyé par le serveur, s'il y en a un. */
  private serverMessage(err: any): string {
    if (err?.error?.message) { return err.error.message; }
    if (typeof err?.error === 'string' && err.error.trim()) { return err.error; }
    return '';
  }

  /** Clé de traduction correspondant au code HTTP reçu. */
  private errorKey(err: any): string {
    switch (err?.status) {
      case 0: return 'errors.network';
      case 400: return 'errors.badRequest';
      case 401: return 'errors.unauthorized';
      case 403: return 'errors.forbidden';
      case 404: return 'errors.notFound';
      case 409: return 'errors.conflict';
      case 500: return 'errors.server';
      default: return 'errors.unknown';
    }
  }
}
