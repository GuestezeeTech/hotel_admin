import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { AlertsService } from '../shared/alerts/alerts.service';
import { LoaderService } from '../shared/loader/loader.service';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { DepartmentListService } from '../department-list/department-list.service';
import { ServiceDetailService } from '../hotel-enrollment-tabview/service-details/service-details.service';
import { TaskManagementService } from '../task-management/task-management.service';
import { Observable, switchMap, tap, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { ProfileService } from '../profile/profile.service';
import { RestaurantsListService } from './restaurants-list.service';
import { ENDPOINTS } from '../app.config';
import { PermissionService, ModulePermission } from '../services/permission.service';

@Component({
  selector: 'app-restaurants-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertsComponent],
  templateUrl: './restaurants-list.component.html',
  styleUrl: './restaurants-list.component.scss'
})

export class RestaurantsListComponent implements OnInit, OnDestroy {
  customerdata: any = {};
  menuOutlets: any[] = [];
  selectedOutlet: any = null;
  today: string = '';
  fallbackOutletImage = 'https://ecbee-labes-images1.s3.ap-south-1.amazonaws.com/Guestezee/Brand/Re.png';
  // fallbackOutletImage = '';
  offers: any[] = [];
  // Flag to show modal
  isClearMenuModalOpen = false;
  pendingOutletChange: any = null;
  // Pagination
  currentPage = 1;
  pageSize = 9;
  totalPages = 0;
  paginatedOffers: any[] = [];
  offerSearchText: string = '';
  filteredOffers: any[] = [];
  departments: any[] = [];
  // Staff assignment
  member_id: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isOfferModalOpen = false;
  selectedOfferOutlet: any = null;
  offerForm: {
    name: string;
    discountType: 'percentage' | 'flat';
    discountValue: number | null;      // renamed from value
    baseAmount: number | null;         // renamed properly
    afterDiscount: number | null;      // renamed from calculatedValue
    dateMode: 'single' | 'multiple';
    durationType: 'continuous' | 'daily';
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    imageUrl: string | null;
  } = {
      name: '',
      discountType: 'percentage',
      discountValue: null,
      baseAmount: null,
      afterDiscount: null,
      dateMode: 'single',
      durationType: 'daily',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      imageUrl: null
    };
  isPickerOpen = false;
  offerErrors: any = {};
  isOfferSubmitted = false;
  isDeleteOfferModalOpen = false;
  offerToDelete: any = null;
  isEditMode = false;
  editingOfferId: number | null = null;
  // Guest / Room selection
  isGuestModalOpen = false;
  selectedOfferForGuest: any = null;
  roomSearchText: string = '';
  allRooms: string[] = [];
  filteredRooms: string[] = [];
  selectedRooms: string[] = [];
  isGuestSaving = false;
  initialSelectedRooms: string[] = [];
  checkInRooms: Set<string> = new Set(); // Store room numbers with Check-in event

  constructor(
    private router: Router,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private localService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private profileService: ProfileService,
    private restaurantsListService: RestaurantsListService,
    private permissionService: PermissionService
  ) { }

  ngOnInit(): void {
    // Set today's date in yyyy-MM-dd format for date inputs
    this.today = new Date().toISOString().split('T')[0];
    this.member_id = this.localService.get('MemberId');
    // console.log('Member Id:', this.member_id);
    if (this.member_id) {
      this.getCustomerById();
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('no-scroll-in-restaurants-list');
  }

  // Permission helpers for FEATURES
  get canReadFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_read_permission ?? false;
  }

  get canAddFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_add_permission ?? false;
  }

  get canEditFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_edit_permission ?? false;
  }

  get canDeleteFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_delete_permission ?? false;
  }

  // Click handlers that respect permissions and stop propagation
  onEditOfferClick(offer: any, event: Event) {
    event.stopPropagation();
    if (!this.canEditFeatures || !this.canReadFeatures) return;
    this.editOffer(offer);
  }

  onDeleteOfferClick(offer: any, event: Event) {
    event.stopPropagation();
    if (!this.canDeleteFeatures || !this.canReadFeatures) return;
    this.openDeleteOfferModal(offer);
  }

  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            customer_member_id: this.member_id
          }
        }
      };
      this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe(
        (resp: any) => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0]; // store customer data
            // console.log('Customer data:', this.customerdata);
            this.initializeRoomsFromCustomer();
            this.getMenuOutlets();
            resolve();  // Resolve promise when data is set
          }
        },
        (err: any) => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);
        }
      );
    });
  }

  initializeRoomsFromCustomer() {
    const roomRange = this.customerdata?.settings?.room_range;
    if (!Array.isArray(roomRange) || roomRange.length === 0) {
      this.allRooms = [];
      this.filteredRooms = [];
      this.selectedRooms = [];
      return;
    }
    // Build an array of "start-end" or single values from room_range
    const rangeStrings: string[] = [];
    roomRange.forEach((r: any) => {
      if (r.startRoom && r.endRoom) {
        rangeStrings.push(`${r.startRoom}-${r.endRoom}`);
      } else if (r.startRoom) {
        rangeStrings.push(String(r.startRoom));
      }
    });
    let roomList: string[] = [];
    const expandAlphaRange = (start: string, end: string): string[] => {
      const result: string[] = [];
      const toNumber = (str: string) => {
        let n = 0;
        for (let i = 0; i < str.length; i++) {
          n = n * 26 + (str.charCodeAt(i) - 65 + 1);
        }
        return n;
      };
      const toLetters = (num: number) => {
        let s = '';
        while (num > 0) {
          let rem = (num - 1) % 26;
          s = String.fromCharCode(65 + rem) + s;
          num = Math.floor((num - 1) / 26);
        }
        return s;
      };
      const startNum = toNumber(start.toUpperCase());
      const endNum = toNumber(end.toUpperCase());
      for (let i = startNum; i <= endNum; i++) {
        result.push(toLetters(i));
      }
      return result;
    };
    rangeStrings.forEach((value: string) => {
      const trimmed = String(value).trim();
      const alphaNumericRange = trimmed.match(/^([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
      if (alphaNumericRange) {
        const start = alphaNumericRange[1];
        const end = alphaNumericRange[2];
        // Numeric range: "1-100"
        if (!isNaN(Number(start)) && !isNaN(Number(end))) {
          for (let i = Number(start); i <= Number(end); i++) {
            roomList.push(String(i));
          }
        }
        // Numeric prefix + single-letter suffix: "1A-1Z"
        else if (/^\d+[A-Z]+$/i.test(start) && /^\d+[A-Z]+$/i.test(end)) {
          const prefixMatch = start.match(/^\d+/);
          const prefix = prefixMatch ? prefixMatch[0] : '';
          const startSuffix = start.slice(prefix.length);
          const endSuffix = end.slice(prefix.length);
          roomList.push(
            ...expandAlphaRange(startSuffix.toUpperCase(), endSuffix.toUpperCase()).map(
              suffix => `${prefix}${suffix}`
            )
          );
        }
        // Letter prefix + numeric suffix: "A1-A5"
        else if (/^[A-Z]+\d+$/i.test(start) && /^[A-Z]+\d+$/i.test(end)) {
          const prefixMatch = start.match(/^[A-Z]+/i);
          const prefix = prefixMatch ? prefixMatch[0] : '';
          const startNum = parseInt(start.slice(prefix.length), 10);
          const endNum = parseInt(end.slice(prefix.length), 10);
          for (let i = startNum; i <= endNum; i++) {
            roomList.push(`${prefix}${i}`);
          }
        }
        // Pure alphabetic range: "AA-AZ"
        else if (/^[A-Z]+$/i.test(start) && /^[A-Z]+$/i.test(end)) {
          roomList.push(...expandAlphaRange(start.toUpperCase(), end.toUpperCase()));
        }
        // Fallback: treat as single string
        else {
          roomList.push(trimmed);
        }
      } else {
        roomList.push(trimmed); // single room
      }
    });
    this.allRooms = roomList;
    this.filteredRooms = [...this.allRooms];
    this.selectedRooms = [];
    // console.log('All Rooms (Restaurants List):', this.allRooms);
  }

  getMenuOutlets() {
    if (!this.customerdata?.Hotel_Code || !this.member_id) {
      console.error('Cannot fetch outlets: Hotel_Code or member_id missing');
      this.menuOutlets = [];
      return;
    }
    const requestBody = {
      domain_name: 'https://www.guestezee.com',
      user_id: 12,
      extras: {
        find: {
          Hotel_Code: this.customerdata.Hotel_Code
        },
        pagination: false,
        sorting: false
      }
    };
    this.taskManagementService.getAllOutlets(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp.status_code === 200) {
          // this.menuOutlets = resp.result?.data || [];
          this.menuOutlets = (resp.result?.data || []).map((outlet: any) => ({
            ...outlet,
            id: outlet.winhms_outlet_id
          }));

          // If there are outlets, auto-select the first one by default
          if (this.menuOutlets.length > 0) {
            this.applyOutletChange(this.menuOutlets[0]);
          } else {
            this.selectedOutlet = null;
            this.offers = [];
            this.filteredOffers = [];
            this.paginatedOffers = [];
          }
        } else {
          this.menuOutlets = [];
          this.selectedOutlet = null;
          this.offers = [];
          this.filteredOffers = [];
          this.paginatedOffers = [];
        }
      },
      () => {
        this.menuOutlets = [];
        this.selectedOutlet = null;
        this.offers = [];
        this.filteredOffers = [];
        this.paginatedOffers = [];
      }
    );
  }

  selectOutlet(outlet: any) {
    // Case 1: Same outlet clicked → UNSELECT
    if (this.selectedOutlet?.id === outlet.id) {
      this.selectedOutlet = null;
      return;
    }
    // Case 2: Normal switch
    this.applyOutletChange(outlet);
  }

  // Confirm change
  confirmChangeRestaurant() {
    if (this.pendingOutletChange) {
      this.applyOutletChange(this.pendingOutletChange);
      this.pendingOutletChange = null;
    }
    this.isClearMenuModalOpen = false;
  }

  // Apply outlet change logic
  applyOutletChange(outlet: any) {
    this.selectedOutlet = outlet;
    this.offerSearchText = '';
    this.filteredOffers = [];
    this.getOffersByOutlet(outlet);
  }

  getOffersByOutlet(outlet: any) {
    this.currentPage = 1;
    this.offerSearchText = '';
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          outlet_id: outlet.winhms_outlet_id
        }
      }
    };
    this.restaurantsListService.postApiCall(requestBody, ENDPOINTS.GET_OFFERS_BY_OUTLET).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp.status_code === 200) {
          this.offers = resp.result.data;
          // console.log('Offers:', this.offers);
          this.filteredOffers = [...this.offers];
          this.totalPages = Math.ceil(this.filteredOffers.length / this.pageSize);
          this.updatePaginatedOffers();
        }
        else {
          // console.log('No Offers found');
          this.offers = [];
          this.paginatedOffers = [];
          this.filteredOffers = [];
        }
      },
      (err: any) => {
        console.error('Error fetching offer details:', err);
        this.offers = [];
        this.paginatedOffers = [];
        this.filteredOffers = [];
      }
    );
  }

  onOfferSearch() {
    // console.log('Offer Search Text:', this.offerSearchText);
    const search = this.offerSearchText.trim().toLowerCase();
    // console.log('Searched Text:', search);
    this.filteredOffers = this.offers.filter(p =>
      p.name?.toLowerCase().includes(search)
    )
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredOffers.length / this.pageSize);
    this.updatePaginatedOffers();
  }

  updatePaginatedOffers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedOffers = this.filteredOffers.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedOffers();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedOffers();
    }
  }

  // Remove a offer from selection
  removeSelectedProduct(offer: any) {
    offer.qty = 0;
    // console.log('Removed offer:', offer);
  }

  openOfferModal(outlet: any) {
    this.selectedOfferOutlet = outlet;
    this.resetOfferForm();
    this.isOfferModalOpen = true;
    // Prevent background scroll when the offer modal is open
    document.body.classList.add('no-scroll-in-restaurants-list');
  }

  allowOnlyNumbers(event: any) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  blockPaste(event: any) {
    event.preventDefault();
  }

  calculateDiscountResult() {
    const discountValue = Number(this.offerForm.discountValue);
    const baseAmount = Number(this.offerForm.baseAmount);
    if (!discountValue || !baseAmount) {
      this.offerForm.afterDiscount = null;
      return;
    }
    let finalAmount: number;
    if (this.offerForm.discountType === 'percentage') {
      const discountAmount = (baseAmount * discountValue) / 100;
      finalAmount = baseAmount - discountAmount;
    } else {
      // flat discount
      finalAmount = Math.max(baseAmount - discountValue, 0);
    }
    //  keep max 2 decimals, no rounding
    this.offerForm.afterDiscount = Number(finalAmount.toFixed(2));
  }

  onDateModeChange() {
    if (this.offerForm.dateMode === 'single') {
      this.offerForm.durationType = 'daily';
      this.offerForm.endDate = this.offerForm.startDate;
    } else {
      this.offerForm.endDate = '';
    }
  }

  onStartDateChange() {
    if (this.offerForm.dateMode === 'single') {
      this.offerForm.endDate = this.offerForm.startDate;
    }
  }

  getMinEndDate(): string {
    if (!this.offerForm.startDate) return '';
    const d = new Date(this.offerForm.startDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  togglePicker(event: any) {
    if (this.isPickerOpen) {
      event.target.blur();        // CLOSE
      this.isPickerOpen = false;
    } else {
      event.target.showPicker?.(); // OPEN
      this.isPickerOpen = true;
    }
  }

  closeOnChange(event: any) {
    setTimeout(() => {
      event.target.blur();
      this.isPickerOpen = false;
    }, 0);
  }

  onOfferImageChange(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    fileInput.value = ''; // reset immediately to allow re-upload
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSizeMB = 2;
    // Validate type
    if (!allowedTypes.includes(file.type)) {
      this.offerErrors.image = 'Only JPG, JPEG or PNG images are allowed';
      this.offerForm.imageUrl = '';
      return;
    }
    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      this.offerErrors.image = 'Image size must be under 2MB';
      this.offerForm.imageUrl = '';
      return;
    }
    // Check 16:9 ratio
    const img = new Image();
    img.onload = () => {
      const is16by9 = img.width * 9 === img.height * 16;
      if (!is16by9) {
        this.offerErrors.image = 'Image must be in 16:9 ratio (1280×720)';
        this.offerForm.imageUrl = '';
        return;
      }
      // VALID IMAGE → Upload to API
      this.offerErrors.image = null;
      const reader = new FileReader();
      reader.readAsDataURL(file); // Optional: for preview
      const formData = new FormData();
      formData.append('upload', file);
      const headers = { source: 'Brand', domain_name: DOMAIN_NAME };
      // Call your API to upload the image
      this.profileService.sendImage(formData, headers).subscribe(
        (resp: any) => {
          if (resp && resp.success === 1 && resp.status_code === 200) {
            const uploadedImage = resp.result.data[0];
            this.offerForm.imageUrl = uploadedImage.location;
            this.alertService.success('Image uploaded successfully', this.options);
          } else {
            this.offerErrors.image = 'Image upload failed. Try again.';
            this.alertService.error(this.offerErrors.image, this.options);
          }
        },
        (err: any) => {
          this.offerErrors.image = 'Image upload failed. Try again.';
          this.alertService.error(this.offerErrors.image, this.options);
        }
      );
    };
    img.src = URL.createObjectURL(file);
  }

  removeOfferImage() {
    this.offerForm.imageUrl = null;
    this.offerErrors.image = null;
  }

  viewOfferImage() {
    if (this.offerForm.imageUrl) {
      window.open(this.offerForm.imageUrl, '_blank');
    }
  }

  validateOfferForm(): boolean {
    this.offerErrors = {};
    // Offer Name
    if (!this.offerForm.name?.trim()) {
      this.offerErrors.name = 'Offer name is required';
    }
    // Image
    if (!this.offerForm.imageUrl) {
      this.offerErrors.image = 'Offer image is required';
    }
    // Type
    if (!this.offerForm.discountType) {
      this.offerErrors.discountType = 'Please select offer type';
    }
    // Discount Value
    if (this.offerForm.discountValue === null || this.offerForm.discountValue === undefined) {
      this.offerErrors.discountValue = 'Discount value is required';
    } else if (this.offerForm.discountValue <= 0) {
      this.offerErrors.discountValue = 'Enter a valid discount value';
    } else if (
      this.offerForm.discountType === 'percentage' &&
      this.offerForm.discountValue > 100
    ) {
      this.offerErrors.discountValue = '% discount cannot exceed 100';
    }
    // Base Amount (optional)
    if (this.offerForm.baseAmount !== null && this.offerForm.baseAmount !== undefined) {
      if (this.offerForm.baseAmount <= 0) {
        this.offerErrors.baseAmount = 'Enter a valid base amount';
      }
    }
    // Start/End Date
    if (!this.offerForm.startDate) {
      this.offerErrors.startDate = 'Start date is required';
    } else {
      const start = new Date(this.offerForm.startDate);
      const today = new Date(this.today);
      // Normalize times for comparison
      start.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        this.offerErrors.startDate = 'Start date cannot be in the past';
      }
    }
    if (this.offerForm.dateMode === 'multiple') {
      if (!this.offerForm.endDate) {
        this.offerErrors.endDate = 'End date is required';
      }
      else {
        const start = new Date(this.offerForm.startDate);
        const end = new Date(this.offerForm.endDate);

        if (end <= start) {
          this.offerErrors.endDate =
            'End date must be after start date';
        }
      }
    }
    // Start/End Time
    if (!this.offerForm.startTime) {
      this.offerErrors.startTime = 'Start time is required';
    }
    if (!this.offerForm.endTime) {
      this.offerErrors.endTime = 'End time is required';
    }
    // Time comparison based on dateMode
    if (this.offerForm.startTime && this.offerForm.endTime) {
      if (this.offerForm.dateMode === 'single') {
        // On single day, endTime must be after startTime and not same
        if (this.offerForm.endTime <= this.offerForm.startTime) {
          this.offerErrors.endTime = 'End time must be after start time';
        }
      } else if (this.offerForm.dateMode === 'multiple') {
        // On multiple days, startTime/endTime can be same or endTime before startTime
        // No error needed
      }
    }
    // Duration Type check
    if (!this.offerForm.durationType) {
      this.offerErrors.durationType = 'Select offer duration type';
    }
    return Object.keys(this.offerErrors).length === 0;
  }

  editOffer(offer: any) {
    this.isEditMode = true;
    this.editingOfferId = offer.id;
    this.selectedOfferOutlet = this.selectedOutlet;
    this.offerForm = {
      name: offer.name,
      discountType: offer.discount_type,
      discountValue: offer.discount_value,
      baseAmount: offer.base_amount,
      afterDiscount: offer.after_discount,
      dateMode: offer.date_mode,
      durationType: offer.duration_type,
      startDate: offer.start_date,
      endDate: offer.end_date,
      startTime: offer.start_time,
      endTime: offer.end_time,
      imageUrl: offer.image_url
    };
    this.isOfferModalOpen = true;
  }

  formatTime12h(time: string): string {
    if (!time) return '';
    const [hour, minute] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  saveOffer() {
    this.isOfferSubmitted = true;
    if (!this.validateOfferForm()) {
      return;
    }
    if (this.isEditMode) {
      this.updateOffer();
    } else {
      this.createOffer();
    }
  }

  buildOfferData() {
    return {
      name: this.offerForm.name,
      discount_type: this.offerForm.discountType,
      discount_value: this.offerForm.discountValue,
      // base_amount: this.offerForm.baseAmount,
      // after_discount: this.offerForm.afterDiscount,
      base_amount: this.offerForm.baseAmount ?? 0,
      after_discount: this.offerForm.afterDiscount ?? 0,
      date_mode: this.offerForm.dateMode,
      duration_type: this.offerForm.durationType,
      start_date: this.offerForm.startDate,
      end_date:
        this.offerForm.dateMode === 'multiple'
          ? this.offerForm.endDate
          : this.offerForm.startDate,
      start_time: this.offerForm.startTime,
      end_time: this.offerForm.endTime,
      image_url: this.offerForm.imageUrl,
      hotel_code: this.selectedOfferOutlet?.Hotel_Code,
      outlet_id: this.selectedOfferOutlet?.winhms_outlet_id
    };
  }

  createOffer() {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        offer_creation: this.buildOfferData()
      }
    };
    // console.log('Payload of create offer:', payload);
    this.restaurantsListService
      .postApiCall(payload, ENDPOINTS.CREATE_OFFER)
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === 1 && resp.status_code === 200) {
            this.alertService.success('Offer created successfully', this.options);
            this.closeOfferModal();
            this.getOffersByOutlet(this.selectedOutlet);
          } else {
            this.alertService.error(resp.message, this.options);
          }
        },
        error: (err: any) => {
          this.alertService.error(err?.error?.message || 'Something went wrong', this.options);
        }
      });
  }

  updateOffer() {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: this.editingOfferId
        }
      },
      payload: {
        offer_updation: this.buildOfferData()
      }
    };
    // console.log('Payload of update offer:', payload);
    this.restaurantsListService
      .postApiCall(payload, ENDPOINTS.UPDATE_OFFER)
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === 1 && resp.status_code === 200) {
            this.alertService.success('Offer updated successfully', this.options);
            this.closeOfferModal();
            this.getOffersByOutlet(this.selectedOutlet);
          } else {
            this.alertService.error(resp.message, this.options);
          }
        },
        error: (err: any) => {
          this.alertService.error(err?.error?.message || 'Something went wrong', this.options);
        }
      });
  }

  closeOfferModal() {
    this.isOfferModalOpen = false;
    this.selectedOfferOutlet = null;
    this.isEditMode = false;
    this.editingOfferId = null;
    this.resetOfferForm();
    // Re‑enable background scroll when the offer modal closes
    document.body.classList.remove('no-scroll-in-restaurants-list');
  }

  resetOfferForm() {
    this.offerForm = {
      name: '',
      discountType: 'percentage',
      discountValue: null,
      baseAmount: null,
      afterDiscount: null,
      dateMode: 'single',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      imageUrl: null,
      durationType: 'daily',
    };

    this.offerErrors = {};
    this.isOfferSubmitted = false;
  }

  openDeleteOfferModal(offer: any) {
    this.offerToDelete = offer;
    this.isDeleteOfferModalOpen = true;
  }

  confirmDeleteOffer() {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {},
      extras: {
        find: {
          id: this.offerToDelete.id
        }
      }
    };
    // console.log('Payload of delete offer:', payload);
    this.restaurantsListService
      .postApiCall(payload, ENDPOINTS.DELETE_OFFER)
      .subscribe((resp: any) => {
        if (resp && resp.success === 1 && resp.status_code === 200) {
          this.alertService.success('Offer deleted successfully', this.options);
          this.isDeleteOfferModalOpen = false;
          this.getOffersByOutlet(this.selectedOutlet);
        }
        else {
          this.alertService.error(resp.message, this.options);
        }
      });
  }

  // ===== Guest Modal & Room Search =====
  openGuestModal(offer: any) {
    this.selectedOfferForGuest = offer;
    this.roomSearchText = '';
    this.filteredRooms = [...this.allRooms];
    const existingRooms = Array.isArray(offer?.guest_rooms)
      ? offer.guest_rooms
      : [];
    this.initialSelectedRooms = existingRooms.map((r: any) => String(r));
    this.selectedRooms = [...this.initialSelectedRooms];
    this.isGuestModalOpen = true;
    // Prevent background scroll when the guest modal is open
    document.body.classList.add('no-scroll-in-restaurants-list');
    // Fetch check-in rooms
    this.getAllCheckInRooms();
  }

  closeGuestModal() {
    this.isGuestModalOpen = false;
    this.selectedOfferForGuest = null;
    this.roomSearchText = '';
    this.filteredRooms = [...this.allRooms];
    this.selectedRooms = [];
    this.initialSelectedRooms = [];
    this.checkInRooms.clear();
    document.body.classList.remove('no-scroll-in-restaurants-list');
  }

  toggleRoomSelection(room: string) {
    const value = String(room);
    const index = this.selectedRooms.indexOf(value);
    if (index > -1) {
      this.selectedRooms.splice(index, 1);
    } else {
      this.selectedRooms.push(value);
    }
  }

  isRoomSelected(room: string): boolean {
    return this.selectedRooms.includes(String(room));
  }

  isRoomCheckIn(room: string): boolean {
    return this.checkInRooms.has(String(room));
  }

  getAllCheckInRooms() {
    if (!this.member_id) {
      return;
    }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: this.member_id
        },
        pagination: false,
        sorting: false
      }
    };
    this.restaurantsListService.postApiCall(requestBody, ENDPOINTS.GET_ALL_RESERVATION_ROOMS).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp.status_code === 200 && resp.result?.data) {
          this.checkInRooms.clear();
          const occupiedEvents = ['check-in', 'in-house(amend)'];
          resp.result.data.forEach((reservation: any) => {
            if (reservation.Room_No && occupiedEvents.includes(reservation.Event.toLowerCase())) {
              this.checkInRooms.add(String(reservation.Room_No));
            }
          });
        }
      },
      (err: any) => {
        console.error('Error fetching check-in rooms:', err);
      }
    );
  }

  hasGuestRoomChanges(): boolean {
    const current = this.selectedRooms.map(String);
    const initial = this.initialSelectedRooms.map(String);
    if (current.length !== initial.length) {
      return true;
    }
    const sortedCurrent = [...current].sort();
    const sortedInitial = [...initial].sort();
    return !sortedCurrent.every((v, i) => v === sortedInitial[i]);
  }

  canSaveGuestRooms(): boolean {
    if (this.isGuestSaving || !this.selectedOfferForGuest?.id) {
      return false;
    }
    const hadExisting = this.initialSelectedRooms.length > 0;
    const hasChanges = this.hasGuestRoomChanges();
    if (!hadExisting) {
      // First time: must select at least one room AND it must be different from initial (empty)
      return this.selectedRooms.length > 0 && hasChanges;
    }
    // Existing data:
    // - If user cleared all rooms → hasChanges is true → allow save
    // - If user changed some rooms → hasChanges true → allow save
    // - If no change → hasChanges false → disable save
    return hasChanges;
  }

  saveGuestRooms() {
    if (!this.canSaveGuestRooms()) {
      return;
    }
    this.isGuestSaving = true;
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: this.selectedOfferForGuest.id
        }
      },
      payload: {
        offer_updation: {
          guest_rooms: this.selectedRooms
        }
      }
    };
    this.restaurantsListService
      .postApiCall(payload, ENDPOINTS.UPDATE_OFFER)
      .subscribe({
        next: (resp: any) => {
          this.isGuestSaving = false;
          if (resp?.success === 1 && resp.status_code === 200) {
            this.alertService.success('Guest rooms saved successfully', this.options);
            // Update local offer object so UI stays in sync
            this.selectedOfferForGuest.guest_rooms = [...this.selectedRooms];
            const match = this.offers.find((o: any) => o.id === this.selectedOfferForGuest.id);
            if (match) {
              match.guest_rooms = [...this.selectedRooms];
            }
            this.closeGuestModal();
          } else {
            this.alertService.error(resp?.message || 'Unable to save guest rooms', this.options);
          }
        },
        error: (err: any) => {
          this.isGuestSaving = false;
          this.alertService.error(
            err?.error?.message || 'Something went wrong while saving guest rooms',
            this.options
          );
        }
      });
  }

  onRoomSearch() {
    const term = this.roomSearchText.trim().toLowerCase();
    if (!term) {
      this.filteredRooms = [...this.allRooms];
      return;
    }
    this.filteredRooms = this.allRooms.filter(room =>
      String(room).toLowerCase().startsWith(term)
    );
  }

  areAllFilteredRoomsSelected(): boolean {
    if (this.filteredRooms.length === 0) {
      return false;
    }
    return this.filteredRooms.every(room => this.isRoomSelected(room));
  }

  toggleSelectAllRooms() {
    if (this.areAllFilteredRoomsSelected() || this.filteredRooms.length === 0) {
      return;
    }
    // Select all filtered rooms
    this.filteredRooms.forEach(room => {
      const roomStr = String(room);
      if (!this.selectedRooms.includes(roomStr)) {
        this.selectedRooms.push(roomStr);
      }
    });
  }

  clearAllSelectedRooms() {
    if (this.selectedRooms.length === 0) {
      return;
    }
    this.selectedRooms = [];
  }

  back() {
    this.router.navigate(['/features']);
  }
}

