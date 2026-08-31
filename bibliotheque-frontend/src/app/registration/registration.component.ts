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
    // Initialize default role if not set
    if (!this.user.role) {
      this.user.role = [{ id: 0, roleName: 'User' }];
    } else if (!this.user.role[0]) {
      this.user.role[0] = { id: 0, roleName: 'User' };
    }
  }

  onSubmit(): void {
    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';

    // Client-side validation
    if (!this.user.name || !this.user.name.trim()) {
      this.errorMessage = 'Veuillez renseigner le nom complet.';
      return;
    }

    if (!this.user.username || !this.user.username.trim()) {
      this.errorMessage = 'Veuillez renseigner le nom d\'utilisateur.';
      return;
    }

    if (!this.user.password || !this.user.password.trim()) {
      this.errorMessage = 'Veuillez renseigner le mot de passe.';
      return;
    }

    this.saving = true;

    this.usersService.createUser(this.user).subscribe({
      next: (response: any) => {
        this.saving = false;
        this.successMessage = response?.message || 'Adhérent créé avec succès.';
        // Auto-navigate after delay
        setTimeout(() => this.goToUsersList(), 1800);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  goToUsersList(): void {
    this.router.navigate(['/users']);
  }

  private extractErrorMessage(err: any): string {
    // Network error — backend down
    if (err.status === 0) {
      return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    }

    // Extract message from backend response
    const backendMessage = err.error?.message
      || err.error?.error
      || err.error;

    switch (err.status) {
      case 400:
        return backendMessage || 'Champ obligatoire manquant ou données invalides.';
      case 404:
        return backendMessage || 'Ressource introuvable.';
      case 409:
        return backendMessage || 'Conflit : cet identifiant est déjà utilisé.';
      case 403:
        return 'Accès interdit. Vous n\'avez pas les droits nécessaires.';
      case 500:
        return 'Erreur interne du serveur. Réessayez plus tard.';
      default:
        if (backendMessage && typeof backendMessage === 'string') {
          return backendMessage;
        }
        return `Une erreur est survenue (code ${err.status || 'inconnu'}).`;
    }
  }
}
