import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Borrow } from '../_model/borrow';
import { Users } from '../_model/users';
import { BorrowService } from '../_service/borrow.service';
import { UsersService } from '../_service/users.service';
import { ToastService } from '../_ui/toast/toast.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
})
export class UserDetailsComponent implements OnInit {

  id: number;
  borrow: Borrow[] = [];
  user: Users = new Users();
  loading = true;
  errorMessage = '';

  /** Seul un Admin peut réintégrer un compte supprimé. */
  estAdmin = false;
  reactivating = false;

  constructor(
    private route: ActivatedRoute,
    private borrowService: BorrowService,
    public userService: UsersService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.params['userId'];
    this.estAdmin = this.userService.roleMatch(['Admin']);
    this.loadUserData();
  }

  /**
   * Un compte est actif par défaut : `actif` est absent (comptes historiques) ou
   * `null` dans la réponse pour les comptes créés avant le soft delete.
   */
  get estActif(): boolean {
    return this.user?.actif !== false;
  }

  /** Réintègre un compte supprimé, sans quitter la fiche. */
  reactiver(): void {
    if (this.reactivating) {
      return;
    }
    this.reactivating = true;
    this.errorMessage = '';

    this.userService.reactivateUser(this.id).subscribe({
      next: (user) => {
        this.user = user;
        this.reactivating = false;
        this.toast.success('members.reactivated');
      },
      error: (err) => {
        this.reactivating = false;
        this.errorMessage = this.getErrorMessage(err);
      }
    });
  }

  loadUserData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getUserById(this.id).subscribe({
      next: (data) => {
        this.user = data;
        this.getBorrowedByUser(this.id);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(err);
      }
    });
  }

  private getBorrowedByUser(userId: number): void {
    this.borrowService.getBooksBorrowedByUser(userId).subscribe({
      next: (data) => {
        this.borrow = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(err);
      }
    });
  }

  private getErrorMessage(err: any): string {
    if (err.status === 0) return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    if (err.status === 404) return 'Adhérent introuvable.';
    if (err.error?.message) return err.error.message;
    return 'Une erreur est survenue lors du chargement.';
  }

  retry(): void {
    this.loadUserData();
  }
}
