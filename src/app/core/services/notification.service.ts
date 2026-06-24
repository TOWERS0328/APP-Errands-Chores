import { Injectable } from '@angular/core';
import { Notyf } from 'notyf';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notyf: Notyf;

  constructor() {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' },
      types: [
        {
          type: 'info',
          background: '#3b82f6',
          dismissible: true,
        },
        {
          type: 'warning',
          background: '#f59e0b',
          dismissible: true,
        },
      ],
    });
  }

  success(message: string) {
    this.notyf.success(message);
  }

  error(message: string) {
    this.notyf.error(message);
  }

  info(message: string) {
    this.notyf.open({ type: 'info', message });
  }

  warning(message: string) {
    this.notyf.open({ type: 'warning', message });
  }
}
