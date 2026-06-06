import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CelebrationService } from '../../../core/services/celebration';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-celebration-toast',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100px)', opacity: 0 }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in',
          style({ transform: 'translateY(100px)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    @if (celebration.isVisible() && celebration.currentMessage()) {
      <div class="celebration-toast" [@slideUp] (click)="celebration.hide()">
        <div class="toast-emoji">{{ celebration.currentMessage()!.emoji }}</div>
        <div class="toast-content">
          <div class="toast-title">{{ celebration.currentMessage()!.title }}</div>
          <div class="toast-subtitle">{{ celebration.currentMessage()!.subtitle }}</div>
        </div>
        <div class="toast-close">✕</div>
      </div>
    }
  `,
  styles: [`
    .celebration-toast {
      position: fixed;
      bottom: 100px;
      left: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--color-surface, #fff);
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      border-left: 4px solid var(--color-primary, #534AB7);
      cursor: pointer;
    }

    .toast-emoji {
      font-size: 28px;
      line-height: 1;
    }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text, #111);
      line-height: 1.3;
    }

    .toast-subtitle {
      font-size: 12px;
      color: var(--color-text-muted, #6B7280);
      margin-top: 2px;
    }

    .toast-close {
      font-size: 12px;
      color: var(--color-text-muted, #6B7280);
      padding: 4px;
    }
  `]
})
export class CelebrationToastComponent {
  celebration = inject(CelebrationService);
}