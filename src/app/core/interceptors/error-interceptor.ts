import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { catchError, from, switchMap, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastCtrl = inject(ToastController);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Unexpected error';

      if (error.status === 0) {
        message = 'No internet connection';
      } else if (error.status === 401) {
        message = 'Session expired. Please sign in again';
      } else if (error.status === 429) {
        message = 'Too many requests. Please wait a moment';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later';
      }

      return from(
        toastCtrl.create({ message, duration: 3000, color: 'danger', position: 'bottom' })
          .then(toast => toast.present())
      ).pipe(
        switchMap(() => throwError(() => error))
      );
    })
  );
};
