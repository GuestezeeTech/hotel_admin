import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { DepartmentListComponent } from '../department-list/department-list.component';
import { ServiceSettingsComponent } from '../service-settings/service-settings.component';

const routes: Routes = [
  { path: 'settings', component: SettingsComponent },
  { path: 'department-list', component: DepartmentListComponent },
  { path: 'service-list', component: ServiceSettingsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class SettingsRoutingModule { }
