import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { AuthService } from '../services/auth';

export const noAuthGuard: CanActivateFn = async (route) => {
  const supabase = inject(SupabaseService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const { data } = await supabase.auth.getSession();

  // Sin sesión: onboarding/login/register quedan libres
  if (!data.session) {
    return true;
  }

  // Hay sesión y ya está desbloqueada → no tiene sentido volver a onboarding/login
  if (authService.appUnlocked()) {
    router.navigate(['/home']);
    return false;
  }

  // Hay sesión pero SIN desbloquear: solo permitimos /login (pantalla de lock)
  if (route.routeConfig?.path === 'login') {
    return true;
  }

  // El usuario eligió usar contraseña → puede navegar a onboarding/register
  if (authService.passwordModeActive()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
