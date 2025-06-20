import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { AlertsService } from '../shared/alerts/alerts.service';
import { Router } from '@angular/router';
import { LocalStorageService } from '../auth-services/local-storage.service';
@Component({
  selector: 'app-bookings-management',
  standalone: true,
  imports: [AlertsComponent, CommonModule],
  templateUrl: './bookings-management.component.html',
  styleUrl: './bookings-management.component.scss'
})
export class BookingsManagementComponent {

  // Guests data
  guests = [
    {
      id: 1,
      name: 'John Doe',
      roomNo: '101',
      noOfGuests: 2,
      checkIn: '25/04/10',
      checkInTime: '12:00hrs',
      checkOut: '25/04/12',
      checkOutTime: '11:00hrs',
      roomOccupancy: 'Stayed',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Platinum',
      actions: 'View/Edit'
    },
    {
      id: 2,
      name: 'Alice Smith',
      roomNo: '102',
      noOfGuests: 1,
      checkIn: '25/04/11',
      checkInTime: '01:00hrs',
      checkOut: '25/04/13',
      checkOutTime: '10:30hrs',
      roomOccupancy: 'Staying',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Bronze',
      actions: 'View/Edit'
    },
    {
      id: 3,
      name: 'Bob Johnson',
      roomNo: '103',
      noOfGuests: 3,
      checkIn: '25/04/09',
      checkInTime: '02:00hrs',
      checkOut: '25/04/14',
      checkOutTime: '11:30hrs',
      roomOccupancy: 'Stayed',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Gold',
      actions: 'View/Edit'
    },
    {
      id: 4,
      name: 'Eve Adams',
      roomNo: '104',
      noOfGuests: 2,
      checkIn: '25/04/10',
      checkInTime: '12:15hrs',
      checkOut: '25/04/11',
      checkOutTime: '11:00hrs',
      roomOccupancy: 'Staying',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Silver',
      actions: 'View/Edit'
    },
    {
      id: 5,
      name: 'Charlie White',
      roomNo: '105',
      noOfGuests: 4,
      checkIn: '25/04/12',
      checkInTime: '03:00hrs',
      checkOut: '25/04/15',
      checkOutTime: '12:00hrs',
      roomOccupancy: 'Stayed',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Platinum',
      actions: 'View/Edit'
    },
    {
      id: 6,
      name: 'Diana Prince',
      roomNo: '106',
      noOfGuests: 2,
      checkIn: '25/04/13',
      checkInTime: '01:30hrs',
      checkOut: '25/04/14',
      checkOutTime: '11:00hrs',
      roomOccupancy: 'Stayed',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Gold',
      actions: 'View/Edit'
    },
    {
      id: 7,
      name: 'Bruce Wayne',
      roomNo: '107',
      noOfGuests: 1,
      checkIn: '25/04/11',
      checkInTime: '02:30hrs',
      checkOut: '25/04/13',
      checkOutTime: '10:00hrs',
      roomOccupancy: 'Staying',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Bronze',
      actions: 'View/Edit'
    },
    {
      id: 8,
      name: 'Clark Kent',
      roomNo: '108',
      noOfGuests: 2,
      checkIn: '25/04/10',
      checkInTime: '12:00hrs',
      checkOut: '25/04/12',
      checkOutTime: '11:00hrs',
      roomOccupancy: 'Stayed',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Silver',
      actions: 'View/Edit'
    },
    {
      id: 9,
      name: 'Lois Lane',
      roomNo: '109',
      noOfGuests: 2,
      checkIn: '25/04/12',
      checkInTime: '01:00hrs',
      checkOut: '25/04/13',
      checkOutTime: '10:30hrs',
      roomOccupancy: 'Stayed',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Gold',
      actions: 'View/Edit'
    },
    {
      id: 10,
      name: 'Peter Parker',
      roomNo: '110',
      noOfGuests: 1,
      checkIn: '25/04/13',
      checkInTime: '02:00hrs',
      checkOut: '25/04/14',
      checkOutTime: '11:00hrs',
      roomOccupancy: 'Staying',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Silver',
      actions: 'View/Edit'
    }
  ];

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


  // Gets the id from url and stores it in a variable
  guestId: number | null = null;
  guestData: any = {};
  constructor(
    private route: ActivatedRoute,
    private alerts: AlertsService,
    private routeUrl: Router,
    private localStorageService: LocalStorageService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.guestId = Number(id); // Converts to number;
        this.guestData = this.guests.find(guest => guest.id === this.guestId);
      }
    });
  }

  navigateToCheckout() {
    this.localStorageService.set('guestData', JSON.stringify(this.guestData));
    this.routeUrl.navigate(['/late-checkout'])
  }
}
