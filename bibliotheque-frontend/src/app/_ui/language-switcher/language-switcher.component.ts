import { Component, ElementRef, HostListener } from '@angular/core';
import { Language, LanguageService } from '../../_service/language.service';

/**
 * Sélecteur de langue de la barre supérieure.
 * Le choix est appliqué immédiatement, sans rechargement de page.
 */
@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.css']
})
export class LanguageSwitcherComponent {

  isOpen = false;

  constructor(
    private languageService: LanguageService,
    private elementRef: ElementRef
  ) { }

  get languages(): Language[] {
    return this.languageService.available;
  }

  get current(): Language {
    return this.languageService.current();
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  select(code: string): void {
    this.languageService.use(code);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen = false;
  }
}
