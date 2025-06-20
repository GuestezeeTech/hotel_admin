import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { AlertsService } from '../shared/alerts/alerts.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-late-checkout',
  standalone: true,
  imports: [AlertsComponent, CommonModule],
  templateUrl: './late-checkout.component.html',
  styleUrl: './late-checkout.component.scss'
})
export class LateCheckoutComponent {
  constructor(
    private routerUrl: Router,
    private alerts: AlertsService,
    private localStorageService: LocalStorageService) { }

  // Stores the guest data 
  guestData: any = {};

  ngOnInit(): void {
    const data = this.localStorageService.get('guestData');
    //console.log('Data:', data);
    if (data) {
      this.guestData = JSON.parse(data);
    }
    //console.log(this.guestData);
  }

  // Table data
  guestLogs = [
    {
      name: 'Peter Parker',
      dateTime: '16/01/2024 12:05 hrs',
      reason: 'Checked in',
      status: 'Occupied'
    },
    {
      name: 'Lois Lane',
      dateTime: '16/01/2024 12:30 hrs',
      reason: 'Guest leave',
      status: 'Dirty'
    },
    {
      name: 'Housekeeping staff',
      dateTime: '16/01/2024 12:35 hrs',
      reason: 'Cleaning starts',
      status: 'In-service'
    },
    {
      name: 'Eve Adams',
      dateTime: '16/01/2024 18:20 hrs',
      reason: 'Guest enters',
      status: 'Occupied'
    },
    {
      name: 'Housekeeping staff',
      dateTime: '16/01/2024 13:00 hrs',
      reason: 'Cleaning completed',
      status: 'In-service'
    }
  ];

  navigateToManagement() {
    this.routerUrl.navigate([`/bookings-management/${this.guestData.id}`]);
  }

}
