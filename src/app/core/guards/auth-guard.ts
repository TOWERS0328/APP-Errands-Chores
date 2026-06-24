import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    router.navigate(['/onboarding']);
    return false;
  }

  // Hay sesión guardada, pero esta app aún no fue desbloqueada
  // en este arranque (huella o contraseña). Mandamos a /login
  // para que se desbloquee, en vez de pasar directo a /home.
  if (!authService.appUnlocked()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
