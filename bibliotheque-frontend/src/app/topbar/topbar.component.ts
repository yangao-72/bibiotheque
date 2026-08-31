import { Component, Output, EventEmitter, OnInit, HostListener, ElementRef } from '@angular/core';
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
    { iconClass: 'fas fa-exclamation-circle', iconColor: '#ef4444', title: '3 retours en retard', subtitle: 'Certains livres ne sont pas encore retournés.', time: 'il y a 1h' },
    { iconClass: 'fas fa-clock', iconColor: '#f59e0b', title: '5 réservations en attente', subtitle: 'Des réservations nécessitent votre attention.', time: 'il y a 3h' },
    { iconClass: 'fas fa-user-plus', iconColor: '#3b82f6', title: 'Nouveau membre', subtitle: 'Marie Dupont a rejoint la bibliothèque.', time: 'il y a 5h' },
    { iconClass: 'fas fa-check-circle', iconColor: '#22c55e', title: 'Sauvegarde terminée', subtitle: 'La sauvegarde quotidienne a réussi.', time: 'il y a 1j' }
  ];

  constructor(
    private themeService: ThemeService,
    private elementRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.isDarkMode = this.themeService.isDarkMode();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showNotifications) {
      const clickedInside = this.elementRef.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.showNotifications = false;
      }
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
  }

  toggleDarkMode(): void {
    this.isDarkMode = this.themeService.toggleDarkMode();
  }
}
