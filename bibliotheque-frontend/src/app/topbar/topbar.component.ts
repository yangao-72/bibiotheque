import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {

  @Output() toggleSidebar = new EventEmitter<void>();

  searchQuery = '';
  showNotifications = false;

  notifications = [
    { icon: '🔴', title: '3 retours en retard', subtitle: 'Certains livres ne sont pas encore retournés.', time: 'il y a 1h' },
    { icon: '📅', title: '5 réservations en attente', subtitle: 'Des réservations nécessitent votre attention.', time: 'il y a 3h' },
    { icon: '👤', title: 'Nouveau membre', subtitle: 'Marie Dupont a rejoint la bibliothèque.', time: 'il y a 5h' },
    { icon: '💾', title: 'Sauvegarde terminée', subtitle: 'La sauvegarde quotidienne a réussi.', time: 'il y a 1j' }
  ];

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }
}
