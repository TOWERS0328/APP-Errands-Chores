import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase';
import { Profile } from '../models/profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Estado reactivo del usuario
  currentUser = signal<any>(null);
  isLoading = signal<boolean>(false);
  isAuthenticated = signal<boolean>(false);

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initAuthState();
  }

  // ── Escuchar cambios de sesión ──────────────────
  private initAuthState() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.currentUser.set(session.user);
        this.isAuthenticated.set(true);
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
        options: {
          data: { full_name: displayName }
        }
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
      if (error) throw error;
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
      options: {
        redirectTo: window.location.origin + '/home'
      }
    });
    if (error) throw error;
  }

  // ── Cerrar sesión ───────────────────────────────
  async signOut() {
    await this.supabase.auth.signOut();
    await this.router.navigate(['/onboarding']);
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
}