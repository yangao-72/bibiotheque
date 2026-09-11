import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Users } from '../_model/users';
import { UsersService } from '../_service/users.service';

type SortColumn = 'name' | 'username';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {

  users: Users[] = [];
  /** Résultat de la recherche et du tri, ce que le tableau affiche réellement. */
  visible: Users[] = [];
  loading = true;
  errorMessage = '';

  query = '';
  sortColumn: SortColumn = 'name';
  sortDirection: SortDirection = 'asc';

  readonly skeletonRows = Array.from({ length: 5 });

  constructor(private usersService: UsersService,
    private router: Router) { }

  ngOnInit(): void {
    this.getUsers();
  }

  private getUsers() {
    this.loading = true;
    this.errorMessage = '';
    this.usersService.getUsersList().subscribe({
      next: data => {
        this.users = data;
        this.refresh();
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  // --- Affichage -----------------------------------------------------------

  /** Initiale affichée dans la pastille, quand aucune photo n'est disponible. */
  initial(user: Users): string {
    return (user.name || user.username || '?').charAt(0);
  }

  /** Un compte porte plusieurs rôles : on les liste tous. */
  roleNames(user: Users): string[] {
    return (user.role || []).map((r: any) => r?.roleName).filter(Boolean);
  }

  roleBadgeClass(roleName: string): string {
    if (roleName === 'Admin' || roleName === 'BIBLIOTHECAIRE') {
      return 'ds-badge--brand';
    }
    return 'ds-badge--neutral';
  }

  // --- Recherche et tri ----------------------------------------------------

  onQueryChange(value: string): void {
    this.query = value;
    this.refresh();
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.refresh();
  }

  isSorted(column: SortColumn): boolean {
    return this.sortColumn === column;
  }

  sortIcon(column: SortColumn): string {
    if (!this.isSorted(column)) { return 'fa-sort'; }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  trackById(_index: number, user: Users): number {
    return user.userId;
  }

  private refresh(): void {
    const needle = this.query.trim().toLowerCase();

    const filtered = needle
      ? this.users.filter(u => `${u.name} ${u.username}`.toLowerCase().includes(needle))
      : [...this.users];

    const direction = this.sortDirection === 'asc' ? 1 : -1;
    const column = this.sortColumn;

    this.visible = filtered.sort((a, b) =>
      String(a[column] ?? '').localeCompare(String(b[column] ?? ''), undefined, { numeric: true }) * direction);
  }

  // --- Navigation ----------------------------------------------------------

  userDetails(userId: number) {
    this.router.navigate(['user-details', userId ]);
  }

  updateUser(userId: number) {
    this.router.navigate(['update-user', userId ]);
  }

  retry() {
    this.getUsers();
  }

  private extractErrorMessage(err: any): string {
    if (err.status === 0) return 'errors.network';
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string') return err.error;
    return 'errors.server';
  }
}
