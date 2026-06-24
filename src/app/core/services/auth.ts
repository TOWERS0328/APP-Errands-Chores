import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { SupabaseService } from './supabase';
import { BiometricService } from './biometric.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<any>(null);
  isLoading = signal<boolean>(false);
  isAuthenticated = signal<boolean>(false);

  // Indica si la app fue desbloqueada en ESTE arranque del proceso
  // (con contraseña o biometría). Vive solo en memoria: al matar
  // y reabrir la app vuelve a false aunque la sesión de Supabase
  // siga siendo válida. Esto es lo que fuerza a pasar por /login
  // (y ofrecer biometría) cada vez que se reabre la app.
  appUnlocked = signal<boolean>(false);

  // true cuando el usuario eligió usar contraseña en lugar de biometría
  // desde la lock screen. Permite navegar a /onboarding y /register
  // aunque haya sesión sin desbloquear. Se resetea al hacer login exitoso.
  passwordModeActive = signal<boolean>(false);

  // Token pendiente para ofrecer biometría desde /home
  pendingBiometricToken: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private biometricService: BiometricService,
    private alertCtrl: AlertController
  ) {
    this.initAuthState();
  }

  // ── Escuchar cambios de sesión ──────────────────
  private initAuthState() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        this.currentUser.set(session.user);
        this.isAuthenticated.set(true);

        // Mantener sincronizado el refresh token guardado en biometría.
        // Supabase rota el refresh token (es de un solo uso): si no lo
        // actualizamos aquí, el token guardado en el keychain queda
        // obsoleto en cuanto Supabase refresca la sesión en segundo plano,
        // y el login con huella/Face ID empieza a fallar con "already used".
        if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session.refresh_token) {
          try {
            const hasBio = await this.biometricService.hasCredentials();
            if (hasBio) {
              await this.biometricService.saveCredentials(session.refresh_token);
              console.log('[Auth] refresh_token sincronizado con biometría (evento:', event, ')');
            }
          } catch (err) {
            console.warn('[Auth] No se pudo sincronizar el refresh token con biometría:', err);
          }
        }
      } else {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
      }
    });
  }

  // ── Registro con email ──────────────────────────
  async signUp(email: string, password: string, displayName: string) {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName } }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Login con email ─────────────────────────────
  async signIn(email: string, password: string) {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('refresh_token:', data.session?.refresh_token ?? 'NULL');

      if (error) throw error;

      // Guardar token ANTES de navegar — el alert se muestra desde /home
      if (data.session?.refresh_token) {
        this.pendingBiometricToken = data.session.refresh_token;
      }

      this.appUnlocked.set(true);
      this.passwordModeActive.set(false); // limpiar al desbloquear

      await this.router.navigate(['/home']);
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Login con Google ────────────────────────────
  async signInWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/home' }
    });
    if (error) throw error;
    this.appUnlocked.set(true);
    this.passwordModeActive.set(false); // limpiar al desbloquear
  }

  // ── Llamar desde /home en ngOnInit ──────────────
  async checkAndOfferBiometric() {
    // Caso 1: viene de login con email
    if (this.pendingBiometricToken) {
      const token = this.pendingBiometricToken;
      this.pendingBiometricToken = null;
      await this.syncOrOfferBiometric(token);
      return;
    }
    // Caso 2: viene de redirect OAuth de Google
    const session = await this.getSession();
    if (session?.refresh_token) {
      await this.syncOrOfferBiometric(session.refresh_token);
    }
  }

  // ── Login con biometría ─────────────────────────
  // Devuelve 'success' | 'cancelled' | 'failed' para que la UI pueda
  // distinguir entre un error real y que el usuario canceló a propósito
  // (tocó "Cancelar" en el prompt nativo). Solo 'failed' debe mostrar
  // un mensaje de error al usuario.
  async signInWithBiometric(): Promise<'success' | 'cancelled' | 'failed'> {
    const { token, cancelled } = await this.biometricService.getCredentialsWithBiometric();
    if (!token) return cancelled ? 'cancelled' : 'failed';

    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: token
      });

      if (error) {
        console.error('[Auth] refreshSession falló:', error.message, (error as any).status);
      }

      if (error || !data.session) return 'failed';

      await this.biometricService.saveCredentials(data.session.refresh_token);
      this.currentUser.set(data.session.user);
      this.isAuthenticated.set(true);
      this.appUnlocked.set(true);
      this.passwordModeActive.set(false); // limpiar al desbloquear

      await this.router.navigate(['/home']);
      return 'success';
    } catch (err) {
      console.error('[Auth] Excepción en signInWithBiometric:', err);
      return 'failed';
    }
  }

  // ── Cerrar sesión ───────────────────────────────
  // No borramos las credenciales biométricas aquí a propósito:
  // el usuario debe poder volver a entrar con huella/Face ID
  // después de cerrar sesión. Solo se borran explícitamente
  // desde disableBiometric() o al eliminar la cuenta.
  async signOut() {
    await this.supabase.auth.signOut();
    this.appUnlocked.set(false);
    this.passwordModeActive.set(false);
    await this.router.navigate(['/onboarding']);
  }

  // ── Desactivar huella manualmente ───────────────
  async disableBiometric(): Promise<void> {
    await this.biometricService.deleteCredentials();
  }

  // ── Obtener sesión actual ───────────────────────
  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  // ── Obtener usuario actual ──────────────────────
  async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  // ── Resetear contraseña ─────────────────────────
  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) throw error;
  }

  // ── Eliminar cuenta ─────────────────────────────
  async deleteAccount(): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error('No authenticated user');

    try {
      await this.supabase.from('tasks').delete().eq('user_id', user.id);
      await this.supabase.from('tags').delete().eq('user_id', user.id);
      await this.supabase.from('profiles').delete().eq('id', user.id);
      await this.supabase.from('google_calendar_tokens').delete().eq('user_id', user.id);
    } catch (err) {
      console.warn('Error deleting user data:', err);
    }

    const { error } = await this.supabase.client.functions.invoke('delete-user', {
      body: { user_id: user.id }
    });

    if (error) throw new Error('Could not delete account. Please contact support.');

    await this.biometricService.deleteCredentials();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.appUnlocked.set(false);
    this.passwordModeActive.set(false);
    await this.router.navigate(['/onboarding']);
  }

  // ── Privado: decide si actualizar en silencio u ofrecer activar ──
  private async syncOrOfferBiometric(refreshToken: string): Promise<void> {
    const available = await this.biometricService.isAvailable();
    console.log('[Auth] biometric available:', available);
    if (!available) return;

    const alreadySaved = await this.biometricService.hasCredentials();
    console.log('[Auth] alreadySaved:', alreadySaved);

    if (alreadySaved) {
      // Ya estaba activada: NO mostrar el alert otra vez, pero SÍ
      // refrescar el token guardado con el que acabamos de recibir en
      // este login. Antes esto se saltaba por completo y el keychain
      // se quedaba con el token original, que eventualmente quedaba
      // inválido y rompía el login con huella.
      try {
        await this.biometricService.saveCredentials(refreshToken);
        console.log('[Auth] Token biométrico re-sincronizado tras login con password');
      } catch (err) {
        console.warn('[Auth] No se pudo re-sincronizar el token biométrico:', err);
      }
      return;
    }

    await this.offerBiometricIfNeeded(refreshToken);
  }

  // ── Privado: ofrecer activar biometría (solo primera vez) ──────
  private async offerBiometricIfNeeded(refreshToken: string): Promise<void> {
    console.log('=== offerBiometricIfNeeded ===');

    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform();
    console.log('platform:', platform);

    const message = platform === 'android'
      ? 'Would you like to enable fingerprint to sign in faster next time?'
      : 'Would you like to enable Face ID to sign in faster next time?';

    const tokenToSave = refreshToken;

    return new Promise<void>(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Quick Sign In',
        message,
        buttons: [
          {
            text: 'Not now',
            role: 'cancel',
            handler: () => {
              console.log('Not now');
              resolve();
            }
          },
          {
            text: 'Enable',
            handler: () => {
              console.log('Enable tapped — saving...');
              this.biometricService.saveCredentials(tokenToSave)
                .then(() => { console.log('✅ Saved'); resolve(); })
                .catch((err) => { console.error('❌ Error:', err); resolve(); });
              return true;
            }
          }
        ]
      });
      await alert.present();
      console.log('Alert shown');
    });
  }
}
