import { Pipe, PipeTransform } from '@angular/core';
import { Priority } from '../../core/models/task';

@Pipe({ name: 'priorityColor', standalone: true })
export class PriorityColorPipe implements PipeTransform {
  transform(priority: Priority): string {
    const colors: Record<Priority, string> = {
      low:    '#34C759',
      medium: '#FF9500',
      high:   '#FF3B30',
    };
    return colors[priority] ?? '#6B7280';
  }
}
