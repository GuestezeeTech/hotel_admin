import { RoleComponent } from './role.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [{ path: 'role', component: RoleComponent },
  { path: 'role/:id', component: RoleComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class RoleRoutingModule { }