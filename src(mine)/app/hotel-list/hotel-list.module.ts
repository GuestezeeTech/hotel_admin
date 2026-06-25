import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HotelListRoutingModule } from './hotel-list-routing.module';
import { HotelListComponent } from './hotel-list.component';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HotelListRoutingModule  // Add the routing module here
  ]
})
export class HotelListModule { }
