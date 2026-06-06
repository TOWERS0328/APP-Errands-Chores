import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { Priority } from '../../../core/models/task';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './priority-badge.component.html',
  styleUrl: './priority-badge.component.scss'
})
export class PriorityBadgeComponent {
  priority = input.required<Priority>();

  get icon(): string {
    return { high: 'arrow-up', medium: 'remove', low: 'arrow-down' }[this.priority()];
  }

  get label(): string {
    return { high: 'High', medium: 'Med', low: 'Low' }[this.priority()];
  }
}
