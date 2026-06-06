import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { TaskService } from '../../core/services/task';
import { TagService } from '../../core/services/tag';
import { SupabaseService } from '../../core/services/supabase';
import { Tag } from '../../core/models/tag';
import { Priority } from '../../core/models/task';
import { trigger, transition, style, animate } from '@angular/animations';
import { Notyf } from 'notyf';

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
  private router   = inject(Router);
  private route    = inject(ActivatedRoute);  // ← nuevo
  private supabase = inject(SupabaseService);
  taskService      = inject(TaskService);
  tagService       = inject(TagService);

  step       = signal(1);
  saving     = signal(false);
  errorMsg   = signal('');

  // Modo edición
  editId = signal<string | null>(null);
  isEditMode = signal(false);

  // Campos
  title           = '';
  description     = '';
  priority        = signal<Priority>('medium');
  dueDate         = '';
  dueTime         = '';
  selectedTagIds  = signal<string[]>([]);
  availableTags   = signal<Tag[]>([]);

  // Tag personalizado
  customTagLabel  = '';
  showCustomTag   = signal(false);

  // Fotos
  photos = signal<string[]>([]);

  private notyf = new Notyf({
    duration: 3000,
    position: { x: 'right', y: 'top' },
    types: [
      {
        type: 'success',
        background: '#534AB7',
        icon: { className: 'notyf-icon', tagName: 'span', text: '✅' }
      },
      {
        type: 'warning',
        background: '#F59E0B',
        icon: { className: 'notyf-icon', tagName: 'span', text: '⚠️' }
      },
      {
        type: 'error',
        background: '#EF4444',
        icon: { className: 'notyf-icon', tagName: 'span', text: '❌' }
      }
    ]
  });

  isPresetAvailable(presetLabel: string): boolean {
    return !this.availableTags().some(t => t.label === presetLabel);
  }

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

  async ngOnInit() {
    const tags = await this.tagService.getTags();
    this.availableTags.set(tags);

    // ── Modo edición: pre-cargar datos de la tarea ──────────────────────────
    const editId = this.route.snapshot.queryParamMap.get('edit');
    if (editId) {
      this.editId.set(editId);
      this.isEditMode.set(true);

      // Intentar desde caché primero
      let task = this.taskService.getTaskById(editId);

      // Si no está en caché, cargar desde Supabase
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
        if (task.tags?.length) {
          this.selectedTagIds.set(task.tags.map(t => t.id));
        }
      }
    }
  }

  // ── Restaurar nav (siempre al salir) ───────────────────────────────────────
  private restoreNav() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) (tabBar as HTMLElement).style.display = '';
  }

  // ── Navegación de pasos ────────────────────────────────────────────────────
  next() {
    if (this.step() === 1 && !this.title.trim()) {
      this.errorMsg.set('Please enter a title');
      return;
    }
    this.errorMsg.set('');
    this.step.update(s => s + 1);
  }

  skip() {
    this.errorMsg.set('');
    this.step.update(s => s + 1);
  }

  back() {
    if (this.step() === 1) {
      this.restoreNav();
      this.router.navigate(['/home']);
    } else {
      this.step.update(s => s - 1);
    }
  }

  close() {
    this.restoreNav();
    this.router.navigate(['/home']);
  }

  // ── Prioridad ──────────────────────────────────────────────────────────────
  setPriority(p: Priority) {
    this.priority.set(p);
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  toggleTag(id: string) {
    const current = this.selectedTagIds();
    if (current.includes(id)) {
      this.selectedTagIds.set(current.filter(t => t !== id));
    } else {
      this.selectedTagIds.set([...current, id]);
    }
  }

  isTagSelected(id: string): boolean {
    return this.selectedTagIds().includes(id);
  }

  async addCustomTag() {
    if (!this.customTagLabel.trim()) return;
    const colors = ['#534AB7','#FF9500','#34C759','#FF2D55','#AF52DE','#5AC8FA'];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    try {
      const tag = await this.tagService.createTag(this.customTagLabel.trim(), color);
      this.availableTags.update(tags => [...tags, tag]);
      this.selectedTagIds.update(ids => [...ids, tag.id]);
      this.customTagLabel = '';
      this.showCustomTag.set(false);
    } catch (e: any) {
      this.errorMsg.set(e.message);
    }
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────
  async pickPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.photos.update(p => [...p, reader.result as string]);
    };
    reader.readAsDataURL(file);
  }

  removePhoto(index: number) {
    this.photos.update(p => p.filter((_, i) => i !== index));
  }

  // ── Guardar / Actualizar ───────────────────────────────────────────────────
  async save() {
    if (!this.title.trim()) return;
    this.saving.set(true);
    this.errorMsg.set('');

    try {
      const { data: { user } } = await this.supabase.client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (this.isEditMode() && this.editId()) {
        // ── EDITAR tarea existente ─────────────────────────────────────────
        await this.taskService.updateTask(this.editId()!, {
          title:       this.title.trim(),
          description: this.description.trim() || undefined,
          priority:    this.priority(),
          due_date:    this.dueDate || undefined,
          due_time:    this.dueTime || undefined,
          photos:      this.photos(),
        });

        this.restoreNav();
        this.notyf.success('✅ Task updated successfully!');
        this.router.navigate(['/home']);

      } else {
        // ── CREAR tarea nueva ──────────────────────────────────────────────
        const { error } = await this.taskService.createTask(
          user.id,
          {
            title:       this.title.trim(),
            description: this.description.trim() || undefined,
            priority:    this.priority(),
            due_date:    this.dueDate || undefined,
            due_time:    this.dueTime || undefined,
            photos:      this.photos(),
          },
          this.selectedTagIds()
        );

        if (error) throw new Error(error);
        this.notyf.success('🎉 Task created successfully!');
        this.router.navigate(['/home']);
      }

    } catch (e: any) {
      this.errorMsg.set(e.message);
      this.notyf.error(`❌ ${e.message}`);
    } finally {
      this.saving.set(false);
    }
  }
}
