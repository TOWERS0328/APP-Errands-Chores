// src/app/modals/language-picker/language-picker.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons,
  IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, globeOutline, closeOutline } from 'ionicons/icons';

interface LanguageOption {
  code: 'en' | 'es';
  label: string;
  native: string;
  flag: string;
}

@Component({
  selector: 'app-language-picker',
  templateUrl: './language-picker.component.html',
  styleUrls: ['./language-picker.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonIcon
  ]
})
export class LanguagePickerComponent {
  private modalCtrl = inject(ModalController);

  selected = signal<'en' | 'es'>('en');

  languages: LanguageOption[] = [
    { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', native: 'Español', flag: '🇨🇴' },
  ];

  constructor() {
    addIcons({ checkmarkOutline, globeOutline, closeOutline });
  }

  selectLanguage(lang: 'en' | 'es') {
    this.selected.set(lang);
    setTimeout(() => {
      this.modalCtrl.dismiss({ language: lang }, 'confirm');
    }, 250);
  }

  close() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
