import { Injectable, computed, effect, signal } from '@angular/core';

const THEME_KEY = 'clothpos.theme';
const DARK_CLASS = 'dark-theme';

export type ThemeMode = 'light' | 'dark';

/**
 * Tracks the app's light/dark mode preference. Defaults to the user's last
 * choice (localStorage), falling back to their OS-level preference the
 * first time the app ever loads. The active mode is reflected onto
 * <html class="dark-theme"> so the Material 3 dark token block in
 * styles.scss (and every --color-* custom property override) applies
 * globally, without each component needing to know about theming.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly modeSignal = signal<ThemeMode>(this.readInitialMode());
  readonly mode = computed(() => this.modeSignal());
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  constructor() {
    effect(() => {
      const mode = this.modeSignal();
      document.documentElement.classList.toggle(DARK_CLASS, mode === 'dark');
      document.documentElement.style.colorScheme = mode;
      localStorage.setItem(THEME_KEY, mode);
    });
  }

  toggle(): void {
    this.modeSignal.set(this.isDark() ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
  }

  private readInitialMode(): ThemeMode {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
