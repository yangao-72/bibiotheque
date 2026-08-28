import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Reservation } from '../_model/reservation';

@Component({
  selector: 'app-reservations-list',
  templateUrl: './reservations-list.component.html',
  styleUrls: ['./reservations-list.component.css']
})
export class ReservationsListComponent {

  @Input() reservations: Reservation[] = [];
  @Input() currentUserRole = '';
  @Output() annuler = new EventEmitter<Reservation>();

  canCancel(statut: string): boolean {
    return statut === 'EN_ATTENTE' || statut === 'DISPONIBLE';
  }

  confirmAnnuler(reservation: Reservation): void {
    const message = `Confirmer l'annulation de la réservation pour "${reservation.livreNom}" ?`;
    if (window.confirm(message)) {
      this.annuler.emit(reservation);
    }
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'badge bg-warning text-dark';
      case 'DISPONIBLE': return 'badge bg-success';
      case 'ANNULEE': return 'badge bg-secondary';
      case 'EXPIREE': return 'badge bg-danger';
      case 'HONOREE': return 'badge bg-info';
      default: return 'badge bg-light text-dark';
    }
  }
}
