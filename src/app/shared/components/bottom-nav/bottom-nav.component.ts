import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, IonIcon],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss'
})
export class BottomNavComponent {
  private router = inject(Router);

  hidden = signal(false);

  // Rutas donde el nav debe ocultarse
  private hiddenRoutes = [
    '/create-task',
    '/task/edit',
  ];

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects ?? e.url;
      this.hidden.set(this.hiddenRoutes.some(r => url.startsWith(r)));
    });
  }

  tabs = [
    { path: '/home',     icon: 'home-outline',        iconActive: 'home',         label: 'Home'     },
    { path: '/calendar', icon: 'calendar-outline',    iconActive: 'calendar',     label: 'Calendar' },
    { path: '/stats',    icon: 'stats-chart-outline', iconActive: 'stats-chart',  label: 'Stats'    },
    { path: '/settings', icon: 'settings-outline',    iconActive: 'settings',     label: 'Settings' },
  ];

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
