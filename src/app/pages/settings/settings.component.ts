// src/app/pages/settings/settings.component.ts
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonRefresher, IonRefresherContent, IonSkeletonText,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, mailOutline, notificationsOutline, timeOutline,
  globeOutline, chevronForwardOutline, logOutOutline, colorPaletteOutline,
  gridOutline, phonePortraitOutline, checkmarkOutline, cameraOutline,
  informationCircleOutline, cardOutline, flashOutline, lockClosedOutline,
  trashOutline, logoGoogle, calendarOutline, shieldCheckmarkOutline,
  eyeOutline, eyeOffOutline, keyOutline,
} from 'ionicons/icons';
import { IonIcon } from '@ionic/angular/standalone';
import { Notyf } from 'notyf';

import { AuthService }         from '../../core/services/auth';
import { ProfileService }      from '../../core/services/profile';
import { ThemeService, Theme } from '../../core/services/theme';
import { NavVisibilityService } from '../../core/services/nav-visibility';
import { AppTheme, AppLanguage } from '../../core/models/profile';

import { LanguagePickerComponent }       from '../../modals/language-picker/language-picker.component';
import { TimePickerComponent }           from '../../modals/time-picker/time-picker.component';
import { NotificationSettingsComponent } from '../../modals/notification-settings/notification-settings.component';
import { WidgetPreviewComponent }        from '../../modals/widget-preview/widget-preview.component';
import { CustomThemeComponent }          from '../../modals/custom-theme/custom-theme.component';
import { GoogleCalendarComponent }       from '../../modals/google-calendar/google-calendar.component';
import { ProfileEditComponent }          from '../../shared/components/profile-edit/profile-edit.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonIcon,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonRefresher, IonRefresherContent, IonSkeletonText,
  ],
})
export class SettingsComponent implements OnInit {

  private auth       = inject(AuthService);
  private profileSvc = inject(ProfileService);
  private themeSvc   = inject(ThemeService);
  private modalCtrl  = inject(ModalController);
  private navVisibility = inject(NavVisibilityService);

  profile     = this.profileSvc.profile;
  currentUser = this.auth.currentUser;
  isLoading   = signal(false);
  isSaving    = signal(false);

  themes      = this.themeSvc.themes;
  activeTheme = this.themeSvc.currentTheme;

  displayName  = computed(() => this.profile()?.display_name ?? 'User');
  userEmail    = computed(() => this.currentUser()?.email ?? '');
  avatarUrl    = computed(() => this.profile()?.avatar_url ?? null);
  avatarLetter = computed(() =>
    (this.profile()?.display_name?.[0] ?? this.userEmail()[0] ?? 'U').toUpperCase()
  );
  notifEnabled  = computed(() => this.profile()?.notifications_enabled ?? false);
  reminderTime  = computed(() => this.profile()?.reminder_time ?? '09:00');
  language      = computed(() => this.profile()?.language ?? 'en');

  languageLabel = computed(() =>
    ({ en: 'English', es: 'Español' }[this.language()] ?? 'English')
  );

  reminderLabel = computed(() => {
    const t = this.reminderTime();
    if (!t) return '9:00 AM';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  });

  appVersion = 'v1.0.0';

  // ── Modales de confirmación ────────────────────────────────────────────────
  showSignOutModal  = signal(false);
  showDeleteModal   = signal(false);
  showPasswordModal = signal(false);
  showThemeModal    = signal(false);
  showSubModal      = signal(false);
  pendingTheme      = signal<Theme | null>(null);
  deleteEmailInput  = '';
  deleteEmailError  = signal('');

  private isOpeningCustomTheme = false;

  private notyf = new Notyf({
    duration: 3000,
    position: { x: 'right', y: 'top' },
    types: [
      { type: 'success', background: '#534AB7', icon: { className: 'notyf-icon', tagName: 'span', text: '✅' } },
      { type: 'warning', background: '#F59E0B', icon: { className: 'notyf-icon', tagName: 'span', text: '⚠️' } },
      { type: 'error',   background: '#EF4444', icon: { className: 'notyf-icon', tagName: 'span', text: '❌' } },
    ]
  });

