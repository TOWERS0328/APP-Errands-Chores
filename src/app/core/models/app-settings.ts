export interface CelebrationMessage {
  title: string;
  subtitle: string;
  emoji: string;
  type: 'progress' | 'badge' | 'complete' | 'streak';
}

export interface AppStats {
  totalCompleted: number;
  totalPending: number;
  completionRate: number;
  currentStreak: number;
  averagePerDay: number;
}

export interface FilterOptions {
  status?: 'all' | 'pending' | 'completed';
  priority?: 'all' | 'high' | 'medium' | 'low';
  date?: string;
  tagId?: string;
}