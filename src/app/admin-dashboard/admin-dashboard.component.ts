import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { AlertsService } from '../shared/alerts/alerts.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import Chart from 'chart.js/auto';
import { Router } from '@angular/router';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AlertsComponent, CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})

export class AdminDashboardComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private alerts: AlertsService,
    private localStorageService: LocalStorageService,
    private routerUrl: Router) { }

  ngOnInit(): void {
    this.createGuestUsageChart();
  }

  summaryCards = [
    { label: 'Guest Logged', count: '087' },
    { label: 'Total Request', count: '65' },
    { label: 'Completed', count: '56' },
    { label: 'Escalated', count: '2' }
  ];

  // For filter dropdown
  selectedUsageFilter = 'Last Year';
  isUsageDropdownOpen = false;

  toggleUsageDropdown() {
    this.isUsageDropdownOpen = !this.isUsageDropdownOpen;
  }

  setUsageFilter(filter: string) {
    this.selectedUsageFilter = filter;
    this.isUsageDropdownOpen = false;
  }

  createGuestUsageChart() {
    const canvas = document.getElementById('guestUsageChart') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [{
            label: 'Guest Usage',
            data: [73, 18, 12, 14, 60, 30, 90, 65, 59, 52, 75, 100],
            borderColor: '#FFDA2D',
            backgroundColor: 'transparent',
            borderWidth: 4,
            pointRadius: 0,
            tension: 0.4,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#838383' },
              border: { display: false }
            },
            y: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 25,
                color: '#838383'
              },
              grid: {
                color: '#E4E5E7'
              },
              border: { display: false }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: '#000',
              titleColor: '#fff',
              bodyColor: '#fff'
            }
          }
        }
      });
    }
  }

  // Guest data
  guestData = [
    { resNo: '84721', guestName: 'Aanya Kapoor', roomNo: 101, noOfGuests: 2, checkIn: '10/12/24', checkOut: '15/12/24' },
    { resNo: '93845', guestName: 'Raghav Mehta', roomNo: 202, noOfGuests: 1, checkIn: '18/12/24', checkOut: '20/12/24' },
    { resNo: '10234', guestName: 'Sanjana Iyer', roomNo: 305, noOfGuests: 3, checkIn: '22/12/24', checkOut: '28/12/24' },
    { resNo: '64829', guestName: 'Vihaan Singh', roomNo: 410, noOfGuests: 4, checkIn: '24/12/24', checkOut: '01/01/25' },
    { resNo: '75913', guestName: 'Meera Nandakumar', roomNo: 115, noOfGuests: 2, checkIn: '19/12/24', checkOut: '23/12/24' },
    { resNo: '82394', guestName: 'Arjun Das', roomNo: 509, noOfGuests: 3, checkIn: '30/12/24', checkOut: '04/01/25' },
    { resNo: '54927', guestName: 'Kavya Sinha', roomNo: 206, noOfGuests: 2, checkIn: '25/12/24', checkOut: '31/12/24' },
    { resNo: '72831', guestName: 'Dhruv Khanna', roomNo: 307, noOfGuests: 1, checkIn: '27/12/24', checkOut: '02/01/25' },
    { resNo: '63928', guestName: 'Tara Reddy', roomNo: 412, noOfGuests: 2, checkIn: '21/12/24', checkOut: '26/12/24' },
    { resNo: '49573', guestName: 'Neeraj Verma', roomNo: 108, noOfGuests: 4, checkIn: '29/12/24', checkOut: '06/01/25' }
  ];

  // Service data
  serviceData = [
    { roomNo: 500, name: 'Nayan Brar', serviceType: 'Room Spray', serviceDept: 'Electrical', assignee: 'Varghese' },
    { roomNo: 123, name: 'Sabari', serviceType: 'Room Towel', serviceDept: 'Plumbing', assignee: 'Tom' },
    { roomNo: 600, name: 'Vineeth Raj', serviceType: 'Hand Towels', serviceDept: 'Delivery', assignee: 'Jadeja' },
    { roomNo: 124, name: 'Priyanka', serviceType: 'Body Spray', serviceDept: 'House Keeping', assignee: 'Varun' },
    { roomNo: 984, name: 'Vijayan', serviceType: 'Soap', serviceDept: 'House Keeping', assignee: 'Sivaji' },
    { roomNo: 333, name: 'Vignesh', serviceType: 'Bath Towel', serviceDept: 'House Keeping', assignee: 'Michael' },
    { roomNo: 401, name: 'Sneha', serviceType: 'Toothpaste', serviceDept: 'Delivery', assignee: 'Anita' },
    { roomNo: 215, name: 'Arun', serviceType: 'Shampoo', serviceDept: 'House Keeping', assignee: 'George' },
    { roomNo: 702, name: 'Ritika', serviceType: 'Face Tissue', serviceDept: 'House Keeping', assignee: 'Rahul' },
    { roomNo: 319, name: 'Karthik', serviceType: 'Body Lotion', serviceDept: 'Electrical', assignee: 'Mohan' }
  ];

  // Selected service 
  selectedButton: string = 'escalated';  // Tracks the selected button

  selectButton(button: string): void {
    this.selectedButton = button; // Sets the selected button
  }

  navigateToBookings() {
    this.routerUrl.navigate(['/bookings']);
  }

  // For navigating to reports
  generateReport() {
    this.routerUrl.navigateByUrl('/report')
  }
}
