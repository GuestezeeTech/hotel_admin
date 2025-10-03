import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelEnrollmentTabviewComponent } from './hotel-enrollment-tabview.component';
import { EditTechnicalInfoComponent } from './technical-info/edit-technical-info/edit-technical-info.component';
import { CancellationComponent } from './cancellation/cancellation.component';

const routes: Routes = [
  { path: 'add-new-hotel', component: HotelEnrollmentTabviewComponent }, // Default route for this module
  { path: 'hotel-registration/add-new-hotel', component: HotelEnrollmentTabviewComponent }, // Default route for this module
  { path: 'edit-new-hotel/:id', component: HotelEnrollmentTabviewComponent },
  { path: 'hotel-registration/edit-new-hotel/:id', component: HotelEnrollmentTabviewComponent },
  { path: 'edit-tech-info/:id', component: EditTechnicalInfoComponent },
  {  path:'confirmation', component: HotelEnrollmentTabviewComponent },
  {  path:'cancellation', component: HotelEnrollmentTabviewComponent },
 {  path:'hotel-registration/confirmation', component: HotelEnrollmentTabviewComponent },
 {  path:'hotel-registration/cancellation', component: HotelEnrollmentTabviewComponent },
  // Default route for this module
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HotelEnrollmentTabviewRoutingModule { }
