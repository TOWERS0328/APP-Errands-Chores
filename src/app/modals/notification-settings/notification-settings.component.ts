// src/app/modals/notification-settings/notification-settings.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkOutline, notificationsOutline,
  mailOutline, phonePortraitOutline, timeOutline,
  alertCircleOutline
} from 'ionicons/icons';

interface NotificationChannel {
  id: 'push' | 'email';
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-notification-settings',
  templateUrl: './notification-settings.component.html',
  styleUrls: ['./notification-settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonIcon
  ]
})
export class NotificationSettingsComponent {
  private modalCtrl = inject(ModalController);

  channels = signal<NotificationChannel[]>([
    {
      id: 'push',
      title: 'Push Notifications',
      description: 'Receive alerts on your device',
      icon: 'phone-portrait-outline',
      enabled: true
    },
    {
      id: 'email',
      title: 'Email Notifications',
      description: 'Receive updates via email',
      icon: 'mail-outline',
      enabled: false
    }
  ]);

  quietHoursEnabled = signal<boolean>(false);
  quietHoursStart = signal<string>('22:00');
  quietHoursEnd = signal<string>('07:00');

  constructor() {
    addIcons({
      closeOutline, checkmarkOutline, notificationsOutline,
      mailOutline, phonePortraitOutline, timeOutline,
      alertCircleOutline
    });
  }

  toggleChannel(id: 'push' | 'email') {
    this.channels.update(list =>
      list.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
  }

  toggleQuietHours() {
    this.quietHoursEnabled.update(v => !v);
  }

  setQuietHours(type: 'start' | 'end', value: string) {
    if (type === 'start') {
      this.quietHoursStart.set(value);
    } else {
      this.quietHoursEnd.set(value);
    }
  }

  confirm() {
    this.modalCtrl.dismiss({
      channels: this.channels(),
      quietHours: {
        enabled: this.quietHoursEnabled(),
        start: this.quietHoursStart(),
        end: this.quietHoursEnd()
      }
    }, 'confirm');
  }

  close() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
