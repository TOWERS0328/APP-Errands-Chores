import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { Task } from '../../../core/models/task';
import { PriorityBadgeComponent } from '../priority-badge/priority-badge.component';
import { TagPillComponent } from '../tag-pill/tag-pill.component';
import { RelativeDatePipe } from '../../pipes/relative-date-pipe';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, IonIcon, PriorityBadgeComponent, TagPillComponent, RelativeDatePipe],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss'
})
export class TaskCardComponent {
  task    = input.required<Task>();
  toggled = output<string>();
  deleted = output<string>();
  tapped  = output<string>();

  isOverdue = computed(() => {
    if (!this.task().due_date || this.task().status === 'completed') return false;
    return this.task().due_date! < new Date().toISOString().split('T')[0];
  });
}
