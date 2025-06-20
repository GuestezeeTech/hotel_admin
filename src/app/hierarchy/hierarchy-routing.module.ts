import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HierarchyFormComponent } from './hierarchy-form/hierarchy-form.component';
import { HierarchyViewComponent } from './hierarchy-view/hierarchy-view.component';
import { HierarchyDetailsComponent } from '../hotel-enrollment-tabview/hierarchy-details/hierarchy-details.component';
import { HierarchyCustomerViewComponent } from './hierarchy-customer-view/hierarchy-customer-view.component';

const routes: Routes = [
  { path: 'create-new-hierarchy', component: HierarchyFormComponent },
  { path: 'edit-hierarchy/:id', component: HierarchyFormComponent },
  { path: 'view', component: HierarchyViewComponent },
  { path: 'view-hierarchy/:id', component: HierarchyViewComponent },
  { path: 'hierarchy-list', component: HierarchyDetailsComponent },
  // Newly added
  { path: 'view-customer-hierarchy/:id', component: HierarchyCustomerViewComponent },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class HierarchyRoutingModule { }
