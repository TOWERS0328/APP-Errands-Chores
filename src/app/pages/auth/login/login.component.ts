import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { trigger, transition, style, animate } from '@angular/animations';
import { IonIcon } from "@ionic/angular/standalone";


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonIcon, CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = signal(false);
  errorMsg = signal('');

  async signIn() {
    if (!this.email || !this.password) return;
    this.errorMsg.set('');
    const { error } = await this.authService.signIn(this.email, this.password);
    if (error) this.errorMsg.set(error);
  }

  async signInWithGoogle() {
    try {
      await this.authService.signInWithGoogle();
    } catch (err: any) {
      this.errorMsg.set(err.message);
    }
  }

  async forgotPassword() {
    if (!this.email) {
      this.errorMsg.set('Enter your email first');
      return;
    }
    try {
      await this.authService.resetPassword(this.email);
      this.errorMsg.set('');
      alert('Check your email for reset instructions');
    } catch (err: any) {
      this.errorMsg.set(err.message);
    }
  }

  goBack() {
    this.router.navigate(['/onboarding']);
  }
}
