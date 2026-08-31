import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Users } from '../_model/users';
import { UsersService } from '../_service/users.service';

@Component({
  selector: 'app-update-user',
  templateUrl: './update-user.component.html',
  styleUrls: ['./update-user.component.css']
})
export class UpdateUserComponent implements OnInit {

  userId: number;
  user: Users = new Users();
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['userId'];
    this.loadUser();
  }

  loadUser(): void {
    this.loading = true;
    this.errorMessage = '';
    this.usersService.getUserById(this.userId).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(err);
      }
    });
  }

  onSubmit(): void {
    if (!this.user.name || !this.user.username) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService.updateUser(this.userId, this.user).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Adhérent modifié avec succès.';
        setTimeout(() => this.goToUsersList(), 1500);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = this.getErrorMessage(err);
      }
    });
  }

  goToUsersList(): void {
    this.router.navigate(['/users']);
  }

  retry(): void {
    this.loadUser();
  }

  private getErrorMessage(err: any): string {
    if (err.status === 0) return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    if (err.status === 404) return 'Adhérent introuvable.';
    if (err.status === 409) return err.error?.message || 'Conflit : cet identifiant est déjà utilisé.';
    if (err.status === 400) return err.error?.message || 'Champ obligatoire manquant.';
    if (err.error?.message) return err.error.message;
    return 'Une erreur est survenue lors de la mise à jour.';
  }
}
