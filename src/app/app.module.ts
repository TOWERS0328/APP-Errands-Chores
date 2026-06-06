import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CelebrationToastComponent } from './shared/components/celebration-toast/celebration-toast.component';
import{ BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { AlertController } from '@ionic/angular/standalone';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot({ mode: 'ios' }),
    AppRoutingModule,
    CelebrationToastComponent,
    BottomNavComponent,

  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    AlertController
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
