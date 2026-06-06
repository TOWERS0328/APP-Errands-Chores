import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { Tag } from '../../../core/models/tag';

@Component({
  selector: 'app-tag-pill',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './tag-pill.component.html',
  styleUrl: './tag-pill.component.scss'
})
export class TagPillComponent {
  tag       = input.required<Tag>();
  removable = input(false);
  removed   = output<string>();
}
