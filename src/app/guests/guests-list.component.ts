import { Component, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { GuestsListService } from './guests-list.service';
import { AlertsService } from '../shared/alerts/alerts.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { HotelListService } from '../hotel-list/hotel-list.service';

@Component({
    selector: 'app-guests-list',
    standalone: true,
    imports: [AlertsComponent, CommonModule, FormsModule],
    templateUrl: './guests-list.component.html',
    styleUrl: './guests-list.component.scss'
})

export class GuestsListComponent implements OnInit, OnDestroy {
    isLoading: boolean = false;
    guests: any[] = [];
    masterGuests: any[] = [];
    allGuests: any[] = []; // current page data
    currentPage: number = 1;
    pageSize: number = 10;
    totalGuests: number = 0;
    totalPages: number = 0;
    searchQuery: string = '';
    selectedKycUrl: SafeResourceUrl | null = null;
    originalKycUrl: string = '';
    isKycPdf: boolean = false;
    isKycModalOpen: boolean = false;
    isDocumentLoading: boolean = false;
    memberId: any = '';
    options = {
        autoClose: true,
        keepAfterRouteChange: false
    };

    constructor(
        private guestsListService: GuestsListService,
        private alertsService: AlertsService,
        private router: Router,
        private localService: LocalStorageService,
        private hotelListService: HotelListService,
        private domSanitizer: DomSanitizer
    ) { }

    async ngOnInit(): Promise<void> {
        const customerType = this.localService.get('CustomerType');
        if (customerType === 'Staff') {
            const staffData = JSON.parse(this.localService.get('StaffData') || '{}');
            this.memberId = staffData.member_id;
            this.getGuestsList(this.memberId);
        }
        else {
            const userId = this.localService.get('UserId');
            try {
                const customerData = await this.getCustomerById(userId);
                if (customerData) {
                    if (customerData.member_id) {
                        this.memberId = customerData.member_id;
                    } else {
                        this.memberId = customerData.customer_member_id;
                    }
                }
                else {
                    this.memberId = this.localService.get('MemberId');
                }
            }
            catch (error) {
                console.error('Error fetching customer details:', error);
                this.memberId = this.localService.get('MemberId');
            }
            this.getGuestsList(this.memberId);
        }
    }

    ngOnDestroy(): void {
        document.body.style.overflow = '';
    }

    getCustomerById(userId: any): Promise<any> {
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
                find: {
                    id: Number(userId)
                }
            }
        };
        return new Promise((resolve) => {
            this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
                next: (resp: any) => {
                    if (resp.success === 1 && resp.status_code === 200 && resp.result?.data?.length > 0) {
                        resolve(resp.result.data[0]);
                    } else {
                        resolve(null);
                    }
                },
                error: () => {
                    resolve(null);
                }
            });
        });
    }

    getGuestsList(memberId: any) {
        this.isLoading = true;
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
                find: {
                    member_id: memberId
                    // Mobile: "8012169931"
                }
            }
        };
        this.guestsListService.getAllGuests(requestBody).subscribe({
            next: (resp: any) => {
                if (resp && resp.success === 1 && resp.status_code === 200) {
                    this.masterGuests = resp.result.data || [];
                    this.applyFilters();
                } else {
                    this.masterGuests = [];
                    this.applyFilters();
                    if (resp && resp.message) {
                        // If no records found, it is normal so we don't spam errors.
                    }
                }
                this.isLoading = false;
            },
            error: (err) => {
                if (err.error?.statusCode === 403) {
                    this.alertsService.error('Session Time Out! Please login Again', this.options);
                    this.router.navigate([`/login`], { skipLocationChange: false });
                } else if (err.error?.message) {
                    this.alertsService.error(err.error.message, this.options);
                } else {
                    this.alertsService.error('Failed to load guests data. Please try again later.', this.options);
                }
                this.isLoading = false;
            }
        });
    }

    applyFilters() {
        const search = this.searchQuery.trim().toLowerCase();
        this.guests = this.masterGuests.filter(guest => {
            // 1. Search term match (First_Name, Last_Name, Mobile, Email)
            let matchesSearch = true;
            if (search) {
                const firstName = (guest.First_Name || '').toLowerCase();
                const lastName = (guest.Last_Name || '').toLowerCase();
                const email = (guest.Email || '').toLowerCase();
                const mobile = (guest.Mobile || '').toLowerCase();
                matchesSearch = firstName.includes(search) ||
                    lastName.includes(search) ||
                    email.includes(search) ||
                    mobile.includes(search);
            }
            return matchesSearch;
        });
        this.totalGuests = this.guests.length;
        this.totalPages = Math.ceil(this.totalGuests / this.pageSize);
        this.currentPage = 1;
        this.updatePaginatedGuests();
    }

    updatePaginatedGuests() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.allGuests = this.guests.slice(startIndex, endIndex);
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePaginatedGuests();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePaginatedGuests();
        }
    }

    viewKyc(url: string) {
        this.isDocumentLoading = true;
        this.originalKycUrl = url;
        const lowercaseUrl = url.toLowerCase();
        if (lowercaseUrl.includes('.pdf')) {
            this.isKycPdf = true;
            const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
            this.selectedKycUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(googleDocsUrl);
        } else {
            this.isKycPdf = false;
            this.selectedKycUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(url);
        }
        this.isKycModalOpen = true;
        document.body.style.overflow = 'hidden';
    }

    onDocumentLoad() {
        this.isDocumentLoading = false;
    }

    closeKycModal() {
        this.selectedKycUrl = null;
        this.originalKycUrl = '';
        this.isKycModalOpen = false;
        this.isDocumentLoading = false;
        document.body.style.overflow = '';
    }


}
