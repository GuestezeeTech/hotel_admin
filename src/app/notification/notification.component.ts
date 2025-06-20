import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertsService } from '../shared/alerts/alerts.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [AlertsComponent, CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent {
  constructor(
    private alertService: AlertsService
  ) { }

  // Notification data
  @Output() close = new EventEmitter<void>();
  notifications = [
    {
      day: 'Today',
      list: [
        { initials: 'ST', name: 'Steve John', time: '11:50' },
        { initials: 'VI', name: 'Victor', time: '10:00' },
        { initials: 'VI', name: 'Vimal', time: '09:00' }
      ]
    },
    {
      day: 'Yesterday',
      list: [
        { initials: 'JH', name: 'John', time: '12:00' },
        { initials: 'KU', name: 'Kumar', time: '10:00' },
        { initials: 'VA', name: 'Varshini', time: '09:40' },
        { initials: 'AE', name: 'Elakkiya', time: '08:14' },
        { initials: 'AT', name: 'Thirishul', time: '06:08' }
      ]
    }
  ];

}
