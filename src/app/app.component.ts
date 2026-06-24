import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './core/services/theme';
import { CelebrationToastComponent } from './shared/components/celebration-toast/celebration-toast.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { SplashComponent } from './splash/splash.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CelebrationToastComponent, BottomNavComponent, SplashComponent, CommonModule],
  template: `
    @if (showSplash()) {
      <app-splash />
    }
    <ion-app [style.opacity]="showSplash() ? '0' : '1'">
      <ion-router-outlet />
      <app-celebration-toast />
      @if (showNav()) {
        <app-bottom-nav />
      }
    </ion-app>
  `
})
export class AppComponent implements OnInit {
  private router       = inject(Router);
  private themeService = inject(ThemeService);

  showNav    = signal(false);
  showSplash = signal(true);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const hideOn = ['/login', '/register', '/onboarding', '/task'];
        this.showNav.set(!hideOn.some(r => e.urlAfterRedirects.startsWith(r)));
      });
  }

  ngOnInit() {
    setTimeout(() => {
      this.showSplash.set(false);
    }, 2500);
  }
}
