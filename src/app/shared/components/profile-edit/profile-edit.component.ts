import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkOutline, cameraOutline, imagesOutline, trashOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Notyf } from 'notyf';

import { AuthService } from '../../../core/services/auth';
import { ProfileService } from '../../../core/services/profile';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.scss',
})
export class ProfileEditComponent implements OnInit {
  private modalCtrl  = inject(ModalController);
  private auth       = inject(AuthService);
  private profileSvc = inject(ProfileService);

  displayName   = '';
  email         = '';
  avatarPreview = signal<string | null>(null);
  isSaving      = signal(false);
  showPhotoSheet = signal(false);

  private newAvatarBlob: Blob | null = null;

  private notyf = new Notyf({
    duration: 2500,
    position: { x: 'right', y: 'top' },
    types: [
      { type: 'success', background: '#534AB7', icon: { className: 'notyf-icon', tagName: 'span', text: '✅' } },
      { type: 'error',   background: '#EF4444', icon: { className: 'notyf-icon', tagName: 'span', text: '❌' } },
    ]
  });

  constructor() {
    addIcons({ closeOutline, checkmarkOutline, cameraOutline, imagesOutline, trashOutline });
  }

  ngOnInit() {
    const profile = this.profileSvc.profile();
    const user    = this.auth.currentUser();
    this.displayName = profile?.display_name
      ?? user?.user_metadata?.['full_name']
      ?? user?.email?.split('@')[0]
      ?? 'User';
    this.email = user?.email ?? '';
    this.avatarPreview.set(profile?.avatar_url ?? user?.user_metadata?.['avatar_url'] ?? null);
  }

  avatarLetter() {
    return (this.displayName?.[0] ?? this.email[0] ?? 'U').toUpperCase();
  }

  // ── Photo sheet ────────────────────────────────────────────────────────────
  async takePhoto(source: 'camera' | 'photos') {
    this.showPhotoSheet.set(false);
    const src = source === 'camera' ? CameraSource.Camera : CameraSource.Photos;
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: src,
      });
      if (photo.dataUrl) {
        this.avatarPreview.set(photo.dataUrl);
        this.newAvatarBlob = this.dataUrlToBlob(photo.dataUrl);
      }
    } catch {
      // usuario canceló
    }
  }

  removePhoto() {
    this.showPhotoSheet.set(false);
    this.avatarPreview.set(null);
    this.newAvatarBlob = null;
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = atob(base64);
    const array  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async save() {
    if (!this.displayName.trim()) return;
    this.isSaving.set(true);
    try {
      if (this.newAvatarBlob) {
        const file = new File([this.newAvatarBlob], 'avatar.jpg', { type: this.newAvatarBlob.type });
        await this.profileSvc.uploadAvatar(file);
      }
      await this.profileSvc.updateProfile({ display_name: this.displayName.trim() });
      this.modalCtrl.dismiss({ saved: true }, 'confirm');
    } catch {
      this.notyf.error('No se pudo guardar el perfil');
    } finally {
      this.isSaving.set(false);
    }
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
