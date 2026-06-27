import { Component, OnInit, Input, Output, EventEmitter, ViewChild, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HotelEnrollmentTabviewComponent } from '../hotel-enrollment-tabview.component';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { CustomValidators, PINCODE_RULES } from '../validators';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../app.config';
import { CheckoutApiService } from '../checkout.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
// Newly added
import { HttpHeaders } from '@angular/common/http';
import { ProfileService } from '../../profile/profile.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { COUNTRY_STATES, CountryState } from '../../shared/constants/countries';
import { SharedDataService } from '../../shared/shared-data.service';

@Component({
  selector: 'app-property-details1',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HotelEnrollmentTabviewComponent, AlertsComponent],
  templateUrl: './property-details1.component.html',
  styleUrl: './property-details1.component.scss'
})

export class PropertyDetails1Component {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  customerProprtyDetailsForm: FormGroup = new FormGroup({});
  hotelId: Number | null = null;
  countryDropdownList: any = [];
  customerId: string | null = null;
  orderData: any;
  memberId: any | null = null;
  isOtherBrand = false;
  customerdata: any = {};
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  states: any;
  statesDropdownList: any = [];
  upsertData: any;
  // Newly added
  @Output() continue = new EventEmitter<void>();

  taxSectionTitle = '';
  taxField1Label = '';
  taxField2Label = '';
  taxField1Key = '';
  taxField2Key = '';
  showTaxSection = false;
  maxPincodeLength = 10;
  isInitialLoad = false;

  get taxControl1(): FormControl {
    return this.customerProprtyDetailsForm.get(this.taxField1Key) as FormControl;
  }

  get taxControl2(): FormControl {
    return this.customerProprtyDetailsForm.get(this.taxField2Key) as FormControl;
  }

  companyStatusOptions = [
    { id: 'radio1', label: 'Private Limited / Public Limited Company' },
    { id: 'radio2', label: 'Sole Proprietor' },
    { id: 'radio3', label: 'Partnership Firm / LLP' },
    { id: 'radio4', label: 'Individual' },
    { id: 'radio5', label: 'NGO or Other (Business Filing Status)' }
  ];
  companyStatusDocuments: { [key: string]: { name: string }[] } = {
    'Private Limited / Public Limited Company': [
      { name: 'Company PAN card' },
      { name: 'Signing authority PAN card' },
      { name: 'Signing authority Aadhar card' },
      { name: 'MOA & Certificate of Incorporation' },
      { name: 'Office Address Proof (Landline/BanK Statement)' },
      { name: 'GST Certificate' },
      { name: 'Cancelled Cheque' }
    ],
    'Sole Proprietor': [
      { name: 'Signing authority PAN card' },
      { name: 'Signing authority Aadhar card' },
      { name: 'Office Address Proof (Landline/BanK Statement)' },
      { name: 'Shop and Establishment Certificate' },
      { name: 'GST Certificate (if applicable)' },
      { name: 'Cancelled Cheque' }
    ],
    'Partnership Firm / LLP': [
      { name: 'Company PAN card' },
      { name: 'Signing authority PAN card' },
      { name: 'Signing authority Aadhar card' },
      { name: 'Partnership Deed / LLP Agreement' },
      { name: 'Office Address Proof (Landline/BanK Statement)' },
      { name: 'GST Certificate' },
      { name: 'Cancelled Cheque' }
    ],
    'Individual': [
      { name: 'Signing authority PAN card' },
      { name: 'Signing authority Aadhar card' },
      { name: 'Cancelled Cheque' }
    ],
    'NGO or Other (Business Filing Status)': [
      { name: 'Company PAN card' },
      { name: 'Signing authority PAN card' },
      { name: 'Signing authority Aadhar card' },
      { name: 'Trust Deed' },
      { name: 'Cancelled Cheque' }
    ]
  };
  uploadedDocuments: { [key: string]: File } = {};
  uploaded_documents: { document_name: string; document_url: string }[] = [];
  uploadedDocumentsApi: any = [];
  // Newly added for payment done
  @Input() paymentDone!: boolean;
  hotelLogo: File | null = null;
  hotelLogoUrl: string | null = null;
  logoUploading = false;
  // Selected property size
  // selectedPropertySize: string = '01-50 Rooms';
  // plans: any[] = [];
  // selectedPropertySize: string = ''; // <-- no hardcoded default
  // propertyPricingMap: any = {}; // stores mapping of all plan sizes & prices
  // finalPrice: number = 0;
  // totalCost: number = 0;
  selectedPropertySize: string = ''; // don't hardcode default here
  plans: any[] = [];
  propertyPricingMap: Record<string, number> = {};
  singleRoomFinalPrice: number = 0; // from "SingleRoomPricing"
  finalPrice: number = 0; // current selected per-room final price
  totalCost: number = 0;
  // perRoomCost!: number; // default
  // finalPrice!: number;
  // totalCost!: number; // default initial total cost
  // plans: any[] = [];
  propertySizes: any[] = []; // will be fetched from API
  // Add a map to define max rooms for each property size
  propertySizeLimits: { [key: string]: number } = {
    '01-50 Rooms': 50,
    '51-100 Rooms': 100,
    '101-150 Rooms': 150,
    '150 and above Rooms': Infinity // no upper limit
  };
  // Min/max range per property size band
  propertySizeRanges: { [key: string]: { min: number; max: number } } = {
    '01-50 Rooms': { min: 1, max: 50 },
    '51-100 Rooms': { min: 51, max: 100 },
    '101-150 Rooms': { min: 101, max: 150 },
    '150 and above Rooms': { min: 151, max: Infinity }
  };
  // dynamicRoomCost: number = 0;
  status: string = '';
  customerStatus: string = '';
  // Newly added fo hierarchy member_id update
  hierarchyData: any;
  // Newly added for documents upload
  originalUploadedDocuments: any[] = [];
  // The company_status value that was last saved to the server
  originalCompanyStatus: string = '';
  // Tracks which specific doc the user clicked upload for
  selectedApiDocName: string | null = null;
  selectedUploadDoc: string | null = null;

