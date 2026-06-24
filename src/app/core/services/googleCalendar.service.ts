import { Injectable, signal, inject } from '@angular/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  isConnected  = signal(false);
  isConnecting = signal(false);
  isSyncing    = signal(false);

  private async showToast(message: string, color: string = 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // Llamar al abrir el modal de Settings
  async checkConnection() {
    const user = this.authService.currentUser();
    if (!user) return;
    const { data } = await this.supabase
      .from('google_calendar_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    this.isConnected.set(!!data);
  }

  // Botón "Conectar con Google" → abre el selector nativo de cuentas
  async connect() {
    const user = this.authService.currentUser();
    if (!user) {
      await this.showToast('ERROR: No autenticado en Supabase', 'danger');
      throw new Error('No autenticado');
    }

    this.isConnecting.set(true);
    try {
      await this.showToast('1. Iniciando Google SignIn...', 'medium');

      const googleUser: any = await GoogleAuth.signIn();

      const serverAuthCode = googleUser?.serverAuthCode;
      const authCode = googleUser?.authentication?.code;
      const hasServerAuth = !!serverAuthCode;
      const hasAuthCode = !!authCode;

      await this.showToast(
        `2. serverAuthCode: ${hasServerAuth ? 'SI' : 'NO'} | auth.code: ${hasAuthCode ? 'SI' : 'NO'}`,
        hasServerAuth ? 'success' : 'warning'
      );

      if (!serverAuthCode && !authCode) {
        await this.showToast('3. ERROR: No se obtuvo ningún código de Google', 'danger');
        throw new Error('No se obtuvo autorización de Google');
      }

      const codeToSend = serverAuthCode || authCode;

      await this.showToast('3. Llamando Edge Function...', 'medium');

      const { data, error } = await this.supabase.client.functions.invoke('connect-google-calendar', {
        body: { user_id: user.id, server_auth_code: codeToSend }
      });

      if (error) {
        await this.showToast(`4. ERROR Edge Function: ${JSON.stringify(error).slice(0, 100)}`, 'danger');
        throw error;
      }

      await this.showToast('4. SUCCESS: Conectado!', 'success');
      this.isConnected.set(true);

    } catch (err: any) {
      await this.showToast(`ERROR FINAL: ${err?.message || JSON.stringify(err).slice(0, 100)}`, 'danger');
      throw err;
    } finally {
      this.isConnecting.set(false);
    }
  }

  // Botón "Desconectar"
  async disconnect() {
    const user = this.authService.currentUser();
    if (!user) return;
    try { await GoogleAuth.signOut(); } catch {}
    await this.supabase.from('google_calendar_tokens').delete().eq('user_id', user.id);
    this.isConnected.set(false);
  }

  // Botón "Sincronizar ahora"
  async syncEvents() {
    const user = this.authService.currentUser();
    if (!user) return [];
    this.isSyncing.set(true);
    try {
      const { data, error } = await this.supabase.client.functions.invoke('sync-google-calendar', {
        body: { user_id: user.id }
      });
      if (error) throw error;
      return data?.events ?? [];
    } finally {
      this.isSyncing.set(false);
    }
  }
}
