import { Injectable, signal } from '@angular/core';
import { CelebrationMessage } from '../models/app-settings';

@Injectable({ providedIn: 'root' })
export class CelebrationService {
  // ── Estado reactivo ─────────────────────────────
  isVisible = signal<boolean>(false);
  currentMessage = signal<CelebrationMessage | null>(null);

  private hideTimeout: any = null;

  // ── Mensajes predefinidos ───────────────────────
  private messages: Record<string, CelebrationMessage[]> = {
    progress: [
      { title: 'Celebrate hitting 50% progress!', subtitle: 'Silver Badge collected!', emoji: '🏆', type: 'progress' },
      { title: 'Halfway there!', subtitle: 'Keep the momentum going!', emoji: '⚡', type: 'progress' },
      { title: '75% done!', subtitle: 'Almost at the finish line!', emoji: '🔥', type: 'progress' },
    ],
    complete: [
      { title: 'Nailed it right on the head!', subtitle: 'Task completed perfectly!', emoji: '🎯', type: 'complete' },
      { title: 'Task crushed!', subtitle: 'You are on a roll!', emoji: '💪', type: 'complete' },
      { title: 'Done and dusted!', subtitle: 'Another one bites the dust!', emoji: '✅', type: 'complete' },
      { title: 'Boom! Completed!', subtitle: 'Nothing can stop you!', emoji: '🚀', type: 'complete' },
    ],
    streak: [
      { title: '7-day streak!', subtitle: 'You are unstoppable!', emoji: '🔥', type: 'streak' },
      { title: 'Streak on fire!', subtitle: 'Keep it up every day!', emoji: '⚡', type: 'streak' },
    ],
    badge: [
      { title: 'New badge unlocked!', subtitle: 'Gold Badge collected!', emoji: '🥇', type: 'badge' },
      { title: 'Achievement unlocked!', subtitle: 'You earned a new badge!', emoji: '🏅', type: 'badge' },
    ]
  };

  // ── Mostrar celebración ─────────────────────────
  show(type: 'progress' | 'complete' | 'streak' | 'badge', custom?: Partial<CelebrationMessage>) {
    // Cancelar timeout anterior si hay uno activo
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    const pool = this.messages[type];
    const random = pool[Math.floor(Math.random() * pool.length)];

    const message: CelebrationMessage = {
      ...random,
      ...custom
    };

    this.currentMessage.set(message);
    this.isVisible.set(true);
    this.playSound(type);

    // Auto-cerrar en 3.5 segundos
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 3500);
  }

  // ── Ocultar ─────────────────────────────────────
  hide() {
    this.isVisible.set(false);
    setTimeout(() => this.currentMessage.set(null), 400);
  }

  // ── Disparadores automáticos ────────────────────
  onTaskCompleted(completedCount: number, totalCount: number) {
    const rate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    if (completedCount === 1) {
      this.show('complete');
    } else if (rate >= 50 && rate < 51) {
      this.show('progress', {
        title: 'Celebrate hitting 50% progress!',
        subtitle: 'Silver Badge collected!',
        emoji: '🏆'
      });
    } else if (rate >= 75 && rate < 76) {
      this.show('progress', {
        title: '75% done!',
        subtitle: 'Almost finished!',
        emoji: '🔥'
      });
    } else if (rate === 100) {
      this.show('badge', {
        title: 'All tasks done!',
        subtitle: 'Gold Badge collected!',
        emoji: '🥇'
      });
    } else {
      this.show('complete');
    }
  }

  onStreakAchieved(days: number) {
    this.show('streak', {
      title: `${days}-day streak!`,
      subtitle: 'You are unstoppable!',
      emoji: '🔥'
    });
  }

  // ── Sonido ──────────────────────────────────────
  private playSound(type: string) {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Sonido diferente según tipo
      if (type === 'complete') {
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);       // C5
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
      } else if (type === 'badge' || type === 'streak') {
        oscillator.frequency.setValueAtTime(784, ctx.currentTime);       // G5
        oscillator.frequency.setValueAtTime(988, ctx.currentTime + 0.1); // B5
        oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.2);// C6
      } else {
        oscillator.frequency.setValueAtTime(659, ctx.currentTime);       // E5
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.15);// G5
      }

      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Silenciar si el navegador bloquea AudioContext
    }
  }
}