import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { noAuthGuard } from './core/guards/no-auth-guard';

const routes: Routes = [
  // Ruta raíz
  {
    path: '',
    redirectTo: 'onboarding',
    pathMatch: 'full'
  },

  // Sin auth
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding.component')
        .then(m => m.OnboardingComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component')
        .then(m => m.LoginComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component')
        .then(m => m.RegisterComponent),
    canActivate: [noAuthGuard]
  },

  // Con auth
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.component')
        .then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./pages/calendar/calendar.component')
        .then(m => m.CalendarComponent),
    canActivate: [authGuard]
  },
  {
    path: 'create-task',
    loadComponent: () =>
      import('./pages/create-task/create-task.component')
        .then(m => m.CreateTaskComponent),
    canActivate: [authGuard]
  },
  {
    path: 'task/:id',
    loadComponent: () =>
      import('./pages/task-detail/task-detail.component')
        .then(m => m.TaskDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stats',
    loadComponent: () =>
      import('./pages/stats/stats.component')
        .then(m => m.StatsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component')
        .then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'onboarding'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
