import { AdminDashboardComponent } from './admin-dashboard.component';
import { KotDashboardComponent } from '../kot-dashboard/kot-dashboard.component';
import { FbDashboardComponent } from '../fb-dashboard/fb-dashboard.component';
import { FoDashboardComponent } from '../fo-dashboard/fo-dashboard.component';
import { HkDashboardComponent } from '../hk-dashboard/hk-dashboard.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'dashboard', component: AdminDashboardComponent },
  { path: 'kot-dashboard', redirectTo: 'overview-dashboard', pathMatch: 'full' },
  { path: 'overview-dashboard', component: KotDashboardComponent },
  { path: 'fb/dashboard', component: FbDashboardComponent },
  { path: 'fo/dashboard', component: FoDashboardComponent },
  { path: 'hk/dashboard', component: HkDashboardComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class AdminDashboardRoutingModule { }
