import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { MaterialModule } from './app/material/material.module';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    importProvidersFrom(MaterialModule, FormsModule)
  ]
}).catch(err => console.error(err));
