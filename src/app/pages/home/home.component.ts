import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { TaskService } from '../../core/services/task';
import { TimeOfDayService } from '../../core/services/time-of-day';
import { ThemeService } from '../../core/services/theme';
import { SupabaseService } from '../../core/services/supabase';
import { TaskCardComponent } from '../../shared/components/task-card/task-card.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LandscapeSvgComponent } from '../../shared/components/landscape-svg/landscape-svg.component';
import { TaskFilterPipe, TaskFilterOptions } from '../../shared/pipes/task-filter-pipe';

type FilterChip = 'all' | 'today' | 'high';

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
export class HomeComponent implements OnInit {
  private router    = inject(Router);
  private supabase  = inject(SupabaseService);
  taskService       = inject(TaskService);
  timeOfDay         = inject(TimeOfDayService);
  themeService      = inject(ThemeService);

  loading    = signal(true);
  activeChip = signal<FilterChip>('all');

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
    return this.taskService.tasks().filter(t =>
      t.due_date === today && t.status === 'pending'
    ).length;
  });

  async ngOnInit() {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (user) await this.taskService.loadTasks(user.id);
    this.loading.set(false);
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



}
