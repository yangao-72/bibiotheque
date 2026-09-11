import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { UserAuthService } from '../_service/user-auth.service';
import { UsersService } from '../_service/users.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loading = false;
  errorMessage = '';

  constructor(
    private userService: UsersService,
    private userAuthService: UserAuthService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  login(loginForm: NgForm): void {
    if (!loginForm.value.username) {
      this.errorMessage = 'validation.usernameRequired';
      return;
    }
    if (!loginForm.value.password) {
      this.errorMessage = 'validation.passwordRequired';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.userService.login(loginForm.value).subscribe({
      next: (response: any) => {
        this.userAuthService.setRoles(response.user.role);
        this.userAuthService.setToken(response.jwtToken);
        this.userAuthService.setUserId(response.user.userId);
        this.userAuthService.setName(response.user.name);

        // Un compte porte plusieurs rôles et l'ordre renvoyé par le serveur
        // n'est pas garanti (côté Java, `role` est un Set) : on cherche donc
        // le rôle d'administration dans toute la liste, jamais en position 0.
        const roleNames: string[] = (response.user.role || []).map((r: any) => r.roleName);
        const isAdmin = roleNames.includes('Admin') || roleNames.includes('BIBLIOTHECAIRE');
        this.router.navigate([isAdmin ? '/books' : '/reservations']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.getLoginErrorMessage(err);
      }
    });
  }

  /** Renvoie une clé de traduction : le message suit la langue de l'interface. */
  private getLoginErrorMessage(err: any): string {
    if (err.status === 0) return 'errors.network';
    if (err.status === 401) return 'auth.invalidCredentials';
    if (err.status === 403) return 'errors.forbidden';
    return 'errors.server';
  }
}
