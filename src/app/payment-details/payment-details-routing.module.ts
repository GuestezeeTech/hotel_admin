import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentDetailsComponent } from './payment-details.component';
const routes: Routes = [
  { path: 'payment-details', component: PaymentDetailsComponent },
  { path: 'payment-details/:id', component: PaymentDetailsComponent }, // Default route for this module
];



@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentDetailsRoutingModule { }
