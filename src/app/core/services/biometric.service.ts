import { Injectable } from '@angular/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const BIOMETRIC_KEY = 'errands_supabase_session';

export interface BiometricResult {
  token: string | null;
  cancelled: boolean;
}

@Injectable({ providedIn: 'root' })
export class BiometricService {

  async isAvailable(): Promise<boolean> {
    try {
      const result = await NativeBiometric.isAvailable();
      // strongBiometryIsAvailable asegura que sea huella/Face ID real, no PIN
      return result.isAvailable && result.strongBiometryIsAvailable;
    } catch (err: any) {
      console.error('Biometric check failed:', err?.code, err?.message ?? err);
      return false;
    }
  }

  async saveCredentials(refreshToken: string): Promise<void> {
    try {
      await NativeBiometric.setCredentials({
        username: 'supabase_user',
        password: refreshToken,
        server: BIOMETRIC_KEY,
      });
    } catch (err: any) {
      console.error('Error saving biometric credentials:', err?.code, err?.message ?? err);
      throw err;
    }
  }

  async getCredentialsWithBiometric(): Promise<BiometricResult> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      const isAndroid = Capacitor.getPlatform() === 'android';

      // 1. Verificar identidad primero
      await NativeBiometric.verifyIdentity({
        reason: 'Confirma tu identidad para iniciar sesión',
        title: 'Inicio rápido',
        subtitle: isAndroid ? 'Usa tu huella' : 'Usa Face ID o Touch ID',
        negativeButtonText: 'Cancelar',
        useFallback: true,
      });

      // 2. Obtener credenciales SOLO si la verificación fue exitosa
      const credentials = await NativeBiometric.getCredentials({
        server: BIOMETRIC_KEY,
      });

      return { token: credentials.password, cancelled: false };
    } catch (err: any) {
      const cancelled = this.isUserCancellation(err);
      console.error('Biometric error:', err?.code, err?.message ?? err, '| cancelled:', cancelled);
      return { token: null, cancelled };
    }
  }

  // Distingue "el usuario tocó Cancelar / cerró el prompt" de un
  // fallo real (huella no reconocida muchas veces, keychain vacío,
  // hardware no disponible, etc). Los códigos varían entre iOS y
  // Android, así que revisamos código y mensaje por las dudas.
  private isUserCancellation(err: any): boolean {
    const code = String(err?.code ?? '').toLowerCase();
    const message = String(err?.message ?? '').toLowerCase();

    return (
      code === '10' ||              // iOS LAError.userCancel
      code === '13' ||               // iOS LAError.appCancel
      code === '16' ||               // Android: negative button pressed
      code.includes('usercancel') ||
      code.includes('systemcancel') ||
      message.includes('cancel')
    );
  }

  async deleteCredentials(): Promise<void> {
    try {
      await NativeBiometric.deleteCredentials({ server: BIOMETRIC_KEY });
    } catch (err: any) {
      console.warn('Error deleting credentials:', err?.code, err?.message ?? err);
    }
  }

  async hasCredentials(): Promise<boolean> {
    try {
      // isCredentialsSaved es más confiable que getCredentials para verificar
      const result = await NativeBiometric.isCredentialsSaved({
        server: BIOMETRIC_KEY,
      });
      return result.isSaved;
    } catch (err: any) {
      console.warn('hasCredentials check failed:', err?.code, err?.message ?? err);
      return false;
    }
  }
}
