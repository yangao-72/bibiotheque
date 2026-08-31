import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Users } from '../_model/users';
import { UsersService } from '../_service/users.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {

  user: Users = new Users();
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private usersService: UsersService,
    private router: Router
  ) { }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (!this.user.name || !this.user.username || !this.user.password) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService.createUser(this.user).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Adhérent créé avec succès.';
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

  private getErrorMessage(err: any): string {
    if (err.status === 0) return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    if (err.status === 409) return err.error?.message || 'Conflit : cet identifiant est déjà utilisé.';
    if (err.status === 400) return err.error?.message || 'Champ obligatoire manquant.';
    if (err.error?.message) return err.error.message;
    return 'Une erreur est survenue lors de la création.';
  }
}
