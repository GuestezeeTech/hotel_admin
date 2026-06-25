import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServiceTabListComponent } from './service-tab-list.component';

const routes: Routes = [
    { path: '', component: ServiceTabListComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class ServiceTabListRoutingModule { }