import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { Profile } from '../models/profile';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private supabase = inject(SupabaseService);

  profile = signal<Profile | null>(null);

  async loadProfile(): Promise<void> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    this.profile.set(data);
  }

  async updateProfile(updates: Partial<Profile>): Promise<void> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Solo enviamos campos que existen en la tabla
    const safeUpdates: Record<string, any> = {};
    const allowedFields = ['display_name', 'theme', 'notifications_enabled', 'reminder_time', 'language', 'avatar_url'];

    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = (updates as any)[key];
    }

    if (Object.keys(safeUpdates).length === 0) return;

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    this.profile.set(data);
  }

 async uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await this.supabase.client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Sin query params en el path — Supabase Storage no los acepta
  const ext = file.name.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await this.supabase.client.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  // Cache busting va en la URL pública, no en el path de storage
  const { data } = this.supabase.client.storage
    .from('avatars')
    .getPublicUrl(path);

  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  await this.updateProfile({ avatar_url: publicUrl });
  return publicUrl;
}
}
