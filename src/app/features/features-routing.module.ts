import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeaturesComponent } from './features.component';
import { UpsellTypesComponent } from './upsell-types/upsell-types.component';

const routes: Routes = [
  { path: 'features', component: FeaturesComponent },
  // Upsell names for the Upselling "Name" dropdown (FEATURES permission via the /features path)
  { path: 'features/upsell-names', component: UpsellTypesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class FeaturesRoutingModule { }
