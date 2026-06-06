import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ExtendedTheme } from '../../../core/services/theme';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-switcher.component.html',
  styleUrl: './theme-switcher.component.scss'
})
export class ThemeSwitcherComponent {
  themeService = inject(ThemeService);

  themes: { id: ExtendedTheme; label: string; color: string }[] = [
    { id: 'light',  label: 'Light',  color: '#FFFFFF' },
    { id: 'dark',   label: 'Dark',   color: '#1C1C1E' },
    { id: 'rose',   label: 'Rosé',   color: '#FF2D55' },
    { id: 'forest', label: 'Forest', color: '#34C759' },
    { id: 'latte',  label: 'Latte',  color: '#C69B7B' },
    { id: 'custom', label: 'Custom', color: '#534AB7' },
  ];
}
