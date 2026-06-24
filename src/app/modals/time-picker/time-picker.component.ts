// src/app/modals/time-picker/time-picker.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonIcon, IonDatetime,
  ModalController
} from '@ionic/angular/standalone';
import type { DatetimeChangeEventDetail } from '@ionic/core';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkOutline, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-time-picker',
  templateUrl: './time-picker.component.html',
  styleUrls: ['./time-picker.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonIcon, IonDatetime
  ]
})
export class TimePickerComponent {
  private modalCtrl = inject(ModalController);

  selectedTime = signal<string>('09:00');

  constructor() {
    addIcons({ closeOutline, checkmarkOutline, timeOutline });
  }

  setTime(event: CustomEvent<DatetimeChangeEventDetail>) {
    const value = event.detail.value;

    if (typeof value === 'string' && value) {
      this.selectedTime.set(value);
    } else if (Array.isArray(value) && value.length > 0 && value[0]) {
      this.selectedTime.set(value[0]);
    }
  }

  confirm() {
    this.modalCtrl.dismiss({ time: this.selectedTime() }, 'confirm');
  }

  close() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
