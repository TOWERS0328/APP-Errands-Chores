import { Injectable, signal, effect } from '@angular/core';
import { AppTheme } from '../models/profile';

export type ExtendedTheme = AppTheme | 'custom';

export interface ThemeVars {
  primary: string;
  primaryDark: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  bgDark: string;
  border: string;
  link: string;
  success: string;
  warning: string;
  danger: string;
}

export interface Theme {
  id: ExtendedTheme;
  name: string;
  colors: string[];
  icon: string;
  isPremium: boolean;
  vars: ThemeVars;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  currentTheme = signal<ExtendedTheme>('light');
  customVars = signal<Partial<ThemeVars>>({});

  readonly themes: Theme[] = [
    {
      id: 'light',
      name: 'Light',
      colors: ['#FFFFFF', '#534AB7', '#34C759'],
      icon: 'bi-sun',
      isPremium: false,
      vars: {
        primary: '#534AB7',
        primaryDark: '#41349a',
        bg: '#FFFFFF',
        surface: '#F8F9FF',
        text: '#111827',
        textMuted: '#6B7280',
        bgDark: '#0F1724',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
        border: '#E6E7F2',
        link: '#534AB7',
      }
    },
    {
      id: 'dark',
      name: 'Dark',
      colors: ['#0E0E0E', '#7F77DD', '#34C759'],
      icon: 'bi-moon',
      isPremium: true,
      vars: {
        primary: '#7F77DD',
        primaryDark: '#6b63c9',
        bg: '#0E0E0E',
        surface: '#121217',
        text: '#F3F4F6',
        textMuted: '#9CA3AF',
        bgDark: '#050507',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
        border: '#1F2937',
        link: '#A99FF8',
      }
    },
    {
      id: 'rose',
      name: 'Rosé',
      colors: ['#4C1D3D', '#DC586D', '#F7E6EA'],
      icon: 'bi-heart',
      isPremium: true,
      vars: {
        primary: '#DC586D',
        primaryDark: '#b94556',
        bg: '#4C1D3D',
        surface: '#5A2840',
        text: '#FFFFFF',
        textMuted: '#E7C9D1',
        bgDark: '#2b1220',
        success: '#34C759',
        warning: '#FFB57A',
        danger: '#FF3B30',
        border: '#6e2f45',
        link: '#FF7A95',
      }
    },
    {
      id: 'forest',
      name: 'Forest',
      colors: ['#0F2B1E', '#3C6848', '#CFEBD7'],
      icon: 'bi-tree',
      isPremium: true,
      vars: {
        primary: '#3C6848',
        primaryDark: '#32583f',
        bg: '#0F2B1E',
        surface: '#102E22',
        text: '#E6F5EA',
        textMuted: '#9DBFAE',
        bgDark: '#071912',
        success: '#2ECC71',
        warning: '#F59E0B',
        danger: '#E02424',
        border: '#16372B',
        link: '#7FC7A8',
      }
    },
    {
      id: 'latte',
      name: 'Latte',
      colors: ['#E8B8B4', '#901C22', '#6B3A2A'],
      icon: 'bi-cup',
      isPremium: true,
      vars: {
        primary: '#901C22',
        primaryDark: '#6f1418',
        bg: '#E8B8B4',
        surface: '#F4E6E5',
        text: '#2B0F0F',
        textMuted: '#6D4C4C',
        bgDark: '#3B1F1F',
        success: '#34C759',
        warning: '#D97706',
        danger: '#991B1B',
        border: '#E2CFCF',
        link: '#7A1B1F',
      }
    },
    {
      id: 'custom',
      name: 'Custom',
      colors: [],
      icon: 'bi-palette',
      isPremium: true,
      vars: {
        primary: '#534AB7',
        primaryDark: '#41349a',
        bg: '#FFFFFF',
        surface: '#F8F9FF',
        text: '#111827',
        textMuted: '#6B7280',
        bgDark: '#0F1724',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
        border: '#E6E7F2',
        link: '#534AB7',
      }
    }
  ];

  constructor() {
    const saved = localStorage.getItem('app-theme') as ExtendedTheme;
    const savedCustom = localStorage.getItem('app-theme-custom');

    if (savedCustom) {
      this.customVars.set(JSON.parse(savedCustom));
    }
    if (saved) {
      this.currentTheme.set(saved);
      this.applyTheme(saved);
    } else {
      this.applyTheme('light');
    }

    // Auto-aplicar cuando cambia el tema
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
      localStorage.setItem('app-theme', theme);
    });
  }

  // ── Cambiar tema ────────────────────────────────
  setTheme(themeId: ExtendedTheme) {
    this.currentTheme.set(themeId);
  }

  // ── Aplicar tema al DOM ─────────────────────────
  applyTheme(themeId: ExtendedTheme) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return;

    const vars = themeId === 'custom'
      ? { ...theme.vars, ...this.customVars() }
      : theme.vars;

    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);

    root.style.setProperty('--color-primary',     vars.primary);
    root.style.setProperty('--color-primary-dark', vars.primaryDark);
    root.style.setProperty('--color-bg',           vars.bg);
    root.style.setProperty('--color-surface',      vars.surface);
    root.style.setProperty('--color-text',         vars.text);
    root.style.setProperty('--color-text-muted',   vars.textMuted);
    root.style.setProperty('--color-bg-dark',      vars.bgDark);
    root.style.setProperty('--color-success',      vars.success);
    root.style.setProperty('--color-warning',      vars.warning);
    root.style.setProperty('--color-danger',       vars.danger);
    root.style.setProperty('--color-border',       vars.border);
    root.style.setProperty('--color-link',         vars.link);

    const textOnPrimary = this.getContrastText(vars.primary);
    root.style.setProperty('--color-text-on-primary', textOnPrimary);

    document.body.style.backgroundColor = vars.bg;
    document.body.style.color = vars.text;
  }

  // ── Guardar tema custom ─────────────────────────
  saveCustomTheme(vars: Partial<ThemeVars>) {
    const custom = this.themes.find(t => t.id === 'custom');
    if (!custom) return;

    const merged = { ...custom.vars, ...vars };
    custom.vars = merged;
    custom.colors = [merged.primary, merged.bg, merged.surface];

    this.customVars.set(vars);
    localStorage.setItem('app-theme-custom', JSON.stringify(vars));
    this.setTheme('custom');
  }

  // ── Obtener tema activo ─────────────────────────
  getActiveTheme(): Theme | undefined {
    return this.themes.find(t => t.id === this.currentTheme());
  }

  // ── Contrast helper ─────────────────────────────
  getContrastText(hex: string): string {
    try {
      const c = hex.replace('#', '');
      const full = c.length === 3
        ? c.split('').map(ch => ch + ch).join('')
        : c;
      const bigint = parseInt(full, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const srgb = [r, g, b].map(v => {
        const pv = v / 255;
        return pv <= 0.03928 ? pv / 12.92 : Math.pow((pv + 0.055) / 1.055, 2.4);
      });
      const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
      return lum > 0.5 ? '#000000' : '#FFFFFF';
    } catch {
      return '#000000';
    }
  }
}