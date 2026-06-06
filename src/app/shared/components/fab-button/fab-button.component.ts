import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-fab-button',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './fab-button.component.html',
  styleUrl: './fab-button.component.scss'
})
export class FabButtonComponent {
  icon    = input<string>('add-outline');
  label   = input<string>('');
  clicked = output<void>();
}
