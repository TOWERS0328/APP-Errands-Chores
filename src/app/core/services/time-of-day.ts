import { Injectable, signal, effect } from '@angular/core';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TimeOfDayConfig {
  period: TimeOfDay;
  greeting: string;
  emoji: string;
  hour: number;
}

@Injectable({ providedIn: 'root' })
export class TimeOfDayService {
  private readonly config: TimeOfDayConfig[] = [
    { period: 'morning',   greeting: 'Good morning',   emoji: '🌅', hour: 5  },
    { period: 'afternoon', greeting: 'Good afternoon', emoji: '☀️', hour: 12 },
    { period: 'evening',   greeting: 'Good evening',   emoji: '🌇', hour: 18 },
    { period: 'night',     greeting: 'Good night',     emoji: '🌙', hour: 21 },
  ];

  current = signal<TimeOfDayConfig>(this.detect());

  constructor() {
    // Actualiza cada minuto
    setInterval(() => this.current.set(this.detect()), 60_000);
  }

  private detect(): TimeOfDayConfig {
    const hour = new Date().getHours();
    // Busca el último periodo cuyo `hour` sea <= hora actual
    const match = [...this.config]
      .reverse()
      .find(c => hour >= c.hour);
    return match ?? this.config[3]; // fallback: night
  }

  get greeting(): string {
    return this.current().greeting;
  }

  get emoji(): string {
    return this.current().emoji;
  }

  get period(): TimeOfDay {
    return this.current().period;
  }
}
