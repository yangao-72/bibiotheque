import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfirmRequest, ConfirmService } from './confirm.service';

/**
 * Modale de confirmation. Placée une seule fois, dans AppComponent.
 *
 * Accessibilité : `role="alertdialog"`, focus porté sur le bouton de
 * confirmation à l'ouverture, Échap annule, et le focus reste piégé dans la
 * modale tant qu'elle est ouverte.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {

  readonly request: Observable<ConfirmRequest | null>;

  @ViewChild('confirmButton') confirmButton?: ElementRef<HTMLButtonElement>;

  constructor(private confirmService: ConfirmService) {
    this.request = this.confirmService.pending;
  }

  /** Échap vaut annulation : c'est la convention attendue d'une boîte de dialogue. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.confirmService.close(false);
  }

  answer(confirmed: boolean): void {
    this.confirmService.close(confirmed);
  }

  /** Donne le focus au bouton de confirmation dès que la modale est rendue. */
  focusConfirm(): void {
    setTimeout(() => this.confirmButton?.nativeElement.focus(), 0);
  }
}
