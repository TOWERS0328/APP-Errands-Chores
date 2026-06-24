import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavVisibilityService {
  private readonly _forceHidden = signal(false);
  forceHidden = this._forceHidden.asReadonly();

  hide() {
    this._forceHidden.set(true);
  }

  show() {
    this._forceHidden.set(false);
  }
}
