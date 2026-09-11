import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { UserAuthService } from '../_service/user-auth.service';
import { UsersService } from '../_service/users.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {

  @Input() isOpen = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  name = '';
  /** Clé de traduction du rôle affiché, résolue dans le template. */
  roleKey = 'roles.user';

  constructor(
    private userAuthService: UserAuthService,
    private router: Router,
    public userService: UsersService
  ) { }

  ngOnInit(): void {
    this.name = this.userAuthService.getName() || '';
    this.roleKey = this.userService.roleMatch(['BIBLIOTHECAIRE', 'Admin'])
      ? 'roles.librarian'
      : 'roles.member';
  }

  public isLoggedIn(): boolean {
    return !!this.userAuthService.isLoggedIn();
  }

  public logout(): void {
    this.userAuthService.clear();
    this.router.navigate(['/']);
  }

  public isAdmin(): boolean {
    return this.userService.roleMatch(['Admin']);
  }

  public isUser(): boolean {
    return this.userService.roleMatch(['User']);
  }

  /** Le module réservation est ouvert aux rôles ADHERENT et BIBLIOTHECAIRE. */
  public peutVoirLesReservations(): boolean {
    return this.userService.roleMatch(['ADHERENT', 'BIBLIOTHECAIRE']);
  }

  onToggle(): void {
    this.toggleSidebar.emit();
  }
}