  constructor() {
    addIcons({
      personOutline, mailOutline, notificationsOutline, timeOutline,
      globeOutline, chevronForwardOutline, logOutOutline, colorPaletteOutline,
      gridOutline, phonePortraitOutline, checkmarkOutline, cameraOutline,
      informationCircleOutline, cardOutline, flashOutline, lockClosedOutline,
      trashOutline, logoGoogle, calendarOutline, shieldCheckmarkOutline,
      eyeOutline, eyeOffOutline, keyOutline,
    });
  }

  async ngOnInit() {
    this.isLoading.set(true);
    try {
      await this.profileSvc.loadProfile();
    } catch {
      this.showToast('Could not load profile', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleRefresh(event: any) {
    try { await this.profileSvc.loadProfile(); } catch {}
    event.target.complete();
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  async selectTheme(theme: Theme) {
    if (theme.id === 'custom') { await this.openCustomTheme(); return; }
    this.navVisibility.hide();
    this.pendingTheme.set(theme);
    this.showThemeModal.set(true);
  }

  cancelTheme() {
    this.showThemeModal.set(false);
    this.pendingTheme.set(null);
    this.navVisibility.show();
  }

  async applyTheme() {
    const theme = this.pendingTheme();
    if (!theme) return;
    this.showThemeModal.set(false);
    this.navVisibility.show();
    this.themeSvc.setTheme(theme.id);
    try {
      await this.profileSvc.updateProfile({ theme: theme.id as AppTheme });
      this.showToast(`Theme "${theme.name}" applied`, 'success');
    } catch {
      this.showToast('Could not save theme', 'danger');
    }
    this.pendingTheme.set(null);
  }

  // ── Custom theme modal ────────────────────────────────────────────────────
  async openCustomTheme() {
    if (this.isOpeningCustomTheme) return;
    this.isOpeningCustomTheme = true;
    this.navVisibility.hide();

    const previousTheme = this.themeSvc.currentTheme();

    const modal = await this.modalCtrl.create({
      component: CustomThemeComponent,
      cssClass: 'fullscreen-ion-modal',
      backdropDismiss: false,
    });

    await modal.present();
    this.isOpeningCustomTheme = false;

    const { data, role } = await modal.onWillDismiss();
    this.navVisibility.show();

    if (role === 'confirm' && data?.saved) {
      this.showToast('Custom theme saved!', 'success');
    } else {
      if (previousTheme !== 'custom') {
        this.themeSvc.setTheme(previousTheme);
      }
    }
  }

  // ── Editar perfil ─────────────────────────────────────────────────────────
  async editProfile() {
    this.navVisibility.hide();
    const modal = await this.modalCtrl.create({
      component: ProfileEditComponent,
      cssClass: 'profile-edit-modal',
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    this.navVisibility.show();
    if (role === 'confirm' && data?.saved) {
      this.showToast('Perfil actualizado', 'success');
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  changePassword() {
    this.navVisibility.hide();
    this.showPasswordModal.set(true);
  }
  cancelPassword() {
    this.navVisibility.show();
    this.showPasswordModal.set(false);
  }

  async doSendResetLink() {
    this.showPasswordModal.set(false);
    this.navVisibility.show();
    try {
      await this.auth.resetPassword(this.userEmail());
      this.showToast('Reset link sent to your email', 'success');
    } catch {
      this.showToast('Could not send reset link', 'danger');
    }
  }

  // ── Notifications toggle ──────────────────────────────────────────────────
  async toggleNotifications() {
    const newVal = !this.notifEnabled();
    try {
      await this.profileSvc.updateProfile({ notifications_enabled: newVal });
      this.showToast(
        newVal ? 'Notifications enabled' : 'Notifications disabled',
        newVal ? 'success' : 'medium'
      );
    } catch {
      this.showToast('Could not update setting', 'danger');
    }
  }

  // ── Push notifications modal ──────────────────────────────────────────────
  async openNotificationSettings() {
    this.navVisibility.hide();
    const modal = await this.modalCtrl.create({
      component: NotificationSettingsComponent,
      cssClass: 'settings-card-modal',
      backdropDismiss: true,
    });
    await modal.present();
    await modal.onWillDismiss();
    this.navVisibility.show();
  }

  // ── Reminder time picker ──────────────────────────────────────────────────
  async openTimePicker() {
    this.navVisibility.hide();
    const modal = await this.modalCtrl.create({
      component: TimePickerComponent,
      componentProps: { value: this.reminderTime() },
      cssClass: 'settings-card-modal',
      backdropDismiss: true,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    this.navVisibility.show();
    if (data?.time) {
      try {
        await this.profileSvc.updateProfile({ reminder_time: data.time });
        this.showToast('Reminder time saved', 'success');
      } catch {
        this.showToast('Could not save reminder time', 'danger');
      }
    }
  }

  // ── Language picker ───────────────────────────────────────────────────────
  async openLanguagePicker() {
    this.navVisibility.hide();
    const modal = await this.modalCtrl.create({
      component: LanguagePickerComponent,
      componentProps: { selected: this.language() },
      cssClass: 'settings-card-modal',
      backdropDismiss: true,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    this.navVisibility.show();
    if (data?.language) {
      try {
        await this.profileSvc.updateProfile({ language: data.language as AppLanguage });
        this.showToast('Language updated', 'success');
      } catch {
        this.showToast('Could not save language', 'danger');
      }
    }
  }

  // ── Google Calendar ───────────────────────────────────────────────────────
  async openGoogleCalendar() {
    this.navVisibility.hide();
    const modal = await this.modalCtrl.create({
      component: GoogleCalendarComponent,
      cssClass: 'settings-card-modal',
      backdropDismiss: true,
    });
    await modal.present();
    await modal.onWillDismiss();
    this.navVisibility.show();
  }

  // ── Widget preview ────────────────────────────────────────────────────────
  async openWidgetPreview() {
    this.navVisibility.hide();
    const modal = await this.modalCtrl.create({
      component: WidgetPreviewComponent,
      cssClass: 'settings-card-modal',
      backdropDismiss: true,
    });
    await modal.present();
    await modal.onWillDismiss();
    this.navVisibility.show();
  }

  // ── Subscription ─────────────────────────────────────────────────────────
  openSubscription() {
    this.navVisibility.hide();
    this.showSubModal.set(true);
  }
  cancelSubscription() {
    this.navVisibility.show();
    this.showSubModal.set(false);
  }
  doUpgrade() {
    this.showSubModal.set(false);
    this.navVisibility.show();
    this.showToast('Coming soon!', 'medium');
  }

  // ── Delete account ────────────────────────────────────────────────────────
  confirmDeleteAccount() {
    this.navVisibility.hide();
    this.deleteEmailInput = '';
    this.deleteEmailError.set('');
    this.showDeleteModal.set(true);
  }
  cancelDelete() {
    this.navVisibility.show();
    this.showDeleteModal.set(false);
  }

  async doDeleteAccount() {
    if (this.deleteEmailInput !== this.userEmail()) {
      this.deleteEmailError.set('Email does not match');
      return;
    }
    this.showDeleteModal.set(false);
    this.navVisibility.show();
    try {
      await this.auth.deleteAccount();
    } catch {
      this.showToast('Could not delete account. Try again.', 'danger');
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  confirmSignOut() {
    this.navVisibility.hide();
    this.showSignOutModal.set(true);
  }
  cancelSignOut() {
    this.navVisibility.show();
    this.showSignOutModal.set(false);
  }
  async doSignOut() {
    this.showSignOutModal.set(false);
    this.navVisibility.show();
    await this.auth.signOut();
  }

  // ── Toast (Notyf) ─────────────────────────────────────────────────────────
  private showToast(message: string, color: 'success' | 'danger' | 'medium') {
    if (color === 'success') this.notyf.success(message);
    else if (color === 'danger') this.notyf.error(message);
    else (this.notyf as any).open({ type: 'warning', message });
  }

  trackById(_: number, t: Theme) { return t.id; }
}
