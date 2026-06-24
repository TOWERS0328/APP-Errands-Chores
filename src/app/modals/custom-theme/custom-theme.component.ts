// src/app/modals/custom-theme/custom-theme.component.ts
import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon,
  ModalController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkOutline, colorPaletteOutline,
  refreshOutline, eyeOutline, saveOutline
} from 'ionicons/icons';
import { ThemeService, ThemeVars } from '../../core/services/theme';

interface ColorInput {
  key: keyof ThemeVars;
  label: string;
  value: string;
  rawValue: string;
  error?: string;
}

// Default color values for reset
const DEFAULT_COLORS: Record<string, string> = {
  primary: '#534AB7',
  bg: '#FFFFFF',
  surface: '#F8F9FF',
  text: '#111827',
  success: '#34C759',
  danger: '#FF3B30',
};

// All editable keys
const EDITABLE_KEYS: (keyof ThemeVars)[] = [
  'primary', 'bg', 'surface', 'text', 'success', 'danger'
];

@Component({
  selector: 'app-custom-theme',
  templateUrl: './custom-theme.component.html',
  styleUrls: ['./custom-theme.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
     IonIcon
  ]
})
export class CustomThemeComponent {
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private themeSvc = inject(ThemeService);

  // Editable colors with labels
  colors = signal<ColorInput[]>(
    EDITABLE_KEYS.map(key => ({
      key,
      label: this.getLabelForKey(key),
      value: DEFAULT_COLORS[key] ?? '#000000',
      rawValue: DEFAULT_COLORS[key] ?? '#000000',
      error: '',
    }))
  );

  previewVars = signal<Partial<ThemeVars>>({});
  hasInvalidColors = computed(() => this.colors().some(c => !!c.error));

  constructor() {
    addIcons({
      closeOutline, checkmarkOutline, colorPaletteOutline,
      refreshOutline, eyeOutline, saveOutline
    });

    // Load existing custom theme if any
    const saved = this.themeSvc.customVars();
    if (saved && Object.keys(saved).length > 0) {
      this.colors.update(list =>
        list.map(c => {
          const raw = saved[c.key] ?? c.value;
          const normalized = this.normalizeHex(raw);
          return {
            ...c,
            value: normalized || c.value,
            rawValue: raw,
            error: normalized ? '' : (raw ? 'Invalid hex code' : ''),
          };
        })
      );
      this.previewVars.set(
  Object.entries(saved).reduce((acc, [key, value]) => {
    if (this.isValidHex(value as string)) {
      acc[key as keyof ThemeVars] = value as string;
    }
    return acc;
  }, {} as Partial<ThemeVars>)
);
    }

    // Auto-preview when colors change
    effect(() => {
      const vars: Partial<ThemeVars> = {};
      this.colors().forEach(c => {
        if (this.isValidHex(c.value)) {
          vars[c.key] = c.value;
        }
      });
      this.previewVars.set(vars);
      this.applyPreview(vars);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private getLabelForKey(key: keyof ThemeVars): string {
    const labels: Record<string, string> = {
      primary: 'Primary',
      bg: 'Background',
      surface: 'Surface',
      text: 'Text',
      success: 'Success',
      danger: 'Danger',
    };
    return labels[key] ?? key;
  }

  private isValidHex(value: string | undefined): boolean {
    if (!value) return false;
    return /^#[0-9A-F]{6}$/.test(value);
  }

  private normalizeHex(value: string): string {
    let hex = value.trim().toUpperCase();
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    if (/^#[0-9A-F]{3}$/.test(hex)) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return this.isValidHex(hex) ? hex : '';
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  updateColor(key: keyof ThemeVars, value: string, fromPicker = false) {
    const rawValue = value.trim().toUpperCase();
    const normalized = this.normalizeHex(rawValue);

    this.colors.update(list =>
      list.map(c => {
        if (c.key !== key) return c;
        if (fromPicker) {
          return {
            ...c,
            value: normalized || c.value,
            rawValue: normalized || c.rawValue,
            error: normalized ? '' : 'Invalid hex code',
          };
        }

        return {
          ...c,
          rawValue,
          value: normalized || c.value,
          error: normalized ? '' : 'Invalid hex code',
        };
      })
    );
  }

  applyPreview(vars: Partial<ThemeVars>) {
    this.themeSvc.saveCustomTheme(vars);
  }

  resetToDefaults() {
    this.colors.update(list =>
      list.map(c => ({
        ...c,
        value: DEFAULT_COLORS[c.key] ?? c.value,
        rawValue: DEFAULT_COLORS[c.key] ?? c.value,
        error: '',
      }))
    );
  }

  // ── TrackBy for *ngFor ───────────────────────────────────────────────────
  trackByColorKey(_index: number, color: ColorInput): string {
    return color.key;
  }

  // ── Save / Close Flow ────────────────────────────────────────────────────
  async confirmSave() {
    if (this.hasInvalidColors()) {
      const alert = await this.alertCtrl.create({
        cssClass: 'settings-alert',
        header: 'Invalid Theme Colors',
        message: 'Please fix any invalid hex codes before saving.',
        buttons: [
          { text: 'OK', role: 'cancel', cssClass: 'alert-btn-cancel' }
        ]
      });
      await alert.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      cssClass: 'settings-alert',
      header: 'Save Custom Theme',
      message: 'This will overwrite your current custom theme. Continue?',
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'alert-btn-cancel' },
        {
          text: 'Save',
          cssClass: 'alert-btn-confirm',
          handler: () => this.saveAndClose()
        }
      ]
    });
    await alert.present();
  }

  async confirmDiscard() {
    const alert = await this.alertCtrl.create({
      cssClass: 'settings-alert',
      header: 'Discard Changes',
      message: 'Your changes will be lost. Are you sure?',
      buttons: [
        { text: 'Keep Editing', role: 'cancel', cssClass: 'alert-btn-cancel' },
        {
          text: 'Discard',
          cssClass: 'alert-btn-danger',
          handler: () => this.closeWithoutSaving()
        }
      ]
    });
    await alert.present();
  }

  saveAndClose() {
    const vars: Partial<ThemeVars> = {};
    this.colors().forEach(c => {
      if (this.isValidHex(c.value)) {
        vars[c.key] = c.value;
      }
    });
    this.modalCtrl.dismiss({ saved: true, vars }, 'confirm');
  }

  closeWithoutSaving() {
    const saved = this.themeSvc.customVars();
    if (saved && Object.keys(saved).length > 0) {
      this.themeSvc.saveCustomTheme(saved);
    } else {
      this.themeSvc.setTheme('light');
    }
    this.modalCtrl.dismiss(null, 'cancel');
  }

  close() {
    this.confirmDiscard();
  }
}
