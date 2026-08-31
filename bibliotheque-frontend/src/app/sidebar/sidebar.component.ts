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
  role = '';

  constructor(
    private userAuthService: UserAuthService,
    private router: Router,
    public userService: UsersService
  ) { }

  ngOnInit(): void {
    this.name = this.userAuthService.getName() || 'Utilisateur';
    const roles: any[] = this.userAuthService.getRoles();
    this.role = roles?.includes('Admin') ? 'Administrateur' : 'Utilisateur';
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

  onToggle(): void {
    this.toggleSidebar.emit();
  }
}
