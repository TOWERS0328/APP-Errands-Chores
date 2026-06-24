// src/app/pages/calendar/calendar.component.ts
import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonIcon,
  IonModal, IonButtons,
  IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline, chevronForwardOutline, closeOutline,
  calendarOutline, timeOutline, flagOutline, pricetagOutline,
  checkmarkCircleOutline, ellipseOutline, trashOutline,
  createOutline, searchOutline,
  checkmarkDoneOutline, alertCircleOutline, filterOutline,
  chevronDownOutline, imageOutline, documentTextOutline,
} from 'ionicons/icons';
import { Notyf } from 'notyf';

import { TaskService } from '../../core/services/task';
import { AuthService } from '../../core/services/auth';
import { Task, Priority } from '../../core/models/task';

interface CalendarDay {
  date: Date;
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  taskCount: number;
  hasPending: boolean;
  hasCompleted: boolean;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonIcon,
    IonModal, IonButtons,
    IonRefresher, IonRefresherContent,
  ]
})
export class CalendarComponent implements OnInit {

  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  // ── Calendar state ────────────────────────────────
  currentDate  = signal<Date>(new Date());
  selectedDate = signal<Date>(new Date());
  calendarDays = signal<CalendarDay[]>([]);

  // ── UI state ──────────────────────────────────────
  searchQuery         = signal<string>('');
  priorityFilter      = signal<string>('all');
  showTaskDetail      = signal<Task | null>(null);

  tasks     = this.taskService.tasks;

  // ── Helpers computados ────────────────────────────
  selectedDateStr = computed(() => this.getLocalDateStr(this.selectedDate()));

