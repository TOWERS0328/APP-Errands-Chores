import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss'
})
export class ProgressBarComponent {
  value   = input<number>(0);  // 0-100
  total   = input<number>(0);
  done    = input<number>(0);
  showLabel = input<boolean>(true);

  percent = computed(() => {
    if (this.value() > 0) return Math.min(this.value(), 100);
    if (this.total() === 0) return 0;
    return Math.round((this.done() / this.total()) * 100);
  });
}
