import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServiceSettingsComponent } from './service-settings.component';
import { ServiceComponent } from './service/service.component';


const routes: Routes = [
  { path: 'service-list', component: ServiceSettingsComponent }, // Default route for this module
  { path: 'add-new-service', component: ServiceComponent }, // Default route for this module
  { path: 'edit-service/:id', component: ServiceComponent },
  { path: 'view-service/:id', component: ServiceComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ServiceSettingsRoutingModule { }
