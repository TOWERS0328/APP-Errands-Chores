import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService, ExtendedTheme } from '../../core/services/theme';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class OnboardingComponent {
  themeService = inject(ThemeService);
  private router = inject(Router);

  particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    style: `
      width: ${Math.random() * 60 + 10}px;
      height: ${Math.random() * 60 + 10}px;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      opacity: ${Math.random() * 0.08 + 0.03};
    `
  }));

  mockTasks = [
    { color: '#FF3B30', done: true },
    { color: '#FF9500', done: false },
    { color: '#34C759', done: true },
  ];

  selectTheme(themeId: ExtendedTheme) {
    this.themeService.setTheme(themeId);
  }

  getThemeName(): string {
    const theme = this.themeService.themes.find(
      t => t.id === this.themeService.currentTheme()
    );
    return theme?.name || 'Light';
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
