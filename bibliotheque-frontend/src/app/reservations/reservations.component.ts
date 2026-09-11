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
import { BarDatum } from '../_ui/bar-chart/bar-chart.component';
import { TranslateService } from '@ngx-translate/core';

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

  /** Réservations créées chaque jour sur les sept derniers jours. */
  reservationsParJour: BarDatum[] = [];

  /** Numérateur et dénominateur du taux d'aboutissement. */
  honorees = 0;
  terminees = 0;

  constructor(
    private reservationService: ReservationService,
    private booksService: BooksService,
    private usersService: UsersService,
    private toast: ToastService,
    private confirm: ConfirmService,
    private translate: TranslateService
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
        this.calculerStatistiques();
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
        this.calculerStatistiques();
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

  // --- Statistiques --------------------------------------------------------

  /**
   * Prépare les deux séries affichées en haut de page.
   *
   * Le taux d'aboutissement se calcule sur les seules réservations *terminées* :
   * rapporter les honorées au total ferait mécaniquement chuter le taux chaque
   * fois qu'une réservation est créée, ce qui ne mesurerait rien.
   */
  calculerStatistiques(): void {
    this.reservationsParJour = this.compterParJour(7);

    this.honorees = this.getCountByStatut('HONOREE');
    this.terminees = this.honorees
      + this.getCountByStatut('ANNULEE')
      + this.getCountByStatut('EXPIREE');
  }

  private compterParJour(nbJours: number): BarDatum[] {
    const jours: BarDatum[] = [];
    const locale = this.translate.currentLang || 'fr';

    for (let i = nbJours - 1; i >= 0; i--) {
      const jour = new Date();
      jour.setHours(0, 0, 0, 0);
      jour.setDate(jour.getDate() - i);

      jours.push({
        label: jour.toLocaleDateString(locale, { weekday: 'short' }),
        fullLabel: jour.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
        value: this.reservations.filter(r => this.memeJour(r.dateReservation, jour)).length
      });
    }

    return jours;
  }

  /** Le serveur sérialise les dates en `dd-MM-yyyy` : `new Date()` ne sait pas les lire. */
  private memeJour(dateReservation: Date | string, jour: Date): boolean {
    if (typeof dateReservation !== 'string') {
      const d = new Date(dateReservation);
      return d.toDateString() === jour.toDateString();
    }

    const parts = dateReservation.split('-');
    if (parts.length !== 3) {
      return false;
    }

    const [jourStr, moisStr, anneeStr] = parts;
    return Number(jourStr) === jour.getDate()
      && Number(moisStr) === jour.getMonth() + 1
      && Number(anneeStr) === jour.getFullYear();
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
