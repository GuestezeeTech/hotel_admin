import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OutletCreationComponent } from './outlet-creation.component';
const routes: Routes = [
  { path: 'create-outlet', component: OutletCreationComponent },
  { path: 'view-outlet', component: OutletCreationComponent },
  { path: 'view-outlet/:id', component: OutletCreationComponent },
 
  // { path: 'payment-details/:id', component: PaymentDetailsComponent }, // Default route for this module
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OutletCreationRoutingModule { }
