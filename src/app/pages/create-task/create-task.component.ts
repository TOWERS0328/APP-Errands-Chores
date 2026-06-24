import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { TaskService } from '../../core/services/task';
import { TagService, MAX_TAGS, PRESET_CATALOG } from '../../core/services/tag';
import { SupabaseService } from '../../core/services/supabase';
import { Priority } from '../../core/models/task';
import { TaskReminderService } from '../../core/services/task-reminder.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './create-task.component.html',
  styleUrl: './create-task.component.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class CreateTaskComponent implements OnInit {
  private router          = inject(Router);
  private route           = inject(ActivatedRoute);
  private supabase        = inject(SupabaseService);
  private reminderService = inject(TaskReminderService);
  taskService             = inject(TaskService);
  tagService              = inject(TagService);

  step            = signal(1);
  saving          = signal(false);
  errorMsg        = signal('');
  editId          = signal<string | null>(null);
  isEditMode      = signal(false);
  title           = '';
  description     = '';
  priority        = signal<Priority>('medium');
  dueDate         = '';
  dueTime         = '';
  selectedTagIds  = signal<string[]>([]);
  reminderMinutes = signal<number | null>(null);
  customTagLabel  = '';
  showCustomTag   = signal(false);
  photos          = signal<string[]>([]);
  toast           = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  readonly MAX_TAGS = MAX_TAGS;
  tagSearch = '';

  filteredUserTags = computed(() => {
    const q = this.tagSearch.toLowerCase().trim();
    return this.tagService.tags().filter(t => !q || t.label.toLowerCase().includes(q));
  });

  filteredPresets = computed(() => {
    const q = this.tagSearch.toLowerCase().trim();
    const userLabels = new Set(this.tagService.tags().map(t => t.label.toLowerCase()));
    return this.tagService.availablePresets().filter(p =>
      !userLabels.has(p.label.toLowerCase()) && (!q || p.label.toLowerCase().includes(q))
    );
  });

  tagLimitReached = computed(() => this.selectedTagIds().length >= MAX_TAGS);

  async ngOnInit() {
    await this.tagService.loadTags();
    const editId = this.route.snapshot.queryParamMap.get('edit');
    if (!editId) return;

    this.editId.set(editId);
    this.isEditMode.set(true);

    let task = this.taskService.getTaskById(editId);
    if (!task) {
      const { data: { user } } = await this.supabase.client.auth.getUser();
      if (user) await this.taskService.loadTasks(user.id);
      task = this.taskService.getTaskById(editId);
    }

    if (task) {
      this.title       = task.title;
      this.description = task.description ?? '';
      this.priority.set(task.priority);
      this.dueDate     = task.due_date ?? '';
      this.dueTime     = task.due_time ?? '';
      this.photos.set(task.photos ?? []);
      this.reminderMinutes.set(task.reminder_minutes ?? null);
      if (task.tags?.length) this.selectedTagIds.set(task.tags.map(t => t.id));
    }
  }

  private getLocalDateString(date: Date = new Date()): string {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private restoreNav() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) (tabBar as HTMLElement).style.display = '';
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 2500);
  }

  private getSelectedDateTime(date: string, time: string): Date | null {
    if (!date) return null;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute]     = time ? time.split(':').map(Number) : [0, 0];
    if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  private validateDateTime(): string | null {
    if (!this.dueDate) return null;
    if (this.dueDate < this.minDate) return 'Due date cannot be in the past';
    if (this.dueDate === this.minDate && this.dueTime) {
      const selected = this.getSelectedDateTime(this.dueDate, this.dueTime);
      if (selected && selected <= new Date()) return 'That time has already passed. Choose a later time or a future date.';
    }
    return null;
  }

  private randomColor(): string {
    const colors = ['#534AB7', '#FF9500', '#34C759', '#FF2D55', '#AF52DE', '#5AC8FA'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  get minDate(): string { return this.getLocalDateString(); }

  get minTime(): string {
    if (this.dueDate !== this.minDate) return '';
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  next() {
    if (this.step() === 1 && !this.title.trim()) { this.errorMsg.set('Please enter a title'); return; }
    this.errorMsg.set('');
    this.step.update(s => s + 1);
  }

  skip() { this.errorMsg.set(''); this.step.update(s => s + 1); }

  back() {
    if (this.step() === 1) { this.restoreNav(); this.router.navigate(['/home']); }
    else { this.step.update(s => s - 1); }
  }

  close() { this.restoreNav(); this.router.navigate(['/home']); }

  setPriority(p: Priority) { this.priority.set(p); }

  setReminder(minutes: number | null) { this.reminderMinutes.set(minutes); }

  toggleTag(id: string) {
    this.selectedTagIds.update(ids => {
      if (ids.includes(id)) return ids.filter(t => t !== id);
      if (ids.length >= MAX_TAGS) return ids;
      return [...ids, id];
    });
  }

  isTagSelected(id: string): boolean { return this.selectedTagIds().includes(id); }

  async addCustomTag(label?: string, color?: string) {
    const finalLabel = (label ?? this.customTagLabel).trim();
    if (!finalLabel) return;

    const alreadyExists = this.tagService.tags().some(t => t.label.toLowerCase() === finalLabel.toLowerCase());
    if (alreadyExists) {
      this.errorMsg.set(`Tag "${finalLabel}" already exists. Select it from the list.`);
      setTimeout(() => this.errorMsg.set(''), 3000);
      return;
    }
    if (this.tagLimitReached()) { this.errorMsg.set(`You can select up to ${MAX_TAGS} tags`); return; }

    const preset = PRESET_CATALOG.find(p => p.label.toLowerCase() === finalLabel.toLowerCase());
    const finalColor = color ?? preset?.color ?? this.randomColor();

    try {
      const tag = await this.tagService.createTag(finalLabel, finalColor);
      this.selectedTagIds.update(ids => [...ids, tag.id]);
      this.customTagLabel = '';
      this.tagSearch = '';
      this.showCustomTag.set(false);
      this.errorMsg.set('');
    } catch (e: any) { this.errorMsg.set(e.message); }
  }

  async pickPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const reader = new FileReader();
    reader.onload = () => this.photos.update(p => [...p, reader.result as string]);
    reader.readAsDataURL(input.files[0]);
  }

  removePhoto(index: number) { this.photos.update(p => p.filter((_, i) => i !== index)); }

  private async syncToGoogleCalendar(userId: string, taskData: { title: string; description: string; date: string; time: string; }) {
    try {
      const { data } = await this.supabase.client.from('google_calendar_tokens').select('user_id').eq('user_id', userId).single();
      if (!data) return;
      await this.supabase.client.functions.invoke('sync-task-to-calendar', { body: { user_id: userId, task: taskData } });
    } catch (e) { console.warn('⚠️ Google Calendar sync failed:', e); }
  }

  async save() {
    if (!this.title.trim()) return;
    const dateError = this.validateDateTime();
    if (dateError) { this.errorMsg.set(dateError); return; }

    this.saving.set(true);
    this.errorMsg.set('');

    try {
      const { data: { user } } = await this.supabase.client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const taskPayload = {
        title:            this.title.trim(),
        description:      this.description.trim() || undefined,
        priority:         this.priority(),
        due_date:         this.dueDate || undefined,
        due_time:         this.dueTime || undefined,
        photos:           this.photos(),
        reminder_minutes: this.reminderMinutes(),
      };

      const calendarData = { title: this.title.trim(), description: this.description.trim() || '', date: this.dueDate, time: this.dueTime };

      if (this.isEditMode() && this.editId()) {
        await this.taskService.updateTask(this.editId()!, taskPayload);
        if (this.reminderMinutes()) {
          const task = this.taskService.getTaskById(this.editId()!);
          if (task) await this.reminderService.scheduleReminder({ ...task, ...taskPayload, id: this.editId()!, reminder_minutes: this.reminderMinutes() });
        } else {
          await this.reminderService.cancelReminder(this.editId()!);
        }
      } else {
        const { error, data } = await this.taskService.createTask(user.id, taskPayload, this.selectedTagIds());
        if (error) throw new Error(error);
        if (data && this.reminderMinutes()) {
          await this.reminderService.scheduleReminder({ ...data, reminder_minutes: this.reminderMinutes() });
        }
      }

      await this.syncToGoogleCalendar(user.id, calendarData);
      this.restoreNav();
      this.router.navigate(['/home']);

    } catch (e: any) {
      this.errorMsg.set(e.message);
    } finally {
      this.saving.set(false);
    }
  }
}
