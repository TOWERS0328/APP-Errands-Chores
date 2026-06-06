import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './core/services/theme';
import { CelebrationToastComponent } from './shared/components/celebration-toast/celebration-toast.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <ion-app>
      <ion-router-outlet />
      <app-celebration-toast />
      @if (showNav()) {
        <app-bottom-nav />
      }
    </ion-app>
  `
})
export class AppComponent {
  private router       = inject(Router);
  private themeService = inject(ThemeService);

  showNav = signal(false);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const hideOn = ['/login', '/register', '/onboarding', '/task'];
        this.showNav.set(!hideOn.some(r => e.urlAfterRedirects.startsWith(r)));
      });
  }
}
