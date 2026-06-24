// src/app/modals/widget-preview/widget-preview.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, documentTextOutline, calendarOutline, flameOutline } from 'ionicons/icons';

interface WidgetOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-widget-preview',
  templateUrl: './widget-preview.component.html',
  styleUrls: ['./widget-preview.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonIcon
  ]
})
export class WidgetPreviewComponent {
  private modalCtrl = inject(ModalController);

  widgets = signal<WidgetOption[]>([
    {
      id: 'task-summary',
      title: 'Task Summary',
      description: 'Overview of all tasks',
      icon: 'document-text-outline',
      enabled: true
    },
    {
      id: 'today-tasks',
      title: 'Today Tasks',
      description: 'Tasks due today',
      icon: 'calendar-outline',
      enabled: false
    },
    {
      id: 'streak',
      title: 'Streak',
      description: 'Your current streak',
      icon: 'flame-outline',
      enabled: true
    }
  ]);

  constructor() {
    addIcons({ closeOutline, documentTextOutline, calendarOutline, flameOutline });
  }

  toggleWidget(id: string) {
    this.widgets.update(list =>
      list.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w)
    );
  }

  close() {
    this.modalCtrl.dismiss({ widgets: this.widgets() }, 'confirm');
  }
}
