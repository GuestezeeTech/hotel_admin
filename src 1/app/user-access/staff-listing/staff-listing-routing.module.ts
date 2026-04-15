import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StaffListingComponent } from './staff-listing.component';

const routes: Routes = [
    { path: 'staff-list', component: StaffListingComponent }, 
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class StaffListingRoutingModule { }