import { USER_ID } from './../../app.config';
import { ProfileService } from './../../profile/profile.service';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { Component, OnInit, Output, EventEmitter, ViewChild, Input } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { CustomValidators } from '../validators';
import { DOMAIN_NAME } from '../../app.config';
import { NgForm } from '@angular/forms';
import { OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-office-details',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, AlertsComponent],
  templateUrl: './office-details.component.html',
  styleUrl: './office-details.component.scss'
})

export class OfficeDetailsComponent implements OnInit, OnChanges {
  customerForm: FormGroup = new FormGroup({});
  hotelId: Number | null = null;
  countryDropdownList: any;
  states: any;
  statesDropdownList: any;
  customerdata: any = {};
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isExitModalOpen: boolean = false;
  // Newly added
  @Output() continue = new EventEmitter<void>();
  // Newly added for disabling form on payment done
  @Input() paymentDone!: boolean;
  customerType: any;

  constructor(
    private authTokenService: AuthTokenService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private localService: LocalStorageService,
    private router: Router,
    private profileService: ProfileService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.customerType = this.localService.get('CustomerType');
    ////console.log(this.continue,"jj")
    this.customerForm = new FormGroup({
      first_name: new FormControl('', Validators.required),
      last_name: new FormControl('', Validators.required),
      designation: new FormControl('', Validators.required),
      phone_number: new FormControl('', [Validators.required, Validators.pattern(/^[0-9\s\-+()]+$/)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      gender: new FormControl('', Validators.required),

      sec_first_name: new FormControl('', Validators.required),
      sec_last_name: new FormControl('', Validators.required),
      sec_designation: new FormControl('', Validators.required),
      sec_phone_number: new FormControl('', [Validators.required, Validators.pattern(/^[0-9\s\-+()]+$/)]),
      sec_email: new FormControl('', [Validators.required, Validators.email]),
      sec_gender: new FormControl('', Validators.required),
      company_name: new FormControl('', Validators.required),
      door_no: new FormControl('', Validators.required),
      address: new FormControl('', Validators.required),
      city: new FormControl('', Validators.required),
      state: new FormControl('', Validators.required),
      country: new FormControl('', Validators.required),
      pincode: new FormControl('', [Validators.required, CustomValidators.pincodeValidator]),
      pan_no: new FormControl('', [Validators.required, CustomValidators.panValidator]),
      gst_no: new FormControl('', [Validators.required, CustomValidators.gstValidator]),

      is_review_emails: new FormControl(false),
      is_password_reset_next_login: new FormControl(false),
      store_credit: new FormControl(0),
      notes: new FormControl(''),
      has_also_subscribed: new FormControl(false),
      subscription_source: new FormControl(''),
      language_code: new FormControl(''),
      token: new FormControl(''),
      is_safe: new FormControl(false),
      is_active: new FormControl(false)
    });
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
    this.hotelId = Number(this.localService.get('UserId'));
    ////console.log('Hotel ID:', this.hotelId);
    if (this.hotelId != 0) {
      this.executeFunctions();
      // this.getCountries();
    }
    else {
      // this.getCountries();
    }
  }

  // Newly added for disabling form on payment done
  ngOnChanges(changes: SimpleChanges): void {
    // Check if paymentDone input has changed - changes(contains the previous and current value)
    if (changes['paymentDone'] && this.paymentDone) {
      this.customerForm.disable();
    }
  }

  public isFormValid(): boolean {
    return this.customerForm?.valid ?? false;
  }

  readFormData() {
    return {
      name: this.customerForm.value?.name || "",
      last_name: this.customerForm.value?.last_name || "",
      company_name: this.customerForm.value?.company_name || "",
      outlet_id: this.customerForm.value?.outlet_id || "",
      outlet_name: this.customerForm.value?.outlet_name || "",
      email: this.customerForm.value?.email || "",
      phone_number: this.customerForm.value?.phone_number || "",
      mobile_number: this.customerForm.value?.mobile_number || "",
      customer_group: this.customerForm.value?.customer_group || "",
      customer_type: this.customerForm.value?.customer_type || "",
      ie_code: this.customerForm.value?.ie_code || "",
      joined_date: this.customerForm.value?.joined_date || "",
      fob_value: this.customerForm.value?.fob_value || "",
      status: this.customerForm.value?.status || "",
      vat_number: this.customerForm.value?.vat_number || "",
      gst: this.customerForm.value?.gst || "",
      cin: this.customerForm.value?.cin || "",
      tin: this.customerForm.value?.tin || "",
      is_review_emails: this.customerForm.value?.is_review_emails || false,
      is_password_reset_next_login: this.customerForm.value?.is_password_reset_next_login || false,
      store_credit: Number(this.customerForm.value?.store_credit) || 0,
      notes: this.customerForm.value?.notes || "",
      has_also_subscribed: this.customerForm.value?.has_also_subscribed || false,
      subscription_source: this.customerForm.value?.subscription_source || "",
      language_code: this.customerForm.value?.language_code || "",
      token: this.customerForm.value?.token || "",
      is_safe: this.customerForm.value?.is_safe || false,
      is_active: this.customerForm.value?.is_active || false
    };
  }

  async save() {
    if (this.customerForm.valid) {
      ////console.log("Form Submitted");
      ////console.log('Hote id:', this.hotelId)
      {
        try {
          await this.customerUpdate().then(() => {
            this.afterCustomerCreate();   // Now customerdata.id will be available
          });
        } catch (err) {
          ////console.error("Customer creation failed:", err);
        }
      }
    } else {
      ////console.log("Form is invalid!");
    }
  }

  async customerCreate(): Promise<void> {
    return new Promise((resolve, reject) => {
      let customerObject = {
        first_name: this.customerForm.value.first_name,
        last_name: this.customerForm.value.last_name,
        designation: this.customerForm.value.designation,
        phone_number: this.customerForm.value.phone_number,
        email: this.customerForm.value.email,
        gender: this.customerForm.value.gender,
        sec_first_name: this.customerForm.value.sec_first_name,
        sec_last_name: this.customerForm.value.sec_last_name,
        sec_designation: this.customerForm.value.sec_designation,
        sec_phone_number: this.customerForm.value.sec_phone_number,
        sec_email: this.customerForm.value.sec_email,
        sec_gender: this.customerForm.value.sec_gender,
        status: "Pending",
        is_active: true,

        registered_address: {
          company_name: this.customerForm.value.company_name,
          door_no: this.customerForm.value.door_no,
          address: this.customerForm.value.address,
          city: this.customerForm.value.city,
          state: this.customerForm.value.state,
          country: this.customerForm.value.country,
          pincode: this.customerForm.value.pincode,
          pan_no: this.customerForm.value.pan_no,
          gst_no: this.customerForm.value.gst_no,
        },
        is_office_details_exists: true
      }
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          customer_update: customerObject
        }
      }
      this.hotelenrollmenttabviewService.addCustomer(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              // ////console.log(resp);
              this.hotelenrollmenttabviewService.clearAdminFormEvent();
              this.alertService.success(resp.message, this.options);
              this.customerdata = resp.result.data[0];
              ////console.log(this.customerdata, "cst");
              this.router.navigate(["/edit-new-hotel", this.customerdata.id]).then(() => {
                let nextTab = document.getElementById('profile-tab');
                if (nextTab) {
                  (nextTab as HTMLAnchorElement).click();
                }
              })
              // this.afterCustomerCreate();

              // setTimeout(() => {
              //   this.router.navigate([`/all-customers`], { skipLocationChange: false });
              // }, 1000);
              // this.router.navigate(['/all-customers'], { state: { result: resp.message }, relativeTo: this.activatedRoute, skipLocationChange: false });
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
    })
  }

  async customerUpdate() {
    if (!this.customerdata) {
      this.customerdata = {};
    }
    this.customerdata.is_office_details_exists = true
    this.customerdata.first_name = this.customerForm.value.first_name,
      this.customerdata.last_name = this.customerForm.value.last_name,
      this.customerdata.designation = this.customerForm.value.designation,
      this.customerdata.phone_number = this.customerForm.value.phone_number,
      this.customerdata.primary_email = this.customerForm.value.email,
      this.customerdata.gender = this.customerForm.value.gender,
      this.customerdata.sec_first_name = this.customerForm.value.sec_first_name,
      this.customerdata.sec_last_name = this.customerForm.value.sec_last_name,
      this.customerdata.sec_designation = this.customerForm.value.sec_designation,
      this.customerdata.sec_phone_number = this.customerForm.value.sec_phone_number,
      this.customerdata.sec_email = this.customerForm.value.sec_email,
      this.customerdata.sec_gender = this.customerForm.value.sec_gender,
      this.customerdata.is_active = true;
    // this.customerdata["password"] = this.localService.get('Password');
    // Initialised empty object
    if (!this.customerdata.registered_address) {
      this.customerdata.registered_address = {};
    }
    this.customerdata.registered_address.company_name = this.customerForm.value.company_name,
      this.customerdata.registered_address.door_no = this.customerForm.value.door_no,
      this.customerdata.registered_address.address = this.customerForm.value.address,
      this.customerdata.registered_address.city = this.customerForm.value.city,
      this.customerdata.registered_address.state = this.customerForm.value.state,
      this.customerdata.registered_address.country = this.customerForm.value.country,
      this.customerdata.registered_address.pincode = this.customerForm.value.pincode,
      this.customerdata.registered_address.pan_no = this.customerForm.value.pan_no,
      this.customerdata.registered_address.gst_no = this.customerForm.value.gst_no
    delete this.customerdata._id;
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        customer_update: this.customerdata
      },
      extras: {
        find: {
          id: this.hotelId
        }
      }
    }
    this.hotelenrollmenttabviewService.updateCustomer(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // ////console.log(resp);
            this.hotelenrollmenttabviewService.clearAdminFormEvent();
            ////console.log(resp.message, "resp.message")
            this.alertService.success(resp.message, this.options);
            this.profileService.getAdminProfileDetails(Number(this.localService.get('UserId')), this.customerType).subscribe(profileResp => {
              if (profileResp.success === 1 && profileResp.status_code === 200) {
                const data = profileResp.result.data[0];
                const profileImage = data?.profile_image?.trim() || 'assets/images/guestezee/profile.png';
                const profileName = data?.first_name || data?.last_name
                  ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
                  : data.phone_number;
                this.profileService.updateProfileImage(profileImage);
                this.profileService.updateProfileName(profileName);
              }
            });
            //  this.saveAndContinue();
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
            ////console.log(this.customerdata, "RESPDATA");
            ////console.log(Array.isArray(this.customerdata));
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
    ////console.log(this.customerdata.first_name, 'this.customerdata.first_name', this.customerdata.registered_address?.state);
    this.customerForm.patchValue({
      first_name: this.customerdata.first_name,
      last_name: this.customerdata.last_name,
      designation: this.customerdata.designation,
      phone_number: this.customerdata.phone_number,
      email: this.customerdata.primary_email,
      gender: this.customerdata.gender,

      sec_first_name: this.customerdata.sec_first_name,
      sec_last_name: this.customerdata.sec_last_name,
      sec_designation: this.customerdata.sec_designation,
      sec_phone_number: this.customerdata.sec_phone_number,
      sec_email: this.customerdata.sec_email,
      sec_gender: this.customerdata.sec_gender,
      company_name: this.customerdata.registered_address?.company_name,
      door_no: this.customerdata.registered_address?.door_no,
      address: this.customerdata.registered_address?.address,
      city: this.customerdata.registered_address?.city,
      state: this.customerdata.registered_address?.state,
      country: this.customerdata.registered_address?.country,
      pincode: this.customerdata.registered_address?.pincode,
      pan_no: this.customerdata.registered_address?.pan_no,
      gst_no: this.customerdata.registered_address?.gst_no
    });
  }

