import { Tag } from './tag';

export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  due_date?: string;
  due_time?: string;
  photos: string[];
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority: Priority;
  due_date?: string;
  due_time?: string;
  photos?: string[];
}
