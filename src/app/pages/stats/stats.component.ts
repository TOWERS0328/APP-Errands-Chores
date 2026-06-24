import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonModal, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline, closeOutline, timeOutline,
  checkmarkCircleOutline, ellipseOutline,
  chevronBackOutline, chevronForwardOutline,
} from 'ionicons/icons';

import { TaskService } from '../../core/services/task';
import { AuthService } from '../../core/services/auth';
import { TagService } from '../../core/services/tag';
import { Task, Priority } from '../../core/models/task';

interface DayBar {
  label: string;
  count: number;
  isToday: boolean;
  dateStr: string;
}

interface CategoryStat {
  label: string;
  color: string;
  completed: number;
  total: number;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonModal, IonIcon,
  ]
})
export class StatsComponent implements OnInit {

  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private tagService  = inject(TagService);

  tasks = this.taskService.tasks;

  // ── Week navigation ───────────────────────────────
  weekOffset = signal<number>(0);  // 0 = esta semana, -1 = semana pasada, 1 = próxima

  weekLabel = computed(() => {
    const offset = this.weekOffset();
    if (offset === 0) return 'This week';
    const start = this.getWeekStart(offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}–${end.getDate()}`;
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  });

  // ── Modal state ───────────────────────────────────
  selectedDayBar = signal<DayBar | null>(null);

  dayTasks = computed(() => {
    const bar = this.selectedDayBar();
    if (!bar) return [];
    return this.tasks()
      .filter(t => t.due_date === bar.dateStr)
      .sort((a, b) => (a.due_time || '23:59').localeCompare(b.due_time || '23:59'));
  });

  // ── Streak ────────────────────────────────────────
  streak = computed(() => this.calcStreak(this.tasks()));

  streakDays = computed(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = this.toDateStr(d);
      const hasCompleted = this.tasks().some(
        t => t.due_date === dateStr && t.status === 'completed'
      );
      return {
        label: ['S','M','T','W','T','F','S'][d.getDay()],
        active: hasCompleted,
        isToday: i === 6,
      };
    });
  });

  // ── Weekly chart ──────────────────────────────────
  weekBars = computed((): DayBar[] => {
    const start = this.getWeekStart(this.weekOffset());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = this.toDateStr(d);
      const count = this.tasks().filter(
        t => t.due_date === dateStr && t.status === 'completed'
      ).length;
      const todayStr = this.toDateStr(new Date());
      return {
        label: ['S','M','T','W','T','F','S'][d.getDay()],
        count,
        isToday: dateStr === todayStr,
        dateStr,
      };
    });
  });

  maxBarCount = computed(() =>
    Math.max(1, ...this.weekBars().map(b => b.count))
  );

  // ── Summary stats ─────────────────────────────────
  completedTotal = computed(() =>
    this.tasks().filter(t => t.status === 'completed').length
  );

  pendingToday = computed(() => {
    const today = this.toDateStr(new Date());
    return this.tasks().filter(
      t => t.due_date === today && t.status === 'pending'
    ).length;
  });

  completionRate = computed(() => {
    const total = this.tasks().length;
    if (!total) return 0;
    return Math.round((this.completedTotal() / total) * 100);
  });

  avgPerDay = computed(() => {
    const completed = this.tasks().filter(t => t.status === 'completed');
    if (!completed.length) return '0';
    const dates = new Set(completed.map(t => t.due_date).filter(Boolean));
    return (completed.length / Math.max(1, dates.size)).toFixed(1);
  });

  // ── Categories: desde TagService ──────────────────
  categoryStats = computed((): CategoryStat[] => {
    const tags = this.tagService.tags();
    const tasks = this.tasks();

    return tags.map(tag => {
      const tagTasks = tasks.filter(t =>
        t.tags?.some(taskTag => taskTag.label === tag.label)
      );
      return {
        label: tag.label,
        color: tag.color,
        completed: tagTasks.filter(t => t.status === 'completed').length,
        total: tagTasks.length,
      };
    }).filter(cat => cat.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  });

  maxCategoryTotal = computed(() =>
    Math.max(1, ...this.categoryStats().map(c => c.total))
  );

  constructor() {
    addIcons({
      calendarOutline, closeOutline, timeOutline,
      checkmarkCircleOutline, ellipseOutline,
      chevronBackOutline, chevronForwardOutline,
    });
  }

  // ── Lifecycle ─────────────────────────────────────
  async ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      await this.taskService.loadTasks(user.id);
      await this.tagService.loadTags();
    }
  }

  // ── Week navigation ───────────────────────────────
  prevWeek() {
    this.weekOffset.update(v => v - 1);
  }

  nextWeek() {
    this.weekOffset.update(v => v + 1);
  }

  private getWeekStart(offset: number): Date {
    const today = new Date();
    const currentDay = today.getDay(); // 0=Sun, 1=Mon...
    const start = new Date(today);
    // Ir al domingo de la semana actual
    start.setDate(today.getDate() - currentDay);
    // Aplicar offset de semanas
    start.setDate(start.getDate() + (offset * 7));
    return start;
  }

  // ── Modal actions ─────────────────────────────────
  openDayTasks(bar: DayBar) {
    this.selectedDayBar.set(bar);
  }

  async toggleTaskStatus(task: Task) {
    task.status === 'pending'
      ? await this.taskService.completeTask(task.id)
      : await this.taskService.reopenTask(task.id);
  }

  // ── Helpers ───────────────────────────────────────
  barHeight(count: number): number {
    return Math.round((count / this.maxBarCount()) * 100);
  }

  categoryWidth(cat: CategoryStat): number {
    return Math.round((cat.completed / Math.max(1, cat.total)) * 100);
  }

  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day)
      .toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getPriorityColor(priority: Priority): string {
    return { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }[priority];
  }

  getPriorityLabel(priority: Priority): string {
    return { high: 'High', medium: 'Medium', low: 'Low' }[priority];
  }

  formatTime(time?: string): string {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  private calcStreak(tasks: Task[]): number {
    const completedDates = new Set(
      tasks
        .filter(t => t.status === 'completed' && t.due_date)
        .map(t => t.due_date!)
    );

    let streak = 0;
    const d = new Date();
    while (true) {
      const dateStr = this.toDateStr(d);
      if (completedDates.has(dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  private toDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  trackByLabel(_: number, item: { label: string }) {
    return item.label;
  }

  trackByTask(_: number, task: Task) {
    return task.id;
  }
}
