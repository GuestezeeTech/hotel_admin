import { PaymentSubscriptionManagementComponent } from './payment-subscription-management.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [{ path: 'payment-subscription', component: PaymentSubscriptionManagementComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentSubscriptionManagementRoutingModule { }
