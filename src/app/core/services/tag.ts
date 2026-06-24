import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { Tag } from '../models/tag';

export const MAX_TAGS = 3;

export const PRESET_CATALOG: Pick<Tag, 'label' | 'color'>[] = [
  { label: 'Home',      color: '#534AB7' },
  { label: 'Work',      color: '#FF9500' },
  { label: 'Health',    color: '#34C759' },
  { label: 'Shopping',  color: '#FF2D55' },
  { label: 'Food',      color: '#FF6B35' },
  { label: 'Finance',   color: '#5AC8FA' },
  { label: 'Personal',  color: '#AF52DE' },
  { label: 'Family',    color: '#FF3B30' },
  { label: 'Travel',    color: '#FFCC00' },
  { label: 'Education', color: '#00C7BE' },
  { label: 'Fitness',   color: '#30D158' },
  { label: 'Social',    color: '#FF375F' },
  { label: 'Errands',   color: '#6E6E73' },
  { label: 'Urgent',    color: '#FF453A' },
  { label: 'Creative',  color: '#BF5AF2' },
  { label: 'Reading',   color: '#0A84FF' },
];

@Injectable({ providedIn: 'root' })
export class TagService {
  private supabase = inject(SupabaseService);

  private _tags   = signal<Tag[]>([]);
  private _loaded = false;

  tags = this._tags.asReadonly();

  availablePresets = computed(() => {
    const existingLabels = new Set(this._tags().map(t => t.label.toLowerCase()));
    return PRESET_CATALOG.filter(p => !existingLabels.has(p.label.toLowerCase()));
  });

  // ── Cargar solo los tags del usuario autenticado ────────────────────────────
  async loadTags(): Promise<void> {
    if (this._loaded) return;

    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.client
      .from('tags')
      .select('*')
      .eq('user_id', user.id)   // ← fix: solo tags de este usuario
      .order('label', { ascending: true });

    if (error) throw error;
    this._tags.set(data ?? []);
    this._loaded = true;
  }

  async getTags(): Promise<Tag[]> {
    await this.loadTags();
    return this._tags();
  }

  async createTag(label: string, color: string): Promise<Tag> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const exists = this._tags().some(
      t => t.label.toLowerCase() === label.trim().toLowerCase()
    );
    if (exists) throw new Error(`Tag "${label}" already exists`);

    const { data, error } = await this.supabase.client
      .from('tags')
      .insert({ label: label.trim(), color, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    this._tags.update(tags =>
      [...tags, data].sort((a, b) => a.label.localeCompare(b.label))
    );
    return data;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const { data, error } = await this.supabase.client
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    this._tags.update(tags => tags.map(t => t.id === id ? { ...t, ...data } : t));
    return data;
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('tags')
      .delete()
      .eq('id', id);
    if (error) throw error;
    this._tags.update(tags => tags.filter(t => t.id !== id));
  }

  clearTags(): void {
    this._tags.set([]);
    this._loaded = false;
  }
}
