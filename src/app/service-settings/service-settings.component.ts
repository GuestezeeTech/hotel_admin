import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ServiceSettingsModule } from './service-settings.module';
import { Router,ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-service-settings',
  standalone: true,
  imports: [],
  templateUrl: './service-settings.component.html',
  styleUrl: './service-settings.component.scss'
})

export class ServiceSettingsComponent {
    constructor(
      private router: Router,
      
    ) { }
  navigateTNewService(){
    this.router.navigate([`/add-new-service`], { skipLocationChange: false });
  }

}
