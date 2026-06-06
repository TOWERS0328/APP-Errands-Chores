import { Pipe, PipeTransform } from '@angular/core';
import { Task, Priority } from '../../core/models/task';
import { Tag } from '../../core/models/tag';

export interface TaskFilterOptions {
  search?:    string;
  priority?:  Priority | 'all';
  tagId?:     string | null;
  status?:    'pending' | 'completed' | null;
  dateFrom?:  string | null;
  dateTo?:    string | null;
}

@Pipe({ name: 'taskFilter', standalone: true, pure: false })
export class TaskFilterPipe implements PipeTransform {
  transform(tasks: Task[] | null, filters: TaskFilterOptions = {}): Task[] {
    if (!tasks) return [];

    return tasks.filter(task => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const inTitle = task.title.toLowerCase().includes(q);
        const inDesc  = task.description?.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inDesc) return false;
      }

      if (filters.priority && filters.priority !== 'all') {
        if (task.priority !== filters.priority) return false;
      }

      if (filters.tagId) {
        if (!task.tags?.some((t: Tag) => t.id === filters.tagId)) return false;
      }

      if (filters.status) {
        if (task.status !== filters.status) return false;
      }

      if (filters.dateFrom && task.due_date) {
        if (task.due_date < filters.dateFrom) return false;
      }

      if (filters.dateTo && task.due_date) {
        if (task.due_date > filters.dateTo) return false;
      }

      return true;
    });
  }
}
