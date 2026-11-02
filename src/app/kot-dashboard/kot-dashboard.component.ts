import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { HotelOverviewDashboardComponent } from '../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.component';

@Component({
  selector: 'app-kot-dashboard',
  standalone: true,
  imports: [CommonModule, AlertsComponent, HotelOverviewDashboardComponent],
  templateUrl: './kot-dashboard.component.html',
  styleUrl: './kot-dashboard.component.scss'
})
export class KotDashboardComponent {}
