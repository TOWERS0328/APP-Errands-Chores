import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Tag } from '../models/tag';

@Injectable({ providedIn: 'root' })
export class TagService {
  private supabase = inject(SupabaseService);

  async getTags(): Promise<Tag[]> {
    const { data, error } = await this.supabase.client
      .from('tags')
      .select('*')
      .order('label', { ascending: true })

    if (error) throw error;
    return data ?? [];
  }

  async createTag(label: string, color: string): Promise<Tag> {
  const { data: { user } } = await this.supabase.client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await this.supabase.client
    .from('tags')
    .insert({ label, color, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
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
    return data;
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
