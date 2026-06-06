import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // Auth shortcuts
  get auth() { return this.supabase.auth; }

  // DB shortcut
  from(table: string) { return this.supabase.from(table); }

  // Storage shortcut
  storage(bucket: string) { return this.supabase.storage.from(bucket); }
}