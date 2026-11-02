import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { FoOperationsDashboardComponent } from './fo-operations-dashboard/fo-operations-dashboard.component';

@Component({
  selector: 'app-fo-dashboard',
  standalone: true,
  imports: [CommonModule, AlertsComponent, FoOperationsDashboardComponent],
  templateUrl: './fo-dashboard.component.html',
  styleUrl: './fo-dashboard.component.scss'
})
export class FoDashboardComponent {}
