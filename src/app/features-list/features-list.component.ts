import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { FeaturesListService } from './features-list.service';
import { ENDPOINTS } from '../app.config';
import { PermissionService, ModulePermission } from '../services/permission.service';
import { UpsellService } from '../features/upsell.service';



@Component({
  selector: 'app-features-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertsComponent],
  templateUrl: './features-list.component.html',
  styleUrl: './features-list.component.scss'
})

export class FeaturesListComponent implements OnInit, OnDestroy {
  customerdata: any = null; //hidden while the application is "checking" for the hotel code
  menuOutlets: any[] = [];
  selectedOutlet: any = null;
  today: string = '';
  // fallbackOutletImage = 'https://guestezee.s3.ap-south-2.amazonaws.com/Guestezee/Brand/Re.png';
  // fallbackOutletImage = '';
  fallbackOutletImage: any = {
    Restaurant: 'https://guestezee.s3.ap-south-2.amazonaws.com/Guestezee/Brand/Re.png',
    Spa: 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2811%29.png',
    Gym: 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2812%29.png',
    Bar: 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2813%29.png',
    'Coffee Shop': 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2814%29.png',
    Bakery: 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2815%29.png',
    'Swimming Pool': 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2816%29.png',
    'Conference Hall': 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2817%29.png',
    'Banquet Hall': 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2818%29.png',
    'Game Zone': 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2819%29.png',
    Salon: 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2820%29.png',
    'Kids Play Area': 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2821%29.png',
    'Sports Arena': 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/web/image%20%2822%29.png'
  }
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
  upsell: any = { name: 'Restaurant' }; //newly added 
  passedOutletType: string | null = null; // newly added
  activeStatus: boolean = true;
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
    activeStatus: boolean;
    durationType: 'continuous' | 'daily';
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    imageUrl: string | null;
    considerBaseAmount: boolean;
  } = {
      name: '',
      discountType: 'percentage',
      discountValue: null,
      baseAmount: null,
      afterDiscount: null,
      dateMode: 'single',
      activeStatus: true,
      durationType: 'daily',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      imageUrl: null,
      considerBaseAmount: false
    };
  isPickerOpen = false;
  offerErrors: any = {};
  isOfferSubmitted = false;
  isDeleteOfferModalOpen = false;
  offerToDelete: any = null;
  isDeleteOutletModalOpen = false;
  outletToDelete: any = null;
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
    private route: ActivatedRoute,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private localService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private profileService: ProfileService,
    private featuresListService: FeaturesListService,
    private permissionService: PermissionService,
    private upsellService: UpsellService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['outlet_type']) {
        this.upsell.name = params['outlet_type'];
        this.passedOutletType = params['outlet_type'];
      }
    });

    // Set today's date in yyyy-MM-dd format for date inputs
    this.today = new Date().toISOString().split('T')[0];
    this.member_id = this.localService.get('MemberId');
    // console.log('Member Id:', this.member_id);
    if (this.member_id) {
      this.getCustomerById();
      if (this.passedOutletType) {
        this.getUpsellDetails();
      }
    }

  }

  ngOnDestroy(): void {
    document.body.classList.remove('no-scroll-in-features-list');
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

  onEditOutletClick(outlet: any, event: Event) {
    event.stopPropagation();
    if (!this.canEditFeatures || !this.canReadFeatures) return;
    this.router.navigate(['/feature-creation', outlet.id], {
      queryParams: { outlet_type: this.passedOutletType }
    });
  }

  viewOutlet(outlet: any, event: Event) {
    event.stopPropagation();
    if (!this.canReadFeatures) return;
    this.router.navigate(['/feature-creation', outlet.id], {
      queryParams: { outlet_type: this.passedOutletType },
      state: { mode: 'view' }
    });
  }

  onDeleteOutletClick(outlet: any, event: Event) {
    event.stopPropagation();
    if (!this.canDeleteFeatures || !this.canReadFeatures) return;
    this.outletToDelete = outlet;
    this.isDeleteOutletModalOpen = true;
  }


  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loaderService.emitLoading();
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
            const profileMemberId = (this.customerdata?.customer_member_id || '').trim();
            if (profileMemberId) {
              this.member_id = profileMemberId;
            }
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

  getUpsellDetails() {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: this.member_id,
          name: this.passedOutletType
        }
      }
    };
    this.loaderService.emitLoading();
    this.upsellService.getAllUpsells(payload).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp && resp.success === 1 && resp.result?.data?.length > 0) {
          // Merge fetched category data (including image/icon) into upsell object
          this.upsell = { ...this.upsell, ...resp.result.data[0] };
        }
      },
      err => {
        this.loaderService.emitComplete();
        console.error('Error fetching upsell details:', err);
      }
    );
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
        // Newly added  & commented for room labelling
        // rangeStrings.push(`${r.startRoom}-${r.endRoom}`);
        if (String(r.startRoom).trim() === String(r.endRoom).trim()) {
          rangeStrings.push(String(r.startRoom));
        }
        else {
          rangeStrings.push(`${r.startRoom}-${r.endRoom}`);
        }
        // End of newly added for room labelling
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
    // Newly added for room labelling
    const labelOption = this.customerdata?.settings?.label_option;
    const customLabels = this.customerdata?.settings?.custom_labels || {};
    if (labelOption === 'different') {
      roomList = roomList.map(roomNum => {
        const customVal = customLabels[roomNum];
        return (customVal && customVal.trim()) ? customVal.trim() : roomNum;
      });
    }
    // End of newly added for room labelling
    this.allRooms = roomList;
    this.filteredRooms = [...this.allRooms];
    this.selectedRooms = [];
    // console.log('All Rooms (Restaurants List):', this.allRooms);
  }

  getMenuOutlets() {
    if (!this.member_id) {
      console.error('Cannot fetch outlets: member_id missing');
      this.menuOutlets = [];
      return;
    }
    const find: Record<string, string> = {
      member_id: String(this.member_id).trim()
    };
    if (this.customerdata?.Hotel_Code) {
      find['Hotel_Code'] = this.customerdata.Hotel_Code;
    }
    if (this.passedOutletType) {
      find['outlet_type'] = this.passedOutletType;
    }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find,
        pagination: false,
        sorting: false
      }
    };
    this.loaderService.emitLoading();
    this.taskManagementService.getAllOutlets(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          // this.menuOutlets = resp.result?.data || [];
          // this.menuOutlets = (resp.result?.data || []).map((outlet: any) => ({
          // Filter out the outlets that don't match our passedOutletType
          // const filteredOutlets = (resp.result?.data || []).filter((outlet: any) => {
          //   if (!this.passedOutletType) return true;

          //   const type = (outlet.outlet_type || '').trim().toLowerCase();
          //   const target = this.passedOutletType.trim().toLowerCase();

          //   // Normalize names (handle typos like 'restaruant' and plurals/legacy data)
          //   const isRestaurantTarget = ['restaurant', 'restaruant', 'restaurants'].includes(target);
          //   const isRestaurantType = ['restaurant', 'restaruant', 'restaurants'].includes(type) || !type;

          //   // If target is restaurant, use legacy logic (allows uncategorized outlets)
          //   if (isRestaurantTarget) {
          //     return isRestaurantType;
          //   }

          //   // For all other targets (like Gym, Spa, etc.), only match if type is explicitly set
          //   if (!type) {
          //     return false;
          //   }

          //   return type === target || type.includes(target) || target.includes(type);
          // });

          // this.menuOutlets = filteredOutlets.map((outlet: any) => ({
          this.menuOutlets = (resp.result?.data || []).map((outlet: any) => ({
            ...outlet,
            id: outlet.id // Explicitly use the numeric database id
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
        this.loaderService.emitComplete();
        this.menuOutlets = [];
        this.selectedOutlet = null;
        this.offers = [];
        this.filteredOffers = [];
        this.paginatedOffers = [];
      }
    );
  }

  getOutletIdentifier(outlet: any): any {
    if (!outlet) return null;
    const isThirdParty = (outlet.hasOwnProperty('is_third_party_outlet_id_exist') && outlet.is_third_party_outlet_id_exist !== null && outlet.is_third_party_outlet_id_exist !== undefined)
      ? (outlet.is_third_party_outlet_id_exist === true || outlet.is_third_party_outlet_id_exist === 'true')
      : false;
    return isThirdParty ? (outlet.winhms_outlet_id || outlet.third_party_outlet_id) : outlet.id;
  }

  selectOutlet(outlet: any) {
    // Case 1: Same outlet clicked → UNSELECT
    // Fixed for multiple highlight
    // if (this.getOutletIdentifier(this.selectedOutlet) === this.getOutletIdentifier(outlet)) {
    if (this.selectedOutlet?.id === outlet.id) {
      // End of fixed for multiple highlight
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
          outlet_id: this.getOutletIdentifier(outlet)
        }
      }
    };
    this.loaderService.emitLoading();
    this.featuresListService.postApiCall(requestBody, ENDPOINTS.GET_OFFERS_BY_OUTLET).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
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
        this.loaderService.emitComplete();
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
    // Fixed for multiple highlight
    //  if (this.getOutletIdentifier(this.selectedOutlet) !== this.getOutletIdentifier(outlet)) {
    if (this.selectedOutlet?.id !== outlet.id) {
      this.applyOutletChange(outlet);
    }
    // End of fixed for multiple highlight
    this.selectedOfferOutlet = outlet;
    this.resetOfferForm();
    this.isOfferModalOpen = true;
    // Prevent background scroll when the offer modal is open
    document.body.classList.add('no-scroll-in-features-list');
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

  onOfferTypeChange() {
    this.offerForm.discountValue = null;
    this.offerErrors.discountType = null;
    this.calculateDiscountResult();
  }

  onConsiderBaseAmountChange() {
    if (!this.offerForm.considerBaseAmount) {
      this.offerForm.baseAmount = 0;
      this.offerForm.afterDiscount = 0;
      this.offerErrors.baseAmount = null;
    } else {
      this.offerForm.baseAmount = null;
      this.offerForm.afterDiscount = null;
    }
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
      this.loaderService.emitLoading();
      this.profileService.sendImage(formData, headers).subscribe(
        (resp: any) => {
          this.loaderService.emitComplete();
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
          this.loaderService.emitComplete();
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
    } else if (this.offerForm.name.length > 50) {
      this.offerErrors.name = 'Offer name cannot exceed 50 characters';
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
    // Validate base amount field only if considerBaseAmount is enabled
    if (this.offerForm.considerBaseAmount) {
      // Base Amount
      if (this.offerForm.baseAmount === null || this.offerForm.baseAmount === undefined) {
        this.offerErrors.baseAmount = 'Base amount is required';
      } else if (this.offerForm.baseAmount <= 0) {
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
      activeStatus: offer.is_active,
      durationType: offer.duration_type,
      startDate: offer.start_date,
      endDate: offer.end_date,
      startTime: offer.start_time,
      endTime: offer.end_time,
      imageUrl: offer.image_url,
      considerBaseAmount: !!offer.consider_base_amount
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
      discount_value: this.offerForm.discountValue ?? 0,
      base_amount: this.offerForm.considerBaseAmount ? (this.offerForm.baseAmount ?? 0) : 0,
      after_discount: this.offerForm.considerBaseAmount ? (this.offerForm.afterDiscount ?? 0) : 0,
      date_mode: this.offerForm.dateMode,
      is_active: this.offerForm.activeStatus,
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
      outlet_id: this.getOutletIdentifier(this.selectedOfferOutlet),
      outlet_name:
        this.selectedOfferOutlet?.name ||
        this.selectedOfferOutlet?.outlet_name ||
        '',
      // outlet_type was previously missing — added to support server-side filtering
      outlet_type: this.passedOutletType,
      consider_base_amount: this.offerForm.considerBaseAmount
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
    this.loaderService.emitLoading();
    this.featuresListService
      .postApiCall(payload, ENDPOINTS.CREATE_OFFER)
      .subscribe({
        next: (resp: any) => {
          this.loaderService.emitComplete();
          if (resp?.success === 1 && resp.status_code === 200) {
            this.alertService.success('Offer created successfully', this.options);
            this.closeOfferModal();
            this.getOffersByOutlet(this.selectedOutlet);
          } else {
            this.alertService.error(resp.message, this.options);
          }
        },
        error: (err: any) => {
          this.loaderService.emitComplete();
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
    this.loaderService.emitLoading();
    this.featuresListService
      .postApiCall(payload, ENDPOINTS.UPDATE_OFFER)
      .subscribe({
        next: (resp: any) => {
          this.loaderService.emitComplete();
          if (resp?.success === 1 && resp.status_code === 200) {
            this.alertService.success('Offer updated successfully', this.options);
            this.closeOfferModal();
            this.getOffersByOutlet(this.selectedOutlet);
          } else {
            this.alertService.error(resp.message, this.options);
          }
        },
        error: (err: any) => {
          this.loaderService.emitComplete();
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
    document.body.classList.remove('no-scroll-in-features-list');
  }

  resetOfferForm() {
    this.offerForm = {
      name: '',
      discountType: 'percentage',
      discountValue: null,
      baseAmount: null,
      afterDiscount: null,
      dateMode: 'single',
      activeStatus: true,
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      imageUrl: null,
      durationType: 'daily',
      considerBaseAmount: false
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
    this.loaderService.emitLoading();
    this.featuresListService
      .postApiCall(payload, ENDPOINTS.DELETE_OFFER)
      .subscribe((resp: any) => {
        this.loaderService.emitComplete();
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
    document.body.classList.add('no-scroll-in-features-list');
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
    document.body.classList.remove('no-scroll-in-features-list');
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
    this.loaderService.emitLoading();
    this.featuresListService.postApiCall(requestBody, ENDPOINTS.GET_ALL_RESERVATION_ROOMS).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200 && resp.result?.data) {
          this.checkInRooms.clear();
          const occupiedEvents = ['check-in', 'in-house(amend)'];
          // Newly added for room labelling
          const labelOption = this.customerdata?.settings?.label_option;
          const customLabels = this.customerdata?.settings?.custom_labels || {};
          // End of newly added for room labelling
          resp.result.data.forEach((reservation: any) => {
            if (reservation.Room_No && occupiedEvents.includes(reservation.Event.toLowerCase())) {
              // Newly added  & commented for room labelling
              // this.checkInRooms.add(String(reservation.Room_No));
              const roomNo = String(reservation.Room_No);
              if (labelOption === 'different') {
                const customVal = customLabels[roomNo];
                this.checkInRooms.add((customVal && customVal.trim()) ? customVal.trim() : roomNo);
              } else {
                this.checkInRooms.add(roomNo);
              }
              // End of newly added for room labelling
            }
          });
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
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
    this.loaderService.emitLoading();
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
    this.featuresListService
      .postApiCall(payload, ENDPOINTS.UPDATE_OFFER)
      .subscribe({
        next: (resp: any) => {
          this.isGuestSaving = false;
          this.loaderService.emitComplete();
          if (resp?.success === 1 && resp.status_code === 200) {
            // this.alertService.success('Guest rooms saved successfully', this.options);
            //newly added
            const msg = this.initialSelectedRooms.length > 0 ? 'Guest rooms updated successfully' : 'Guest rooms saved successfully';
            this.alertService.success(msg, this.options);
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
          this.loaderService.emitComplete();
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
  openModal() {
    this.router.navigate(['/feature-creation'], {
      queryParams: { outlet_type: this.upsell.name }
    });
  }

  // Newly commanding & updating for port change
  confirmDeleteOutlet() {
    if (!this.outletToDelete) return;
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {},
      extras: {
        find: {
          // Newly commanding & updating for port change
          // id: this.outletToDelete.id
          "winhms_outlet_id": this.outletToDelete.winhms_outlet_id
        }
      }
    };
    this.loaderService.emitLoading();
    this.featuresListService
      .postApiCall(payload, ENDPOINTS.OUTLET_DELETE)
      .subscribe((resp: any) => {
        this.loaderService.emitComplete();
        if (resp && resp.success === 1 && resp.status_code === 200) {
          this.alertService.success('Outlet deleted successfully', this.options);
          this.isDeleteOutletModalOpen = false;
          this.outletToDelete = null;
          this.getMenuOutlets();
        }
        else {
          this.alertService.error(resp.message || 'Delete failed', this.options);
        }
      });
  }


}

