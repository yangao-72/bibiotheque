import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Borrow } from '../_model/borrow';
import { environment } from '../../environments/environment';

/**
 * Emprunts et retours.
 *
 * La sécurité est rendue par le serveur, pas ici :
 * - `borrowBook` / `returnBook` agissent sur l'emprunteur du token pour un
 *   adhérent (le `userId` envoyé est écrasé côté serveur), sur n'importe qui
 *   pour le bibliothécaire ;
 * - `getBorrowList` et `getBookBorrowHistory` sont réservés au personnel : en
 *   les appelant pour un adhérent, on récolte un 403 et une redirection vers
 *   /forbidden (voir `DashboardComponent`, qui ne les déclenche que si `isAdmin`).
 */
@Injectable({
  providedIn: 'root'
})
export class BorrowService {

  private baseURL = `${environment.apiUrl}/borrow`;

  constructor(private httpClient: HttpClient) { }

  getBorrowList(): Observable<Borrow[]> {
    return this.httpClient.get<Borrow[]>(`${this.baseURL}`);
  }

  borrowBook(borrow: Borrow): Observable<Object> {
    return this.httpClient.post(`${this.baseURL}`, borrow);
  }

  returnBook(borrow: Borrow): Observable<Object> {
    return this.httpClient.put(`${this.baseURL}`, borrow);
  }

  getBooksBorrowedByUser(userId: number): Observable<Borrow[]> {
    return this.httpClient.get<Borrow[]>(`${this.baseURL}/user/${userId}`);
  }

  getBookBorrowHistory(bookId: number): Observable<Borrow[]> {
    return this.httpClient.get<Borrow[]>(`${this.baseURL}/book/${bookId}`);
  }
}
