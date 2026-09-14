import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Reservation } from '../_model/reservation';
import { ReservationService } from '../_service/reservation.service';
import { UsersService } from '../_service/users.service';
import { ToastService } from '../_ui/toast/toast.service';
import { ConfirmService } from '../_ui/confirm-dialog/confirm.service';

/**
 * Écran de détail d'une réservation, accessible par son identifiant
 * ({@code /reservation-details/:reservationId}).
 *
 * <p>La page s'appuie sur {@code GET /api/reservations/{id}}, qui applique
 * RS-03 côté serveur : un ADHERENT qui demande la réservation d'un autre reçoit
 * 403. L'intercepteur redirige alors vers {@code /forbidden} — l'écran ne montre
 * donc jamais les données d'autrui.</p>
 */
@Component({
  selector: 'app-reservation-details',
  templateUrl: './reservation-details.component.html',
  styleUrls: ['./reservation-details.component.css']
})
export class ReservationDetailsComponent implements OnInit {

  reservationId: number;
  reservation: Reservation | null = null;

  loading = true;
  /** Clé de traduction de l'erreur (`errors.*`), ou chaîne vide. */
  errorMessage = '';
  errorParams: Record<string, unknown> = {};

  /** Vrai si l'utilisateur connecté porte le rôle BIBLIOTHECAIRE (ou Admin). */
  estBibliothecaire = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private usersService: UsersService,
    private toast: ToastService,
    private confirm: ConfirmService
  ) { }

  ngOnInit(): void {
    this.reservationId = Number(this.route.snapshot.params['reservationId']);
    this.estBibliothecaire = this.usersService.roleMatch(['BIBLIOTHECAIRE']);
    this.loadReservation();
  }

  loadReservation(): void {
    this.loading = true;
    this.errorMessage = '';

    this.reservationService.getReservationById(this.reservationId).subscribe({
      next: (data) => {
        this.reservation = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.errorKey(err);
        this.errorParams = { status: err?.status };
      }
    });
  }

  /** Les statuts annulables, comme dans la liste (RG-05). */
  get canCancel(): boolean {
    const statut = this.reservation?.statut;
    return statut === 'EN_ATTENTE' || statut === 'DISPONIBLE';
  }

  back(): void {
    this.router.navigate(['/reservations']);
  }

  async onAnnuler(): Promise<void> {
    if (!this.reservation) { return; }

    const confirmed = await this.confirm.ask({
      titleKey: 'reservations.cancelConfirmTitle',
      textKey: 'reservations.cancelConfirmText',
      params: { book: this.reservation.livreNom },
      confirmKey: 'reservations.cancelAction',
      danger: true
    });
    if (!confirmed) { return; }

    this.reservationService.annulerReservation(this.reservation.reservationId).subscribe({
      next: (updated) => {
        // On rafraîchit la fiche : le bandeau de statut doit suivre le serveur.
        this.reservation = updated;
        this.toast.success('reservations.cancelled');
      },
      error: (err) => this.showError(err)
    });
  }

  async onSupprimer(): Promise<void> {
    if (!this.reservation) { return; }

    const confirmed = await this.confirm.ask({
      titleKey: 'reservations.deleteConfirmTitle',
      textKey: 'reservations.deleteConfirmText',
      params: { book: this.reservation.livreNom },
      confirmKey: 'reservations.deleteAction',
      danger: true
    });
    if (!confirmed) { return; }

    this.reservationService.supprimerReservation(this.reservation.reservationId).subscribe({
      next: () => {
        this.toast.success('reservations.deleted');
        // La réservation n'existe plus : retour à la liste.
        this.back();
      },
      error: (err) => this.showError(err)
    });
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

  statutKey(statut: string): string {
    return `reservations.status.${statut}`;
  }

  // --- Interne -------------------------------------------------------------

  /** Affiche le message métier du serveur, sinon la clé liée au code HTTP. */
  private showError(err: any): void {
    const serverMessage = err?.error?.message
      || (typeof err?.error === 'string' ? err.error : '');
    if (serverMessage) {
      this.toast.showText('error', serverMessage);
    } else {
      this.toast.error(this.errorKey(err), { status: err?.status });
    }
  }

  private errorKey(err: any): string {
    switch (err?.status) {
      case 0: return 'errors.network';
      case 401: return 'errors.unauthorized';
      case 403: return 'errors.forbidden';
      case 404: return 'errors.notFound';
      case 409: return 'errors.conflict';
      case 500: return 'errors.server';
      default: return 'errors.unknown';
    }
  }
}
