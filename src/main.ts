import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app';
import { appRoutes } from './app/app.routes';
import { importProvidersFrom } from '@angular/core';
import { MaterialModule } from './app/material/material.module';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    importProvidersFrom(MaterialModule)
  ]
}).catch(err => console.error(err));
