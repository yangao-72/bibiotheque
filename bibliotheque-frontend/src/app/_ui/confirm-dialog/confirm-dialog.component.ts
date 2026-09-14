import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfirmRequest, ConfirmService } from './confirm.service';

/**
 * Modale de confirmation. Placée une seule fois, dans AppComponent.
 *
 * Accessibilité : `role="alertdialog"`, focus porté sur le champ de saisie (ou
 * sur le bouton de confirmation à défaut), Échap annule, et le focus reste piégé
 * dans la modale tant qu'elle est ouverte.
 *
 * Elle sert deux usages : le oui/non (`ask`) et l'action justifiée (`askWithInput`),
 * où l'utilisateur doit saisir un motif — supprimer un compte, par exemple, dont
 * le motif est conservé pour l'audit.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {

  /** Requête courante, `null` quand la modale est fermée. */
  request: ConfirmRequest | null = null;

  /** Texte saisi, remis à zéro à chaque ouverture. */
  value = '';

  @ViewChild('confirmButton') confirmButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('inputField') inputField?: ElementRef<HTMLTextAreaElement>;

  private subscription?: Subscription;

  constructor(private confirmService: ConfirmService) { }

  ngOnInit(): void {
    this.subscription = this.confirmService.pending.subscribe((req) => {
      this.request = req;
      // Chaque boîte repart d'un champ vide : le motif de la précédente ne doit
      // pas se retrouver pré-rempli sous les yeux de l'utilisateur suivant.
      this.value = '';
      this.focusConfirm();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Échap vaut annulation : c'est la convention attendue d'une boîte de dialogue. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.confirmService.close(false);
  }

  answer(confirmed: boolean): void {
    this.confirmService.close(confirmed, this.value.trim());
  }

  /** Une saisie obligatoire laissée vide bloque la confirmation. */
  get canConfirm(): boolean {
    return !this.request?.inputRequired || this.value.trim().length > 0;
  }

  /** Donne le focus au champ (ou au bouton) dès que la modale est rendue. */
  focusConfirm(): void {
    setTimeout(() => {
      if (this.request?.inputLabelKey) {
        this.inputField?.nativeElement.focus();
      } else {
        this.confirmButton?.nativeElement.focus();
      }
    }, 0);
  }
}
