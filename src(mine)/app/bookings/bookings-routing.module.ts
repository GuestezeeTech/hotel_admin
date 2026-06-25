import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookingsComponent } from './bookings.component';
import { ReportComponent } from '../report/report.component'; // Import the report component


const routes: Routes = [
    { path: 'bookings', component: BookingsComponent }, // Default route for this module
    { path: 'reports-data', component: ReportComponent }, // Default route for this module
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class BookingsRoutingModule { }