import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { TaskService } from '../../core/services/task';
import { TimeOfDayService } from '../../core/services/time-of-day';
import { ThemeService } from '../../core/services/theme';
import { SupabaseService } from '../../core/services/supabase';
import { AuthService } from '../../core/services/auth';
import { TaskCardComponent } from '../../shared/components/task-card/task-card.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LandscapeSvgComponent } from '../../shared/components/landscape-svg/landscape-svg.component';
import { TaskFilterPipe, TaskFilterOptions } from '../../shared/pipes/task-filter-pipe';
import { Task } from '../../core/models/task';
import { NavVisibilityService } from '../../core/services/nav-visibility';

type FilterChip = 'all' | 'today' | 'high';

const HISTORY_KEY = 'tasks_history';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    TaskCardComponent,
    FabButtonComponent,
    SkeletonCardComponent,
    EmptyStateComponent,
    LandscapeSvgComponent,
    TaskFilterPipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private router    = inject(Router);
  private supabase  = inject(SupabaseService);
  private authService = inject(AuthService);
  private navVisibility = inject(NavVisibilityService);
  taskService       = inject(TaskService);
  timeOfDay         = inject(TimeOfDayService);
  themeService      = inject(ThemeService);

  loading    = signal(true);
  activeChip = signal<FilterChip>('today');

  // ── Modals ────────────────────────────────────────────────────────────────
  showClearConfirm  = signal(false);
  showHistoryModal  = signal(false);
  showBellModal     = signal(false);
  historyTasks      = signal<Task[]>([]);
  historyIds        = signal<Set<string>>(new Set());

  homeTasks = computed(() => {
    const hidden = this.historyIds();
    return this.taskService.tasks().filter(task =>
      !(task.status === 'completed' && hidden.has(task.id))
    );
  });

  // ── Notificaciones en memoria ─────────────────────────────────────────────
  notifications = signal<{ id: number; message: string; time: string; icon: string }[]>([
    { id: 1, message: 'You have tasks due today', time: 'Just now', icon: 'calendar-outline' },
  ]);

  filters = computed<TaskFilterOptions>(() => {
    const chip = this.activeChip();
    if (chip === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return { dateFrom: today, dateTo: today };
    }
    if (chip === 'high') return { priority: 'high' };
    return {};
  });

  todayCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.homeTasks().filter(t =>
      t.due_date === today && t.status === 'pending'
    ).length;
  });

  unreadCount = computed(() => this.notifications().length);

  async ngOnInit() {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (user) {
      await this.taskService.loadTasks(user.id);
      this.historyIds.set(new Set(this.loadHistory().map(task => task.id)));

      // Ofrecer activar biometría tras login (con email o redirect de Google)
      await this.authService.checkAndOfferBiometric();
    }
    this.loading.set(false);

    // Agregar notificación si hay tareas vencidas
    const today = new Date().toISOString().split('T')[0];
    const overdue = this.taskService.tasks().filter(
      t => t.due_date && t.due_date < today && t.status === 'pending'
    ).length;
    if (overdue > 0) {
      this.notifications.update(n => [
        ...n,
        { id: Date.now(), message: `${overdue} overdue task${overdue > 1 ? 's' : ''}`, time: 'Check now', icon: 'alert-circle-outline' }
      ]);
    }
  }

  async toggleTask(id: string) {
    const task = this.taskService.tasks().find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await this.taskService.updateTask(id, { status: newStatus });
  }

  async deleteTask(id: string) {
    await this.taskService.deleteTask(id);
  }

  openTask(id: string) {
    this.router.navigate(['/task', id]);
  }

  openCreate() {
    this.router.navigate(['/create-task']);
  }

  setChip(chip: FilterChip) {
    this.activeChip.set(chip);
  }

  ngOnDestroy() {
    this.navVisibility.show();
  }

  // ── Clear Home ─────────────────────────────────────────────────────────────
  openClearConfirm() {
    this.showClearConfirm.set(true);
    this.navVisibility.hide();
  }

  cancelClear() {
    this.showClearConfirm.set(false);
    this.navVisibility.show();
  }

  confirmClear() {
    // Guardar completadas en historial (localStorage)
    const completed = this.taskService.tasks().filter(t => t.status === 'completed');
    if (completed.length > 0) {
      const existing = this.loadHistory();
      const merged = [...completed, ...existing].slice(0, 200); // máx 200 en historial
      localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
      this.historyIds.set(new Set(merged.map(task => task.id)));
    }

    // Ocultar en Home las tareas completadas ya movidas a History.
    this.showClearConfirm.set(false);
    this.navVisibility.show();
  }

  // ── History Modal ─────────────────────────────────────────────────────────
  openHistory() {
    this.historyTasks.set(this.loadHistory());
    this.showHistoryModal.set(true);
  }

  closeHistory() {
    this.showHistoryModal.set(false);
  }

  clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    this.historyTasks.set([]);
    this.historyIds.set(new Set());
  }

  private loadHistory(): Task[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  formatHistoryDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Bell / Notifications Modal ────────────────────────────────────────────
  openBell() {
    this.showBellModal.set(true);
  }

  closeBell() {
    this.showBellModal.set(false);
  }

  dismissNotification(id: number) {
    this.notifications.update(n => n.filter(x => x.id !== id));
  }

  clearAllNotifications() {
    this.notifications.set([]);
  }
}
