import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Toast, ToastService } from './toast.service';

/**
 * Rend la pile de toasts. Placé une seule fois, dans AppComponent.
 *
 * `aria-live="polite"` : les lecteurs d'écran annoncent les nouveaux messages
 * sans interrompre la lecture en cours.
 */
@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html'
})
export class ToastContainerComponent {

  readonly toasts: Observable<Toast[]>;

  private static readonly ICONS: Record<string, string> = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  constructor(private toastService: ToastService) {
    this.toasts = this.toastService.toasts;
  }

  icon(kind: string): string {
    return ToastContainerComponent.ICONS[kind] || 'fa-circle-info';
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  trackById(_index: number, toast: Toast): number {
    return toast.id;
  }
}
