import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { Task, TaskCreate, Priority, TaskStatus } from '../models/task';
import { FilterOptions } from '../models/app-settings';

const CACHE_KEY = 'tasks_cache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

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
    const today = this.getLocalDateString();
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

  // ── Fecha local (evita desfase UTC) ────────────
  private getLocalDateString(date: Date = new Date()): string {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ── Cache helpers ───────────────────────────────
  private saveCache(userId: string, tasks: Task[]) {
    try {
      localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
        tasks,
        timestamp: Date.now()
      }));
    } catch {}
  }

  private loadCache(userId: string): Task[] | null {
    try {
      const raw = localStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (!raw) return null;
      const { tasks, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > CACHE_TTL) return null;
      return tasks;
    } catch {
      return null;
    }
  }

  private clearCache(userId: string) {
    try {
      localStorage.removeItem(`${CACHE_KEY}_${userId}`);
    } catch {}
  }

  // ── Cargar tareas (cache-first) ─────────────────
  async loadTasks(userId: string) {
    const cached = this.loadCache(userId);
    if (cached) {
      this._tasks.set(cached);
      this._isLoading.set(true);
      this._error.set(null);
      void this.refreshTasks(userId);
      return;
    }

    await this.refreshTasks(userId);
  }

  private async refreshTasks(userId: string) {
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
      this.saveCache(userId, tasks);
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

      if (tagIds.length > 0) {
        const taskTags = tagIds.map(tagId => ({
          task_id: data.id,
          tag_id: tagId
        }));
        await this.supabase.from('task_tags').insert(taskTags);
      }

      this._tasks.update(tasks => {
        const updated = [{ ...data, tags: [] }, ...tasks];
        this.saveCache(userId, updated);
        return updated;
      });

      return { data, error: null };
    } catch (err: any) {
      this._error.set(err.message);
      return { data: null, error: err.message };
    } finally {
      this._isLoading.set(false);
    }
  }

  // ── Actualizar tarea ────────────────────────────
  async updateTask(id: string, changes: Partial<Task>, userId?: string) {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      this._tasks.update(tasks => {
        const updated = tasks.map(t => t.id === id ? { ...t, ...data } : t);
        if (userId) this.saveCache(userId, updated);
        return updated;
      });

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }

  // ── Completar tarea ─────────────────────────────
  async completeTask(id: string, userId?: string) {
    return this.updateTask(id, { status: 'completed' }, userId);
  }

  // ── Reactivar tarea ─────────────────────────────
  async reopenTask(id: string, userId?: string) {
    return this.updateTask(id, { status: 'pending' }, userId);
  }

  // ── Eliminar tarea ──────────────────────────────
  async deleteTask(id: string, userId?: string) {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this._tasks.update(tasks => {
        const updated = tasks.filter(t => t.id !== id);
        if (userId) this.saveCache(userId, updated);
        return updated;
      });

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // ── Ocultar completadas del home (para Clear Home) ──
  hideCompleted() {
    this._tasks.update(tasks => tasks.filter(t => t.status === 'pending'));
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
  clearTasks(userId?: string) {
    this._tasks.set([]);
    if (userId) this.clearCache(userId);
  }
}
