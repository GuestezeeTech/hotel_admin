import { HotelListService } from './../hotel-list/hotel-list.service';
import { LocalStorageService } from './../auth-services/local-storage.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertsService } from '../shared/alerts/alerts.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { BookingsService } from './bookings.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [AlertsComponent, CommonModule, FormsModule],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss'
})

export class BookingsComponent {
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
  filteredGuests = [...this.guests]; // initialize with all guests
  // For deleting guests
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  selectedGuestIds: number[] = [];
  isDeleteModalOpen: boolean = false;
  // For viewing guest details
  dropdownVisibleId: number | null = null;
  // For showing filter
  showFilterDropdown: boolean = false;
  searchTerm: string = '';
  allBookings: any[] = [];
  hotelId: any;
  memberId: any;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 per page
  totalTasks: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  bookings: any[] = [];

  constructor(
    private alertService: AlertsService,
    private routeUrl: Router,
    private bookingService: BookingsService,
    private localStorageService: LocalStorageService,
    private hotelListService: HotelListService
  ) { }

  ngOnInit(): void {
    this.hotelId = Number(this.localStorageService.get('UserId'));
    if (this.hotelId) {
      this.getCustomerById(this.hotelId);
    }
    // this.getAllBookings();
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

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

  toggleDropdown(id: number) {
    this.dropdownVisibleId = this.dropdownVisibleId === id ? null : id;
  }

  viewGuest(guestId: number) {
    this.routeUrl.navigate(['/bookings-management', guestId]);
  }

  filterGuests() {
    const term = this.searchTerm.toLowerCase().trim();
    console.log('Search term:', term);
    if (!term) {
      this.filteredGuests = [...this.guests]; // reset when empty
      return;
    }
    this.filteredGuests = this.guests.filter(guest =>
      guest.name.toLowerCase().includes(term) ||
      guest.roomNo.toLowerCase().includes(term)
    );
    console.log('Filtered Guests:', this.filteredGuests);
  }

  getCustomerById(hotelId: any): Promise<any> {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: hotelId } }
    };
    return new Promise((resolve, reject) => {
      this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
        next: (resp: any) => {
          if (resp.success === 1 && resp.status_code === 200) {
            const userData = resp.result.data[0];
            this.memberId = userData.customer_member_id;
            console.log('Member id:', this.memberId);
            this.getAllBookings(this.memberId);
            resolve(userData);
          } else {
            reject('Customer not found');
          }
        },
        error: reject
      });
    });
  }

  getAllBookings(memberId: any) {
    console.log('All Bookings:', memberId);
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          // "member_id": "BINM00071"
          "member_id": memberId
        },
        "pagination": true,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 10
        },
        "sorting": true,
        "sortingDetails": {
          "email": -1
        }
      }
    }
    this.bookingService.getAllBookings(requestBody).subscribe(
      resp => {
        if (resp) {
          const rawBookings = resp.result.data;
          // Map to store the most recent record for each Guest_Id
          const bookingMap = new Map<string, any>();
          rawBookings.forEach((booking: any) => {
            const guestId = booking.Guest_detail?.[0]?.Guest_Id;
            if (!guestId) return;
            // Keep only the first occurrence (assuming array is sorted most recent first)
            if (!bookingMap.has(guestId)) {
              bookingMap.set(guestId, booking);
            }
          });
          // Convert map values back to array
          this.allBookings = Array.from(bookingMap.values());
          // this.allBookings = resp.result.data;
          console.log(this.allBookings, "Bookings List");
          this.bookings = this.allBookings;
          this.totalTasks = this.allBookings.length;
          this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
          this.updatePaginatedTasks();
        }
      },
      err => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.routeUrl.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertService.error(err.error.message, this.options)
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
      }
    )
  }

  // Newly added - function to get event status
  getEventStatus(event: string): string {
    if (event === 'Reserved' || event === 'Reserved(Amend)') {
      return 'Reserved';
    }
    if (event === 'Check-in' || event === 'In-house(Amend)') {
      return 'Checked-in';
    }
    if (event === 'Checked-out') {
      return 'Checked-out';
    }
    if (event === 'Cancelled') {
      return 'Cancelled';
    }
    return event; // fallback in case of unknown value
  }


  updatePaginatedTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allBookings = this.bookings.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedTasks();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedTasks();
    }
  }

}
