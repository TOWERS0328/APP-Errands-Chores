import { Injectable } from '@angular/core';
import { Notyf, NotyfOptions } from 'notyf';

@Injectable({
  providedIn: 'root',
})
export class Notification {
  private notyf: Notyf;

  constructor() {
    const opts: NotyfOptions = {
      duration: 3000,
      position: { x: 'right', y: 'top' },
    };
    this.notyf = new Notyf(opts);
  }

  success(message: string) {
    this.notyf.success(message);
  }

  error(message: string) {
    this.notyf.error(message);
  }

  open(message: string) {
    // Generic open uses success style by default
    this.notyf.open({ type: 'info', message } as any);
  }
}
