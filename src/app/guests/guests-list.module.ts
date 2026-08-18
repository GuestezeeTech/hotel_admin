import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestsListRoutingModule } from './guests-list-routing.module';
import { GuestsListComponent } from './guests-list.component';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        GuestsListRoutingModule,
        GuestsListComponent
    ]
})

export class GuestsListModule { }
