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
  userRole = '';
  isAdmin = false;

  stats = {
    livres: 0,
    adherents: 0,
    emprunts: 0,
    reservations: 0
  };

  loading = true;
  errorMessage = '';

  constructor(
    private booksService: BooksService,
    private usersService: UsersService,
    private borrowService: BorrowService,
    private reservationService: ReservationService,
    private userAuthService: UserAuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userName = this.userAuthService.getName() || 'Utilisateur';
    const roles: any[] = this.userAuthService.getRoles();
    this.userRole = roles?.includes('Admin') ? 'Administrateur' : 'Utilisateur';
    this.isAdmin = roles?.includes('Admin');
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

  private loadUserStats(): void {
    this.loading = false;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
