import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookingsManagementComponent } from './bookings-management.component';

const routes: Routes = [{ path: 'bookings-management', component: BookingsManagementComponent },
  { path: 'bookings-management/:id', component: BookingsManagementComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BookingsManagementRoutingModule { }
