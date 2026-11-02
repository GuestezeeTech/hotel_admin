import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GuestReviewsComponent } from './guest-reviews.component';

const routes: Routes = [
  { path: 'guest-reviews', component: GuestReviewsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GuestReviewsRoutingModule { }
