import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeOfDay } from '../../../core/services/time-of-day';

@Component({
  selector: 'app-landscape-svg',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landscape-svg.component.html',
  styleUrl: './landscape-svg.component.scss'
})
export class LandscapeSvgComponent {
  period = input<TimeOfDay>('morning');
}
