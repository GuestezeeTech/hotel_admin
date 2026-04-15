import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelListComponent } from './hotel-list.component';

const routes: Routes = [
  { path: 'hotel-list', component: HotelListComponent }, // Default route for this module
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HotelListRoutingModule { }
