import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app/app.component';
import { AlertController, ModalController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import {
  arrowBackOutline, checkmarkOutline, warningOutline,
  mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline,
  arrowForwardOutline, personOutline, callOutline, logoGoogle,
  closeOutline, checkmarkCircleOutline, alertCircleOutline,
  homeOutline, calendarOutline, addOutline, statsChartOutline,
  settingsOutline, notificationsOutline, trashOutline,
  createOutline, ellipsisVertical, chevronForwardOutline,
  chevronBackOutline, searchOutline, filterOutline,
  starOutline, star, heartOutline, timeOutline,
  flagOutline, checkmarkDoneOutline,
} from 'ionicons/icons';
import { appRoutes } from './app/app.routes';

// ✅ INICIALIZAR GOOGLE AUTH ANTES de bootstrap
GoogleAuth.initialize({
  clientId: '1091663877007-lf0h2ifnri2sumnprb43nmptog03aful.apps.googleusercontent.com',
  scopes: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
  grantOfflineAccess: true,
});

// Register all icons globally
addIcons({
  'arrow-back-outline': arrowBackOutline,
  'checkmark-outline': checkmarkOutline,
  'warning-outline': warningOutline,
  'mail-outline': mailOutline,
  'lock-closed-outline': lockClosedOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'person-outline': personOutline,
  'call-outline': callOutline,
  'logo-google': logoGoogle,
  'close-outline': closeOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'alert-circle-outline': alertCircleOutline,
  'home-outline': homeOutline,
  'calendar-outline': calendarOutline,
  'add-outline': addOutline,
  'stats-chart-outline': statsChartOutline,
  'settings-outline': settingsOutline,
  'notifications-outline': notificationsOutline,
  'trash-outline': trashOutline,
  'create-outline': createOutline,
  'ellipsis-vertical': ellipsisVertical,
  'chevron-forward-outline': chevronForwardOutline,
  'chevron-back-outline': chevronBackOutline,
  'search-outline': searchOutline,
  'filter-outline': filterOutline,
  'star-outline': starOutline,
  'star': star,
  'heart-outline': heartOutline,
  'time-outline': timeOutline,
  'flag-outline': flagOutline,
  'checkmark-done-outline': checkmarkDoneOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserAnimationsModule,
      IonicModule.forRoot({ mode: 'ios' })
    ),
    provideRouter(
      appRoutes,
      withPreloading(PreloadAllModules)
    ),
    ModalController,
    ToastController,
    AlertController,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ]
}).catch(err => console.error(err));
