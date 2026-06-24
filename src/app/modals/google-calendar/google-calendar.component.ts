import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonIcon, IonSpinner,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, logoGoogle, calendarOutline,
  checkmarkCircleOutline, syncOutline, trashOutline,
  alertCircleOutline, checkmarkOutline
} from 'ionicons/icons';

import { GoogleCalendarService } from '../../core/services/googleCalendar.service';

@Component({
  selector: 'app-google-calendar-modal',
  templateUrl: './google-calendar.component.html',
  styleUrls: ['./google-calendar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonIcon, IonSpinner,   // ← sin IonContent, igual que profile-edit
  ]
})
export class GoogleCalendarComponent implements OnInit {

  protected gcal    = inject(GoogleCalendarService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({
      closeOutline, logoGoogle, calendarOutline,
      checkmarkCircleOutline, syncOutline, trashOutline,
      alertCircleOutline, checkmarkOutline
    });
  }

  async ngOnInit() {
    await this.gcal.checkConnection();
  }

  async connect() {
    try {
      await this.gcal.connect();
      this.showToast('Google Calendar connected!', 'success');
    } catch (err: any) {
      this.showToast(err?.message ?? 'Connection error', 'danger');
    }
  }

  async sync() {
    try {
      await this.gcal.syncEvents();
      this.showToast('Events synced!', 'success');
    } catch (err: any) {
      this.showToast(err?.message ?? 'Sync error', 'danger');
    }
  }

  async disconnect() {
    await this.gcal.disconnect();
    this.showToast('Google Calendar disconnected', 'medium');
  }

  close() {
    this.modalCtrl.dismiss();
  }

  private async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({
      message, duration: 2500, color, position: 'bottom'
    });
    t.present();
  }
}
