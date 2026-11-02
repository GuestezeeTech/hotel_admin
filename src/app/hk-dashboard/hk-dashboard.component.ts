import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { HkOperationsDashboardComponent } from './hk-operations-dashboard/hk-operations-dashboard.component';

@Component({
  selector: 'app-hk-dashboard',
  standalone: true,
  imports: [CommonModule, AlertsComponent, HkOperationsDashboardComponent],
  templateUrl: './hk-dashboard.component.html',
  styleUrl: './hk-dashboard.component.scss'
})
export class HkDashboardComponent {}
