import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ServiceSettingsRoutingModule } from './service-settings-routing.module';
import { RouterModule } from '@angular/router';
import { OnInit } from '@angular/core';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ServiceSettingsRoutingModule,
    RouterModule
  ]
})
export class ServiceSettingsModule implements OnInit {
  ngOnInit(): void {
    
  }
 }
