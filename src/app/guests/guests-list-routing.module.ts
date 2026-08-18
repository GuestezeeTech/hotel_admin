import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GuestsListComponent } from './guests-list.component';

const routes: Routes = [
    { path: 'guests-list', component: GuestsListComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class GuestsListRoutingModule { }
