import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeatureCreationComponent } from './feature-creation.component';

const routes: Routes = [
  { path: '', component: FeatureCreationComponent },
  { path: ':id', component: FeatureCreationComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeatureCreationRoutingModule { }
