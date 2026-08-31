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
      case 'EN_ATTENTE': return 'statut-badge statut-en-attente';
      case 'DISPONIBLE': return 'statut-badge statut-disponible';
      case 'ANNULEE': return 'statut-badge statut-annulee';
      case 'EXPIREE': return 'statut-badge statut-expiree';
      case 'HONOREE': return 'statut-badge statut-honoree';
      default: return 'statut-badge';
    }
  }

  formatStatut(statut: string): string {
    const labels: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'DISPONIBLE': 'Disponible',
      'ANNULEE': 'Annulée',
      'EXPIREE': 'Expirée',
      'HONOREE': 'Honorée'
    };
    return labels[statut] || statut;
  }
}
