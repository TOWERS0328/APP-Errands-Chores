import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { TaskService } from '../../core/services/task';
import { TagService } from '../../core/services/tag';
import { SupabaseService } from '../../core/services/supabase';
import { Task } from '../../core/models/task';
import { Priority } from '../../core/models/task';
import { Tag } from '../../core/models/tag';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge.component';
import { TagPillComponent } from '../../shared/components/tag-pill/tag-pill.component';
import { RelativeDatePipe } from '../../shared/pipes/relative-date-pipe';
import { TimeFormatPipe } from '../../shared/pipes/time-format-pipe';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    PriorityBadgeComponent,
    TagPillComponent,
    RelativeDatePipe,
    TimeFormatPipe,
  ],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(30px)' }),
        animate('280ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class TaskDetailComponent implements OnInit {
  private router    = inject(Router);
  private route     = inject(ActivatedRoute);
  private supabase  = inject(SupabaseService);
  taskService       = inject(TaskService);
  tagService        = inject(TagService);

  task    = signal<Task | null>(null);
  loading = signal(true);
  saving  = signal(false);

  // ── Toast inline (reemplaza notyf) ────────────────────────────────────────
  toast = signal<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // ── Modal: Delete ─────────────────────────────────────────────────────────
  showDeleteModal = signal(false);

  // ── Modal: Postpone ───────────────────────────────────────────────────────
  showPostponeModal = signal(false);
  postponeDate      = signal('');
  postponeTime      = signal('');

  // ── Modal: Edit (pasos) ───────────────────────────────────────────────────
  showEditModal  = signal(false);
  editStep       = signal(1);
  editSaving     = signal(false);
  editErrorMsg   = signal('');

  readonly minDate = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();

  get minTime(): string {
    if (this.editDueDate !== this.minDate) return '';
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  editTitle          = '';
  editDescription    = '';
  editPriority       = signal<Priority>('medium');
  editDueDate        = '';
  editDueTime        = '';
  editSelectedTagIds = signal<string[]>([]);
  availableTags      = signal<Tag[]>([]);
  editPhotos         = signal<string[]>([]);
  editCustomTagLabel = '';
  showEditCustomTag  = signal(false);

  readonly PRESET_TAGS = [
    { label: 'Home',     color: '#534AB7' },
    { label: 'Work',     color: '#FF9500' },
    { label: 'Health',   color: '#34C759' },
    { label: 'Shopping', color: '#FF2D55' },
    { label: 'Food',     color: '#FF6B35' },
    { label: 'Finance',  color: '#5AC8FA' },
    { label: 'Personal', color: '#AF52DE' },
    { label: 'Family',   color: '#FF3B30' },
  ];

  private showToast(message: string, type: 'success' | 'warning' | 'error' = 'success') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 2500);
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/home']); return; }

    const cached = this.taskService.getTaskById(id);
    if (cached) { this.task.set(cached); this.loading.set(false); return; }

    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (user) await this.taskService.loadTasks(user.id);
    this.task.set(this.taskService.getTaskById(id) ?? null);
    this.loading.set(false);
  }

  goBack() { this.router.navigate(['/home']); }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  async openEdit() {
    const t = this.task();
    if (!t || t.status === 'completed') return;

    if (!this.availableTags().length) {
      const tags = await this.tagService.getTags();
      this.availableTags.set(tags);
    }

    this.editTitle       = t.title;
    this.editDescription = t.description ?? '';
    this.editPriority.set(t.priority);
    this.editDueDate     = t.due_date ?? '';
    this.editDueTime     = t.due_time ?? '';
    this.editPhotos.set(t.photos ?? []);
    this.editSelectedTagIds.set(t.tags?.map(tag => tag.id) ?? []);

    this.editStep.set(1);
    this.editErrorMsg.set('');
    this.showEditModal.set(true);
  }

  closeEdit() { this.showEditModal.set(false); }

  editNext() {
    if (this.editStep() === 1 && !this.editTitle.trim()) {
      this.editErrorMsg.set('Please enter a title');
      return;
    }
    this.editErrorMsg.set('');
    this.editStep.update(s => s + 1);
  }

  editBack() {
    if (this.editStep() === 1) { this.closeEdit(); return; }
    this.editStep.update(s => s - 1);
  }

  editSkip() {
    this.editErrorMsg.set('');
    this.editStep.update(s => s + 1);
  }

  setEditPriority(p: Priority) { this.editPriority.set(p); }
  isTagSelected(id: string): boolean { return this.editSelectedTagIds().includes(id); }

  toggleEditTag(id: string) {
    const current = this.editSelectedTagIds();
    this.editSelectedTagIds.set(
      current.includes(id) ? current.filter(t => t !== id) : [...current, id]
    );
  }

  isPresetAvailable(label: string): boolean {
    return !this.availableTags().some(t => t.label === label);
  }

  async addEditCustomTag() {
    if (!this.editCustomTagLabel.trim()) return;
    const colors = ['#534AB7','#FF9500','#34C759','#FF2D55','#AF52DE','#5AC8FA'];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    try {
      const tag = await this.tagService.createTag(this.editCustomTagLabel.trim(), color);
      this.availableTags.update(tags => [...tags, tag]);
      this.editSelectedTagIds.update(ids => [...ids, tag.id]);
      this.editCustomTagLabel = '';
      this.showEditCustomTag.set(false);
    } catch (e: any) { this.editErrorMsg.set(e.message); }
  }

  async pickEditPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const reader = new FileReader();
    reader.onload = () => this.editPhotos.update(p => [...p, reader.result as string]);
    reader.readAsDataURL(input.files[0]);
  }

  removeEditPhoto(index: number) {
    this.editPhotos.update(p => p.filter((_, i) => i !== index));
  }

  private getSelectedDateTime(date: string, time: string): Date | null {
    if (!date) return null;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time ? time.split(':').map(Number) : [0, 0];

    if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  private validateEditDateTime(): string | null {
    if (!this.editDueDate) return null;
    if (this.editDueDate < this.minDate) return 'Due date cannot be in the past';

    if (this.editDueDate === this.minDate && this.editDueTime) {
      const now = new Date();
      const selected = this.getSelectedDateTime(this.editDueDate, this.editDueTime);

      if (!selected) return null;

      if (selected <= now) {
        this.editErrorMsg.set('That time has already passed. Choose a later time or a future date.');
        return 'That time has already passed. Choose a later time or a future date.';
      }
    }
    return null;
  }

  async saveEdit() {
    const t = this.task();
    if (!t || !this.editTitle.trim()) return;

    const dateError = this.validateEditDateTime();
    if (dateError) {
      this.editErrorMsg.set(dateError);
      return;
    }

    this.editSaving.set(true);
    this.editErrorMsg.set('');
    try {
      await this.taskService.updateTask(t.id, {
        title:       this.editTitle.trim(),
        description: this.editDescription.trim() || undefined,
        priority:    this.editPriority(),
        due_date:    this.editDueDate || undefined,
        due_time:    this.editDueTime || undefined,
        photos:      this.editPhotos(),
      });
      this.task.update(task => task ? {
        ...task,
        title:       this.editTitle.trim(),
        description: this.editDescription.trim() || undefined,
        priority:    this.editPriority(),
        due_date:    this.editDueDate || undefined,
        due_time:    this.editDueTime || undefined,
        photos:      this.editPhotos(),
      } : task);
      this.showEditModal.set(false);
      this.showToast('Task updated', 'success');
    } catch (e: any) {
      this.editErrorMsg.set(e.message);
    } finally {
      this.editSaving.set(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════
  async markComplete() {
    const t = this.task();
    if (!t) return;
    this.saving.set(true);
    const newStatus = t.status === 'completed' ? 'pending' : 'completed';
    await this.taskService.updateTask(t.id, { status: newStatus });
    this.task.update(task => task ? { ...task, status: newStatus } : task);
    this.saving.set(false);
    this.showToast(
      newStatus === 'completed' ? 'Task completed ✓' : 'Task reopened',
      newStatus === 'completed' ? 'success' : 'warning'
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSTPONE MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  openPostponeModal() {
    const t = this.task();
    if (!t?.due_date) return;
    const nextDay = new Date(t.due_date);
    nextDay.setDate(nextDay.getDate() + 1);
    this.postponeDate.set(nextDay.toISOString().split('T')[0]);
    this.postponeTime.set(t.due_time ?? '');
    this.showPostponeModal.set(true);
  }

  async confirmPostpone() {
    const t = this.task();
    if (!t || !this.postponeDate()) return;
    this.saving.set(true);
    const updates: Partial<Task> = { due_date: this.postponeDate() };
    if (this.postponeTime()) updates.due_time = this.postponeTime();
    await this.taskService.updateTask(t.id, updates);
    this.task.update(task => task ? { ...task, ...updates } : task);
    this.saving.set(false);
    this.showPostponeModal.set(false);
    const timeStr = this.postponeTime() ? ` at ${this.postponeTime()}` : '';
    this.showToast(`Postponed to ${this.postponeDate()}${timeStr}`, 'warning');
  }

  cancelPostpone() { this.showPostponeModal.set(false); }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  openDeleteModal() { this.showDeleteModal.set(true); }
  cancelDelete()    { this.showDeleteModal.set(false); }

  async confirmDelete() {
    const t = this.task();
    if (!t) return;
    this.saving.set(true);
    await this.taskService.deleteTask(t.id);
    this.showDeleteModal.set(false);
    this.router.navigate(['/home']);
  }
}
