import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StaffComponent } from './staff.component';

const routes: Routes = [
    { path: 'staff', component: StaffComponent },
      { path: 'staff/:id', component: StaffComponent } 
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class StaffRoutingModule { }