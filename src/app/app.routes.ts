import { Routes } from '@angular/router';
import { DataComponent } from './pages/data/data.component';
import { AnalysisComponent } from './pages/analysis/analysis.component';
import { MonitorComponent } from './pages/monitor/monitor.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'data', pathMatch: 'full' },
  { path: 'data', component: DataComponent },
  { path: 'analysis', component: AnalysisComponent },
  { path: 'monitor', component: MonitorComponent }
];
