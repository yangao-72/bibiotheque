import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Users } from '../_model/users';
import { UsersService } from '../_service/users.service';
import { ToastService } from '../_ui/toast/toast.service';
import { ConfirmService } from '../_ui/confirm-dialog/confirm.service';

type SortColumn = 'name' | 'username';
type SortDirection = 'asc' | 'desc';

/** Les deux vues de la page Adhérents. */
export type MembersView = 'actifs' | 'archives';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {

  users: Users[] = [];
  /** Comptes de la vue courante (actifs ou archivés), avant recherche. */
  base: Users[] = [];
  /** Résultat de la recherche et du tri, ce que le tableau affiche réellement. */
  visible: Users[] = [];
  loading = true;
  errorMessage = '';

  query = '';
  sortColumn: SortColumn = 'name';
  sortDirection: SortDirection = 'asc';

  readonly skeletonRows = Array.from({ length: 5 });

  /** Seul un Admin peut supprimer un compte (hasRole('Admin') côté serveur). */
  estAdmin = false;

  /** Vue courante : les adhérents actifs, ou les archives des comptes supprimés. */
  vue: MembersView = 'actifs';

  constructor(private usersService: UsersService,
    private router: Router,
    private toast: ToastService,
    private confirm: ConfirmService) { }

  ngOnInit(): void {
    this.estAdmin = this.usersService.roleMatch(['Admin']);
    this.getUsers();
  }

  private getUsers() {
    this.loading = true;
    this.errorMessage = '';
    // La vue des actifs n'a pas besoin des comptes supprimés ; seule la vue
    // Archives les demande, puis ne garde que ceux-là (cf. `base`).
    this.usersService.getUsersList(this.vue === 'archives').subscribe({
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
    this.base = this.users.filter(u =>
      this.vue === 'archives' ? !this.estActif(u) : this.estActif(u));

    const needle = this.query.trim().toLowerCase();

    const filtered = needle
      ? this.base.filter(u => `${u.name} ${u.username}`.toLowerCase().includes(needle))
      : [...this.base];

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

  /**
   * Bascule entre les adhérents actifs et les archives des comptes supprimés.
   * La recherche et le tri repartent de zéro : ils portaient sur l'autre liste.
   */
  onChangeVue(vue: MembersView): void {
    if (this.vue === vue) {
      return;
    }
    this.vue = vue;
    this.query = '';
    this.getUsers();
  }

  /** Un compte est actif par défaut : `actif` absent vaut actif. */
  estActif(user: Users): boolean {
    return user?.actif !== false;
  }

  // --- Suppression ---------------------------------------------------------

  /**
   * Retrait d'un compte (suppression logique). Le backend refusera (409) un adhérent
   * qui détient encore un exemplaire, ou la suppression de son propre compte ;
   * le message métier est alors affiché tel quel.
   *
   * La modale réclame un motif obligatoire : c'est lui qui alimentera la trace
   * d'audit affichée ensuite sur la fiche de l'adhérent.
   */
  async onDelete(user: Users): Promise<void> {
    const motif = await this.confirm.askWithInput({
      titleKey: 'members.deleteConfirmTitle',
      textKey: 'members.deleteConfirmText',
      params: { name: user.name },
      confirmKey: 'common.delete',
      danger: true,
      inputLabelKey: 'members.deleteMotif',
      inputPlaceholderKey: 'members.deleteMotifPlaceholder',
      inputRequired: true
    });

    if (motif === null) {
      return;
    }

    this.usersService.deleteUser(user.userId, motif).subscribe({
      next: () => {
        this.toast.success('members.deleted');
        this.getUsers();
      },
      error: (err) => {
        const serverMessage = err?.error?.message;
        if (serverMessage) {
          this.toast.showText('error', serverMessage);
        } else {
          this.toast.error(this.extractErrorMessage(err));
        }
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (err.status === 0) return 'errors.network';
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string') return err.error;
    return 'errors.server';
  }
}
