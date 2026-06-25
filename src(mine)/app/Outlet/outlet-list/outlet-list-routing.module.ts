import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OutletListComponent } from './outlet-list.component';

const routes: Routes = [
  { path: 'outlet-list', component: OutletListComponent },
  // { path: 'payment-details/:id', component: PaymentDetailsComponent }, // Default route for this module
];



@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OutletListRoutingModule { }
