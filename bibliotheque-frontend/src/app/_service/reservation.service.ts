import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Reservation, ReservationRequest } from '../_model/reservation';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  private baseURL = `${environment.apiUrl}/api/reservations`;

  constructor(private httpClient: HttpClient) { }

  getReservations(statut?: string): Observable<Reservation[]> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.httpClient.get<Reservation[]>(this.baseURL, { params });
  }

  getReservationById(id: number): Observable<Reservation> {
    return this.httpClient.get<Reservation>(`${this.baseURL}/${id}`);
  }

  /**
   * RS-04 : un ADHERENT ne transmet pas d'`adherentId` — le serveur déduit son
   * identité du token. On omet la clé au lieu de l'envoyer à `null` : le corps
   * d'un membre ne contient alors que le livre, et la requête ne peut pas être
   * relue comme « réserve pour l'adhérent null ». Seul un BIBLIOTHECAIRE, qui
   * choisit l'adhérent, envoie la clé.
   */
  createReservation(request: ReservationRequest): Observable<Reservation> {
    const corps: Partial<ReservationRequest> = { livreId: request.livreId };
    if (request.adherentId != null) {
      corps.adherentId = request.adherentId;
    }
    return this.httpClient.post<Reservation>(this.baseURL, corps);
  }

  /**
   * RS-04 : l'identité de l'appelant est déduite du token côté serveur.
   * Aucun `userId` n'est transmis — il serait falsifiable.
   */
  annulerReservation(id: number): Observable<Reservation> {
    return this.httpClient.patch<Reservation>(`${this.baseURL}/${id}/annuler`, null);
  }

  supprimerReservation(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseURL}/${id}`);
  }
}
