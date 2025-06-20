import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertsService } from '../shared/alerts/alerts.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { Router } from '@angular/router';
@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [AlertsComponent, CommonModule],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss'
})
export class BookingsComponent {
  constructor(
    private alertService: AlertsService,
    private routeUrl: Router,
  ) { }

  // Guests data
  guests = [
    {
      id: 1,
      name: 'John Doe',
      roomNo: '101',
      noOfGuests: 2,
      checkIn: '25/04/10',
      checkInTime: '12:00 PM',
      checkOut: '25/04/12',
      checkOutTime: '11:00 AM',
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
      checkInTime: '01:00 PM',
      checkOut: '25/04/13',
      checkOutTime: '10:30 AM',
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
      checkInTime: '02:00 PM',
      checkOut: '25/04/14',
      checkOutTime: '11:30 AM',
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
      checkInTime: '12:15 PM',
      checkOut: '25/04/11',
      checkOutTime: '11:00 AM',
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
      checkInTime: '03:00 PM',
      checkOut: '25/04/15',
      checkOutTime: '12:00 PM',
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
      checkInTime: '01:30 PM',
      checkOut: '25/04/14',
      checkOutTime: '11:00 AM',
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
      checkInTime: '02:30 PM',
      checkOut: '25/04/13',
      checkOutTime: '10:00 AM',
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
      checkInTime: '12:00 PM',
      checkOut: '25/04/12',
      checkOutTime: '11:00 AM',
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
      checkInTime: '01:00 PM',
      checkOut: '25/04/13',
      checkOutTime: '10:30 AM',
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
      checkInTime: '02:00 PM',
      checkOut: '25/04/14',
      checkOutTime: '11:00 AM',
      roomOccupancy: 'Staying',
      image: '../assets/images/guestezee/guestRoom.png',
      imageType: 'Silver',
      actions: 'View/Edit'
    }
  ];


  // For showing filter
  showFilterDropdown: boolean = false;
  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  // For deleting guests
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  selectedGuestIds: number[] = [];
  isDeleteModalOpen: boolean = false;
  // For storing selected guest ids
  toggleSelection(event: any, guestId: number) {
    if (event.target.checked) {
      this.selectedGuestIds.push(guestId);
      //console.log(this.selectedGuestIds);
    } else {
      this.selectedGuestIds = this.selectedGuestIds.filter(id => id !== guestId);
    }
  }

  deleteSelectedGuests() {
    this.isDeleteModalOpen = false;
  }

  // This function opens the delete modal & deletes the selected guests
  openDeleteModal() {
    if (this.selectedGuestIds.length == 0) {
      this.alertService.error("Please select at least one user to delete.", this.options);
    }
    else {
      this.isDeleteModalOpen = true;
    }
  }
  // This function closes the delete modal
  closeDeleteModal() {
    this.isDeleteModalOpen = false;
  }


  // For viewing guest details
  dropdownVisibleId: number | null = null;
  toggleDropdown(id: number) {
    this.dropdownVisibleId = this.dropdownVisibleId === id ? null : id;
  }

  viewGuest(guestId: number) {
    this.routeUrl.navigate(['/bookings-management', guestId]);
  }



}
