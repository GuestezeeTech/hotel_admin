import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { FbDepartmentHeadDashboardComponent } from './fb-department-head-dashboard/fb-department-head-dashboard.component';

@Component({
  selector: 'app-fb-dashboard',
  standalone: true,
  imports: [CommonModule, AlertsComponent, FbDepartmentHeadDashboardComponent],
  templateUrl: './fb-dashboard.component.html',
  styleUrl: './fb-dashboard.component.scss'
})
export class FbDashboardComponent {}
