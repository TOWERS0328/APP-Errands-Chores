import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonIcon, IonDatetime } from '@ionic/angular/standalone';
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
import { Notyf } from 'notyf';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonDatetime,
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

  // ── Modal: Delete ─────────────────────────────────────────────────────────
  showDeleteModal = signal(false);

  // ── Modal: Postpone ───────────────────────────────────────────────────────
  showPostponeModal = signal(false);
  postponeDate    = signal('');
  postponeTime    = signal('');
  postponeDateISO = signal('');
  postponeTimeISO = signal('');

  // ── Modal: Edit (pasos) ───────────────────────────────────────────────────
  showEditModal = signal(false);
  editStep      = signal(1);
  editSaving    = signal(false);
  editErrorMsg  = signal('');

  // Fecha mínima = hoy (bloquea fechas pasadas)
  readonly minDate = new Date().toISOString().split('T')[0];

  // Campos del formulario de edición
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

  private notyf = new Notyf({
    duration: 3000,
    position: { x: 'right', y: 'top' },
    types: [
      { type: 'success', background: '#534AB7', icon: { className: 'notyf-icon', tagName: 'span', text: '✅' } },
      { type: 'warning', background: '#F59E0B', icon: { className: 'notyf-icon', tagName: 'span', text: '📅' } },
      { type: 'error',   background: '#EF4444', icon: { className: 'notyf-icon', tagName: 'span', text: '🗑️' } }
    ]
  });

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
  // EDIT MODAL — solo para tareas pendientes
  // ═══════════════════════════════════════════════════════════════════════════
  async openEdit() {
    const t = this.task();
    // Guardia: solo tareas pendientes pueden editarse
    if (!t || t.status === 'completed') return;

    // Cargar tags si no están cargados
    if (!this.availableTags().length) {
      const tags = await this.tagService.getTags();
      this.availableTags.set(tags);
    }

    // Pre-cargar datos de la tarea
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

  async saveEdit() {
    const t = this.task();
    if (!t || !this.editTitle.trim()) return;

    // Validar que la fecha elegida no sea pasada
    if (this.editDueDate && this.editDueDate < this.minDate) {
      this.editErrorMsg.set('Due date cannot be in the past');
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
      // Reflejar cambios localmente
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
      this.notyf.success('Task updated successfully!');
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
    if (newStatus === 'completed') {
      this.notyf.success('Task marked as completed!');
    } else {
      (this.notyf as any).open({ type: 'warning', message: 'Task reopened' });
    }
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

  onDateChange(event: any) {
    const val: string = event.detail.value;
    if (val) this.postponeDate.set(val.split('T')[0]);
  }

  onTimeChange(event: any) {
    const val: string = event.detail.value;
    if (val) {
      const timePart = val.includes('T') ? val.split('T')[1].substring(0, 5) : val.substring(0, 5);
      this.postponeTime.set(timePart);
    }
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
    (this.notyf as any).open({ type: 'warning', message: `Task postponed to ${this.postponeDate()}${timeStr}` });
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
    this.notyf.error('Task deleted');
    this.router.navigate(['/home']);
  }
}
