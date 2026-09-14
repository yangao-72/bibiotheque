import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BooksService } from '../_service/books.service';
import { UsersService } from '../_service/users.service';
import { BorrowService } from '../_service/borrow.service';
import { UserAuthService } from '../_service/user-auth.service';
import { ReservationService } from '../_service/reservation.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  userName = '';
  /** Clé de traduction du rôle affiché. */
  roleKey = 'roles.member';
  isAdmin = false;

  stats = {
    livres: 0,
    adherents: 0,
    emprunts: 0,
    reservations: 0
  };

  loading = true;
  errorMessage = '';

  /** Nombre de cartes de squelette affichées pendant le chargement. */
  readonly skeletonCards = Array.from({ length: 4 });

  constructor(
    private booksService: BooksService,
    private usersService: UsersService,
    private borrowService: BorrowService,
    private reservationService: ReservationService,
    private userAuthService: UserAuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userName = this.userAuthService.getName() || '';
    // `getRoles()` renvoie des objets { roleName }, pas des chaînes : un
    // `includes('Admin')` y était toujours faux, et l'administrateur se voyait
    // servir le tableau de bord adhérent.
    this.isAdmin = this.usersService.roleMatch(['Admin', 'BIBLIOTHECAIRE']);
    this.roleKey = this.isAdmin ? 'roles.librarian' : 'roles.member';
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.errorMessage = '';

    if (this.isAdmin) {
      this.loadAdminStats();
    } else {
      this.loadUserStats();
    }
  }

  /**
   * Statistiques du personnel. Ces quatre appels ne sont légitimes que pour un
   * compte Admin/BIBLIOTHECAIRE : `GET /borrow` et `GET /admin/users` répondent
   * **403** à un adhérent, et l'intercepteur le redirigerait vers /forbidden.
   * Le garde `isAdmin` n'est donc pas cosmétique — il tient la matrice
   * d'autorisation du serveur.
   */
  private loadAdminStats(): void {
    let completed = 0;
    const total = 4;

    this.booksService.getBooksList().subscribe({
      next: (data) => {
        this.stats.livres = data.length;
        completed++;
        if (completed === total) this.loading = false;
      },
      error: () => {
        this.stats.livres = 0;
        completed++;
        if (completed === total) this.loading = false;
      }
    });

    this.usersService.getUsersList().subscribe({
      next: (data) => {
        this.stats.adherents = data.length;
        completed++;
        if (completed === total) this.loading = false;
      },
      error: () => {
        this.stats.adherents = 0;
        completed++;
        if (completed === total) this.loading = false;
      }
    });

    this.borrowService.getBorrowList().subscribe({
      next: (data) => {
        this.stats.emprunts = data.length;
        completed++;
        if (completed === total) this.loading = false;
      },
      error: () => {
        this.stats.emprunts = 0;
        completed++;
        if (completed === total) this.loading = false;
      }
    });

    this.reservationService.getReservations().subscribe({
      next: (data) => {
        this.stats.reservations = data.length;
        completed++;
        if (completed === total) this.loading = false;
      },
      error: () => {
        this.stats.reservations = 0;
        completed++;
        if (completed === total) this.loading = false;
      }
    });
  }

  /** Un adhérent ne voit que ses propres chiffres : aucun appel réservé au personnel. */
  private loadUserStats(): void {
    this.loading = false;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
