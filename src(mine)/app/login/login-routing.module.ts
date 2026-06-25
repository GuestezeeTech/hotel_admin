// login/login-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';  // Make sure Routes is imported here
import { LoginComponent } from './login.component';  // Import your LoginComponent

const routes: Routes = [  // Declare routes array with the correct type
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },  // Define the route for the LoginComponent
  { path: 'hotel-registration/login', component: LoginComponent }  // Define the route for the LoginComponent
];

@NgModule({
  imports: [RouterModule.forChild(routes)],  // Pass routes array to forChild() for child module routing
  exports: [RouterModule]  // Export RouterModule so it can be used in LoginModule
})
export class LoginRoutingModule {}