  constructor(
    private authTokenService: AuthTokenService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private checkoutApiService: CheckoutApiService,
    private localStorageService: LocalStorageService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    // Newly added
    private profileService: ProfileService,
    // Newly added fo hierarchy member_id update
    private hierarchyService: HierarchyService,
    private sharedDataService: SharedDataService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.url; // Get the current URL
        //console.log('Current URL:', currentUrl); // Debugging (Optional)
        // Enable showSidebar if URL contains "confirmation"
        this.isVisible = currentUrl.includes('confirmation')
        if (currentUrl.includes('confirmation')) {
          let nextTab = document.getElementById('profile-tab');
          if (nextTab) {
            (nextTab as HTMLAnchorElement).click();
          }
        }
      }
    });
  }

  ngOnInit(): void {
    // Newly added for getting customer id for customer type
    // this.hotelId = Number(this.localStorageService.get('UserId'));
    //console.log('Hotels ID:', this.hotelId);
    this.memberId = this.localStorageService.get('MemberId');
    // console.log('Member ID:', this.memberId);
    // End of newly added for getting customer id for customer type
    this.executeFunctions();
    this.customerProprtyDetailsForm = new FormGroup({
      hotel_name: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
      // contact_person: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
      contact_person: new FormControl('', [Validators.required, Validators.pattern(/^([^0-9]*)$/), CustomValidators.noWhitespaceValidator]),
      designation: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
      primary_phone_number: new FormControl('', [Validators.required, Validators.pattern(/^[0-9\s\-+()]+$/), CustomValidators.noWhitespaceValidator]),
      secondary_phone_number: new FormControl('', [Validators.required, Validators.pattern(/^[0-9\s\-+()]+$/), CustomValidators.noWhitespaceValidator]),
      // email: new FormControl('', [Validators.required, Validators.email]), 
      email: new FormControl('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/)]),
      brand: new FormControl('', Validators.required),
      property_doorno: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
      property_address: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
      // property_city: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
      property_city: new FormControl('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9\s.'-]*$/), CustomValidators.noWhitespaceValidator]),
      property_state: new FormControl('', Validators.required),
      property_location: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
      property_country: new FormControl('', Validators.required),
      property_pincode: new FormControl('', [Validators.required, CustomValidators.dynamicPincodeValidator()]),
      property_size: new FormControl('', Validators.required),
      // Newly added
      company_status: new FormControl('', Validators.required),
      // other_brand_name: new FormControl('', Validators.required),
      // Newly added for other brand name
      other_brand_name: new FormControl(''),
      // uploaded_documents: new FormControl('', Validators.required),
      // Newly added for room number 
      number_of_rooms: new FormControl('', [Validators.required]),
    });
    // Newly added for documents upload
    // React when company status (KYC) changes so that
    // required documents list is rebuilt for the selected option
    const companyStatusControl = this.customerProprtyDetailsForm.get('company_status');
    if (companyStatusControl) {
      companyStatusControl.valueChanges.subscribe((status: string) => {
        this.onCompanyStatusChange(status);
      });
    }
    //  End of newly added for documents upload

    // Newly added for getting customer id for customer type
    // if (this.hotelId != 0) {
    if (this.memberId !== undefined && this.memberId !== null && this.memberId !== '' && this.memberId !== 'undefined' && this.memberId !== 'null') {
      // End of newly added for getting customer id for customer type
      // this.getCustomerById();
      this.getCustomerById().then(() => {
        if (!this.selectedPropertySize && Object.keys(this.propertyPricingMap).length > 0) {
          const defaultSize = Object.keys(this.propertyPricingMap).find(k => k !== 'SingleRoomPricing')
            || Object.keys(this.propertyPricingMap)[0];
          this.selectedPropertySize = defaultSize;
          // Set form control value to trigger validation
          this.customerProprtyDetailsForm.get('property_size')?.setValue(defaultSize);
        }
      });
    }
    // this.getCountries();
    this.getCustomerDataAfterConfirmation();

    // Initialize countries list from the shared constant
    this.countryDropdownList = COUNTRY_STATES;
    this.statesDropdownList = [];

    // Disable state initially
    this.customerProprtyDetailsForm.get('property_state')?.disable();

    // Listen to changes on the country select dropdown
    this.customerProprtyDetailsForm.get('property_country')?.valueChanges.subscribe((selectedCountryName) => {
      if (selectedCountryName) {
        // Find the matching country object
        const selectedCountry = COUNTRY_STATES.find(
          (c) => c.country === selectedCountryName
        );

        if (selectedCountry) {
          // The template expects objects with a 'state' property
          this.statesDropdownList = selectedCountry.states.map(s => ({ state: s, code: '', flag: '' }));
          if (this.customerProprtyDetailsForm.disabled || this.customerStatus === 'approved') {
            this.customerProprtyDetailsForm.get('property_state')?.disable();
          } else {
            this.customerProprtyDetailsForm.get('property_state')?.enable();
          }
        } else {
          this.statesDropdownList = [];
          this.customerProprtyDetailsForm.get('property_state')?.disable();
        }
      } else {
        this.statesDropdownList = [];
        this.customerProprtyDetailsForm.get('property_state')?.disable();
      }

      // Reset the state value whenever the country changes
      if (!this.isInitialLoad) {
        const stateCtrl = this.customerProprtyDetailsForm.get('property_state');
        if (stateCtrl) {
          stateCtrl.setValue('');
          const selectedCountry = COUNTRY_STATES.find((c) => c.country === selectedCountryName);
          if (selectedCountry && !stateCtrl.disabled) {
            stateCtrl.markAsTouched();
          }
        }
      }

      // Re-validate and mark pincode as touched when country changes
      const pincodeCtrl = this.customerProprtyDetailsForm.get('property_pincode');
      const rule = PINCODE_RULES[selectedCountryName || 'default'] || PINCODE_RULES['default'];
      this.maxPincodeLength = rule.maxLength;
      if (pincodeCtrl) {
        pincodeCtrl.updateValueAndValidity();
        if (!this.isInitialLoad && pincodeCtrl.value) {
          pincodeCtrl.markAsTouched();
        }
      }

      // Setup dynamic tax controls
      if (!this.isInitialLoad) {
        this.onCountryOrStateChange(selectedCountryName, this.customerProprtyDetailsForm.get('property_state')?.value, false);
      }
    });

    // Listen to changes on the state select dropdown
    this.customerProprtyDetailsForm.get('property_state')?.valueChanges.subscribe((selectedStateName) => {
      if (!this.isInitialLoad) {
        this.onCountryOrStateChange(this.customerProprtyDetailsForm.get('property_country')?.value, selectedStateName, false);
      }
    });

  }

  // Newly added for disabling form on payment done
  ngOnChanges(changes: SimpleChanges): void {
    // console.log('Changes:', changes['paymentDone']);
    // Check if paymentDone input has changed - changes(contains the previous and current value)
    // if (changes['paymentDone'] || this.paymentDone) {
    //   this.customerProprtyDetailsForm.disable();
    // }
    // console.log('Payment changes:', changes, 'Payment done:', this.paymentDone);
    if (changes['paymentDone'] || this.paymentDone) {
      this.customerProprtyDetailsForm.get('property_size')?.disable();
      this.customerProprtyDetailsForm.get('number_of_rooms')?.disable();
    }
  }

  refreshData() {
    this.executeFunctions();
  }

  isFormValid(): boolean {
    return this.customerProprtyDetailsForm.valid;
  }
  async getCustomerDataAfterConfirmation() {
    if (this.router.url.includes('confirmation')) {
      this.customerId = this.activatedRoute.snapshot.queryParamMap.get('customer_id');
      //console.log('Customer ID:', this.customerId);
      // Newly added for getting customer id for customer type
      // this.hotelId = Number(this.customerId)
      this.memberId = this.localStorageService.get('MemberId');
      // console.log('Member ID:', this.memberId);
      // End of newly added for getting customer id for customer type
      this.executeFunctions().then(() => {
        this.getOrderData(this.memberId)
      });

    }

    // this.countryDropdownList = [{ "country": "Afghanistan", "code": "", "flag": "" },
    // { "country": "Åland (Finland)", "code": "", "flag": "" },
    // { "country": "Albania", "code": "", "flag": "" },
    // { "country": "Algeria", "code": "", "flag": "" },
    // { "country": "American Samoa (US)", "code": "", "flag": "" },
    // { "country": "Andorra", "code": "", "flag": "" },
    // { "country": "Angola", "code": "", "flag": "" },
    // { "country": "Anguilla (BOT)", "code": "", "flag": "" },
    // { "country": "Antigua and Barbuda", "code": "", "flag": "" },
    // { "country": "Argentina", "code": "", "flag": "" },
    // { "country": "Armenia", "code": "", "flag": "" },
    // { "country": "Artsakh", "code": "", "flag": "" },
    // { "country": "Aruba (Netherlands)", "code": "", "flag": "" },
    // { "country": "Australia", "code": "", "flag": "" },
    // { "country": "Austria", "code": "", "flag": "" },
    // { "country": "Azerbaijan", "code": "", "flag": "" },
    // { "country": "Bahamas", "code": "", "flag": "" },
    // { "country": "Bahrain", "code": "", "flag": "" },
    // { "country": "Bangladesh", "code": "", "flag": "" },
    // { "country": "Barbados", "code": "", "flag": "" },
    // { "country": "Belarus", "code": "", "flag": "" },
    // { "country": "Belgium", "code": "", "flag": "" },
    // { "country": "Belize", "code": "", "flag": "" },
    // { "country": "Benin", "code": "", "flag": "" },
    // { "country": "Bermuda (BOT)", "code": "", "flag": "" },
    // { "country": "Bhutan", "code": "", "flag": "" },
    // { "country": "Bolivia", "code": "", "flag": "" },
    // { "country": "Bonaire (Netherlands)", "code": "", "flag": "" },
    // { "country": "Bosnia and Herzegovina", "code": "", "flag": "" },
    // { "country": "Botswana", "code": "", "flag": "" },
    // { "country": "Brazil", "code": "", "flag": "" },
    // { "country": "British Virgin Islands (BOT)", "code": "", "flag": "" },
    // { "country": "Brunei", "code": "", "flag": "" },
    // { "country": "Bulgaria", "code": "", "flag": "" },
    // { "country": "Burkina Faso", "code": "", "flag": "" },
    // { "country": "Burundi", "code": "", "flag": "" },
    // { "country": "Cambodia", "code": "", "flag": "" },
    // { "country": "Cameroon", "code": "", "flag": "" },
    // { "country": "Canada", "code": "", "flag": "" },
    // { "country": "Cape Verde", "code": "", "flag": "" },
    // { "country": "Cayman Islands (BOT)", "code": "", "flag": "" },
    // { "country": "Central African Republic", "code": "", "flag": "" },
    // { "country": "Chad", "code": "", "flag": "" },
    // { "country": "Chile", "code": "", "flag": "" },
    // { "country": "China", "code": "", "flag": "" },
    // { "country": "Christmas Island (Australia)", "code": "", "flag": "" },
    // { "country": "Cocos (Keeling) Islands (Australia)", "code": "", "flag": "" },
    // { "country": "Colombia", "code": "", "flag": "" },
    // { "country": "Comoros", "code": "", "flag": "" },
    // { "country": "Congo", "code": "", "flag": "" },
    // { "country": "Cook Islands", "code": "", "flag": "" },
    // { "country": "Costa Rica", "code": "", "flag": "" },
    // { "country": "Croatia", "code": "", "flag": "" },
    // { "country": "Cuba", "code": "", "flag": "" },
    // { "country": "Curaçao (Netherlands)", "code": "", "flag": "" },
    // { "country": "Cyprus", "code": "", "flag": "" },
    // { "country": "Czech Republic", "code": "", "flag": "" },
    // { "country": "Denmark", "code": "", "flag": "" },
    // { "country": "Djibouti", "code": "", "flag": "" },
    // { "country": "Dominica", "code": "", "flag": "" },
    // { "country": "Dominican Republic", "code": "", "flag": "" },
    // { "country": "DR Congo", "code": "", "flag": "" },
    // { "country": "East Timor", "code": "", "flag": "" },
    // { "country": "Ecuador", "code": "", "flag": "" },
    // { "country": "Egypt", "code": "", "flag": "" },
    // { "country": "El Salvador", "code": "", "flag": "" },
    // { "country": "Equatorial Guinea", "code": "", "flag": "" },
    // { "country": "Eritrea", "code": "", "flag": "" },
    // { "country": "Estonia", "code": "", "flag": "" },
    // { "country": "Eswatini", "code": "", "flag": "" },
    // { "country": "Ethiopia", "code": "", "flag": "" },
    // { "country": "Falkland Islands (BOT)", "code": "", "flag": "" },
    // { "country": "Faroe Islands (Denmark)", "code": "", "flag": "" },
    // { "country": "Fiji", "code": "", "flag": "" },
    // { "country": "Finland", "code": "", "flag": "" },
    // { "country": "France", "code": "", "flag": "" },
    // { "country": "French Guiana (France)", "code": "", "flag": "" },
    // { "country": "French Polynesia (France)", "code": "", "flag": "" },
    // { "country": "Gabon", "code": "", "flag": "" },
    // { "country": "Gambia", "code": "", "flag": "" },
    // { "country": "Georgia", "code": "", "flag": "" },
    // { "country": "Germany", "code": "", "flag": "" },
    // { "country": "Ghana", "code": "", "flag": "" },
    // { "country": "Gibraltar (BOT)", "code": "", "flag": "" },
    // { "country": "Greece", "code": "", "flag": "" },
    // { "country": "Greenland (Denmark)", "code": "", "flag": "" },
    // { "country": "Grenada", "code": "", "flag": "" },
    // { "country": "Guadeloupe (France)", "code": "", "flag": "" },
    // { "country": "Guam (US)", "code": "", "flag": "" },
    // { "country": "Guatemala", "code": "", "flag": "" },
    // { "country": "Guernsey (Crown Dependency)", "code": "", "flag": "" },
    // { "country": "Guinea", "code": "", "flag": "" },
    // { "country": "Guinea-Bissau", "code": "", "flag": "" },
    // { "country": "Guyana", "code": "", "flag": "" },
    // { "country": "Haiti", "code": "", "flag": "" },
    // { "country": "Honduras", "code": "", "flag": "" },
    // { "country": "Hong Kong", "code": "", "flag": "" },
    // { "country": "Hungary", "code": "", "flag": "" },
    // { "country": "Iceland", "code": "", "flag": "" },
    // { "country": "India", "code": "", "flag": "" },
    // { "country": "Indonesia", "code": "", "flag": "" },
    // { "country": "Iran", "code": "", "flag": "" },
    // { "country": "Iraq", "code": "", "flag": "" },
    // { "country": "Ireland", "code": "", "flag": "" },
    // { "country": "Isle of Man (Crown Dependency)", "code": "", "flag": "" },
    // { "country": "Israel", "code": "", "flag": "" },
    // { "country": "Italy", "code": "", "flag": "" },
    // { "country": "Ivory Coast", "code": "", "flag": "" },
    // { "country": "Jamaica", "code": "", "flag": "" },
    // { "country": "Japan", "code": "", "flag": "" },
    // { "country": "Jersey (Crown Dependency)", "code": "", "flag": "" },
    // { "country": "Jordan", "code": "", "flag": "" },
    // { "country": "Kazakhstan", "code": "", "flag": "" },
    // { "country": "Kenya", "code": "", "flag": "" },
    // { "country": "Kiribati", "code": "", "flag": "" },
    // { "country": "Kosovo", "code": "", "flag": "" },
    // { "country": "Kuwait", "code": "", "flag": "" },
    // { "country": "Kyrgyzstan", "code": "", "flag": "" },
    // { "country": "Laos", "code": "", "flag": "" },
    // { "country": "Latvia", "code": "", "flag": "" },
    // { "country": "Lebanon", "code": "", "flag": "" },
    // { "country": "Lesotho", "code": "", "flag": "" },
    // { "country": "Liberia", "code": "", "flag": "" },
    // { "country": "Libya", "code": "", "flag": "" },
    // { "country": "Liechtenstein", "code": "", "flag": "" },
    // { "country": "Lithuania", "code": "", "flag": "" },
    // { "country": "Luxembourg", "code": "", "flag": "" },
    // { "country": "Macau", "code": "", "flag": "" },
    // { "country": "Madagascar", "code": "", "flag": "" },
    // { "country": "Malawi", "code": "", "flag": "" },
    // { "country": "Malaysia", "code": "", "flag": "" },
    // { "country": "Maldives", "code": "", "flag": "" },
    // { "country": "Mali", "code": "", "flag": "" },
    // { "country": "Malta", "code": "", "flag": "" },
    // { "country": "Marshall Islands", "code": "", "flag": "" },
    // { "country": "Martinique (France)", "code": "", "flag": "" },
    // { "country": "Mauritania", "code": "", "flag": "" },
    // { "country": "Mauritius", "code": "", "flag": "" },
    // { "country": "Mayotte (France)", "code": "", "flag": "" },
    // { "country": "Mexico", "code": "", "flag": "" },
    // { "country": "Micronesia", "code": "", "flag": "" },
    // { "country": "Moldova", "code": "", "flag": "" },
    // { "country": "Monaco", "code": "", "flag": "" },
    // { "country": "Mongolia", "code": "", "flag": "" },
    // { "country": "Montenegro", "code": "", "flag": "" },
    // { "country": "Montserrat (BOT)", "code": "", "flag": "" },
    // { "country": "Morocco", "code": "", "flag": "" },
    // { "country": "Mozambique", "code": "", "flag": "" },
    // { "country": "Myanmar", "code": "", "flag": "" },
    // { "country": "Namibia", "code": "", "flag": "" },
    // { "country": "Nauru", "code": "", "flag": "" },
    // { "country": "Nepal", "code": "", "flag": "" },
    // { "country": "Netherlands", "code": "", "flag": "" },
    // { "country": "New Caledonia (France)", "code": "", "flag": "" },
    // { "country": "New Zealand", "code": "", "flag": "" },
    // { "country": "Nicaragua", "code": "", "flag": "" },
    // { "country": "Niger", "code": "", "flag": "" },
    // { "country": "Nigeria", "code": "", "flag": "" },
    // { "country": "Niue", "code": "", "flag": "" },
    // { "country": "Norfolk Island (Australia)", "code": "", "flag": "" },
    // { "country": "North Korea", "code": "", "flag": "" },
    // { "country": "North Macedonia", "code": "", "flag": "" },
    // { "country": "Northern Cyprus", "code": "", "flag": "" },
    // { "country": "Northern Mariana Islands (US)", "code": "", "flag": "" },
    // { "country": "Norway", "code": "", "flag": "" },
    // { "country": "Oman", "code": "", "flag": "" },
    // { "country": "Pakistan", "code": "", "flag": "" },
    // { "country": "Palau", "code": "", "flag": "" },
    // { "country": "Palestine", "code": "", "flag": "" },
    // { "country": "Panama", "code": "", "flag": "" },
    // { "country": "Papua New Guinea", "code": "", "flag": "" },
    // { "country": "Paraguay", "code": "", "flag": "" },
    // { "country": "Peru", "code": "", "flag": "" },
    // { "country": "Philippines", "code": "", "flag": "" },
    // { "country": "Pitcairn Islands (BOT)", "code": "", "flag": "" },
    // { "country": "Poland", "code": "", "flag": "" },
    // { "country": "Portugal", "code": "", "flag": "" },
    // { "country": "Puerto Rico (US)", "code": "", "flag": "" },
    // { "country": "Qatar", "code": "", "flag": "" },
    // { "country": "Réunion (France)", "code": "", "flag": "" },
    // { "country": "Romania", "code": "", "flag": "" },
    // { "country": "Russia", "code": "", "flag": "" },
    // { "country": "Rwanda", "code": "", "flag": "" },
    // { "country": "Saba (Netherlands)", "code": "", "flag": "" },
    // { "country": "Saint Barthélemy (France)", "code": "", "flag": "" },
    // { "country": "Saint Helena, Ascension and Tristan da Cunha (BOT)", "code": "", "flag": "" },
    // { "country": "Saint Kitts and Nevis", "code": "", "flag": "" },
    // { "country": "Saint Lucia", "code": "", "flag": "" },
    // { "country": "Saint Martin (France)", "code": "", "flag": "" },
    // { "country": "Saint Pierre and Miquelon (France)", "code": "", "flag": "" },
    // { "country": "Saint Vincent and the Grenadines", "code": "", "flag": "" },
    // { "country": "Samoa", "code": "", "flag": "" },
    // { "country": "San Marino", "code": "", "flag": "" },
    // { "country": "São Tomé and Príncipe", "code": "", "flag": "" },
    // { "country": "Saudi Arabia", "code": "", "flag": "" },
    // { "country": "Senegal", "code": "", "flag": "" },
    // { "country": "Serbia", "code": "", "flag": "" },
    // { "country": "Seychelles", "code": "", "flag": "" },
    // { "country": "Sierra Leone", "code": "", "flag": "" },
    // { "country": "Singapore", "code": "", "flag": "" },
    // { "country": "Sint Eustatius (Netherlands)", "code": "", "flag": "" },
    // { "country": "Sint Maarten (Netherlands)", "code": "", "flag": "" },
    // { "country": "Slovakia", "code": "", "flag": "" },
    // { "country": "Slovenia", "code": "", "flag": "" },
    // { "country": "Solomon Islands", "code": "", "flag": "" },
    // { "country": "Somalia", "code": "", "flag": "" },
    // { "country": "South Africa", "code": "", "flag": "" },
    // { "country": "South Korea", "code": "", "flag": "" },
    // { "country": "South Sudan", "code": "", "flag": "" },
    // { "country": "Spain", "code": "", "flag": "" },
    // { "country": "Sri Lanka", "code": "", "flag": "" },
    // { "country": "Sudan", "code": "", "flag": "" },
    // { "country": "Suricountry", "code": "", "flag": "" },
    // { "country": "Svalbard and Jan Mayen (Norway)", "code": "", "flag": "" },
    // { "country": "Sweden", "code": "", "flag": "" },
    // { "country": "Switzerland", "code": "", "flag": "" },
    // { "country": "Syria", "code": "", "flag": "" },
    // { "country": "Taiwan", "code": "", "flag": "" },
    // { "country": "Tajikistan", "code": "", "flag": "" },
    // { "country": "Tanzania", "code": "", "flag": "" },
    // { "country": "Thailand", "code": "", "flag": "" },
    // { "country": "Togo", "code": "", "flag": "" },
    // { "country": "Tokelau (NZ)", "code": "", "flag": "" },
    // { "country": "Tonga", "code": "", "flag": "" },
    // { "country": "Transnistria", "code": "", "flag": "" },
    // { "country": "Trinidad and Tobago", "code": "", "flag": "" },
    // { "country": "Tunisia", "code": "", "flag": "" },
    // { "country": "Turkey", "code": "", "flag": "" },
    // { "country": "Turkmenistan", "code": "", "flag": "" },
    // { "country": "Turks and Caicos Islands (BOT)", "code": "", "flag": "" },
    // { "country": "Tuvalu", "code": "", "flag": "" },
    // { "country": "U.S. Virgin Islands (US)", "code": "", "flag": "" },
    // { "country": "Uganda", "code": "", "flag": "" },
    // { "country": "Ukraine", "code": "", "flag": "" },
    // { "country": "United Arab Emirates", "code": "", "flag": "" },
    // { "country": "United Kingdom", "code": "", "flag": "" },
    // { "country": "United States", "code": "", "flag": "" },
    // { "country": "Uruguay", "code": "", "flag": "" },
    // { "country": "Uzbekistan", "code": "", "flag": "" },
    // { "country": "Vanuatu", "code": "", "flag": "" },
    // { "country": "Vatican City", "code": "", "flag": "" },
    // { "country": "Venezuela", "code": "", "flag": "" },
    // { "country": "Vietnam", "code": "", "flag": "" },
    // { "country": "Wallis and Futuna (France)", "code": "", "flag": "" },
    // { "country": "Western Sahara", "code": "", "flag": "" },
    // { "country": "Yemen", "code": "", "flag": "" }]

    // this.statesDropdownList = [
    //   { "state": "Andhra Pradesh", "code": "", "flag": "" },
    //   { "state": "Arunachal Pradesh", "code": "", "flag": "" },
    //   { "state": "Assam", "code": "", "flag": "" },
    //   { "state": "Bihar", "code": "", "flag": "" },
    //   { "state": "Chhattisgarh", "code": "", "flag": "" },
    //   { "state": "Goa", "code": "", "flag": "" },
    //   { "state": "Gujarat", "code": "", "flag": "" },
    //   { "state": "Haryana", "code": "", "flag": "" },
    //   { "state": "Himachal Pradesh", "code": "", "flag": "" },
    //   { "state": "Jharkhand", "code": "", "flag": "" },
    //   { "state": "Karnataka", "code": "", "flag": "" },
    //   { "state": "Kerala", "code": "", "flag": "" },
    //   { "state": "Madhya Pradesh", "code": "", "flag": "" },
    //   { "state": "Maharashtra", "code": "", "flag": "" },
    //   { "state": "Manipur", "code": "", "flag": "" },
    //   { "state": "Meghalaya", "code": "", "flag": "" },
    //   { "state": "Mizoram", "code": "", "flag": "" },
    //   { "state": "Nagaland", "code": "", "flag": "" },
    //   { "state": "Odisha", "code": "", "flag": "" },
    //   { "state": "Punjab", "code": "", "flag": "" },
    //   { "state": "Rajasthan", "code": "", "flag": "" },
    //   { "state": "Sikkim", "code": "", "flag": "" },
    //   { "state": "Tamil Nadu", "code": "", "flag": "" },
    //   { "state": "Telangana", "code": "", "flag": "" },
    //   { "state": "Tripura", "code": "", "flag": "" },
    //   { "state": "Uttar Pradesh", "code": "", "flag": "" },
    //   { "state": "Uttarakhand", "code": "", "flag": "" },
    //   { "state": "West Bengal", "code": "", "flag": "" }
    // ]
  }

  onSubmit() {
    if (this.customerProprtyDetailsForm.valid) {
      //console.log("Form Submitted");
      this.customerUpdate();
    } else {
      //console.log("Form is invalid!", this.customerProprtyDetailsForm);
    }
  }

  /*  async customerUpdate() {
     // console.log('Clicked')
     delete this.customerdata._id;
     delete this.customerdata.password;
     //console.log(this.customerdata._id, this.customerdata, "test check ")
     const formValues = this.customerProprtyDetailsForm.getRawValue();
     let tempCustomerObject = {
       "contact_details": {
         hotel_name: formValues.hotel_name,
         contact_person: formValues.contact_person,
         designation: formValues.designation,
         primary_phone_number: formValues.primary_phone_number,
         secondary_phone_number: formValues.secondary_phone_number,
         email: formValues.email,
         brand: formValues.brand,
         other_brand_name: formValues.other_brand_name,
       },
       "property_address": {
         property_doorno: formValues.property_doorno,
         property_address: formValues.property_address,
         property_city: formValues.property_city,
         property_state: formValues.property_state,
         property_location: formValues.property_location,
         property_country: formValues.property_country,
         property_pincode: formValues.property_pincode,
         property_pan: formValues.property_pan,
         property_gst: formValues.property_gst,
         property_size: formValues.property_size,
         number_of_rooms: formValues.number_of_rooms
       },
       // Newly added
       "kyc_documents": {
         company_status: formValues.company_status,
         uploaded_documents: this.uploaded_documents
       },
       "hotel_logo": this.hotelLogoUrl
     }
     this.customerdata["property_details"] = tempCustomerObject;
     this.customerdata["name"] = formValues.hotel_name;
     this.customerdata["is_property_details_exists"] = true;
 
     //  Password key reset value
     // this.customerdata["password"] = this.localStorageService.get('Password');
     //console.log(tempCustomerObject)
     //console.log(this.customerdata, " this.customerdata")
     let requestBody = {
       domain_name: DOMAIN_NAME,
       user_id: USER_ID,
       payload: {
         customer_update: this.customerdata
       },
       extras: {
         find: {
           // id: this.hotelId
           customer_member_id: this.memberId
         }
       }
     }
     //console.log("123")
     // this.hotelenrollmenttabviewService.updateCustomer(requestBody).subscribe(
     this.hotelenrollmenttabviewService.updateCustomerSettings(requestBody).subscribe(
       resp => {
         this.loaderService.emitComplete();
         if (resp) {
           if (resp.success === 1 && resp.status_code === 200) {
             // this.hotelenrollmenttabviewService.updateCustomer(requestBody).subscribe(
             this.hotelenrollmenttabviewService.updateCustomerSettings(requestBody).subscribe(
               resp1 => {
                 this.loaderService.emitComplete();
                 if (resp1) {
                   // console.log(resp1.success, resp1.status_code, "resp1")
                   if (resp1.success === 1 && resp1.status_code === 200) {
                     let requestBody = {
                       domain_name: DOMAIN_NAME,
                       user_id: USER_ID,
                       extras: {
                         find: {
                           id: this.hotelId
                           // customer_member_id: this.memberId
                         }
                       }
                     };
                     this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
                       resp2 => {
                         this.loaderService.emitComplete();
                         if (resp2) {
                           // console.log(resp2.result.data[0].customer_member_id, "Member iddddddd");
                           this.localStorageService.set('MemberId', resp2.result.data[0].customer_member_id);
                           // Newly added fo hierarchy member_id update - started
                           const customerMemberId = resp2.result.data[0].customer_member_id;
                           // console.log(customerMemberId, "Member id");
                           // this.getHierarchyById(this.hotelId).then(() => {
                           this.getHierarchyById(this.memberId).then(() => {
                             if (this.hierarchyData) {
                               const hierarchyMemberId = this.hierarchyData.member_id;
                               const hierarchyUpdateData: any = { ...this.hierarchyData };
                               delete hierarchyUpdateData._id;
                               if (hierarchyMemberId !== customerMemberId) {
                                 // Build update request for hierarchy
                                 const updateHierarchyBody = {
                                   domain_name: DOMAIN_NAME,
                                   user_id: USER_ID,
                                   payload: {
                                     hierarchy_update: {
                                       ...hierarchyUpdateData,
                                       member_id: customerMemberId   // update member_id
                                     }
                                   },
                                   extras: {
                                     find: {
                                       // Newly added for getting member id for customer type
                                       // customer_id: this.hierarchyData.customer_id
                                       member_id: this.hierarchyData.member_id
                                     }
                                   }
                                 };
                                 // Call update hierarchy API
                                 this.hierarchyService.apiCall(updateHierarchyBody, ENDPOINTS.UPDATE_HIERARCHY).subscribe(
                                   (resp: any) => {
                                     if (resp) {
                                       if (resp.success === 1 && resp.status_code === 200) {
                                         // Success message – do NOT navigate anywhere here
                                         // console.log("Hierarchy updated due to member_id mismatch");
                                         this.alertService.success('Hierarchy updated successfully', this.options);
 
                                       }
                                       else if (resp.success === 0) {
                                         if (resp.message) {
                                           this.alertService.error(resp.message, this.options);
                                         }
                                       }
                                       else if (resp.message && resp.status_code !== 200) {
                                         this.alertService.error(resp.message, this.options);
                                       }
                                       else {
                                         this.alertService.error('Something bad happened. Please try again!', this.options);
                                       }
                                     }
                                   },
                                   (err: any) => {
                                     if (err.error.statusCode === 403) {
                                       this.alertService.error('Session Time Out! Please login Again', this.options);
                                       this.router.navigate([`/login`], { skipLocationChange: false });
                                     }
                                     else if (err.error.message) {
                                       this.alertService.error(err.error.message, this.options);
                                     }
                                     else {
                                       this.alertService.error('Something bad happened. Please try again!', this.options);
                                     }
                                   }
                                 );
                               }
                             }
                           });
                           // Ended
                           this.hotelenrollmenttabviewService.clearAdminFormEvent();
                           //console.log("alerttttt")
                           this.alertService.success(resp1.message, this.options);
                           this.executeFunctions(); //For storing all values am calling this function
                           this.onContinue();
                           // //console.log(resp);
                         }
                       })
 
 
                   }
                 }
               })
           }
           else if (resp.success === 0) {
             if (resp.message) {
               this.alertService.error(resp.message, this.options);
             }
           }
           else if (resp.message && resp.status_code !== 200) {
             this.alertService.error(resp.message, this.options);
           }
           else {
             this.alertService.error('Something bad happened. Please try again!', this.options);
           }
         }
       },
       err => {
         this.loaderService.emitComplete();
         if (err.error.statusCode === 403) {
           this.alertService.error('Session Time Out! Please login Again', this.options)
           this.router.navigate([`/login`], { skipLocationChange: false });
         }
         else if (err.error.message) {
           this.alertService.error(err.error.message, this.options)
         }
         else {
           this.alertService.error('Something bad happened. Please try again!', this.options);
         }
       }
     )
   } */

  async customerUpdate() {
    // console.log('Clicked')
    delete this.customerdata._id;
    delete this.customerdata.password;

    const formValues = this.customerProprtyDetailsForm.getRawValue();
    const tempCustomerObject = {
      contact_details: {
        hotel_name: formValues.hotel_name,
        contact_person: formValues.contact_person,
        designation: formValues.designation,
        primary_phone_number: formValues.primary_phone_number,
        secondary_phone_number: formValues.secondary_phone_number,
        email: formValues.email,
        brand: formValues.brand,
        other_brand_name: formValues.other_brand_name,
      },
      property_address: {
        property_doorno: formValues.property_doorno,
        property_address: formValues.property_address,
        property_city: formValues.property_city,
        property_state: formValues.property_state,
        property_location: formValues.property_location,
        property_country: formValues.property_country,
        property_pincode: formValues.property_pincode,
        property_size: formValues.property_size,
        number_of_rooms: formValues.number_of_rooms,
        ...(formValues.property_country === 'India' ? {
          property_pan: formValues.property_pan,
          property_gst: formValues.property_gst
        } : {
          property_vat: formValues.property_vat,
          property_tin: formValues.property_tin
        })
      },
      // Newly added
      kyc_documents: {
        company_status: formValues.company_status,
        uploaded_documents: this.uploaded_documents
      },
      hotel_logo: this.hotelLogoUrl
    };

    this.customerdata['property_details'] = tempCustomerObject;
    this.customerdata['name'] = formValues.hotel_name;
    this.customerdata['is_property_details_exists'] = true;
    this.customerdata['old_member_id'] = this.localStorageService.get('MemberId');

    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        customer_update: this.customerdata
      },
      extras: {
        find: {
          // id: this.hotelId
          customer_member_id: this.memberId
        }
      }
    };

    // Single customer update
    this.hotelenrollmenttabviewService.updateCustomerSettings(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {

            // After update, get customer data and member_id
            const getCustomerBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              extras: {
                find: {
                  id: this.hotelId
                  // customer_member_id: this.memberId
                }
              }
            };

            this.hotelenrollmentservice.getLoginCustomerById(getCustomerBody).subscribe(
              resp2 => {
                this.loaderService.emitComplete();
                if (resp2) {
                  const customerMemberId = resp2.result.data[0].customer_member_id;
                  this.memberId = customerMemberId;
                  // Store member id
                  this.localStorageService.set('MemberId', customerMemberId);
                  // console.log(this.memberId, "Member id(After update in property details)");
                  // Update hierarchy with this member id (2nd updation)
                  /*  this.getHierarchyById(this.memberId).then(() => {
                     if (this.hierarchyData) {
                       const hierarchyMemberId = this.hierarchyData.member_id;
                       const hierarchyUpdateData: any = { ...this.hierarchyData };
                       delete hierarchyUpdateData._id;
 
                       if (hierarchyMemberId !== customerMemberId) {
                         const updateHierarchyBody = {
                           domain_name: DOMAIN_NAME,
                           user_id: USER_ID,
                           payload: {
                             hierarchy_update: {
                               ...hierarchyUpdateData,
                               member_id: customerMemberId
                             }
                           },
                           extras: {
                             find: {
                               // customer_id: this.hierarchyData.customer_id
                               member_id: this.hierarchyData.member_id
                             }
                           }
                         };
 
                         this.hierarchyService.apiCall(updateHierarchyBody, ENDPOINTS.UPDATE_HIERARCHY).subscribe(
                           (resp: any) => {
                             if (resp) {
                               if (resp.success === 1 && resp.status_code === 200) {
                                 this.alertService.success('Hierarchy updated successfully', this.options);
                               } else if (resp.success === 0) {
                                 if (resp.message) {
                                   this.alertService.error(resp.message, this.options);
                                 }
                               } else if (resp.message && resp.status_code !== 200) {
                                 this.alertService.error(resp.message, this.options);
                               } else {
                                 this.alertService.error('Something bad happened. Please try again!', this.options);
                               }
                             }
                           },
                           (err: any) => {
                             if (err.error.statusCode === 403) {
                               this.alertService.error('Session Time Out! Please login Again', this.options);
                               this.router.navigate(['/login'], { skipLocationChange: false });
                             } else if (err.error.message) {
                               this.alertService.error(err.error.message, this.options);
                             } else {
                               this.alertService.error('Something bad happened. Please try again!', this.options);
                             }
                           }
                         );
                       }
                     }
                   }); */

                  const checkPayload = {
                    domain_name: DOMAIN_NAME,
                    user_id: USER_ID,
                    payload: {
                      integration_settings: {
                        member_id: customerMemberId
                      }
                    }
                  };
                  this.hotelenrollmenttabviewService.checkIsTechnicalInfoExist(checkPayload).subscribe({
                    next: (checkResp: any) => {
                      if (checkResp) {
                        if (checkResp.success === 1 && checkResp.status_code === 200) {
                          // Final success actions
                          this.hotelenrollmenttabviewService.clearAdminFormEvent();
                          this.alertService.success(resp.message, this.options);
                          this.executeFunctions();
                          this.onContinue();
                        } else if (checkResp.success === 0) {
                          if (checkResp.message) {
                            this.alertService.error(checkResp.message, this.options);
                          }
                        } else if (checkResp.message && checkResp.status_code !== 200) {
                          this.alertService.error(checkResp.message, this.options);
                        } else {
                          this.alertService.error('Something bad happened. Please try again!', this.options);
                        }
                      }
                    },
                    error: (err: any) => {
                      this.loaderService.emitComplete();
                      if (err.error && err.error.statusCode === 403) {
                        this.alertService.error('Session Time Out! Please login Again', this.options);
                        this.router.navigate(['/login'], { skipLocationChange: false });
                      } else if (err.error && err.error.message) {
                        this.alertService.error(err.error.message, this.options);
                      } else {
                        this.alertService.error('Something bad happened. Please try again!', this.options);
                      }
                    }
                  });
                }
              },
              err => {
                this.loaderService.emitComplete();
                if (err.error.statusCode === 403) {
                  this.alertService.error('Session Time Out! Please login Again', this.options);
                  this.router.navigate(['/login'], { skipLocationChange: false });
                } else if (err.error.message) {
                  this.alertService.error(err.error.message, this.options);
                } else {
                  this.alertService.error('Something bad happened. Please try again!', this.options);
                }
              }
            );

          }
          else if (resp.message.toLowerCase().includes('input parameters missing')) {
            this.alertService.error('Please fill all the required fields.', this.options);
          }
          else if (resp.success === 0) {
            if (resp.message) {
              this.alertService.error(resp.message, this.options);
            }
          } else if (resp.message && resp.status_code !== 200) {
            this.alertService.error(resp.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate(['/login'], { skipLocationChange: false });
        } else if (err.error.message) {
          this.alertService.error(err.error.message, this.options);
        } else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
      }
    );
  }

  onCountryOrStateChange(country: string, state: string, isInitialLoad = false) {
    if (!country) {
      this.showTaxSection = false;
      if (this.taxField1Key) this.customerProprtyDetailsForm.removeControl(this.taxField1Key);
      if (this.taxField2Key) this.customerProprtyDetailsForm.removeControl(this.taxField2Key);
      this.taxField1Key = '';
      this.taxField2Key = '';
      return;
    }

    this.showTaxSection = true;
    const isIndia = country === 'India';
    const newField1Key = isIndia ? 'property_pan' : 'property_vat';
    const newField2Key = isIndia ? 'property_gst' : 'property_tin';

    // Calculate new title and labels first
    let newTaxSectionTitle = '';
    let newTaxField1Label = '';
    let newTaxField2Label = '';

    if (isIndia) {
      newTaxSectionTitle = 'PAN & GST Details';
      newTaxField1Label = 'PAN Number';
      newTaxField2Label = 'GST';
    } else {
      newTaxSectionTitle = 'VAT & TIN Details';
      newTaxField1Label = 'VAT Number';
      newTaxField2Label = 'Tax Identification Number (TIN)';

      if (country === 'Spain') {
        newTaxField2Label = 'Tax ID (NIF / NIE)';
        if (state === 'Canary Islands') {
          newTaxSectionTitle = 'IGIC & Tax ID Details';
          newTaxField1Label = 'IGIC Number';
        } else {
          newTaxSectionTitle = 'VAT & Tax ID Details';
          newTaxField1Label = 'VAT Number (IVA)';
        }
      } else if (country === 'Switzerland') {
        newTaxSectionTitle = 'VAT & Business ID Details';
        newTaxField1Label = 'VAT Number (MWST/TVA/IVA)';
        newTaxField2Label = 'Business ID (UID)';
      } else if (country === 'Germany') {
        newTaxSectionTitle = 'VAT & Tax Number Details';
        newTaxField1Label = 'VAT Number (USt-IdNr.)';
        newTaxField2Label = 'Tax Number (Steuernummer)';
      } else if (country === 'Austria') {
        newTaxSectionTitle = 'VAT & Tax Number Details';
        newTaxField1Label = 'VAT Number (UID)';
        newTaxField2Label = 'Tax Number (Steuernummer)';
      } else if (country === 'Poland') {
        newTaxSectionTitle = 'VAT & Tax ID Details';
        newTaxField1Label = 'VAT Number (NIP)';
        newTaxField2Label = 'Tax ID (NIP / PESEL)';
      } else if (country === 'Romania') {
        newTaxSectionTitle = 'VAT & Tax ID Details';
        newTaxField1Label = 'VAT Number (CIF)';
        newTaxField2Label = 'Tax ID (CIF / CNP)';
      } else if (country === 'United Kingdom') {
        newTaxSectionTitle = 'VAT & Tax Reference Details';
        newTaxField1Label = 'VAT Number';
        newTaxField2Label = 'Unique Taxpayer Reference (UTR)';
      }
    }

    // Determine if the tax system configuration actually changed
    const taxSystemChanged =
      this.taxField1Key !== newField1Key ||
      this.taxField2Key !== newField2Key ||
      this.taxSectionTitle !== newTaxSectionTitle ||
      this.taxField1Label !== newTaxField1Label ||
      this.taxField2Label !== newTaxField2Label;

    if (this.taxField1Key && this.taxField1Key !== newField1Key) {
      this.customerProprtyDetailsForm.removeControl(this.taxField1Key);
    }
    if (this.taxField2Key && this.taxField2Key !== newField2Key) {
      this.customerProprtyDetailsForm.removeControl(this.taxField2Key);
    }

    this.taxField1Key = newField1Key;
    this.taxField2Key = newField2Key;
    this.taxSectionTitle = newTaxSectionTitle;
    this.taxField1Label = newTaxField1Label;
    this.taxField2Label = newTaxField2Label;

    if (!this.customerProprtyDetailsForm.contains(newField1Key)) {
      const existingVal1 = isInitialLoad
        ? (isIndia
          ? (this.customerdata?.property_details?.property_address?.property_pan || '')
          : (this.customerdata?.property_details?.property_address?.property_vat || ''))
        : '';

      const ctrl1 = new FormControl(existingVal1, [
        Validators.required,
        CustomValidators.noWhitespaceValidator,
        CustomValidators.dynamicTaxValidator('VAT')
      ]);
      this.customerProprtyDetailsForm.addControl(newField1Key, ctrl1);
    } else {
      const ctrl1 = this.customerProprtyDetailsForm.get(newField1Key);
      if (ctrl1) {
        ctrl1.setValidators([
          Validators.required,
          CustomValidators.noWhitespaceValidator,
          CustomValidators.dynamicTaxValidator('VAT')
        ]);
        if (!isInitialLoad && taxSystemChanged) {
          ctrl1.setValue('');
        }
        ctrl1.updateValueAndValidity();
      }
    }

    if (!this.customerProprtyDetailsForm.contains(newField2Key)) {
      const existingVal2 = isInitialLoad
        ? (isIndia
          ? (this.customerdata?.property_details?.property_address?.property_gst || '')
          : (this.customerdata?.property_details?.property_address?.property_tin || ''))
        : '';

      const ctrl2 = new FormControl(existingVal2, [
        Validators.required,
        CustomValidators.noWhitespaceValidator,
        CustomValidators.dynamicTaxValidator('TIN')
      ]);
      this.customerProprtyDetailsForm.addControl(newField2Key, ctrl2);
    } else {
      const ctrl2 = this.customerProprtyDetailsForm.get(newField2Key);
      if (ctrl2) {
        ctrl2.setValidators([
          Validators.required,
          CustomValidators.noWhitespaceValidator,
          CustomValidators.dynamicTaxValidator('TIN')
        ]);
        if (!isInitialLoad && taxSystemChanged) {
          ctrl2.setValue('');
        }
        ctrl2.updateValueAndValidity();
      }
    }

    if (this.customerProprtyDetailsForm.disabled || this.customerStatus === 'approved') {
      this.customerProprtyDetailsForm.get(newField1Key)?.disable();
      this.customerProprtyDetailsForm.get(newField2Key)?.disable();
    }

    // Programmatic error triggering on country/state changes
    const ctrl1 = this.customerProprtyDetailsForm.get(newField1Key);
    if (ctrl1) {
      if ((!isInitialLoad && taxSystemChanged) || (isInitialLoad && ctrl1.value)) {
        ctrl1.markAsTouched();
      }
    }
    const ctrl2 = this.customerProprtyDetailsForm.get(newField2Key);
    if (ctrl2) {
      if ((!isInitialLoad && taxSystemChanged) || (isInitialLoad && ctrl2.value)) {
        ctrl2.markAsTouched();
      }
    }
  }

  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // id: this.hotelId
            customer_member_id: this.memberId
          }
        }
      };
      this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            this.hotelId = resp.result.data[0].id;
            // console.log('Customer data:', this.customerdata);
            if (resp.result.data[0]) {
              if (resp?.result?.data[0]?.property_details?.kyc_documents?.uploaded_documents) {
                const apiDocs = resp.result.data[0].property_details.kyc_documents.uploaded_documents;
                // Store snapshot so onCompanyStatusChange can restore URLs when switching back
                this.originalUploadedDocuments = apiDocs;
                this.uploaded_documents = apiDocs;
                this.uploadedDocumentsApi = [...apiDocs];
                // uploadedDocuments is a {[docName]: File} map — do NOT assign the API array to it
                this.uploadedDocuments = {};
              }
              // Track the company status that was originally saved to the server
              if (resp?.result?.data[0]?.property_details?.kyc_documents?.company_status) {
                this.originalCompanyStatus = resp.result.data[0].property_details.kyc_documents.company_status;
              }
              //  Store company logo URL from API
              if (resp?.result?.data[0]?.property_details?.hotel_logo) {
                this.hotelLogoUrl = resp?.result?.data[0]?.property_details?.hotel_logo;
                this.sharedDataService.setHotelLogo(this.hotelLogoUrl);
                // console.log('Existing company logo:', this.hotelLogoUrl);
              } else {
                this.hotelLogoUrl = null;
                this.sharedDataService.setHotelLogo(null);
              }
              this.status = this.customerdata.status;
              this.customerStatus = this.customerdata.status;
              // console.log('Customer status:', this.status);
              if (this.paymentDone) {
                this.customerProprtyDetailsForm.get('property_size')?.disable();
                this.customerProprtyDetailsForm.get('number_of_rooms')?.disable();
              }
              if (this.status == 'approved') {
                // Disable the form if not approved
                this.customerProprtyDetailsForm.disable();
              }
              // Set perRoomCost from customer subscription if exists
              // if (this.customerdata?.subscription_detail?.perRoomCost) {
              //   this.perRoomCost = this.customerdata.subscription_detail.perRoomCost;
              // }
              // if (this.customerdata?.subscription_detail?.finalPrice) {
              //   this.finalPrice = this.customerdata.subscription_detail.finalPrice;
              // }
              // else {
              // fallback to general plan
              this.getAllSubscriptionsAndSetGeneral();
              // Only calculate input field cost if rooms already entered

              // }
              // Set initial total cost based on selected size
              // this.totalCost = this.getTotalCostForOption(this.selectedPropertySize);
            }
            //console.log(this.customerdata, "RESPDATA",this.uploaded_documents);
            //console.log(Array.isArray(this.customerdata));
            resolve();  // Resolve promise when data is set
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }

  // Fetch general subscription if customer has no subscription_detail
  // getAllSubscriptionsAndSetGeneral() {
  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: { },
  //       pagination: true,
  //       paginationDetails: { limit: 0, pageSize: 10 },
  //       sorting: true,
  //       sortingDetails: { email: -1 }
  //     }
  //   };
  //   this.hotelenrollmenttabviewService.getAllSubscriptionDetails(requestBody).subscribe(
  //     resp => {
  //       if (resp && resp.result?.data?.length) {
  //         // Take the first plan as general fallback
  //         this.plans = resp.result.data;
  //         // console.log('Subscription Plans', this.plans);
  //         // this.perRoomCost = this.plans[0]?.perRoomCost;
  //         // console.log('Per Room Cost Set To:', this.perRoomCost);
  //         this.finalPrice = this.plans[0]?.finalPrice;
  //         // console.log('Final Price Cost Set To:', this.finalPrice);
  //         // Update total cost for current selection
  //         this.totalCost = this.getTotalCostForOption(this.selectedPropertySize);
  //         // console.log('Total Cost Updated To:', this.totalCost);
  //       }
  //     },
  //     (err: any) => {
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.options);
  //       } else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.options);
  //       } else {
  //         this.alertService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   );
  // }

  // Calculate total cost for a given property size
  // getTotalCostForOption(option: string): number {
  //   let roomCount = 50; // default
  //   switch (option) {
  //     case '01-50 Rooms': roomCount = 50; break;
  //     case '51-100 Rooms': roomCount = 100; break;
  //     case '101-150 Rooms': roomCount = 150; break;
  //     case '150 and above Rooms': roomCount = 200; break;
  //   }
  //   // return this.perRoomCost * roomCount * 12; // Annual cost
  //   return this.perRoomCost * roomCount * 12; // Annual cost
  // }

  // Handle user changing property size
  // onPropertySizeChange(option: string) {
  //   this.selectedPropertySize = option;
  //   this.totalCost = this.getTotalCostForOption(option);
  // }


  setFormValues() {
    if (
      this.customerdata?.property_details?.contact_details &&
      this.customerdata?.property_details?.property_address &&
      this.customerdata?.property_details?.kyc_documents
    ) {
      this.isInitialLoad = true;
      const docs = this.customerdata.property_details?.kyc_documents?.uploaded_documents;
      //console.log( this.uploadedDocumentsApi,'this.uploadedDocumentsApi');
      //console.log( this.uploadedDocumentsApi,'this.uploadedDocumentsApi')

      // if (docs?.length ) {
      docs.forEach((doc: any) => {
        this.uploadedDocumentsApi[doc.document_name] = doc.document_url;
      });
      // }
      if (this.customerdata.property_details.contact_details?.brand == "Others") {
        this.isOtherBrand = true;
      }
      if (
        this.customerdata?.property_details?.contact_details &&
        this.customerdata?.property_details?.property_address &&
        this.customerdata?.property_details?.kyc_documents &&
        this.customerdata?.property_details?.hotel_logo
      ) {
        this.hotelLogoUrl = this.customerdata.property_details?.hotel_logo
      }
      const country = this.customerdata?.property_details.property_address?.property_country || '';
      const state = this.customerdata.property_details.property_address?.property_state || '';
      this.onCountryOrStateChange(country, state, this.isInitialLoad);

      const patchData: any = {
        hotel_name: this.customerdata?.property_details?.contact_details?.hotel_name,
        contact_person: this.customerdata.property_details?.contact_details?.contact_person,
        designation: this.customerdata.property_details?.contact_details?.designation,
        primary_phone_number: this.customerdata.property_details?.contact_details?.primary_phone_number,
        secondary_phone_number: this.customerdata.property_details?.contact_details?.secondary_phone_number,
        email: this.customerdata.property_details.contact_details?.email,
        brand: this.customerdata.property_details.contact_details?.brand,
        other_brand_name: this.customerdata.property_details.contact_details?.other_brand_name,

        property_doorno: this.customerdata.property_details.property_address?.property_doorno,
        property_address: this.customerdata.property_details.property_address?.property_address,
        property_city: this.customerdata.property_details.property_address?.property_city,
        property_country: this.customerdata?.property_details.property_address?.property_country,
        property_state: this.customerdata.property_details.property_address?.property_state,
        property_location: this.customerdata.property_details.property_address?.property_location,

        property_pincode: this.customerdata.property_details.property_address?.property_pincode,
        property_size: this.customerdata.property_details.property_address.property_size,

        // Newly added
        company_status: this.customerdata.property_details?.kyc_documents?.company_status,
        uploaded_documents: this.customerdata.property_details?.kyc_documents?.uploaded_documents,
        // Newly added for room no
        number_of_rooms: this.customerdata.property_details?.property_address?.number_of_rooms
      };

      if (this.taxField1Key) {
        patchData[this.taxField1Key] = this.taxField1Key === 'property_pan'
          ? this.customerdata.property_details.property_address?.property_pan
          : this.customerdata.property_details.property_address?.property_vat;
      }
      if (this.taxField2Key) {
        patchData[this.taxField2Key] = this.taxField2Key === 'property_gst'
          ? this.customerdata.property_details.property_address?.property_gst
          : this.customerdata.property_details.property_address?.property_tin;
      }

      this.customerProprtyDetailsForm.patchValue(patchData);
      this.isInitialLoad = false;
      // Sync selectedPropertySize so range validation works correctly on load
      const savedSize = this.customerdata.property_details?.property_address?.property_size;
      if (savedSize) {
        this.selectedPropertySize = savedSize;
      }
      // Newly added for documents upload
      //  this.uploadedDocumentsApi = this.customerdata.property_details?.kyc_documents?.uploaded_documents;
      this.originalUploadedDocuments = this.customerdata.property_details?.kyc_documents?.uploaded_documents || [];
      this.uploadedDocumentsApi = [...this.originalUploadedDocuments];
      //console.log('Uploaded Documents', this.uploadedDocumentsApi);
      //console.log('Company status', this.customerdata.property_details?.kyc_documents?.company_status);
      //console.log('this:', this.customerdata.property_details.property_address?.property_pincode);
    }

  }

  async executeFunctions(): Promise<void> {
    this.getCustomerById()
      .then(() => {
        this.setFormValues() // Runs after data is fetched
      })
      .catch(error => {
        //console.error("Error fetching customer data:", error);
      });


  }

  // getCountries() {
  //   // get country list
  //   this.hotelenrollmenttabviewService.getCountries().subscribe(
  //     resp => {
  //       this.countryDropdownList = resp.result;
  //       //console.log(this.countryDropdownList, "countryDropdownList");
  //       if (this.customerdata?.registered_address?.country != undefined && this.customerdata.registered_address?.country != null) {
  //         this.getStateData()
  //       }
  //       // //console.log(this.countryList);
  //     },
  //     err => {
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.options)
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       }
  //       else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.options)
  //       }
  //       else {
  //         this.alertService.error('Something bad happened while loading countries. Please try again!', this.options);
  //       }
  //     }
  //   )
  // }

  // getStateData() {
  //   const selectedCountry = this.countryDropdownList.find((c: { country: string; id: number }) => c.country === this.customerdata.registered_address?.country); if (selectedCountry) {
  //     //console.log('Selected Country ID:', selectedCountry.id);
  //     this.getStates(selectedCountry.id);
  //   } else {
  //     //console.log('Country not found');
  //   }
  // }

  // getStates(country_id: number) {
  //   let statesRequest = {
  //         "domain_name": "https://www.guestezee.com",
  //   "user_id": 16,
  //   "extras": {
  //       "find": {},
  //       "pagination": false,
  //       "paginationDetails": {
  //           "limit": 10000000,
  //           "pageSize": 2
  //       },
  //       "sorting": true,
  //       "sortingDetails": {
  //           "sortfield": "",
  //           "sortorder": -1
  //       }
  //   }


  //     // "domain_name": DOMAIN_NAME,
  //     // "user_id": USER_ID,
  //     // "extras": {
  //     //   "find": {
  //     //     "countryid": country_id
  //     //   },
  //     //   "pagination": false,
  //     //   "paginationDetails": {
  //     //     "limit": 0,
  //     //     "pageSize": 2
  //     //   },
  //     //   "sorting": true,
  //     //   "sortingDetails": {
  //     //     "sortfield": "",
  //     //     "sortorder": -1
  //     //   }
  //     // }
  //   }
  //   this.hotelenrollmenttabviewService.getStatesById(statesRequest).subscribe(resp => {
  //     if (resp.success === 1) {
  //       this.states = resp.result
  //       let temArray: any = []
  //       //iterate through object
  //       Object.entries(this.states).forEach(([key, value]) => {
  //         temArray.push(value)
  //       })
  //       //flatten array
  //       this.statesDropdownList = Array.prototype.concat.apply([], temArray)
  //       //console.log(this.statesDropdownList, " this.statesDropdownList")
  //       // //console.log(this.statesDropdownList)
  //     }
  //     else {
  //       this.states = []
  //     }
  //   }, err => {
  //     if (err.error.statusCode === 403) {
  //       this.alertService.error('Session Time Out! Please login Again', this.options)
  //       this.router.navigate([`/login`], { skipLocationChange: false });
  //     }
  //     else if (err.error.message) {
  //       this.alertService.error(err.error.message, this.options)
  //     }
  //     // else {
  //     //   this.alertService.error('Something bad happened while loading customer group. Please try again!', this.options);
  //     // }
  //     this.states = []
  //   })
  // }

  // generateMemberID(orderAmount: number) {
  //   const today = new Date();
  //   // Format date as YYYYMMDD
  //   const year = today.getFullYear();
  //   const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  //   const day = String(today.getDate()).padStart(2, '0');
  //   // Generate a random 4-digit number
  //   const randomNum = Math.floor(1000 + Math.random() * 9000);
  //   let start = ''
  //   if (orderAmount == 10000) {
  //     start = 'B'
  //   }
  //   else if (orderAmount == 20000) {
  //     start = 'S'
  //   }
  //   else if (orderAmount == 30000) {
  //     start = 'G'
  //   }
  //   else if (orderAmount == 40000) {
  //     start = 'P'
  //   }
  //   // return `GE-${year}${month}${day}-${randomNum}`;
  //   return `${start}${this.customerdata.property_details.property_address.property_country.substring(0, 2).toUpperCase()}${this.customerdata.property_details.property_address.property_state.split(" ")
  //     .map((word: string) => word[0])
  //     .join("")
  //     .toUpperCase()}${this.customerdata.id.toString().padStart(5, "0")}`;
  // }

  // async payNow() {
  //   let orderAmount = 10000;
  //   if (this.customerProprtyDetailsForm.value.property_size == "01-50 Rooms") {
  //     orderAmount = 10000;
  //   }
  //   if (this.customerProprtyDetailsForm.value.property_size == "51-101 Rooms") {
  //     orderAmount = 20000;
  //   }
  //   if (this.customerProprtyDetailsForm.value.property_size == "101-150 Rooms") {
  //     orderAmount = 30000;
  //   }
  //   if (this.customerProprtyDetailsForm.value.property_size == "50 and above Rooms") {
  //     orderAmount = 40000;
  //   }
  //   //console.log("this.custom data", this.customerdata);
  //   let endDate = new Date();
  //   endDate.setFullYear(endDate.getFullYear() + 1); // Add 1 year
  //   let due_date = `${String(endDate.getDate()).padStart(2, '0')}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${endDate.getFullYear()}`; // Format as YYYY-MM-DD
  //   let orderData = {
  //     "customer_id": this.customerdata.id,
  //     "status": "Awaiting Payment",
  //     "status_id": "1",
  //     "system_label": "Pending",
  //     "orderConfirmDate": new Date(),
  //     "subscription_end_date": due_date,
  //     "customer": {
  //       "customer_id": this.customerdata.id,
  //       "customer_name": this.customerdata.first_name,
  //       "email": this.customerdata.email,
  //       "customer_type": "business customer",
  //       "phone_number": this.customerdata.phone_number,
  //       "address": this.customerdata.property_details.property_address.property_address,
  //       "brand": this.customerdata.property_details.contact_details.brand,
  //       "hotel_name": this.customerdata.property_details.contact_details.hotel_name,
  //       // "member_id": this.generateMemberID(orderAmount),
  //       "property_size": this.customerdata.property_details.property_address.property_size,
  //       "is_email_opt_in": false
  //     },
  //     "delivery": {
  //       "outlet_id": "1",
  //       "outlet_name": "guest ezee",
  //       "email": this.customerdata.property_details.contact_details.email,

  //       "phone_number": this.customerdata.property_details.contact_details.primary_phone_number,
  //       "address": this.customerdata.property_details.property_address.property_address,

  //       "is_email_opt_in": false
  //     },


  //     "order_review": {
  //       "order_summary": {
  //         "sub_total": Number(orderAmount),

  //         "tax": 0.00,

  //         "order_total_amount": Number(orderAmount)

  //       }
  //     },





  //     "organization_id": 46,
  //     "store_id": 1,



  //     "created_by": this.localStorageService.get('UserId'),
  //     "is_deleted": false,
  //     "is_active": true,
  //     "modified_by": 16,

  //   }
  //   let requestData = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: {
  //       order_creation: orderData,
  //     },
  //     extras: {
  //       find: {
  //         id: ""
  //       }
  //     }
  //   }
  //   this.hotelenrollmenttabviewService.orderUpsert(requestData).subscribe(
  //     resp => {
  //       let res: any = resp;
  //       this.upsertData = res.result.data;
  //       //console.log(this.upsertData, 'this.upsertData')

  //       if (res.success) {

  //         let user = {
  //           exist: false,
  //           password: false,
  //           email: false
  //         }
  //         this.getHdfcData();

  //       }
  //     })


  // }

  // getHdfcData() {
  //   //console.log("123")
  //   let hdfcData = {
  //     domain_name: DOMAIN_NAME,
  //     oid: this.upsertData[0].id,
  //     amount: 1500,
  //   }
  //   this.checkoutApiService.getHDFClink(hdfcData).then(
  //     respData3 => {

  //       let res3: any = respData3;
  //       //console.log("123", res3)
  //       if (res3 !== false) {
  //         var form = document.createElement("form");
  //         var element1 = document.createElement("input");
  //         var element2 = document.createElement("input");
  //         form.method = "POST";
  //         form.action = res3.link;
  //         form.target = '_self'
  //         element1.value = res3.encrequest;
  //         element1.name = "encRequest";
  //         form.appendChild(element1);
  //         element2.value = res3.accesscode;
  //         element2.name = "access_code";
  //         form.appendChild(element2);
  //         document.body.appendChild(form);
  //         // this.loaderService.emitComplete();
  //         form.submit();
  //         // this.CheckoutLocalStorageService.removeOrderId();
  //         // window.open("https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction&access_code=AVJT16KI07CA37TJAC&encRequest=0ae90ee5da7391dbfa55bccc526d8366460f50701e9fdcafbfee1a7ba1b4c9dffc7d4a40107a85e3e5c51598aa1803cc4eeace4bfb0f5f3730b1e8a908b69dadb7ee1a4666c3e16af8dcd5f51febbfc71a76b84f58735aea84ff54e8c49202a493724321f1172976a76798968d8a289e4534ebfffe0033bd8d3336113b548e47adb6ffc205e4056811ffe0309bb9ebbe2f05cbc0b36c3453a72cbb6ed7198348e40732622ecfc1586ceb0ede38a08e4bce9265b0d21677daeeefe23f1ca2da3a")
  //       }
  //     }
  //   );
  // }

  onBack() {
    this.close.emit();
  }

  onContinue() {
    this.isVisible = false;
    this.continue.emit();
  }

  backtoForm() {
    this.customerId = this.activatedRoute.snapshot.queryParamMap.get('customer_id');
    //console.log('Customer ID:', this.customerId);
    this.router.navigate(["/edit-new-hotel", this.customerId]);

  }

  cancel() {
    this.customerProprtyDetailsForm.reset();
  }

  onItemsSelect(item: any) {
    //console.log(item.target.value, "item")
    const selectedCountry = this.countryDropdownList.find((c: { country: string; id: number }) => c.country === item.target.value); if (selectedCountry) {
      //console.log('Selected Country ID:', selectedCountry.id);
      // this.getStates(selectedCountry.id);
    } else {
      //console.log('Country not found');
    }
  }

  // getOrderData(customer_id: number) {
  getOrderData(memberId: any) {
    //console.log("111")
    let formatJson = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // customer_id: Number(customer_id),
          customer_member_id: memberId,
          status: "Order Confirmed"

        }
      },
      "pagination": false,
      "paginationDetails": {
        "limit": 0,
        "pageSize": 10
      },
      "sorting": true,
      "sortingDetails": {
        "sortfield": "",
        "sortorder": -1
      }
    }



    this.hotelenrollmenttabviewService.orderDetailsGetById(formatJson).subscribe(
      resp => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {

          let response = resp.result.data;



          // let element = resp.result.data[response.length-1 ];
          let element = resp.result.data[0];
          this.orderData = element;
          this.memberId = element.customer.member_id != null ? element.customer.member_id : "    "
          // this.memberId = element.status;
        }
      }
    )
  }

  get selectedDocumentList(): { name: string }[] {
    const status = this.customerProprtyDetailsForm.get('company_status')?.value;
    //console.log('Selected Company Status:', this.companyStatusDocuments[status]);
    return this.companyStatusDocuments[status] || [];
  }

  get nextPendingDocument(): string | null {
    for (let doc of this.selectedDocumentList) {
      if (!this.uploadedDocuments[doc.name]) {
        return doc.name;
      }
    }
    return null;
  }

  // isAllDocumentsUploaded(): boolean {
  //   return this.uploadedDocuments.every((doc: any) => doc.document_url && doc.document_url.trim() !== '');
  // }

  isAllDocumentsUploaded(): boolean {
    const result = this.selectedDocumentList.length > 0 &&
      this.selectedDocumentList.every(doc => !!this.uploadedDocuments[doc.name]);
    //console.log('selectedDocumentList:', this.selectedDocumentList);
    //console.log('uploadedDocuments:', this.uploadedDocuments);
    //console.log('All uploaded?', result);
    return result;
  }


  get hasPendingDocument(): boolean {
    return this.uploadedDocumentsApi.some((doc: any) => doc.document_url.trim() === '');
  }

  get nextApiPendingDocument(): string | null {
    const pendingDoc = this.uploadedDocumentsApi.find((doc: any) => doc.document_url.trim() === '');
    return pendingDoc ? pendingDoc.document_name : null;
  }

  isAllApiDocumentsUploaded(): boolean {
    return this.uploadedDocumentsApi.length > 0 &&
      this.uploadedDocumentsApi.every(
        (doc: any) => !!doc.document_url && doc.document_url.trim() !== ''
      );
  }

  onFileChange(event: Event) {
    var reader = new FileReader();
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      // Validate type
      if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        this.alertService.error('Only PDF, JPEG, JPG files are allowed.', this.options);
        return;
      }
      // Validate size
      if (file.size > 2 * 1024 * 1024) {
        this.alertService.error('File size must be less than 2MB.', this.options);
        return;
      }
      // Use the explicitly selected doc name (set by triggerUpload) so the
      // correct row is always updated, not just the first pending one.
      const currentDoc = this.selectedUploadDoc ?? this.nextPendingDocument;
      if (currentDoc) {
        this.uploadedDocuments[currentDoc] = file;
        //console.log('Uploaded Docs:', this.uploadedDocuments);
        reader.readAsDataURL(file);
        let headers = new HttpHeaders().set("source", "Brand").set("domain_name", DOMAIN_NAME);
        let formData_imageCate = new FormData();
        if (file !== null) {
          formData_imageCate.append('upload', file)
        }
        this.profileService.sendImage(formData_imageCate, headers).subscribe(resp => {
          if (resp && resp.success === 1 && resp.status_code === 200) {
            let imgVariable = resp.result.data[0];
            //Create object and add to uploaded_documents array
            const docObject = {
              document_name: currentDoc,
              document_url: imgVariable.location
            };
            //Remove if already exists (avoid duplicates)
            this.uploaded_documents = this.uploaded_documents.filter(doc => doc.document_name !== currentDoc);
            //Push new object
            this.uploaded_documents.push(docObject);
            //console.log('Uploaded Docs:', this.uploaded_documents)
            // Newly added for document error
            // Also update uploadedDocumentsApi so that if the view switches to the API view, it remains in sync
            const apiIndex = this.uploadedDocumentsApi.findIndex((doc: any) => doc.document_name === currentDoc);
            if (apiIndex !== -1) {
              this.uploadedDocumentsApi[apiIndex].document_url = imgVariable.location;
            } else {
              this.uploadedDocumentsApi.push({
                document_name: currentDoc,
                document_url: imgVariable.location
              });
            }
            // Ended for document error
            // Only show success after server confirms ALL docs are uploaded
            if (!this.nextPendingDocument) {
              this.alertService.success('All required documents uploaded successfully.', this.options);
            }
          }
        })

      }
      // Reset input to allow uploading same file again
      fileInput.value = '';
      // Clear the explicit selection after upload is handled
      this.selectedUploadDoc = null;
    }
  }

  /**
   * Called by each row's upload icon (non-API section). Sets the target
   * document name so onFileChange uploads to the correct doc.
   */
  triggerUpload(docName: string, input: HTMLInputElement): void {
    this.selectedUploadDoc = docName;
    input.value = '';
    input.click();
  }

  onFileChangeApi(event: Event) {
    var reader = new FileReader();
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      // Validate type
      if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        this.alertService.error('Only PDF, JPEG, JPG files are allowed.', this.options);
        return;
      }
      // Validate size
      if (file.size > 2 * 1024 * 1024) {
        this.alertService.error('File size must be less than 2MB.', this.options);
        return;
      }
      // Use the explicitly selected doc name (set by triggerApiUpload) so the
      // correct row is always updated, not just the first pending one.
      const currentDoc = this.selectedApiDocName ?? this.nextApiPendingDocument;
      //console.log('Current Doc:', currentDoc);
      if (currentDoc) {
        this.uploadedDocumentsApi[currentDoc] = file;
        //console.log('Uploaded Docs:', this.uploadedDocumentsApi);
        reader.readAsDataURL(file);
        let headers = new HttpHeaders().set("source", "Brand").set("domain_name", DOMAIN_NAME);
        let formData_imageCate = new FormData();
        if (file !== null) {
          formData_imageCate.append('upload', file)
        }
        this.profileService.sendImage(formData_imageCate, headers).subscribe(resp => {
          if (resp && resp.success === 1 && resp.status_code === 200) {
            let imgVariable = resp.result.data[0];
            // Find the index of the document to update
            const index = this.uploadedDocumentsApi.findIndex((doc: any) => doc.document_name === currentDoc);
            if (index !== -1) {
              // Update the document_url
              this.uploadedDocumentsApi[index].document_url = imgVariable.location;
            }
            this.uploaded_documents = this.uploadedDocumentsApi;
            //console.log('Uploaded Docs:', this.uploaded_documents)

            // Only show success after server confirms ALL docs are uploaded
            if (!this.hasPendingDocument) {
              this.alertService.success('All required documents uploaded successfully.', this.options);
            }
          }
        })

      }
      // Reset input to allow uploading same file again
      fileInput.value = '';
      // Clear the explicit selection after upload is handled
      this.selectedApiDocName = null;
    }
  }

  /**
   * Called by each row's upload icon. Sets the target document name so that
   * onFileChangeApi knows which row to update, then opens that row's own
   * hidden file input (rowFileInput) instead of a shared one.
   */
  triggerApiUpload(docName: string, input: HTMLInputElement): void {
    this.selectedApiDocName = docName;
    input.value = ''; // reset so same file can be re-selected if needed
    input.click();
  }

  removeDocument(docName: string) {
    if (this.uploadedDocuments[docName]) {
      delete this.uploadedDocuments[docName];
      this.uploaded_documents = this.uploaded_documents.filter(doc => doc.document_name !== docName);
      // Newly added for document error
      const apiIndex = this.uploadedDocumentsApi.findIndex((doc: any) => doc.document_name === docName);
      if (apiIndex !== -1) {
        this.uploadedDocumentsApi[apiIndex].document_url = '';
      }
      // Ended for document error
      // this.alertService.success(`${docName} removed.`, this.options);
    }
    else {
      this.alertService.error(`No file uploaded for ${docName}`, this.options);
    }
  }

  removeDocumentApi(document: any) {
    //console.log(this.uploadedDocumentsApi, "this.uploadedDocumentsApi");
    const index = this.uploadedDocumentsApi.findIndex((doc: any) => doc.document_url === document.document_url);
    if (index !== -1) {
      this.uploaded_documents = this.uploadedDocumentsApi.filter((doc: any) => doc.document_url !== document.document_url);
      this.uploadedDocumentsApi = this.uploadedDocumentsApi.map((doc: any) => {
        if (doc.document_url === document.document_url) {
          return { ...doc, document_url: '' };
        }
        return doc;
      });
      //console.log('After removind documents from uploaded api documents:', this.uploaded_documents);
      // this.alertService.success(`${document.document_name} removed.`, this.options);
    }
    else {
      this.alertService.error(`No file uploaded for ${document.document_name}`, this.options);
    }
  }

  previewDocument(docName: string) {
    const file = this.uploadedDocuments[docName];
    if (file) {
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } else {
      this.alertService.error(`No file uploaded for ${docName}`, this.options);
    }
  }

  previewApiDocument(docUrl: any) {
    if (docUrl == undefined || docUrl == '') {
      this.alertService.error(`No file uploaded for this document`, this.options);
    }
    else {
      window.open(docUrl, '_blank');
    }
  }
  back() {
    var button = document.getElementById("Registered Office Details");
    button?.click();
    window.scroll(0, 0);
  }
  setOtherBrand(data: any) {

  }
  unsetOtherBrand() {

  }

  // Newly added for other brand name
  onBrandChange(event: any): void {
    const selectedBrand = event.target.value;
    // console.log('Selected Brand:', selectedBrand);
    this.isOtherBrand = selectedBrand === 'Others';
    const otherBrandControl = this.customerProprtyDetailsForm.controls['other_brand_name'];
    // console.log('Other Brand Name:', otherBrandControl);
    // Always reset value and validation status
    otherBrandControl.setValue('');
    otherBrandControl.markAsPristine();
    otherBrandControl.markAsUntouched();

    if (this.isOtherBrand) {
      otherBrandControl.setValidators([Validators.required, this.noWhitespaceValidator]);
    } else {
      otherBrandControl.clearValidators();
    }
    otherBrandControl.updateValueAndValidity();
  }

  // Custom validator to prevent whitespace-only input
  noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  }

  //   var file;
  // onBrandChange(event: any): void {
  //   //console.log("11")
  //   const selectedBrand = event.target.value;

  //   this.isOtherBrand = selectedBrand === 'Others';
  //   //console.log( this.isOtherBrand," this.isOtherBrand")

  //   if (!this.isOtherBrand) {
  //       //console.log("!isOtherBrand")
  //     this.customerProprtyDetailsForm.controls['other_brand_name'].setValue(' ');
  //   }
  //   else{
  //     this.customerProprtyDetailsForm.get('other_brand_name')?.reset();
  //   }
  // }

  // Allow pincode characters dynamically
  allowPincodeInput(event: KeyboardEvent) {
    const country = this.customerProprtyDetailsForm.get('property_country')?.value || 'default';
    const rule = PINCODE_RULES[country] || PINCODE_RULES['default'];

    // Check digits-only
    if (rule.digitsOnly && (event.key < '0' || event.key > '9')) {
      event.preventDefault();
      return;
    }

    if (!rule.digitsOnly) {
      const allowedChars = /^[a-zA-Z0-9\s\-]$/;
      if (event.key.length === 1 && !allowedChars.test(event.key)) {
        event.preventDefault();
        return;
      }
    }
  }

  handlePaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text') ?? '';
    const country = this.customerProprtyDetailsForm.get('property_country')?.value || 'default';
    const rule = PINCODE_RULES[country] || PINCODE_RULES['default'];

    let regex = /^[a-zA-Z0-9\s\-]+$/;
    if (rule.digitsOnly) {
      regex = /^\d+$/;
    }
    if (!regex.test(pasted) || pasted.length > rule.maxLength) {
      event.preventDefault();
    }
  }

  // Newly added for company logo upload
  onLogoChange(event: Event) {
    // console.log('File input changed', event);
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Validate type
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        this.alertService.error('Only JPG, JPEG, or PNG files are allowed.', this.options);
        input.value = '';
        return;
      }
      // Validate size
      if (file.size > 2 * 1024 * 1024) {
        this.alertService.error('File size must be less than 2MB.', this.options);
        input.value = '';
        return;
      }

      // Validate dimensions
      const img = new Image();
      img.src = window.URL.createObjectURL(file);
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        window.URL.revokeObjectURL(img.src);

        if (width !== 200 || height !== 200) {
          this.alertService.error(`Image dimensions must be exactly 200 × 200 pixels. (Uploaded image: ${width} × ${height} pixels)`, this.options);
          input.value = '';
          return;
        }

        // Upload and Preview
        this.uploadAndPreviewLogo(file);
      };

      img.onerror = () => {
        window.URL.revokeObjectURL(img.src);
        this.alertService.error('Invalid image file.', this.options);
        input.value = '';
      };

      // Reset file input
      input.value = '';
    }
  }

  uploadAndPreviewLogo(file: File) {
    this.logoUploading = true;
    this.hotelLogo = file;
    // Preview locally
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.hotelLogoUrl = e.target.result;
    };
    reader.readAsDataURL(file);
    // Upload to API
    const headers = new HttpHeaders().set('source', 'Brand').set('domain_name', DOMAIN_NAME);
    const formData = new FormData();
    formData.append('upload', file);
    this.profileService.sendImage(formData, headers).subscribe({
      next: (resp: any) => {
        if (resp && resp.success === 1 && resp.status_code === 200) {
          const imgVariable = resp.result.data[0];
          this.hotelLogoUrl = imgVariable.location;
          this.alertService.success('Logo uploaded successfully.', this.options);
        } else {
          this.alertService.error('Failed to upload logo. Please try again.', this.options);
        }
        this.logoUploading = false;
      },
      error: () => {
        this.alertService.error('Error uploading logo.', this.options);
        this.logoUploading = false;
      },
    });
  }

  previewLogo() {
    if (this.hotelLogoUrl) {
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write(`
        <html>
          <head><title>Hotel Logo Preview</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background: black;">
            <img src="${this.hotelLogoUrl}" alt="Company Logo" style="max-width:100%;max-height:100%;object-fit:contain;">
          </body>
        </html>
      `);
      }
    } else {
      this.alertService.error('Logo not uploaded yet.', this.options);
    }
  }

  removeLogo() {
    if (this.hotelLogoUrl) {
      this.hotelLogo = null;
      this.hotelLogoUrl = null;
      this.alertService.success('Logo removed.', this.options);
    } else {
      this.alertService.error('No logo to remove.', this.options);
    }
  }

  // Newly added for subscription
  getAllSubscriptionsAndSetGeneral() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: {}, pagination: true, paginationDetails: { limit: 0, pageSize: 10 } }
    };
    this.hotelenrollmenttabviewService.getAllSubscriptionDetails(requestBody).subscribe(
      (resp: any) => {
        if (resp?.result?.data?.length) {
          this.plans = resp.result.data;
          // reset maps
          this.propertyPricingMap = {};
          this.singleRoomFinalPrice = this.singleRoomFinalPrice || 0;
          // Build map and pick out SingleRoomPricing
          this.plans.forEach((plan: any) => {
            if (!plan || !plan.name) return;
            // store plan.finalPrice for its name
            this.propertyPricingMap[plan.name] = plan.finalPrice ?? 0;
            // capture SingleRoomPricing as fallback per-room price
            if (plan.name === 'SingleRoomPricing') {
              this.singleRoomFinalPrice = plan.finalPrice ?? this.singleRoomFinalPrice;
            }
          });
          // console.log('All property sizes final price:', this.propertyPricingMap);
          // console.log('SingleRoomFinalPrice (fallback):', this.singleRoomFinalPrice);
          // Ensure selectedPropertySize exists (default to first non-SingleRoomPricing plan if empty)
          // Set default selectedPropertySize if not set, and update form control
          // if (!this.selectedPropertySize) {
          //   const keys = Object.keys(this.propertyPricingMap).filter(k => k !== 'SingleRoomPricing');
          //   this.selectedPropertySize = keys.length ? keys[0] : (Object.keys(this.propertyPricingMap)[0] ?? '');
          //   this.customerProprtyDetailsForm.get('property_size')?.setValue(this.selectedPropertySize);
          // }
          // Set finalPrice and totalCost
          this.finalPrice = this.propertyPricingMap[this.selectedPropertySize] ?? this.singleRoomFinalPrice ?? 0;
          this.totalCost = this.getTotalCostForOption(this.selectedPropertySize);
        }
      },
      err => {
        this.alertService.error('Failed to load plans', this.options);
      }
    );
  }

  // onPropertySizeChange(option: string) {
  //   this.selectedPropertySize = option;
  //   // Prefer plan-specific finalPrice, else fallback to SingleRoomPricing
  //   this.finalPrice = this.propertyPricingMap[option] ?? this.singleRoomFinalPrice ?? 0;
  //   this.totalCost = this.getTotalCostForOption(option);
  //   console.log(`Changed to ${option}, finalPrice: ${this.finalPrice}, totalCost: ${this.totalCost}`);
  //   // Validate number of rooms against new selection
  //   this.validateNumberOfRooms();
  // }

  // onPropertySizeChange(option: string) {
  //   this.selectedPropertySize = option;
  //   this.customerProprtyDetailsForm.get('property_size')?.setValue(option);
  //   const numberOfRooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value || 0;
  //   this.finalPrice = this.propertyPricingMap[option] ?? this.singleRoomFinalPrice ?? 0;
  //   this.totalCost = this.finalPrice * numberOfRooms * 12;
  //   this.validateNumberOfRooms();
  // }

  // getTotalCostForOption(option: string): number {
  //   let roomCount = 50;
  //   switch (option) {
  //     case '01-50 Rooms': roomCount = 50; break;
  //     case '51-100 Rooms': roomCount = 100; break;
  //     case '101-150 Rooms': roomCount = 150; break;
  //     case '150 and above Rooms': roomCount = 200; break;
  //   }
  //   // Use property-specific price if available, otherwise use singleRoomFinalPrice fallback
  //   const pricePerRoom = this.propertyPricingMap[option] ?? this.singleRoomFinalPrice ?? 0;
  //   return pricePerRoom * roomCount * 12; // annual
  // }

  // Newly added for room no
  // allowOnlyNumbers(event: KeyboardEvent): void {
  //   const charCode = event.which ? event.which : event.keyCode;
  //   const input = event.target as HTMLInputElement;
  //   // Allow only digits 0-9
  //   if (charCode < 48 || charCode > 57) {
  //     event.preventDefault();
  //     return;
  //   }
  //   // Prevent 0 as the first character
  //   if (charCode === 48 && input.value.length === 0) {
  //     event.preventDefault();
  //   }
  // }


  // onRoomNumberChange() {
  //   this.validateNumberOfRooms();
  //   // Optionally, recalc totalCost based on entered rooms
  //   const numberOfRooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value;
  //   if (numberOfRooms > 0) {
  //     this.totalCost = (this.finalPrice ?? 0) * numberOfRooms * 12;
  //   }
  // }

  // onRoomNumberChange() {
  //   const numberOfRooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value;
  //   if (!numberOfRooms || numberOfRooms < 1) return;
  //   // Determine property size based on number of rooms
  //   if (numberOfRooms <= 50) {
  //     this.selectedPropertySize = '01-50 Rooms';
  //   } else if (numberOfRooms <= 100) {
  //     this.selectedPropertySize = '51-100 Rooms';
  //   } else if (numberOfRooms <= 150) {
  //     this.selectedPropertySize = '101-150 Rooms';
  //   } else {
  //     this.selectedPropertySize = '150 and above Rooms';
  //   }
  //   // Update form control to match selection
  //   this.customerProprtyDetailsForm.get('property_size')?.setValue(this.selectedPropertySize);
  //   // Set finalPrice and totalCost
  //   this.finalPrice = this.propertyPricingMap[this.selectedPropertySize] ?? this.singleRoomFinalPrice ?? 0;
  //   this.totalCost = this.finalPrice * numberOfRooms * 12; // annual
  //   // Validate against property size limit
  //   this.validateNumberOfRooms();
  // }


  // Function to validate number of rooms
  // validateNumberOfRooms() {
  //   const control = this.customerProprtyDetailsForm.get('number_of_rooms');
  //   const numberOfRooms = control?.value;
  //   const maxRooms = this.propertySizeLimits[this.selectedPropertySize] || Infinity;
  //   if (numberOfRooms > maxRooms) {
  //     control?.setErrors({ maxExceeded: true });
  //   } else {
  //     // remove maxExceeded error if it exists
  //     if (control?.errors) {
  //       delete control.errors['maxExceeded'];
  //       if (Object.keys(control.errors).length === 0) {
  //         control.setErrors(null);
  //       }
  //     }
  //   }
  // }

  // --- Update total cost and validate dynamically
  // updatePricingAndValidation(numberOfRooms?: number, selectedSize?: string) {
  //   const control = this.customerProprtyDetailsForm.get('number_of_rooms');
  //   const rooms = numberOfRooms ?? control?.value ?? 0;
  //   let propertySize = selectedSize ?? this.selectedPropertySize;
  //   console.log('propertySize', propertySize);
  //   // --- Auto-set property size if not selected and input exists
  //   if (!selectedSize && rooms > 0) {
  //     if (rooms <= 50) propertySize = '01-50 Rooms';
  //     else if (rooms <= 100) propertySize = '51-100 Rooms';
  //     else if (rooms <= 150) propertySize = '101-150 Rooms';
  //     else propertySize = '150 and above Rooms';
  //     // Update form control for property size when auto-set
  //     this.selectedPropertySize = propertySize;
  //     this.customerProprtyDetailsForm.get('property_size')?.setValue(propertySize, { emitEvent: false });
  //   }
  //   // --- Determine price per room (always from general plan)
  //   let pricePerRoom = this.propertyPricingMap[propertySize] ?? this.singleRoomFinalPrice;
  //   // Use subscription if exists AND matches selected property size
  //   if (
  //     this.customerdata?.subscription_detail &&
  //     this.customerdata.subscription_detail.name === propertySize &&
  //     this.customerdata.subscription_detail.finalPrice != null
  //   ) {
  //     pricePerRoom = this.customerdata.subscription_detail.finalPrice;
  //   }
  //   this.finalPrice = pricePerRoom;
  //   this.totalCost = rooms > 0 ? pricePerRoom * rooms * 12 : 0;
  //   // --- Validate number of rooms against selected property size limits
  //   const maxRooms = this.propertySizeLimits[propertySize] ?? Infinity;
  //   const errors: any = {};
  //   if (!rooms) errors.required = true;
  //   if (rooms < 1) errors.min = true;
  //   if (rooms > maxRooms) errors.maxExceeded = true;
  //   // Additional check: if user manually selected a property size that doesn't match room count
  //   if (selectedSize && rooms > 0) {
  //     let sizeMismatch = false;
  //     if (rooms <= 50 && selectedSize !== '01-50 Rooms') sizeMismatch = true;
  //     else if (rooms <= 100 && selectedSize !== '51-100 Rooms') sizeMismatch = true;
  //     else if (rooms <= 150 && selectedSize !== '101-150 Rooms') sizeMismatch = true;
  //     else if (rooms > 150 && selectedSize !== '150 and above Rooms') sizeMismatch = true;
  //     if (sizeMismatch) errors.sizeMismatch = true;
  //   }
  //   control?.setErrors(Object.keys(errors).length > 0 ? errors : null);
  // }

  // // Input events
  // onRoomNumberChange() {
  //   const rooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value;
  //   this.updatePricingAndValidation(rooms, undefined);
  //   // const rooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value ?? 0;
  //   // const selectedSize = this.customerProprtyDetailsForm.get('property_size')?.value;
  //   // this.updatePricingAndValidation(rooms, selectedSize)
  // }

  // onPropertySizeChange(option: string) {
  //   // this.updatePricingAndValidation(undefined, option);
  //   const rooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value ?? 0;
  //   this.updatePricingAndValidation(rooms, option)
  // }

  // updatePricingAndValidation(numberOfRooms?: number, selectedSize?: string) {
  //   const control = this.customerProprtyDetailsForm.get('number_of_rooms');
  //   const rooms = numberOfRooms ?? control?.value ?? 0;
  //   let propertySize = selectedSize ?? this.selectedPropertySize;
  //
  //   // --- Auto-set property size only if user hasn't manually selected one
  //   if (!selectedSize && rooms > 0) {
  //     if (rooms <= 50) propertySize = '01-50 Rooms';
  //     else if (rooms <= 100) propertySize = '51-100 Rooms';
  //     else if (rooms <= 150) propertySize = '101-150 Rooms';
  //     else propertySize = '150 and above Rooms';
  //     this.selectedPropertySize = propertySize;
  //     this.customerProprtyDetailsForm.get('property_size')?.setValue(propertySize, { emitEvent: false });
  //   }
  //
  //   // --- Determine price per room (from general pricing map)
  //   const pricePerRoom = this.propertyPricingMap[propertySize] ?? this.singleRoomFinalPrice;
  //   this.finalPrice = pricePerRoom;
  //   this.totalCost = rooms > 0 ? pricePerRoom * rooms * 12 : 0;
  //
  //   // --- Validate number of rooms against the min/max range for the selected property size band
  //   const range = this.propertySizeRanges[propertySize];
  //   const errors: any = {};
  //
  //   if (!rooms && rooms !== 0) {
  //     errors.required = true;
  //   } else if (rooms < 1) {
  //     errors.min = true;
  //   } else if (range) {
  //     if (rooms < range.min) {
  //       // Room count too low for selected property size
  //       errors.belowMin = true;
  //     } else if (range.max !== Infinity && rooms > range.max) {
  //       // Room count too high for selected property size
  //       errors.maxExceeded = true;
  //     }
  //   }
  //
  //   control?.setErrors(Object.keys(errors).length > 0 ? errors : null);
  // }

  updatePricingAndValidation(numberOfRooms?: number, selectedSize?: string) {
    const control = this.customerProprtyDetailsForm.get('number_of_rooms');
    const rooms = numberOfRooms ?? control?.value ?? 0;
    const propertySize = selectedSize ?? this.selectedPropertySize;

    // --- Determine price per room and update cost display
    const pricePerRoom = this.propertyPricingMap[propertySize] ?? this.singleRoomFinalPrice;
    this.finalPrice = pricePerRoom;
    this.totalCost = rooms > 0 ? pricePerRoom * rooms * 12 : 0;

    // --- Validate: rooms must fall within the min/max band of the selected property size
    const range = this.propertySizeRanges[propertySize];
    const errors: any = {};

    if (!rooms || rooms === '') {
      errors['required'] = true;
    } else if (Number(rooms) < 1) {
      errors['min'] = true;
    } else if (range) {
      if (Number(rooms) < range.min) {
        errors['belowMin'] = true;
      } else if (range.max !== Infinity && Number(rooms) > range.max) {
        errors['maxExceeded'] = true;
      }
    }

    control?.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  // Triggered when number input changes
  onRoomNumberChange() {
    const rooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value;
    this.updatePricingAndValidation(rooms, undefined);
  }

  // Triggered when property size radio is changed
  onPropertySizeChange(option: string) {
    this.selectedPropertySize = option;
    // const rooms = this.customerProprtyDetailsForm.get('number_of_rooms')?.value ?? 0;
    const control = this.customerProprtyDetailsForm.get('number_of_rooms');
    let rooms = control?.value ?? 0;
    // Mark control as touched so errors appear immediately
    control?.markAsTouched();
    this.updatePricingAndValidation(rooms, option);
  }

  // Numeric only input
  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    const input = event.target as HTMLInputElement;

    if (charCode < 48 || charCode > 57) event.preventDefault();
    if (charCode === 48 && input.value.length === 0) event.preventDefault();
  }

  // Get total cost for radio labels
  getTotalCostForOption(option: string, rooms?: number): number {
    const roomCount = rooms ?? (() => {
      switch (option) {
        case '01-50 Rooms': return 50;
        case '51-100 Rooms': return 100;
        case '101-150 Rooms': return 150;
        case '150 and above Rooms': return 200;
        default: return 50;
      }
    })();
    // console.log('Customer data for subscription: ', this.customerdata);
    let pricePerRoom = this.singleRoomFinalPrice;
    // if (this.customerdata?.subscription_detail?.name === option &&
    //   this.customerdata.subscription_detail.finalPrice != null) {
    //   console.log('Customer data for subscription(Price per room): ', this.customerdata.subscription_detail.finalPrice);
    //   pricePerRoom = this.customerdata.subscription_detail.finalPrice;
    //   console.log('Price per room based on subscription: ', pricePerRoom);
    // } else if 
    // (this.propertyPricingMap[option] != null) {
    pricePerRoom = this.propertyPricingMap[option];
    // }
    // console.log('Total amount: ', pricePerRoom * roomCount * 12);
    return pricePerRoom * roomCount * 12;
  }

  // getHierarchyById(customerId: any): Promise<void> {
  getHierarchyById(memberId: any): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // customer_id: customerId
            member_id: this.memberId
          }
        }
      };
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.GETBYID_HIERARCHY).subscribe(
        (resp: any) => {
          if (resp) {
            this.hierarchyData = resp.result.data[0];
            resolve();
          }
        },
        (err: any) => {
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

  // Newly added for documents upload
  onCompanyStatusChange(status: string) {
    if (!status) {
      return;
    }
    const templates = this.companyStatusDocuments[status] || [];
    // Only restore previously saved URLs when switching back to the EXACT
    // option that was saved on the server. For any other option, all docs
    // start with an empty URL so nothing bleeds across options.
    const isSameAsOriginal = status === this.originalCompanyStatus;
    const currentMap = new Map<string, string>();
    if (isSameAsOriginal) {
      this.originalUploadedDocuments.forEach((doc: any) => {
        if (doc && doc.document_name) {
          currentMap.set(doc.document_name, doc.document_url || '');
        }
      });
    }
    this.uploadedDocumentsApi = templates.map(t => ({
      document_name: t.name,
      document_url: currentMap.get(t.name) || ''
    }));
    // Keep payload array in sync with the currently selected status
    this.uploaded_documents = [...this.uploadedDocumentsApi];
    // Clear locally selected files so documents uploaded under one option
    // are not shown as "Uploaded" in a different option's document list.
    this.uploadedDocuments = {};
  }

  // Allow only alphabets for contact person (no numbers)
  onlyAllowAlphabets(event: KeyboardEvent) {
    const charCode = event.key;
    // Block digits 0-9
    if (/^[0-9]$/.test(charCode)) {
      event.preventDefault();
    }
  }

  handleAlphabetsPaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (/[0-9]/.test(pasted)) {
      event.preventDefault(); // Block strings with numbers
    }
  }

  // Allow alphanumeric characters, spaces, hyphens, and dots for tax fields
  onlyAllowAlphaNumeric(event: KeyboardEvent) {
    const charCode = event.key;
    // Allow letters, numbers, spaces, hyphens, and dots
    if (!/^[a-zA-Z0-9\s.\-]$/.test(charCode)) {
      event.preventDefault();
    }
  }

  handleAlphaNumericPaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^[a-zA-Z0-9\s.\-]*$/.test(pasted)) {
      event.preventDefault(); // Block strings with other special characters
    }
  }



}


