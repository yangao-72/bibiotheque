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
    if (!loginForm.value.username || !loginForm.value.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
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

        const role = response.user.role[0].roleName;
        if (role === 'Admin') {
          this.router.navigate(['/books']);
        } else {
          this.router.navigate(['/borrow-book']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.getLoginErrorMessage(err);
      }
    });
  }

  private getLoginErrorMessage(err: any): string {
    if (err.status === 0) return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    if (err.status === 401) return 'Identifiant ou mot de passe incorrect.';
    if (err.status === 403) return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
    if (err.error?.message) return err.error.message;
    return 'Une erreur est survenue lors de la connexion.';
  }
}
