export type AppTheme = 'light' | 'dark' | 'rose' | 'forest' | 'latte';
export type AppLanguage = 'en' | 'es';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  theme: AppTheme;
  notifications_enabled: boolean;
  reminder_time: string;
  language: AppLanguage;
  created_at: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  display_name?: string;
  avatar_url?: string;
  theme?: AppTheme;
  notifications_enabled?: boolean;
  reminder_time?: string;
  language?: AppLanguage;
}
