import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { trigger, transition, style, animate } from '@angular/animations';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [IonIcon, CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class RegisterComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirm = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  async signUp() {
    this.errorMsg.set('');

    if (!this.displayName || !this.email || !this.password) {
      this.errorMsg.set('Please fill in all fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg.set('Passwords do not match');
      return;
    }

    if (this.password.length < 6) {
      this.errorMsg.set('Password must be at least 6 characters');
      return;
    }

    const { error } = await this.authService.signUp(
      this.email,
      this.password,
      this.displayName
    );

    if (error) {
      this.errorMsg.set(error);
    } else {
      this.successMsg.set('Account created! Check your email to confirm.');
    }
  }

  async signInWithGoogle() {
    try {
      await this.authService.signInWithGoogle();
    } catch (err: any) {
      this.errorMsg.set(err.message);
    }
  }

  goBack() {
    this.router.navigate(['/onboarding']);
  }
}
