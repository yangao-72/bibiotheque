import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { ThemeService } from '../_service/theme.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit {

  @Output() toggleSidebar = new EventEmitter<void>();

  searchQuery = '';
  showNotifications = false;
  isDarkMode = false;

  notifications = [
    { icon: '🔴', title: '3 retours en retard', subtitle: 'Certains livres ne sont pas encore retournés.', time: 'il y a 1h' },
    { icon: '📅', title: '5 réservations en attente', subtitle: 'Des réservations nécessitent votre attention.', time: 'il y a 3h' },
    { icon: '👤', title: 'Nouveau membre', subtitle: 'Marie Dupont a rejoint la bibliothèque.', time: 'il y a 5h' },
    { icon: '💾', title: 'Sauvegarde terminée', subtitle: 'La sauvegarde quotidienne a réussi.', time: 'il y a 1j' }
  ];

  constructor(private themeService: ThemeService) { }

  ngOnInit(): void {
    this.isDarkMode = this.themeService.isDarkMode();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  toggleDarkMode(): void {
    this.isDarkMode = this.themeService.toggleDarkMode();
  }
}
