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

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    this.profile.set(data);
  }

  async uploadAvatar(file: File): Promise<string> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = this.supabase.client.storage
      .from('avatars')
      .getPublicUrl(path);

    await this.updateProfile({ avatar_url: data.publicUrl });
    return data.publicUrl;
  }
}
