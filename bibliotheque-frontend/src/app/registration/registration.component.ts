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
    // Les validations côté client renvoient des clés de traduction ; les messages
    // métier du serveur, eux, sont affichés tels quels (le pipe `translate`
    // restitue une chaîne inconnue à l'identique).
    if (!this.user.name || !this.user.name.trim()) {
      this.errorMessage = 'validation.nameRequired';
      return;
    }

    if (!this.user.username || !this.user.username.trim()) {
      this.errorMessage = 'validation.usernameRequired';
      return;
    }

    if (!this.user.password || !this.user.password.trim()) {
      this.errorMessage = 'validation.passwordRequired';
      return;
    }

    // Le profil choisi détermine deux rôles : le rôle historique (gestion des
    // livres/adhérents) et le rôle du module réservation (RS-01..RS-05).
    this.user.role = this.construireRoles(this.user.role[0].roleName);

    this.saving = true;

    this.usersService.createUser(this.user).subscribe({
      next: (response: any) => {
        this.saving = false;
        this.successMessage = response?.message || 'members.created';
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

  /**
   * Associe au profil choisi son rôle « réservation » :
   *  - Administrateur → Admin + BIBLIOTHECAIRE (voit et gère toutes les réservations)
   *  - Utilisateur    → User  + ADHERENT       (ne voit que les siennes)
   */
  private construireRoles(profil: string): any[] {
    const roleReservation = profil === 'Admin' ? 'BIBLIOTHECAIRE' : 'ADHERENT';
    return [
      { id: 0, roleName: profil },
      { id: 0, roleName: roleReservation }
    ];
  }

  private extractErrorMessage(err: any): string {
    // Erreur réseau — backend injoignable
    if (err.status === 0) {
      return 'errors.network';
    }

    // Extract message from backend response
    const backendMessage = err.error?.message
      || err.error?.error
      || err.error;

    switch (err.status) {
      case 400:
        return backendMessage || 'errors.badRequest';
      case 404:
        return backendMessage || 'errors.notFound';
      case 409:
        return backendMessage || 'errors.conflict';
      case 403:
        return 'errors.forbidden';
      case 500:
        return 'errors.server';
      default:
        if (backendMessage && typeof backendMessage === 'string') {
          return backendMessage;
        }
        return `errors.unknown|${err.status || '?'}`;
    }
  }
}
