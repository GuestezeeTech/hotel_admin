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
import { CustomValidators } from '../validators';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../app.config';
import { CheckoutApiService } from '../checkout.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';

// Newly added
import { HttpHeaders } from '@angular/common/http';
import { ProfileService } from '../../profile/profile.service';

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
  countryDropdownList: any;
  customerId: string | null = null;
  orderData: any;
  memberId: Number | null = null;
  isOtherBrand = false;
  customerdata: any = {};
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  states: any;
  statesDropdownList: any;
  upsertData: any;
  // Newly added
  @Output() continue = new EventEmitter<void>();
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

  constructor(
    private authTokenService: AuthTokenService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private checkoutApiService: CheckoutApiService,
    private localStorageService: LocalStorageService,
    // Newly added
    private profileService: ProfileService
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
    this.hotelId = Number(this.localStorageService.get('UserId'));
    //console.log('Hotels ID:', this.hotelId);
    this.executeFunctions();
    this.customerProprtyDetailsForm = new FormGroup({
      hotel_name: new FormControl('', Validators.required),
      contact_person: new FormControl('', Validators.required),
      designation: new FormControl('', Validators.required),
      primary_phone_number: new FormControl('', [Validators.required, Validators.pattern(/^[0-9\s\-+()]+$/)]),
      secondary_phone_number: new FormControl('', [Validators.required, Validators.pattern(/^[0-9\s\-+()]+$/)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      brand: new FormControl('', Validators.required),

      property_doorno: new FormControl('', Validators.required),
      property_address: new FormControl('', Validators.required),
      property_city: new FormControl('', Validators.required),
      property_state: new FormControl('', Validators.required),
      property_location: new FormControl('', [Validators.required,]),
      property_country: new FormControl('', Validators.required),
      property_pincode: new FormControl('', [Validators.required, CustomValidators.pincodeValidator]),
      property_pan: new FormControl('', [Validators.required, CustomValidators.panValidator]),
      property_gst: new FormControl('', [Validators.required, CustomValidators.gstValidator]),
      property_size: new FormControl('', Validators.required),
      // Newly added
      company_status: new FormControl('', Validators.required),
      // other_brand_name: new FormControl('', Validators.required),

      // Newly added for other brand name
      other_brand_name: new FormControl('')

      // uploaded_documents: new FormControl('', Validators.required),
    });

    if (this.hotelId != 0) {
      this.getCustomerById();
    }
    // this.getCountries();
    this.getCustomerDataAfterConfirmation();
  }

  // Newly added for disabling form on payment done
  ngOnChanges(changes: SimpleChanges): void {
    // Check if paymentDone input has changed - changes(contains the previous and current value)
    if (changes['paymentDone'] && this.paymentDone) {
      this.customerProprtyDetailsForm.disable();
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
      this.hotelId = Number(this.customerId)
      this.executeFunctions().then(() => {
        this.getOrderData(Number(this.customerId))
      });

    }

    this.countryDropdownList = [{ "country": "Afghanistan", "code": "", "flag": "" },
    { "country": "Åland (Finland)", "code": "", "flag": "" },
    { "country": "Albania", "code": "", "flag": "" },
    { "country": "Algeria", "code": "", "flag": "" },
    { "country": "American Samoa (US)", "code": "", "flag": "" },
    { "country": "Andorra", "code": "", "flag": "" },
    { "country": "Angola", "code": "", "flag": "" },
    { "country": "Anguilla (BOT)", "code": "", "flag": "" },
    { "country": "Antigua and Barbuda", "code": "", "flag": "" },
    { "country": "Argentina", "code": "", "flag": "" },
    { "country": "Armenia", "code": "", "flag": "" },
    { "country": "Artsakh", "code": "", "flag": "" },
    { "country": "Aruba (Netherlands)", "code": "", "flag": "" },
    { "country": "Australia", "code": "", "flag": "" },
    { "country": "Austria", "code": "", "flag": "" },
    { "country": "Azerbaijan", "code": "", "flag": "" },
    { "country": "Bahamas", "code": "", "flag": "" },
    { "country": "Bahrain", "code": "", "flag": "" },
    { "country": "Bangladesh", "code": "", "flag": "" },
    { "country": "Barbados", "code": "", "flag": "" },
    { "country": "Belarus", "code": "", "flag": "" },
    { "country": "Belgium", "code": "", "flag": "" },
    { "country": "Belize", "code": "", "flag": "" },
    { "country": "Benin", "code": "", "flag": "" },
    { "country": "Bermuda (BOT)", "code": "", "flag": "" },
    { "country": "Bhutan", "code": "", "flag": "" },
    { "country": "Bolivia", "code": "", "flag": "" },
    { "country": "Bonaire (Netherlands)", "code": "", "flag": "" },
    { "country": "Bosnia and Herzegovina", "code": "", "flag": "" },
    { "country": "Botswana", "code": "", "flag": "" },
    { "country": "Brazil", "code": "", "flag": "" },
    { "country": "British Virgin Islands (BOT)", "code": "", "flag": "" },
    { "country": "Brunei", "code": "", "flag": "" },
    { "country": "Bulgaria", "code": "", "flag": "" },
    { "country": "Burkina Faso", "code": "", "flag": "" },
    { "country": "Burundi", "code": "", "flag": "" },
    { "country": "Cambodia", "code": "", "flag": "" },
    { "country": "Cameroon", "code": "", "flag": "" },
    { "country": "Canada", "code": "", "flag": "" },
    { "country": "Cape Verde", "code": "", "flag": "" },
    { "country": "Cayman Islands (BOT)", "code": "", "flag": "" },
    { "country": "Central African Republic", "code": "", "flag": "" },
    { "country": "Chad", "code": "", "flag": "" },
    { "country": "Chile", "code": "", "flag": "" },
    { "country": "China", "code": "", "flag": "" },
    { "country": "Christmas Island (Australia)", "code": "", "flag": "" },
    { "country": "Cocos (Keeling) Islands (Australia)", "code": "", "flag": "" },
    { "country": "Colombia", "code": "", "flag": "" },
    { "country": "Comoros", "code": "", "flag": "" },
    { "country": "Congo", "code": "", "flag": "" },
    { "country": "Cook Islands", "code": "", "flag": "" },
    { "country": "Costa Rica", "code": "", "flag": "" },
    { "country": "Croatia", "code": "", "flag": "" },
    { "country": "Cuba", "code": "", "flag": "" },
    { "country": "Curaçao (Netherlands)", "code": "", "flag": "" },
    { "country": "Cyprus", "code": "", "flag": "" },
    { "country": "Czech Republic", "code": "", "flag": "" },
    { "country": "Denmark", "code": "", "flag": "" },
    { "country": "Djibouti", "code": "", "flag": "" },
    { "country": "Dominica", "code": "", "flag": "" },
    { "country": "Dominican Republic", "code": "", "flag": "" },
    { "country": "DR Congo", "code": "", "flag": "" },
    { "country": "East Timor", "code": "", "flag": "" },
    { "country": "Ecuador", "code": "", "flag": "" },
    { "country": "Egypt", "code": "", "flag": "" },
    { "country": "El Salvador", "code": "", "flag": "" },
    { "country": "Equatorial Guinea", "code": "", "flag": "" },
    { "country": "Eritrea", "code": "", "flag": "" },
    { "country": "Estonia", "code": "", "flag": "" },
    { "country": "Eswatini", "code": "", "flag": "" },
    { "country": "Ethiopia", "code": "", "flag": "" },
    { "country": "Falkland Islands (BOT)", "code": "", "flag": "" },
    { "country": "Faroe Islands (Denmark)", "code": "", "flag": "" },
    { "country": "Fiji", "code": "", "flag": "" },
    { "country": "Finland", "code": "", "flag": "" },
    { "country": "France", "code": "", "flag": "" },
    { "country": "French Guiana (France)", "code": "", "flag": "" },
    { "country": "French Polynesia (France)", "code": "", "flag": "" },
    { "country": "Gabon", "code": "", "flag": "" },
    { "country": "Gambia", "code": "", "flag": "" },
    { "country": "Georgia", "code": "", "flag": "" },
    { "country": "Germany", "code": "", "flag": "" },
    { "country": "Ghana", "code": "", "flag": "" },
    { "country": "Gibraltar (BOT)", "code": "", "flag": "" },
    { "country": "Greece", "code": "", "flag": "" },
    { "country": "Greenland (Denmark)", "code": "", "flag": "" },
    { "country": "Grenada", "code": "", "flag": "" },
    { "country": "Guadeloupe (France)", "code": "", "flag": "" },
    { "country": "Guam (US)", "code": "", "flag": "" },
    { "country": "Guatemala", "code": "", "flag": "" },
    { "country": "Guernsey (Crown Dependency)", "code": "", "flag": "" },
    { "country": "Guinea", "code": "", "flag": "" },
    { "country": "Guinea-Bissau", "code": "", "flag": "" },
    { "country": "Guyana", "code": "", "flag": "" },
    { "country": "Haiti", "code": "", "flag": "" },
    { "country": "Honduras", "code": "", "flag": "" },
    { "country": "Hong Kong", "code": "", "flag": "" },
    { "country": "Hungary", "code": "", "flag": "" },
    { "country": "Iceland", "code": "", "flag": "" },
    { "country": "India", "code": "", "flag": "" },
    { "country": "Indonesia", "code": "", "flag": "" },
    { "country": "Iran", "code": "", "flag": "" },
    { "country": "Iraq", "code": "", "flag": "" },
    { "country": "Ireland", "code": "", "flag": "" },
    { "country": "Isle of Man (Crown Dependency)", "code": "", "flag": "" },
    { "country": "Israel", "code": "", "flag": "" },
    { "country": "Italy", "code": "", "flag": "" },
    { "country": "Ivory Coast", "code": "", "flag": "" },
    { "country": "Jamaica", "code": "", "flag": "" },
    { "country": "Japan", "code": "", "flag": "" },
    { "country": "Jersey (Crown Dependency)", "code": "", "flag": "" },
    { "country": "Jordan", "code": "", "flag": "" },
    { "country": "Kazakhstan", "code": "", "flag": "" },
    { "country": "Kenya", "code": "", "flag": "" },
    { "country": "Kiribati", "code": "", "flag": "" },
    { "country": "Kosovo", "code": "", "flag": "" },
    { "country": "Kuwait", "code": "", "flag": "" },
    { "country": "Kyrgyzstan", "code": "", "flag": "" },
    { "country": "Laos", "code": "", "flag": "" },
    { "country": "Latvia", "code": "", "flag": "" },
    { "country": "Lebanon", "code": "", "flag": "" },
    { "country": "Lesotho", "code": "", "flag": "" },
    { "country": "Liberia", "code": "", "flag": "" },
    { "country": "Libya", "code": "", "flag": "" },
    { "country": "Liechtenstein", "code": "", "flag": "" },
    { "country": "Lithuania", "code": "", "flag": "" },
    { "country": "Luxembourg", "code": "", "flag": "" },
    { "country": "Macau", "code": "", "flag": "" },
    { "country": "Madagascar", "code": "", "flag": "" },
    { "country": "Malawi", "code": "", "flag": "" },
    { "country": "Malaysia", "code": "", "flag": "" },
    { "country": "Maldives", "code": "", "flag": "" },
    { "country": "Mali", "code": "", "flag": "" },
    { "country": "Malta", "code": "", "flag": "" },
    { "country": "Marshall Islands", "code": "", "flag": "" },
    { "country": "Martinique (France)", "code": "", "flag": "" },
    { "country": "Mauritania", "code": "", "flag": "" },
    { "country": "Mauritius", "code": "", "flag": "" },
    { "country": "Mayotte (France)", "code": "", "flag": "" },
    { "country": "Mexico", "code": "", "flag": "" },
    { "country": "Micronesia", "code": "", "flag": "" },
    { "country": "Moldova", "code": "", "flag": "" },
    { "country": "Monaco", "code": "", "flag": "" },
    { "country": "Mongolia", "code": "", "flag": "" },
    { "country": "Montenegro", "code": "", "flag": "" },
    { "country": "Montserrat (BOT)", "code": "", "flag": "" },
    { "country": "Morocco", "code": "", "flag": "" },
    { "country": "Mozambique", "code": "", "flag": "" },
    { "country": "Myanmar", "code": "", "flag": "" },
    { "country": "Namibia", "code": "", "flag": "" },
    { "country": "Nauru", "code": "", "flag": "" },
    { "country": "Nepal", "code": "", "flag": "" },
    { "country": "Netherlands", "code": "", "flag": "" },
    { "country": "New Caledonia (France)", "code": "", "flag": "" },
    { "country": "New Zealand", "code": "", "flag": "" },
    { "country": "Nicaragua", "code": "", "flag": "" },
    { "country": "Niger", "code": "", "flag": "" },
    { "country": "Nigeria", "code": "", "flag": "" },
    { "country": "Niue", "code": "", "flag": "" },
    { "country": "Norfolk Island (Australia)", "code": "", "flag": "" },
    { "country": "North Korea", "code": "", "flag": "" },
    { "country": "North Macedonia", "code": "", "flag": "" },
    { "country": "Northern Cyprus", "code": "", "flag": "" },
    { "country": "Northern Mariana Islands (US)", "code": "", "flag": "" },
    { "country": "Norway", "code": "", "flag": "" },
    { "country": "Oman", "code": "", "flag": "" },
    { "country": "Pakistan", "code": "", "flag": "" },
    { "country": "Palau", "code": "", "flag": "" },
    { "country": "Palestine", "code": "", "flag": "" },
    { "country": "Panama", "code": "", "flag": "" },
    { "country": "Papua New Guinea", "code": "", "flag": "" },
    { "country": "Paraguay", "code": "", "flag": "" },
    { "country": "Peru", "code": "", "flag": "" },
    { "country": "Philippines", "code": "", "flag": "" },
    { "country": "Pitcairn Islands (BOT)", "code": "", "flag": "" },
    { "country": "Poland", "code": "", "flag": "" },
    { "country": "Portugal", "code": "", "flag": "" },
    { "country": "Puerto Rico (US)", "code": "", "flag": "" },
    { "country": "Qatar", "code": "", "flag": "" },
    { "country": "Réunion (France)", "code": "", "flag": "" },
    { "country": "Romania", "code": "", "flag": "" },
    { "country": "Russia", "code": "", "flag": "" },
    { "country": "Rwanda", "code": "", "flag": "" },
    { "country": "Saba (Netherlands)", "code": "", "flag": "" },
    { "country": "Saint Barthélemy (France)", "code": "", "flag": "" },
    { "country": "Saint Helena, Ascension and Tristan da Cunha (BOT)", "code": "", "flag": "" },
    { "country": "Saint Kitts and Nevis", "code": "", "flag": "" },
    { "country": "Saint Lucia", "code": "", "flag": "" },
    { "country": "Saint Martin (France)", "code": "", "flag": "" },
    { "country": "Saint Pierre and Miquelon (France)", "code": "", "flag": "" },
    { "country": "Saint Vincent and the Grenadines", "code": "", "flag": "" },
    { "country": "Samoa", "code": "", "flag": "" },
    { "country": "San Marino", "code": "", "flag": "" },
    { "country": "São Tomé and Príncipe", "code": "", "flag": "" },
    { "country": "Saudi Arabia", "code": "", "flag": "" },
    { "country": "Senegal", "code": "", "flag": "" },
    { "country": "Serbia", "code": "", "flag": "" },
    { "country": "Seychelles", "code": "", "flag": "" },
    { "country": "Sierra Leone", "code": "", "flag": "" },
    { "country": "Singapore", "code": "", "flag": "" },
    { "country": "Sint Eustatius (Netherlands)", "code": "", "flag": "" },
    { "country": "Sint Maarten (Netherlands)", "code": "", "flag": "" },
    { "country": "Slovakia", "code": "", "flag": "" },
    { "country": "Slovenia", "code": "", "flag": "" },
    { "country": "Solomon Islands", "code": "", "flag": "" },
    { "country": "Somalia", "code": "", "flag": "" },
    { "country": "South Africa", "code": "", "flag": "" },
    { "country": "South Korea", "code": "", "flag": "" },
    { "country": "South Sudan", "code": "", "flag": "" },
    { "country": "Spain", "code": "", "flag": "" },
    { "country": "Sri Lanka", "code": "", "flag": "" },
    { "country": "Sudan", "code": "", "flag": "" },
    { "country": "Suricountry", "code": "", "flag": "" },
    { "country": "Svalbard and Jan Mayen (Norway)", "code": "", "flag": "" },
    { "country": "Sweden", "code": "", "flag": "" },
    { "country": "Switzerland", "code": "", "flag": "" },
    { "country": "Syria", "code": "", "flag": "" },
    { "country": "Taiwan", "code": "", "flag": "" },
    { "country": "Tajikistan", "code": "", "flag": "" },
    { "country": "Tanzania", "code": "", "flag": "" },
    { "country": "Thailand", "code": "", "flag": "" },
    { "country": "Togo", "code": "", "flag": "" },
    { "country": "Tokelau (NZ)", "code": "", "flag": "" },
    { "country": "Tonga", "code": "", "flag": "" },
    { "country": "Transnistria", "code": "", "flag": "" },
    { "country": "Trinidad and Tobago", "code": "", "flag": "" },
    { "country": "Tunisia", "code": "", "flag": "" },
    { "country": "Turkey", "code": "", "flag": "" },
    { "country": "Turkmenistan", "code": "", "flag": "" },
    { "country": "Turks and Caicos Islands (BOT)", "code": "", "flag": "" },
    { "country": "Tuvalu", "code": "", "flag": "" },
    { "country": "U.S. Virgin Islands (US)", "code": "", "flag": "" },
    { "country": "Uganda", "code": "", "flag": "" },
    { "country": "Ukraine", "code": "", "flag": "" },
    { "country": "United Arab Emirates", "code": "", "flag": "" },
    { "country": "United Kingdom", "code": "", "flag": "" },
    { "country": "United States", "code": "", "flag": "" },
    { "country": "Uruguay", "code": "", "flag": "" },
    { "country": "Uzbekistan", "code": "", "flag": "" },
    { "country": "Vanuatu", "code": "", "flag": "" },
    { "country": "Vatican City", "code": "", "flag": "" },
    { "country": "Venezuela", "code": "", "flag": "" },
    { "country": "Vietnam", "code": "", "flag": "" },
    { "country": "Wallis and Futuna (France)", "code": "", "flag": "" },
    { "country": "Western Sahara", "code": "", "flag": "" },
    { "country": "Yemen", "code": "", "flag": "" }]



    this.statesDropdownList = [
      { "state": "Andhra Pradesh", "code": "", "flag": "" },
      { "state": "Arunachal Pradesh", "code": "", "flag": "" },
      { "state": "Assam", "code": "", "flag": "" },
      { "state": "Bihar", "code": "", "flag": "" },
      { "state": "Chhattisgarh", "code": "", "flag": "" },
      { "state": "Goa", "code": "", "flag": "" },
      { "state": "Gujarat", "code": "", "flag": "" },
      { "state": "Haryana", "code": "", "flag": "" },
      { "state": "Himachal Pradesh", "code": "", "flag": "" },
      { "state": "Jharkhand", "code": "", "flag": "" },
      { "state": "Karnataka", "code": "", "flag": "" },
      { "state": "Kerala", "code": "", "flag": "" },
      { "state": "Madhya Pradesh", "code": "", "flag": "" },
      { "state": "Maharashtra", "code": "", "flag": "" },
      { "state": "Manipur", "code": "", "flag": "" },
      { "state": "Meghalaya", "code": "", "flag": "" },
      { "state": "Mizoram", "code": "", "flag": "" },
      { "state": "Nagaland", "code": "", "flag": "" },
      { "state": "Odisha", "code": "", "flag": "" },
      { "state": "Punjab", "code": "", "flag": "" },
      { "state": "Rajasthan", "code": "", "flag": "" },
      { "state": "Sikkim", "code": "", "flag": "" },
      { "state": "Tamil Nadu", "code": "", "flag": "" },
      { "state": "Telangana", "code": "", "flag": "" },
      { "state": "Tripura", "code": "", "flag": "" },
      { "state": "Uttar Pradesh", "code": "", "flag": "" },
      { "state": "Uttarakhand", "code": "", "flag": "" },
      { "state": "West Bengal", "code": "", "flag": "" }
    ]
  }

  onSubmit() {
    if (this.customerProprtyDetailsForm.valid) {
      //console.log("Form Submitted");
      this.customerUpdate();
    } else {
      //console.log("Form is invalid!", this.customerProprtyDetailsForm);
    }
  }

  async customerUpdate() {
    delete this.customerdata._id;
    //console.log(this.customerdata._id, this.customerdata, "test check ")
    let tempCustomerObject = {
      "contact_details": {
        hotel_name: this.customerProprtyDetailsForm.value.hotel_name,
        contact_person: this.customerProprtyDetailsForm.value.contact_person,
        designation: this.customerProprtyDetailsForm.value.designation,
        primary_phone_number: this.customerProprtyDetailsForm.value.primary_phone_number,
        secondary_phone_number: this.customerProprtyDetailsForm.value.secondary_phone_number,
        email: this.customerProprtyDetailsForm.value.email,
        brand: this.customerProprtyDetailsForm.value.brand,
        other_brand_name: this.customerProprtyDetailsForm.value.other_brand_name,
      },
      "property_address": {
        property_doorno: this.customerProprtyDetailsForm.value.property_doorno,
        property_address: this.customerProprtyDetailsForm.value.property_address,
        property_city: this.customerProprtyDetailsForm.value.property_city,
        property_state: this.customerProprtyDetailsForm.value.property_state,
        property_location: this.customerProprtyDetailsForm.value.property_location,
        property_country: this.customerProprtyDetailsForm.value.property_country,
        property_pincode: this.customerProprtyDetailsForm.value.property_pincode,
        property_pan: this.customerProprtyDetailsForm.value.property_pan,
        property_gst: this.customerProprtyDetailsForm.value.property_gst,
        property_size: this.customerProprtyDetailsForm.value.property_size,
      },
      // Newly added
      "kyc_documents": {
        company_status: this.customerProprtyDetailsForm.value.company_status,
        uploaded_documents: this.uploaded_documents
      },

    }
    this.customerdata["property_details"] = tempCustomerObject;
    this.customerdata["name"] = this.customerProprtyDetailsForm.value.hotel_name;
    this.customerdata["is_property_details_exists"] = true;

    //  Password key reset value
    this.customerdata["password"] = this.localStorageService.get('Password');
    //console.log(tempCustomerObject)
    //console.log(this.customerdata, " this.customerdata")
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        customer_creation: this.customerdata
      },
      extras: {
        find: {
          id: this.hotelId
        }
      }
    }
    //console.log("123")
    this.hotelenrollmenttabviewService.updateCustomer(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // //console.log(resp);
            this.hotelenrollmenttabviewService.clearAdminFormEvent();
            //console.log("alerttttt")
            this.alertService.success(resp.message, this.options);
            this.executeFunctions(); //For storing all values am calling this function
            this.onContinue();
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
  }

  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            id: this.hotelId
          }
        }
      };

      this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            if (resp.result.data[0]) {
              if (resp?.result?.data[0]?.property_details?.kyc_documents?.uploaded_documents) {
                this.uploadedDocuments = resp?.result?.data[0]?.property_details?.kyc_documents?.uploaded_documents;
                this.uploaded_documents = resp?.result?.data[0]?.property_details?.kyc_documents?.uploaded_documents;
                this.uploadedDocumentsApi = resp?.result?.data[0]?.property_details?.kyc_documents?.uploaded_documents;
              }

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

  setFormValues() {
    if (
      this.customerdata?.property_details?.contact_details &&
      this.customerdata?.property_details?.property_address &&
      this.customerdata?.property_details?.kyc_documents
    ) {
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

      this.customerProprtyDetailsForm.patchValue({
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
        property_pan: this.customerdata.property_details.property_address?.property_pan,
        property_gst: this.customerdata.property_details.property_address?.property_gst,
        property_size: this.customerdata.property_details.property_address.property_size,

        // Newly added
        company_status: this.customerdata.property_details?.kyc_documents?.company_status,
        uploaded_documents: this.customerdata.property_details?.kyc_documents?.uploaded_documents
      });
      this.uploadedDocumentsApi = this.customerdata.property_details?.kyc_documents?.uploaded_documents;
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
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": {
  //         "countryid": country_id
  //       },
  //       "pagination": false,
  //       "paginationDetails": {
  //         "limit": 0,
  //         "pageSize": 2
  //       },
  //       "sorting": true,
  //       "sortingDetails": {
  //         "sortfield": "",
  //         "sortorder": -1
  //       }
  //     }
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
  //     else {
  //       this.alertService.error('Something bad happened while loading customer group. Please try again!', this.options);
  //     }
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

  getOrderData(customer_id: number) {
    //console.log("111")
    let formatJson = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_id: Number(customer_id),

          status: "Confirmed"

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
      const currentDoc = this.nextPendingDocument;
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

          }
        })

        // this.alertService.success(`${currentDoc} uploaded successfully`, this.options);
        // If this upload completed the list
        if (!this.nextPendingDocument) {
          setTimeout(() => {
            this.alertService.success('All required documents uploaded successfully.', this.options);
          }, 200); // Slight delay ensures nextPendingDocument reflects new state
        }
      }
      // Reset input to allow uploading same file again
      fileInput.value = '';
    }
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
      const currentDoc = this.nextApiPendingDocument;
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
          }
        })

        // this.alertService.success(`${currentDoc} uploaded successfully`, this.options);
        // If this upload completed the list
        if (!this.nextPendingDocument) {
          setTimeout(() => {
            this.alertService.success('All required documents uploaded successfully.', this.options);
          }, 200); // Slight delay ensures nextPendingDocument reflects new state
        }
      }
      // Reset input to allow uploading same file again
      fileInput.value = '';
    }
  }

  removeDocument(docName: string) {
    if (this.uploadedDocuments[docName]) {
      delete this.uploadedDocuments[docName];
      this.uploaded_documents = this.uploaded_documents.filter(doc => doc.document_name !== docName);
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
    this.isOtherBrand = selectedBrand === 'Others';
    const otherBrandControl = this.customerProprtyDetailsForm.controls['other_brand_name'];
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

  // Allow only numbers for pincode
  onlyAllowSixDigits(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    // Blocks non-digit characters
    if (event.key < '0' || event.key > '9') {
      event.preventDefault();
      return;
    }
    // Prevent typing more than 6 digits
    if (input.value.length >= 6) {
      event.preventDefault();
    }
  }

  handlePaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^\d{1,6}$/.test(pasted)) {
      event.preventDefault(); // Block non-numeric or >6-digit pastes
    }
  }
}