  executeFunctions() {
    this.getCustomerById()
      .then(() => {
        this.setFormValues(); // Runs after data is fetched
      })
      .catch(error => {
        ////console.error("Error fetching customer data:", error);
      });
  }

  getCountries() {
    // get country list
    this.hotelenrollmenttabviewService.getCountries().subscribe(
      resp => {
        this.countryDropdownList = resp.result;
        ////console.log(this.countryDropdownList, "countryDropdownList");
        if (this.customerdata?.registered_address?.country != undefined && this.customerdata.registered_address?.country != null) {
          this.getStateData()
        }
        // ////console.log(this.countryList);
      },
      err => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertService.error(err.error.message, this.options)
        }
        else {
          this.alertService.error('Something bad happened while loading countries. Please try again!', this.options);
        }
      }
    )
  }

  getStates(country_id: number) {
    let statesRequest = {
      "domain_name": "https://www.beaubelle.in",
      "user_id": USER_ID,
      "extras": {
        "find": {
          "countryid": country_id
        },
        "pagination": false,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 2
        },
        "sorting": true,
        "sortingDetails": {
          "sortfield": "",
          "sortorder": -1
        }
      }
    }
    this.hotelenrollmenttabviewService.getStatesById(statesRequest).subscribe(resp => {
      if (resp.success === 1) {
        this.states = resp.result
        let temArray: any = []
        //iterate through object
        Object.entries(this.states).forEach(([key, value]) => {
          temArray.push(value)
        })
        //flatten array
        this.statesDropdownList = Array.prototype.concat.apply([], temArray)
        ////console.log(this.statesDropdownList, " this.statesDropdownList")
        // ////console.log(this.statesDropdownList)
      }
      else {
        this.states = []
      }
    }, err => {
      if (err.error.statusCode === 403) {
        this.alertService.error('Session Time Out! Please login Again', this.options)
        this.router.navigate([`/login`], { skipLocationChange: false });
      }
      else if (err.error.message) {
        this.alertService.error(err.error.message, this.options)
      }
      else {
        // this.alertService.error('Something bad happened while loading customer group. Please try again!', this.options);
      }
      this.states = []
    })
  }

  onItemsSelect(item: any) {
    ////console.log(item.target.value, "item")
    const selectedCountry = this.countryDropdownList.find((c: { country: string; id: number }) => c.country === item.target.value); if (selectedCountry) {
      ////console.log('Selected Country ID:', selectedCountry.id);
      this.getStates(selectedCountry.id);
    } else {
      ////console.log('Country not found');
    }
  }

  getStateData() {
    const selectedCountry = this.countryDropdownList.find((c: { country: string; id: number }) => c.country === this.customerdata.registered_address?.country); if (selectedCountry) {
      ////console.log('Selected Country ID:', selectedCountry.id);
      this.getStates(selectedCountry.id);
    } else {
      ////console.log('Country not found');
    }
  }

  saveAndContinue() {
    ////console.log("save")
    this.continue.emit();
    ////console.log("save")
    if (this.customerForm.invalid) {
      this.executeFunctions();


    }
  }

  cancel() {
    this.customerForm.reset();
  }

  async afterCustomerCreate() {
    ////console.log(this.customerdata.id, "CHECK THE URL");
    this.continue.emit();
    //      this.continue.emit();
    //   this.router.navigateByUrl(`/edit-new-hotel/${this.customerdata.id}`).then(() => {
    //   ////console.log("Navigated to edit-new-hotel", this.customerdata.id);
    // });
  }

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

  openExiteModal() {
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }

  logout() {
    this.localService.remove('accessToken');
    this.localService.remove('refreshToken');
    this.localService.remove('expireTime');
    this.localService.remove('UserName');
    this.localService.remove('UserEmail');
    this.localService.remove('UserId');
    this.localService.remove('domainName');
    this.localService.remove('rexpireTime');
    this.localService.remove('db_schema');
    this.localService.remove('Password');
    this.localService.remove('MemberId');
    this.localService.remove('CustomerType');
    this.localService.remove('guestData');
    this.localService.remove('maxTabReached');
    this.localService.remove('currentTab');
    this.localService.remove('StaffData');
    this.localService.remove('hierarchy');
    this.localService.remove('roleName');
    this.localService.remove('role_id');
    this.localService.remove('selectedSlots');
    this.localService.remove('USERACCESS');
    this.router.navigate(['/'], { skipLocationChange: false });
  }
}
