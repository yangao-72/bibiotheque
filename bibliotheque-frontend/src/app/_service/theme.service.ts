import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly STORAGE_KEY = 'bibliogest-dark-mode';

  constructor() {
    this.applyInitialTheme();
  }

  private applyInitialTheme(): void {
    const isDark = this.isDarkMode();
    this.applyTheme(isDark);
  }

  isDarkMode(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    // Default: check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  toggleDarkMode(): boolean {
    const isDark = !this.isDarkMode();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(isDark));
    this.applyTheme(isDark);
    return isDark;
  }

  setDarkMode(isDark: boolean): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(isDark));
    this.applyTheme(isDark);
  }

  private applyTheme(isDark: boolean): void {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }
}
