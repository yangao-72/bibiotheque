import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { Users } from '../_model/users';
import { UserAuthService } from './user-auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private baseURL = `${environment.apiUrl}/admin/users`;
  requestHeader = new HttpHeaders(
    { 'No-Auth': 'True' }
  );

  constructor(
    private httpClient: HttpClient,
    private userAuthService: UserAuthService
  ) { }

  public login(loginData: NgForm) {
    return this.httpClient.post(`${environment.apiUrl}/authenticate`, loginData, {
      headers: this.requestHeader,
    });
  }

  /**
   * Vrai si l'utilisateur connecté possède au moins un des rôles attendus.
   *
   * Un compte porte désormais plusieurs rôles (ex. « Admin » + « BIBLIOTHECAIRE ») :
   * toutes les combinaisons doivent donc être parcourues avant de conclure.
   */
  public roleMatch(allowedRoles: any): boolean {
    const userRoles: any = this.userAuthService.getRoles();

    if (!userRoles || !allowedRoles) {
      return false;
    }

    return userRoles.some((userRole: any) =>
      allowedRoles.some((allowedRole: string) => userRole?.roleName === allowedRole)
    );
  }

  /**
   * Liste des comptes. Par défaut les comptes supprimés sont exclus — c'est la
   * liste utilisée pour choisir l'adhérent d'une réservation. `inclureDesactives`
   * les fait réapparaître, pour que l'écran Adhérents puisse rouvrir leur fiche.
   */
  getUsersList(inclureDesactives = false): Observable<Users[]> {
    let params = new HttpParams();
    if (inclureDesactives) {
      params = params.set('inclureDesactives', 'true');
    }
    return this.httpClient.get<Users[]>(`${this.baseURL}`, { params });
  }

  createUser(user: Users): Observable<Object> {
    return this.httpClient.post(`${this.baseURL}`, user);
  }

  getUserById(userId: number): Observable<Users> {
    return this.httpClient.get<Users>(`${this.baseURL}/${userId}`);
  }

  updateUser(userId: number, user: Users): Observable<Object> {
    return this.httpClient.put(`${this.baseURL}/${userId}`, user);
  }

  /**
   * Suppression d'un compte : réservée au rôle Admin.
   *
   * Le serveur la met en œuvre en **suppression logique** : le compte est
   * désactivé (plus de connexion, absent de la liste) mais ses réservations et
   * emprunts restent en base. Il refuse (409) un adhérent qui a encore un
   * emprunt en cours, ainsi que l'auto-suppression.
   *
   * Le `motif` est conservé avec la date du retrait pour l'audit. Il passe par
   * la query string : le corps d'un DELETE est supprimé par certains
   * intermédiaires HTTP.
   */
  deleteUser(userId: number, motif?: string): Observable<void> {
    let params = new HttpParams();
    if (motif && motif.trim()) {
      params = params.set('motif', motif.trim());
    }
    return this.httpClient.delete<void>(`${this.baseURL}/${userId}`, { params });
  }

  /**
   * Réintègre un compte supprimé : réservé au rôle Admin. Les rôles et les
   * réservations du compte n'ont jamais été touchés, il retrouve donc ses accès.
   */
  reactivateUser(userId: number): Observable<Users> {
    return this.httpClient.patch<Users>(`${this.baseURL}/${userId}/reactiver`, null);
  }

}
