import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConfirmRequest {
  /** Clés de traduction, résolues au moment de l'affichage. */
  titleKey: string;
  textKey: string;
  params?: Record<string, unknown>;
  confirmKey?: string;
  cancelKey?: string;
  /** Habille la modale en rouge et met le focus sur l'action destructrice. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (confirmed: boolean) => void;
}

/**
 * Remplace `window.confirm()`.
 *
 * La boîte native ne peut être ni traduite, ni mise aux couleurs de
 * l'application, ni rendue accessible. Ce service expose la même ergonomie
 * (une promesse booléenne) avec une modale maison.
 *
 *   const ok = await this.confirm.ask({ titleKey: '…', textKey: '…' });
 */
@Injectable({
  providedIn: 'root'
})
export class ConfirmService {

  private readonly pending$ = new BehaviorSubject<PendingConfirm | null>(null);

  get pending(): Observable<PendingConfirm | null> {
    return this.pending$.asObservable();
  }

  ask(request: ConfirmRequest): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.pending$.next({ ...request, resolve });
    });
  }

  /** Appelé par la modale. `confirmed` porte le choix de l'utilisateur. */
  close(confirmed: boolean): void {
    const current = this.pending$.value;
    if (!current) {
      return;
    }
    this.pending$.next(null);
    current.resolve(confirmed);
  }
}
