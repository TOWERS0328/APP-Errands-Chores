import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingController } from '@ionic/angular/standalone';
import { finalize, from, switchMap } from 'rxjs';

const SKIP_LOADING_URLS = [
  'googleapis.com',
  'supabase.co/functions',
];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingCtrl = inject(LoadingController);

  const skip = SKIP_LOADING_URLS.some(url => req.url.includes(url));
  if (skip) return next(req);

  return from(
    loadingCtrl.create({ spinner: 'crescent', backdropDismiss: false })
  ).pipe(
    switchMap(loading => {
      loading.present();
      return next(req).pipe(
        finalize(() => loading.dismiss())
      );
    })
  );
};
