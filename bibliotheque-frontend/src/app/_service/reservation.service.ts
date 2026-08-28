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

  createReservation(request: ReservationRequest): Observable<Reservation> {
    return this.httpClient.post<Reservation>(this.baseURL, request);
  }

  annulerReservation(id: number, userId: number): Observable<Reservation> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.httpClient.patch<Reservation>(`${this.baseURL}/${id}/annuler`, null, { params });
  }

  supprimerReservation(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseURL}/${id}`);
  }
}
