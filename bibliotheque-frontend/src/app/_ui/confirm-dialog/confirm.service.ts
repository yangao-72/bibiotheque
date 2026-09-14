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
  /**
   * Libellé du champ texte demandé (facultatif). Sa présence fait de la modale
   * une boîte « action + justification » plutôt qu'un simple oui/non — c'est le
   * cas de la suppression d'un compte, dont le motif est conservé pour l'audit.
   */
  inputLabelKey?: string;
  inputPlaceholderKey?: string;
  /** Interdit de confirmer tant que le champ est vide. */
  inputRequired?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  /** Vrai si la modale attend une saisie plutôt qu'un oui/non. */
  withInput: boolean;
  resolve: (value: boolean | string | null) => void;
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
      this.pending$.next({
        ...request,
        withInput: false,
        resolve: (value) => resolve(value as boolean)
      });
    });
  }

  /**
   * Variante avec justification : renvoie le texte saisi, ou {@code null} si
   * l'utilisateur annule. Le texte est déjà débarrassé de ses espaces de bord.
   */
  askWithInput(request: ConfirmRequest): Promise<string | null> {
    return new Promise<string | null>(resolve => {
      this.pending$.next({
        ...request,
        withInput: true,
        resolve: (value) => resolve(value as string | null)
      });
    });
  }

  /** Appelé par la modale. `confirmed` porte le choix de l'utilisateur. */
  close(confirmed: boolean, value = ''): void {
    const current = this.pending$.value;
    if (!current) {
      return;
    }
    this.pending$.next(null);
    current.resolve(current.withInput ? (confirmed ? value : null) : confirmed);
  }
}