  // ── Search: busca en TODAS las tareas (no solo del día seleccionado) ───
  selectedDateTasks = computed(() => {
    const query    = this.searchQuery().trim().toLowerCase();
    const priority = this.priorityFilter();

    let result = this.tasks();

    // Si hay búsqueda, busca en todas las tareas por título, descripción y tags
    if (query) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some(tag => tag.label.toLowerCase().includes(query)))
      );
    } else {
      // Sin búsqueda: muestra solo las del día seleccionado
      const dateStr = this.selectedDateStr();
      result = result.filter(t => t.due_date === dateStr);
    }

    if (priority !== 'all') result = result.filter(t => t.priority === priority);

    return result.sort((a, b) => (a.due_time || '23:59').localeCompare(b.due_time || '23:59'));
  });

  currentMonthLabel = computed(() =>
    this.currentDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );

  selectedDateLabel = computed(() => {
    const query = this.searchQuery().trim();
    if (query) {
      return `Search: "${query}"`;
    }
    const d = this.selectedDate();
    const isToday = this.toDateStr(d) === this.getLocalDateStr(new Date());
    if (isToday) return 'Today';
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  });

  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  filterOptions = [
    { k: 'all',    l: 'All'    },
    { k: 'high',   l: '🔴 High'   },
    { k: 'medium', l: '🟡 Med' },
    { k: 'low',    l: '🟢 Low'    },
  ];

  private notyf = new Notyf({
    duration: 2500,
    position: { x: 'right', y: 'top' },
    types: [
      { type: 'success', background: '#534AB7', icon: { className: 'notyf-icon', tagName: 'span', text: '✅' } },
      { type: 'error',   background: '#EF4444', icon: { className: 'notyf-icon', tagName: 'span', text: '❌' } },
    ]
  });

  constructor() {
    addIcons({
      chevronBackOutline, chevronForwardOutline, closeOutline,
      calendarOutline, timeOutline, flagOutline, pricetagOutline,
      checkmarkCircleOutline, ellipseOutline, trashOutline,
      createOutline, searchOutline,
      checkmarkDoneOutline, alertCircleOutline, filterOutline,
      chevronDownOutline, imageOutline, documentTextOutline,
    });

    effect(() => {
      this.tasks();
      this.buildCalendar();
    });
  }

  async ngOnInit() {
    await this.loadTasks();
    this.buildCalendar();
  }

  // ── Build calendar ────────────────────────────────
  buildCalendar() {
    const current     = this.currentDate();
    const year        = current.getFullYear();
    const month       = current.getMonth();
    const todayStr    = this.getLocalDateStr(new Date());
    const selectedStr = this.selectedDateStr();
    const firstDay    = new Date(year, month, 1);
    const lastDay     = new Date(year, month + 1, 0);
    const startDay    = firstDay.getDay();
    const days: CalendarDay[] = [];

    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(this.buildDay(date, this.getLocalDateStr(date), false, todayStr, selectedStr));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push(this.buildDay(date, this.getLocalDateStr(date), true, todayStr, selectedStr));
    }
    for (let d = 1; d <= 42 - days.length; d++) {
      const date = new Date(year, month + 1, d);
      days.push(this.buildDay(date, this.getLocalDateStr(date), false, todayStr, selectedStr));
    }

    this.calendarDays.set(days);
  }

  private buildDay(date: Date, dateStr: string, isCurrentMonth: boolean, todayStr: string, selectedStr: string): CalendarDay {
    const dayTasks = this.tasks().filter(t => t.due_date === dateStr);
    return {
      date, dateStr,
      day: date.getDate(),
      isCurrentMonth,
      isToday:      dateStr === todayStr,
      isSelected:   dateStr === selectedStr,
      taskCount:    dayTasks.length,
      hasPending:   dayTasks.some(t => t.status === 'pending'),
      hasCompleted: dayTasks.some(t => t.status === 'completed'),
    };
  }

  // ── Navigation ────────────────────────────────────
  prevMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.buildCalendar();
  }

  nextMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.buildCalendar();
  }

  selectDay(day: CalendarDay) {
    // Al seleccionar un día, limpia la búsqueda para mostrar tareas de ese día
    this.searchQuery.set('');
    this.selectedDate.set(day.date);
    this.buildCalendar();
  }

  goToToday() {
    const today = new Date();
    this.searchQuery.set('');
    this.currentDate.set(today);
    this.selectedDate.set(today);
    this.buildCalendar();
  }

  // ── Load tasks ────────────────────────────────────
  async loadTasks() {
    const user = this.authService.currentUser();
    if (!user) return;
    await this.taskService.loadTasks(user.id);
    this.buildCalendar();
  }

  async handleRefresh(event: any) {
    try {
      await this.loadTasks();
    } catch (err) {
      console.error('Error refreshing calendar:', err);
    } finally {
      event.target.complete();
    }
  }

  getLocalDateStr(date: Date = new Date()): string {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ── Task actions ──────────────────────────────────
  openTaskDetail(task: Task)  { this.showTaskDetail.set(task); }
  closeTaskDetail()           { this.showTaskDetail.set(null); }

  async toggleTaskStatus(task: Task) {
    task.status === 'pending'
      ? await this.taskService.completeTask(task.id)
      : await this.taskService.reopenTask(task.id);
    this.buildCalendar();
    const updated = this.taskService.getTaskById(task.id);
    if (updated && this.showTaskDetail()?.id === task.id) this.showTaskDetail.set(updated);
  }

  async deleteTask(task: Task) {
    await this.taskService.deleteTask(task.id);
    this.showTaskDetail.set(null);
    this.buildCalendar();
    this.notyf.error('Task deleted');
  }

  // ── Filters ───────────────────────────────────────
  setFilter(priority: string) { this.priorityFilter.set(priority); }
  onSearch(event: any)          { this.searchQuery.set(event.target.value || ''); }

  // ── Helpers ───────────────────────────────────────
  toDateStr(date: Date): string { return this.getLocalDateStr(date); }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return '';
    return new Date(year, month - 1, day)
      .toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getPriorityColor(priority: Priority): string {
    return { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }[priority];
  }

  getPriorityLabel(priority: Priority): string {
    return { high: 'High', medium: 'Medium', low: 'Low' }[priority];
  }

  getPriorityIcon(priority: Priority): string {
    return { high: 'alert-circle-outline', medium: 'flag-outline', low: 'checkmark-done-outline' }[priority];
  }

  formatTime(time?: string): string {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  trackByDay(_: number, day: CalendarDay)         { return day.dateStr; }
  trackByTask(_: number, task: Task)              { return task.id; }
}
