import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { BiometricService } from '../../../core/services/biometric.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonIcon, CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  private biometricService = inject(BiometricService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = signal(false);
  errorMsg = signal('');
  biometricAvailable = signal(false);
  hasBiometricCredentials = signal(false);
  showBiometricSheet = signal(false);

  // true cuando ya había una sesión activa de Supabase guardada
  // (reapertura de la app) y solo falta desbloquear con huella.
  isLockScreen = signal(false);
  // true mientras se está mostrando el prompt nativo de biometría,
  // para evitar doble-tap o auto-disparos duplicados.
  checkingBiometric = signal(false);

  async ngOnInit() {
    const { Capacitor } = await import('@capacitor/core');

    // En browser: NO mostrar biometría (el plugin no funciona en web)
    if (!Capacitor.isNativePlatform()) {
      this.biometricAvailable.set(false);
      this.hasBiometricCredentials.set(false);
      return;
    }

    // En nativo: verificar si hay biometría disponible y credenciales guardadas
    const available = await this.biometricService.isAvailable();
    this.biometricAvailable.set(available);
    this.hasBiometricCredentials.set(await this.biometricService.hasCredentials());

    // Caso "reabrir la app": ya hay una sesión de Supabase guardada
    // (el authGuard nos mandó aquí porque appUnlocked = false) y el
    // usuario tiene biometría activa. Mostramos la pantalla de
    // desbloqueo y disparamos el prompt de huella automáticamente.
    const session = await this.authService.getSession();
    if (session && this.hasBiometricCredentials()) {
      this.isLockScreen.set(true);
      await this.handleBiometricTap();
    }
  }

  async handleBiometricTap() {
    if (!this.hasBiometricCredentials()) {
      this.showBiometricSheet.set(true);
      return;
    }
    if (this.checkingBiometric()) return;

    this.checkingBiometric.set(true);
    this.errorMsg.set('');
    const result = await this.authService.signInWithBiometric();
    this.checkingBiometric.set(false);

    if (result === 'failed') {
      this.errorMsg.set('Biometric sign in failed. Please use your password.');
      this.isLockScreen.set(false);
    } else if (result === 'cancelled') {
      // El usuario canceló el prompt a propósito (tocó "Cancelar" o
      // cerró el diálogo nativo) — no es un error, no mostramos nada.
      // Lo dejamos en el formulario normal de email/contraseña.
      this.isLockScreen.set(false);
    }
    // 'success' → signInWithBiometric() ya navegó a /home
  }

  usePasswordInstead() {
    this.isLockScreen.set(false);
    this.errorMsg.set('');
    this.authService.passwordModeActive.set(true); // habilitar navegación libre
  }

  async disableBiometric() {
    const confirmed = confirm('Remove saved fingerprint/Face ID sign-in? You can enable it again next time you log in with your password.');
    if (!confirmed) return;

    await this.authService.disableBiometric();
    this.hasBiometricCredentials.set(false);
  }

  closeSheetAndFocus() {
    this.showBiometricSheet.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async signIn() {
    if (!this.email || !this.password) return;
    this.errorMsg.set('');
    const { error } = await this.authService.signIn(this.email, this.password);
    if (error) {
      this.errorMsg.set(error);
    } else {
      // Refrescar estado biométrico tras login exitoso
      this.hasBiometricCredentials.set(await this.biometricService.hasCredentials());
    }
  }

  async signInWithGoogle() {
    try {
      await this.authService.signInWithGoogle();
    } catch (err: any) {
      this.errorMsg.set(err.message);
    }
  }

  async forgotPassword() {
    if (!this.email) {
      this.errorMsg.set('Enter your email first');
      return;
    }
    try {
      await this.authService.resetPassword(this.email);
      this.errorMsg.set('');
      alert('Check your email for reset instructions');
    } catch (err: any) {
      this.errorMsg.set(err.message);
    }
  }

  goBack() {
    this.router.navigate(['/onboarding']);
  }
}
