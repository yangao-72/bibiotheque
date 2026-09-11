import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
  code: string;
  label: string;
  flag: string;
}

/**
 * Pilote la langue de l'interface.
 *
 * La langue choisie est mémorisée dans le localStorage : elle survit au
 * rechargement et à la déconnexion. À la première visite, on suit la langue
 * du navigateur si elle est supportée, sinon on retombe sur le français.
 */
@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  static readonly DEFAULT_LANGUAGE = 'fr';

  static readonly AVAILABLE: Language[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  private readonly STORAGE_KEY = 'bibliogest-language';

  constructor(private translate: TranslateService) { }

  /** Appelé une fois au démarrage de l'application. */
  init(): void {
    const codes = LanguageService.AVAILABLE.map(l => l.code);
    this.translate.addLangs(codes);
    this.translate.setDefaultLang(LanguageService.DEFAULT_LANGUAGE);
    this.use(this.currentLanguage());
  }

  get available(): Language[] {
    return LanguageService.AVAILABLE;
  }

  currentLanguage(): string {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored && this.isSupported(stored)) {
      return stored;
    }
    return this.browserLanguage();
  }

  current(): Language {
    const code = this.currentLanguage();
    return LanguageService.AVAILABLE.find(l => l.code === code)
      || LanguageService.AVAILABLE[0];
  }

  use(code: string): void {
    const target = this.isSupported(code) ? code : LanguageService.DEFAULT_LANGUAGE;
    localStorage.setItem(this.STORAGE_KEY, target);
    this.translate.use(target);
    // L'attribut lang conditionne la césure, la synthèse vocale et le choix
    // des guillemets par le navigateur : il doit suivre la langue affichée.
    document.documentElement.setAttribute('lang', target);
  }

  private isSupported(code: string): boolean {
    return LanguageService.AVAILABLE.some(l => l.code === code);
  }

  private browserLanguage(): string {
    const browser = this.translate.getBrowserLang();
    return browser && this.isSupported(browser)
      ? browser
      : LanguageService.DEFAULT_LANGUAGE;
  }
}
