import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  /** Texte déjà traduit, ou clé de traduction si `translate` vaut true. */
  text: string;
  translate: boolean;
  params?: Record<string, unknown>;
  leaving?: boolean;
}

/**
 * Pile de notifications éphémères.
 *
 * Les toasts flottent au-dessus de la page : contrairement aux bandeaux
 * précédents, ils ne décalent jamais le contenu quand ils apparaissent.
 *
 * Les erreurs ne disparaissent pas toutes seules — on ne veut pas qu'un message
 * d'échec s'évapore avant que l'utilisateur l'ait lu.
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private static readonly AUTO_DISMISS_MS = 5000;

  private nextId = 1;
  private readonly toasts$ = new BehaviorSubject<Toast[]>([]);

  get toasts(): Observable<Toast[]> {
    return this.toasts$.asObservable();
  }

  /** Affiche une clé de traduction. À privilégier : le texte suit la langue. */
  showKey(kind: ToastKind, key: string, params?: Record<string, unknown>): number {
    return this.push({ kind, text: key, translate: true, params });
  }

  /** Affiche un texte déjà résolu (message renvoyé par le serveur, par exemple). */
  showText(kind: ToastKind, text: string): number {
    return this.push({ kind, text, translate: false });
  }

  success(key: string, params?: Record<string, unknown>): number {
    return this.showKey('success', key, params);
  }

  info(key: string, params?: Record<string, unknown>): number {
    return this.showKey('info', key, params);
  }

  warning(key: string, params?: Record<string, unknown>): number {
    return this.showKey('warning', key, params);
  }

  error(key: string, params?: Record<string, unknown>): number {
    return this.showKey('error', key, params);
  }

  dismiss(id: number): void {
    const current = this.toasts$.value;
    const target = current.find(t => t.id === id);
    if (!target || target.leaving) {
      return;
    }

    // On marque d'abord le toast comme sortant pour laisser jouer l'animation,
    // puis on le retire réellement de la pile.
    this.toasts$.next(current.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
    }, 180);
  }

  clear(): void {
    this.toasts$.next([]);
  }

  private push(toast: Omit<Toast, 'id'>): number {
    const id = this.nextId++;
    this.toasts$.next([...this.toasts$.value, { ...toast, id }]);

    if (toast.kind !== 'error') {
      setTimeout(() => this.dismiss(id), ToastService.AUTO_DISMISS_MS);
    }

    return id;
  }
}
