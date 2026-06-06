import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { Task, TaskCreate, Priority, TaskStatus } from '../models/task';
import { FilterOptions } from '../models/app-settings';

@Injectable({ providedIn: 'root' })
export class TaskService {
  // ── Estado reactivo ─────────────────────────────
  private _tasks = signal<Task[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // ── Computed (derivados automáticos) ────────────
  tasks = this._tasks.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();

  pendingTasks = computed(() =>
    this._tasks().filter(t => t.status === 'pending')
  );

  completedTasks = computed(() =>
    this._tasks().filter(t => t.status === 'completed')
  );

  todayTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._tasks().filter(t => t.due_date === today);
  });

  highPriorityTasks = computed(() =>
    this._tasks().filter(t => t.priority === 'high' && t.status === 'pending')
  );

  completionRate = computed(() => {
    const total = this._tasks().length;
    if (total === 0) return 0;
    return Math.round((this.completedTasks().length / total) * 100);
  });

  constructor(private supabase: SupabaseService) {}

  // ── Cargar todas las tareas ─────────────────────
  async loadTasks(userId: string) {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          task_tags (
            tags (*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasks = data.map((t: any) => ({
        ...t,
        tags: t.task_tags?.map((tt: any) => tt.tags) || []
      }));

      this._tasks.set(tasks);
    } catch (err: any) {
      this._error.set(err.message);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ── Obtener tarea por ID ────────────────────────
  getTaskById(id: string): Task | undefined {
    return this._tasks().find(t => t.id === id);
  }

  // ── Crear tarea ─────────────────────────────────
  async createTask(userId: string, task: TaskCreate, tagIds: string[] = []) {
    this._isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert({
          ...task,
          user_id: userId,
          status: 'pending',
          photos: task.photos || []
        })
        .select()
        .single();

      if (error) throw error;

      // Asociar tags si hay
      if (tagIds.length > 0) {
        const taskTags = tagIds.map(tagId => ({
          task_id: data.id,
          tag_id: tagId
        }));
        await this.supabase.from('task_tags').insert(taskTags);
      }

      // Actualizar estado local
      this._tasks.update(tasks => [{ ...data, tags: [] }, ...tasks]);
      return { data, error: null };
    } catch (err: any) {
      this._error.set(err.message);
      return { data: null, error: err.message };
    } finally {
      this._isLoading.set(false);
    }
  }

  // ── Actualizar tarea ────────────────────────────
  async updateTask(id: string, changes: Partial<Task>) {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      this._tasks.update(tasks =>
        tasks.map(t => t.id === id ? { ...t, ...data } : t)
      );
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }

  // ── Completar tarea ─────────────────────────────
  async completeTask(id: string) {
    return this.updateTask(id, { status: 'completed' });
  }

  // ── Reactivar tarea ─────────────────────────────
  async reopenTask(id: string) {
    return this.updateTask(id, { status: 'pending' });
  }

  // ── Eliminar tarea ──────────────────────────────
  async deleteTask(id: string) {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this._tasks.update(tasks => tasks.filter(t => t.id !== id));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // ── Filtrar tareas ──────────────────────────────
  filterTasks(options: FilterOptions): Task[] {
    let result = this._tasks();

    if (options.status && options.status !== 'all') {
      result = result.filter(t => t.status === options.status);
    }
    if (options.priority && options.priority !== 'all') {
      result = result.filter(t => t.priority === options.priority);
    }
    if (options.date) {
      result = result.filter(t => t.due_date === options.date);
    }
    if (options.tagId) {
      result = result.filter(t =>
        t.tags?.some(tag => tag.id === options.tagId)
      );
    }
    return result;
  }

  // ── Tareas por fecha (para calendario) ──────────
  getTasksByDate(date: string): Task[] {
    return this._tasks().filter(t => t.due_date === date);
  }

  // ── Limpiar estado ──────────────────────────────
  clearTasks() {
    this._tasks.set([]);
  }
}