import { CommonModule } from '@angular/common';
import { DOMAIN_NAME, USER_ID, ENDPOINTS } from './../../app.config';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { Component, Output, EventEmitter, AfterViewInit, Input, OnInit, HostListener } from '@angular/core';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ProfileService } from '../../profile/profile.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview.service';
import { CheckoutApiService } from '../checkout.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, AbstractControl, Validators } from '@angular/forms';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
// Newly added
import { TechnicalInfoService } from './technical-info.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { EditTechnicalInfoComponent } from './edit-technical-info/edit-technical-info.component';
// Newly added for payment
import { Subscription } from 'rxjs';
declare var $: any;
// import * as bootstrap from 'bootstrap';
declare var bootstrap: any;
import { ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-technical-info',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, EditTechnicalInfoComponent, AlertsComponent],
  templateUrl: './technical-info.component.html',
  styleUrl: './technical-info.component.scss'
})

export class TechnicalInfoComponent implements OnInit {
  toggleSwitch(element: any) {
    element.classList.toggle("active");
  }

  // Newly added
  @Output() continue = new EventEmitter<void>();
  hotelId: Number | null = null;
  customerdata: any;
  status !: string;
  selectedTab = "lock";
  selectedTechInfo: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  showEdit: boolean = true;
  upsertData: any;
  memberId: string | null = null;
  generalTechInfoData: any;
  allinfoData: any;
  customerTechInfo: any;
  technicalInfoData: any; // hold iniital technicalInfo data
  technicalInfodatalength: any; // hold iniital technicalInfo data length
  checkExistingtechnicalInfoChoosen!: Number; // check if technicalInfo is already
  isTechnicalInfoExists: boolean = false; // Flag to check if TechnicalInfo exists
  technicalInfos: any; //store whole technicalInfo data
  selectedTechnicalInfoToCreate: any[] = []; // Holds the chosen technicalInfo obj
  isSelectedTechnicalInfoId: any; // Holds the chosen technicalInfo obj
  customerTechnicalInfodata: any;
  isCustomerChoosen: boolean = false;
  // Track which technical info items are enabled in DB for this customer (by id)
  enabledCustomerTechnicalInfoIds: Set<number> = new Set<number>();
  iscancelVisible = false;
  // Payment
  paymentoptions = ['Quarterly Payment', 'Half-Yearly Payment', 'Full Payment'];
  selectedIndex: number = 2;
  isMemberid!: boolean;
  Memberid!: string;
  // Newly added for disabling form on payment done
  @Input() paymentDone!: boolean;
  activeTab: number = 1;
  // Newly added for payment
  orderdata: any;
  private payNowSub!: Subscription;
  activeSubscription: any; // Holds the active subscription plan
  // Newly added for payment modal
  @ViewChild('paymentModal') paymentModal!: ElementRef;
  modalInstance: any;
  isPaymentModalOpen: boolean = false;
  customerStatus: any;
  // Ecom Integration Settings 
  @ViewChild('ecomIntegrationModal') ecomIntegrationModal!: ElementRef;
  ecomIntegrationModalInstance: any;
  selectedEcomIntegrationData: any = null;
  ecomIntegrationForm: FormGroup;
  ecomTechnicalInfoForm: FormGroup;
  // End of Ecom Integration Settings 
  // Loader flag - show loader until initial data is loaded (same as department / service tab)
  isLoading: boolean = false;
  /** When false, parent (Hotels) loader is still showing; don't show Technical Info until true to avoid two loaders at once. */
  @Input() parentLoaderDone: boolean = true;
  modifiedTechnicalInfos: any[] = [];
  originalEnabledState: { [key: number]: boolean } = {};

  constructor(
    private localService: LocalStorageService,
    private authTokenService: AuthTokenService,
    private router: Router,
    private alertsService: AlertsService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private profileSrvice: ProfileService,
    private activatedRoute: ActivatedRoute,
    private checkoutApiService: CheckoutApiService,
    private technicalInfoService: TechnicalInfoService,
    private fb: FormBuilder) {
    // Ecom Integration Settings 
    // Initialize Ecom Integration forms
    this.ecomIntegrationForm = this.fb.group({
      name: [{ value: '', disabled: true }],
      type: [{ value: '', disabled: true }],
      // api_url: ['', [Validators.pattern(/^(http|https):\/\/[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/)]]
      api_url: [{ value: '', disabled: true }]
    });
    this.ecomTechnicalInfoForm = this.fb.group({
      technicalInfo: this.fb.array([])
    });
    // End of Ecom Integration Settings 
  }

  async ngOnInit(): Promise<void> {
    await this.refreshData();
    // Nelwy added for Payment
    // Subscribe to "Pay Now" events from header
    // this.payNowSub = this.technicalInfoService.payNow$.subscribe(() => {
    //   this.payNow();
    // });
    this.payNowSub = this.technicalInfoService.payNow$.subscribe((index) => {
      // console.log('Received payNow trigger. Index:', index);
      if (index !== null && index !== undefined) {
        // Got index from Header modal
        // console.log('Triggered from Header with index:', index);
        this.selectedIndex = index;
      }
      this.payNow();
    });
    this.technicalInfoService.modalTrigger$.subscribe(() => {
      this.openModal();
    });
  }

  async refreshData(): Promise<void> {
    this.hotelId = Number(this.localService.get('UserId'));
    this.memberId = this.localService.get('MemberId');
    if (this.memberId !== undefined && this.memberId !== null && this.memberId !== '' && this.memberId !== 'undefined' && this.memberId !== 'null') {
      try {
        this.isLoading = true;
        await this.getCustomerById();
        this.getAllTechnicalInfo();
      } catch (err) {
        this.isLoading = false;
        ////console.error('Failed to get customer by ID:', err);
      }
    }
  }

  // Nelwy added for Payment
  ngOnDestroy() {
    this.payNowSub?.unsubscribe();
  }

  async customerUpdate() {
    delete this.customerdata._id;
    ////console.log(this.customerdata._id, this.customerdata, "test check ");
    // this.customerdata["status"] = 'approved';
    //  Password key reset value
    // this.customerdata["password"] = this.localService.get('Password');
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
    this.hotelenrollmentservice.updateCustomerSettings(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // ////console.log(resp);
            this.alertsService.success(resp.message, this.options);
            // this.payNow();
            this.localService.set('maxTabReached', 4);
            // this.onContinue();
            setTimeout(() => {
              this.router.navigate([`/all-customers`], { skipLocationChange: false });
            }, 1000);
            this.router.navigate(['/all-customers'], { state: { result: resp.message }, relativeTo: this.activatedRoute, skipLocationChange: false });
          }
          else if (resp.success === 0) {
            if (resp.message) {
              this.alertsService.error(resp.message, this.options);
            }
          }
          else if (resp.message && resp.status_code !== 200) {
            this.alertsService.error(resp.message, this.options);
          }
          else {
            this.alertsService.error('Something bad happened. Please try again!', this.options);
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error.statusCode === 403) {
          this.alertsService.error('Session Time Out! Please login Again', this.options)
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertsService.error(err.error.message, this.options)
        }
        else {
          this.alertsService.error('Something bad happened. Please try again!', this.options);
        }
      }
    )
  }

  // async payNow() {
  //   let orderAmount = 1;
  //   // ////console.log("Property size 2:", this.customerdata.property_details.property_address.property_size);
  //   if (this.customerdata.property_details.property_address.property_size == "01-50 Rooms") {
  //     orderAmount = 1;
  //   }
  //   if (this.customerdata.property_details.property_address.property_size == "51-101 Rooms") {
  //     orderAmount = 2;
  //   }
  //   if (this.customerdata.property_details.property_address.property_size == "101-150 Rooms") {
  //     orderAmount = 3;
  //   }
  //   if (this.customerdata.property_details.property_address.property_size == "50 and above Rooms") {
  //     orderAmount = 4;
  //   }
  //   let paymentType = "";
  //   if (this.selectedIndex == 0) {
  //     paymentType = "quarterly";
  //     orderAmount = (orderAmount / 4);
  //   }
  //   if (this.selectedIndex == 1) {
  //     paymentType = "half-yearly";
  //     orderAmount = (orderAmount / 2);
  //   }
  //   if (this.selectedIndex == 2) {
  //     paymentType = "full";
  //   }
  //   ////console.log("this.custom data", this.customerdata);
  //   let endDate = new Date();
  //   endDate.setFullYear(endDate.getFullYear() + 1); // Add 1 year
  //   let due_date = `${String(endDate.getDate()).padStart(2, '0')}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${endDate.getFullYear()}`; // Format as YYYY-MM-DD
  //   if (this.selectedIndex == 0) {
  //     let dueDateObj = new Date(endDate);
  //     dueDateObj.setMonth(dueDateObj.getMonth() + 3);
  //     due_date = `${String(dueDateObj.getDate()).padStart(2, '0')}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${dueDateObj.getFullYear()}`;
  //   }
  //   if (this.selectedIndex == 1) {
  //     let dueDateObj = new Date(endDate);
  //     dueDateObj.setMonth(dueDateObj.getMonth() + 6);
  //     due_date = `${String(dueDateObj.getDate()).padStart(2, '0')}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${dueDateObj.getFullYear()}`;
  //   }
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
  //       "property_size": this.customerdata.property_details.property_address.property_size,
  //       "is_email_opt_in": false
  //     },
  //     "shipping" : {
  //       "shipping_address_count" : "",
  //       "fixed_shippping_price" : false,
  //       "pay_to_logistics" : "",
  //       "free_shipping" : false,
  //       "shipped_date" : "",
  //       "items_total" : "",
  //       "items_shipped" : "",
  //       "items_total_quantity" : "",
  //       "shipping_addresses" : [
  //           {
  //               "customer_id" : this.customerdata.id,
  //               "alias" : "",
  //               "first_name" : this.customerdata.first_name,
  //               "gst_number" : "",
  //               "last_name" : "",
  //               "company_name" : "",
  //               "entire_location" : this.customerdata.email,
  //               "address1" : this.customerdata.property_details.property_address.property_address,
  //               "landmark" : "",
  //               "city" : "",
  //               "state" : "",
  //               "country" : "",
  //               "country_code" : "104",
  //               "zipcode" : "",
  //               "email" : "",
  //               "phone_number" : "",
  //               "is_preferred_address" : false,
  //               "address_type" : "",
  //               "latitude" : "",
  //               "longitude" : ""
  //           }
  //       ],
  //       "delivery_instructions" : "",
  //       "shipping_method" : {
  //           "name" : "",
  //           "delivery_charge" : 0,
  //           "pay_to_logistics" : 0,
  //           "total_shipping_price" : 0
  //       },
  //       "shipping_carrier" : {
  //           "shipping_carrier_id" : "",
  //           "shipping_carrier_name" : "",
  //           "api_integration_id" : "",
  //           "api_integration_name" : ""
  //       },
  //       "deliveries" : [

  //       ],
  //       "geo_info" : {

  //       },
  //       "customer_comment" : "",
  //       "notes" : ""
  //   },
  //     "payment" : {
  //       "status_flow" : {
  //           "name" : "Online Payment",
  //           "title" : "Order - Online Payment",
  //           "statuses" : [
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 1,
  //                   "status_name" : "Pending",
  //                   "status_system_label" : "Pending",
  //                   "status_custom_label" : "Order Placed",
  //                   "process" : "Checkout",
  //                   "sequence" : 1,
  //                   "sms_notification" : false,
  //                   "email_notification" : false,
  //                   "push_notification" : false
  //               },
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 2,
  //                   "status_name" : "Awaiting Payment",
  //                   "status_system_label" : "Awaiting Payment",
  //                   "status_custom_label" : "Awaiting Payment",
  //                   "process" : "Checkout",
  //                   "sequence" : 2,
  //                   "sms_notification" : false,
  //                   "email_notification" : false,
  //                   "push_notification" : false
  //               },
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 3,
  //                   "status_name" : "Confirmed",
  //                   "status_system_label" : "Confirmed",
  //                   "status_custom_label" : "Order Confirmed",
  //                   "process" : "Checkout",
  //                   "sequence" : 3,
  //                   "sms_notification" : true,
  //                   "email_notification" : true,
  //                   "push_notification" : true
  //               },
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 4,
  //                   "status_name" : "Processing",
  //                   "status_system_label" : "Processing",
  //                   "status_custom_label" : "Being Prepared",
  //                   "process" : "Manual",
  //                   "sequence" :4,
  //                   "sms_notification" : false,
  //                   "email_notification" : false,
  //                   "push_notification" : false
  //               },
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 5,
  //                   "status_name" : "Awaiting Shipment",
  //                   "status_system_label" : "Awaiting Shipment",
  //                   "status_custom_label" : "Ready for Delivery",
  //                   "process" : "Manual",
  //                   "sequence" : 5,
  //                   "sms_notification" : false,
  //                   "email_notification" : false,
  //                   "push_notification" : false
  //               },
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 6,
  //                   "status_name" : "Shipped",
  //                   "status_system_label" : "Shipped",
  //                   "status_custom_label" : "Out for Delivery",
  //                   "process" : "Manual/API",
  //                   "sequence" : 6,
  //                   "sms_notification" : false,
  //                   "email_notification" : false,
  //                   "push_notification" : false
  //               },
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 7,
  //                   "status_name" : "Delivered",
  //                   "status_system_label" : "Delivered",
  //                   "status_custom_label" : "Delivered",
  //                   "process" : "Manual/API",
  //                   "sequence" : 7,
  //                   "sms_notification" : true,
  //                   "email_notification" : true,
  //                   "push_notification" : false
  //               },
  //               {
  //                   "name" : "",
  //                   "title" : "",
  //                   "status_id" : 8,
  //                   "status_name" : "Cancelled",
  //                   "status_system_label" : "Cancelled",
  //                   "status_custom_label" : "Cancelled",
  //                   "process" : "Manual/API",
  //                   "sequence" : 8,
  //                   "sms_notification" : true,
  //                   "email_notification" : true,
  //                   "push_notification" : false
  //               }
  //           ]
  //       },
  //       "payment_date" : "",
  //       "payment_reference_no" : "",
  //       "payment_status" : ""
  //   },

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
  //         "tax": Number(orderAmount) * 0.18,
  //         "order_total_amount": Number(orderAmount) + (Number(orderAmount) * 0.18)
  //       }
  //     },
  //     "organization_id": 46,
  //     "store_id": 1,
  //     "created_by": this.localService.get('UserId'),
  //     "is_deleted": false,
  //     "is_active": true,
  //     "modified_by": 16,
  //     payment_type: paymentType
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
  //   this.hotelenrollmentservice.orderUpsert(requestData).subscribe(
  //     resp => {
  //       let res: any = resp;
  //       this.upsertData = res.result.data;
  //       ////console.log(this.upsertData, 'this.upsertData')
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
  //   ////console.log("123")
  //   let hdfcData = {
  //     domain_name: DOMAIN_NAME,
  //     oid: this.upsertData[0].id,
  //     amount: 1500,
  //   }
  //   this.checkoutApiService.getHDFClink(hdfcData).then(
  //     respData3 => {
  //       let res3: any = respData3;
  //       ////console.log("123", res3)
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
  //         form.submit();
  //       }
  //     }
  //   );
  // }

  // getCustomerById(): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     let requestBody = {
  //       domain_name: DOMAIN_NAME,
  //       user_id: USER_ID,
  //       extras: {
  //         find: {
  //           id: this.hotelId
  //         }
  //       }
  //     };
  //     this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
  //       resp => {
  //         this.loaderService.emitComplete();
  //         if (resp) {
  //           this.customerdata = resp.result.data[0];
  //           this.status = this.customerdata.status;
  //           this.isMemberid = this.customerdata.status == 'Order Confirmed' ? true : false;
  //           this.Memberid = this.customerdata.customer_member_id;
  //           // console.log(this.Memberid, "Member id");
  //           ////console.log('Status:', this.status)
  //           ////console.log(this.customerdata, "RESPDATA");
  //           ////console.log(Array.isArray(this.customerdata));
  //           resolve();  // Resolve promise when data is set
  //         }
  //       },
  //       err => {
  //         this.loaderService.emitComplete();
  //         if (err.error.statusCode === 403) {
  //           this.alertsService.error('Session Time Out! Please login Again', this.options);
  //           this.router.navigate([`/login`], { skipLocationChange: false });
  //         } else if (err.error.message) {
  //           this.alertsService.error(err.error.message, this.options);
  //         } else {
  //           this.alertsService.error('Something bad happened. Please try again!', this.options);
  //         }
  //         reject(err);  // Reject promise if there is an error
  //       }
  //     );
  //   });
  // }

  async getCustomerById(): Promise<void> {
    // console.log('Hotel ID:', this.hotelId);
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // id: this.hotelId
            customer_member_id: this.memberId
          }
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        async resp => {
          this.loaderService.emitComplete();
          if (resp?.result?.data?.length) {
            this.customerdata = resp.result.data[0];
            // console.log('Customer Data:', this.customerdata);
            this.status = this.customerdata.status;
            this.isMemberid = this.customerdata.status === 'Order Confirmed';
            this.Memberid = this.customerdata.customer_member_id;
            this.localService.set('MemberId', this.Memberid);
            // console.log(this.memberId, "Member id(In technical info)");
            // console.log('Member ID:', this.Memberid);
            // Newly added for disabling form on payment done to approving the customer
            this.customerStatus = this.customerdata.status;
            // console.log('Customer status:', this.customerStatus);
            // Newly added & commented 
            // Step 1: Check for customer-specific subscription
            // if (this.customerdata?.subscription_detail) {
            //   this.activeSubscription = this.customerdata.subscription_detail;
            //   console.log('Using Customer Subscription:', this.activeSubscription);
            //   resolve();
            // }
            // // Step 2: Else fetch general subscription as fallback
            // else {
            //   console.log('Customer has no specific plan, fetching general...');
            //   try {
            //     const generalReq = {
            //       domain_name: DOMAIN_NAME,
            //       user_id: USER_ID,
            //       extras: {
            //         find: {
            //           name: "SingleRoomPricing"
            //         },
            //         pagination: true,
            //         paginationDetails: { limit: 0, pageSize: 10 },
            //         sorting: true,
            //         sortingDetails: { email: -1 }
            //       }
            //     };
            //     const generalResp: any = await new Promise((res, rej) => {
            //       this.hotelenrollmentservice.getAllSubscriptionDetails(generalReq).subscribe(
            //         result => res(result),
            //         error => rej(error)
            //       );
            //     });
            //     if (generalResp?.result?.data?.length) {
            //       this.activeSubscription = generalResp.result.data[0];
            //       // console.log('Using General Subscription:', this.activeSubscription);
            //     }
            //     resolve();
            //   } catch (err) {
            //     console.error('Failed to fetch general subscription:', err);
            //     // this.activeSubscription = { per_room_cost: 450 };
            //     resolve();
            //   }
            // }
            // await this.getActiveSubscription();
            try {
              // Await subscription call properly
              await this.getActiveSubscription();
              resolve();  // Resolve here
            } catch (subErr) {
              console.error('Failed to fetch subscription', subErr);
              resolve(); // Resolve anyway, you can choose reject(subErr) if needed
            }
          } else {
            reject(' No customer data found.');
          }
          // Ended
        },
        err => {
          this.isLoading = false;
          this.loaderService.emitComplete();
          if (err.error?.statusCode === 403) {
            this.alertsService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate(['/login'], { skipLocationChange: false });
          } else if (err.error?.message) {
            this.alertsService.error(err.error.message, this.options);
          } else {
            this.alertsService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);
        }
      );
    });
  }

  async getActiveSubscription(): Promise<void> {
    // console.log('Getting active subscription...');
    return new Promise(async (resolve, reject) => {
      try {
        const propertySize = this.customerdata?.property_details.property_address.property_size;
        const customerSub = this.customerdata?.subscription_detail;
        if (customerSub) {
          // console.log('Using customer’s subscription detail directly');
          this.activeSubscription = customerSub;
          // console.log('Using Customer Subscription:', this.activeSubscription);
          return resolve();
        }
        // console.log('No customer-specific subscription, fetching general subscription list...');
        const reqBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: {
            find: {},
            pagination: true,
            paginationDetails: { limit: 0, pageSize: 100 },
            sorting: true,
            sortingDetails: { name: 1 }
          }
        };
        const generalResp: any = await new Promise((res, rej) => {
          this.hotelenrollmentservice.getAllSubscriptionDetails(reqBody).subscribe(
            result => res(result),
            error => rej(error)
          );
        });
        if (generalResp?.result?.data?.length) {
          const allSubs = generalResp.result.data;
          let matched = allSubs.find((sub: any) => sub.name === propertySize);
          if (!matched) {
            console.warn(`No plan found matching "${propertySize}". Using first plan as default.`);
            matched = allSubs[0];
          }
          this.activeSubscription = matched;
          // console.log('Using General Subscription:', this.activeSubscription);
          resolve();
        } else {
          reject('No general subscription plans found.');
        }
      } catch (err) {
        console.error('Error in getActiveSubscription:', err);
        reject(err);
      }
    });
  }

  async executePayment() {
    // await this.getCustomerById();
    await this.payNow();
  }

  async technicalInfoCreate(selectedTechnicalInfoToCreate: any): Promise<void> {
    const memberId = this.localService.get('MemberId');
    // console.log(memberId, 'Tech member id');
    // delete this.selectedTechnicalInfoToCreate._id
    return new Promise((resolve, reject) => {
      // Strip nested `customer_technical_info` that each item carries when it comes
      // from existing customer data — passing those raw objects would cause each entry
      // inside the payload array to embed another customer_technical_info sub-array.
      const cleanedPayload = Array.isArray(selectedTechnicalInfoToCreate)
        ? selectedTechnicalInfoToCreate.map(({ customer_technical_info, ...rest }: any) => rest)
        : selectedTechnicalInfoToCreate;
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          create_technical_info: {
            customer_id: this.hotelId,
            customer_technical_info: cleanedPayload,
            member_id: this.Memberid
          }
        }
      };
      //Call API
      this.technicalInfoService.addCustomerTechnicalInfo(requestBody).subscribe(
        (resp: any) => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.customerTechnicalInfodata = resp.result.data;
              ////console.log(this.customerTechnicalInfodata, "Customer Technical Info");
              this.isSelectedTechnicalInfoId = selectedTechnicalInfoToCreate.id;
              // ////console.log('Selected technical info id', this.isSelectedTechnicalInfoId); 
              ////console.log("Property size:", this.customerdata.property_details.property_address.property_size);
              this.isTechnicalInfoExists = true;

              // Ecom Integration Settings - Automatically sync Hotel_Code if a PMS integration is enabled
              if (Array.isArray(selectedTechnicalInfoToCreate)) {
                const enabledPms = selectedTechnicalInfoToCreate.find((item: any) =>
                  item.is_enabled === true &&
                  (item.type === 'pos') &&
                  (item.name?.toLowerCase() === 'win hms' || item.name?.toLowerCase() === 'oracle')
                );
                if (enabledPms) {
                  // console.log('Syncing Hotel_Code from active PMS integration:', enabledPms.name);
                  this.updateCustomerHotelCodeFromEcomAttributes(enabledPms.attributes || [], enabledPms.name);
                }
                else {
                  const disabledPms = selectedTechnicalInfoToCreate.find((item: any) =>
                    item.type === 'pos' &&
                    (item.name?.toLowerCase() === 'win hms' || item.name?.toLowerCase() === 'oracle')
                  );
                  if (disabledPms) {
                    this.updateCustomerHotelCodeFromEcomAttributes([], disabledPms.name);
                  }
                }
              }

              this.updateCustomer();
              // this.customerdata();
              ////console.log("TechnicalInfoExists", this.isTechnicalInfoExists);
              // this.payNow();
              this.localService.set('maxTabReached', 4);
              // this.continue.emit();
              resolve();
            } else if (resp.success === 0 && resp.message) {
              this.alertsService.error(resp.message, this.options);
              reject(resp.message);
            } else if (resp.message && resp.status_code !== 200) {
              this.alertsService.error(resp.message, this.options);
              reject(resp.message);
            } else {
              this.alertsService.error('Something bad happened. Please try again!', this.options);
              reject('Unknown error');
            }
          }
        },
        (err: any) => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertsService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate(['/login'], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertsService.error(err.error.message, this.options);
          } else {
            this.alertsService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);
        }
      );
    });
  }

  onToggleSwitch(technicalInfo: any, isChecked: boolean): void {
    const index = this.selectedTechnicalInfoToCreate?.findIndex(
      (item: any) => item.id === technicalInfo.id
    );
    if (index !== -1 && index !== undefined) {
      this.selectedTechnicalInfoToCreate[index].is_active = isChecked;
    } else {
      // Optionally push it if not found
      this.selectedTechnicalInfoToCreate?.push({
        ...technicalInfo,
        is_active: isChecked
      });
    }
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    const uniqueInfos = this.technicalInfos?.filter(
      (item: any, index: any, self: any) => index === self?.findIndex((t: any) => t.id === item.id)
    );
    this.generalTechInfoData = uniqueInfos?.filter((item: any) => item.type === this.selectedTab);
    // Optional: update allinfoData with deduplicated latest data
    // this.allinfoData = [
    //   ...this.allinfoData?.filter((existing: any) => !this.generalTechInfoData.some((newItem: any) => newItem.id === existing.id)),
    //   ...this.generalTechInfoData,
    // ];
    this.allinfoData = [
      ...(this.allinfoData?.filter((existing: any) =>
        !this.generalTechInfoData?.some((newItem: any) => newItem.id === existing.id)
      ) || []), // fallback to empty array
      ...(this.generalTechInfoData || []), // fallback to empty array
    ];

  }

  // trackBy function for *ngFor on generalTechInfoData cards — prevents checkbox DOM reuse glitch
  trackById(index: number, item: any): any {
    return item?.id ?? index;
  }

  editKeyValues(id: any) {
    this.router.navigate(['/edit-tech-info', id]);
  }

  setTechInfo(data: any) {
    this.selectedTechInfo = data;
  }

  // Payment
  selectOnlyOne(index: number) {
    this.selectedIndex = index;
    ////console.log(this.selectedIndex)
  }

  updateCustomer() {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        "customer_update": {
          "is_technical_info_exists": true
        }
      },
      extras: {
        find: {
          // id: this.hotelId
          customer_member_id: this.memberId
        }
      }
    }
    this.hotelenrollmentservice.updateCustomerSettings(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // ////console.log(resp);
            this.hotelenrollmentservice.clearAdminFormEvent();
            ////console.log(resp.message, "resp.message")
            this.alertsService.success(resp.message, this.options);
            if (this.customerdata) {
              this.customerdata.is_technical_info_exists = true;
            }
          }
          else if (resp.success === 0) {
            if (resp.message) {
              this.alertsService.error(resp.message, this.options);
            }
          }
          else if (resp.message && resp.status_code !== 200) {
            this.alertsService.error(resp.message, this.options);
          }
          else {
            this.alertsService.error('Something bad happened. Please try again!', this.options);
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error.statusCode === 403) {
          this.alertsService.error('Session Time Out! Please login Again', this.options)
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertsService.error(err.error.message, this.options)
        }
        else {
          this.alertsService.error('Something bad happened. Please try again!', this.options);
        }
      }
    )
  }
  next() {
    this.continue.emit();
  }

  firstTabCount() {
    this.activeTab = 1;
  }

  secondTabCount() {
    this.activeTab = 2;
  }

  thirdTabCount() {
    this.activeTab = 3;
  }

  // Newly added for back
  back() {
    if (this.activeTab == 1) {
      var back = document.getElementById('Property Details');
      if (back) {
        back.click();
        window.scroll(0, 0);
      }
    }
    if (this.activeTab == 2) {
      this.selectTab('lock');
      this.firstTabCount();
    }
    if (this.activeTab == 3) {
      this.selectTab('pos');
      this.secondTabCount();
    }
  }

  getLastOrderForCustomer(): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            // customer_id: this.customerdata.id
            customer_member_id: this.memberId
          }
        }
      };
      this.hotelenrollmentservice.orderDetailsGetById(req).subscribe(
        (res: any) => {
          // console.log('Fetching last order of customer...');
          const orders = res?.result?.data || [];
          // console.log('All customer orders:', orders);
          const confirmedOrders = orders.filter((order: any) => order.status === 'Order Confirmed');
          // console.log('Confirmed orders:', confirmedOrders);
          const sortedConfirmed = confirmedOrders.sort((a: any, b: any) => {
            const dateA = new Date(a.created_on);
            const dateB = new Date(b.created_on);
            return dateB.getTime() - dateA.getTime(); // latest first
          });
          this.orderdata = sortedConfirmed.length > 0 ? sortedConfirmed[0] : null;
          // console.log('Latest confirmed order of customer:', this.orderdata);
          resolve(this.orderdata);
        },
        (err: any) => {
          console.error('Error fetching last order:', err);
          reject(err);
        }
      );
    });
  }

  // async payNow() {
  //   // 1.Determine order amount based on property size
  //   let orderAmount = 1;
  //   const sizeMap: any = {
  //     "01-50 Rooms": 4,
  //     "51-101 Rooms": 5,
  //     "101-150 Rooms": 6,
  //     "50 and above Rooms": 7
  //   };
  //   console.log('Property size:', this.customerdata.property_details.property_address.property_size);
  //   orderAmount = sizeMap[this.customerdata.property_details.property_address.property_size] || 1;
  //   console.log('Order amount:', orderAmount);
  //   // 2.Determine payment type & installation based on payment type
  //   let paymentType = "";
  //   let installments = 1;
  //   if (this.selectedIndex == 0) { paymentType = "quarterly"; installments = 4; }
  //   if (this.selectedIndex == 1) { paymentType = "half-yearly"; installments = 2; }
  //   if (this.selectedIndex == 2) { paymentType = "full"; installments = 1; }
  //   console.log('Payment type:', paymentType);
  //   console.log('Installments:', installments);
  //   // 3.Calculate subTotal per installment
  //   const subTotalPerInstallment = orderAmount / installments;
  //   console.log('Subtotal per installment:', subTotalPerInstallment);
  //   const taxPerInstallment = subTotalPerInstallment * 0.18;
  //   console.log('Tax per installment:', taxPerInstallment);
  //   const totalPerInstallment = subTotalPerInstallment + taxPerInstallment;
  //   console.log('Total per installment:', totalPerInstallment);
  //   // 4.Generate payment_split for the order (installments)
  //   let payment_split: any[] = [];
  //   let baseDate = new Date();
  //   for (let i = 1; i <= installments; i++) {
  //     let tempDate = new Date(baseDate);
  //     if (paymentType === "quarterly") tempDate.setMonth(tempDate.getMonth() + (3 * i));
  //     if (paymentType === "half-yearly") tempDate.setMonth(tempDate.getMonth() + (6 * i));
  //     if (paymentType === "full") tempDate.setFullYear(tempDate.getFullYear() + 1);
  //     const subscription_end_date = `${String(tempDate.getDate()).padStart(2, '0')}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${tempDate.getFullYear()}`;
  //     payment_split.push({
  //       // As of now static
  //       // sub_total: subTotalPerInstallment,
  //       // tax: taxPerInstallment,
  //       // order_total_amount: totalPerInstallment,
  //       sub_total: 1.70,
  //       tax: 0.30,
  //       order_total_amount: 2.00,
  //       paid_date_time: null,
  //       status: "Not Paid",
  //       subscription_end_date
  //     });
  //   }
  //   console.log('Payment split:', payment_split);
  //   // 5.Prepare initial order data using first installment
  //   const firstInstallment = payment_split[0];
  //   // 6.Prepare order data
  //   let orderData = {
  //     customer_id: this.customerdata.id,
  //     status: "Awaiting Payment",
  //     status_id: "1",
  //     system_label: "Pending",
  //     orderConfirmDate: new Date(),
  //     subscription_end_date: "", // will update after payment
  //     customer: {
  //       customer_id: this.customerdata.id,
  //       customer_name: this.customerdata.first_name,
  //       email: this.customerdata.email,
  //       customer_type: "business customer",
  //       phone_number: this.customerdata.phone_number,
  //       address: this.customerdata.property_details.property_address.property_address,
  //       brand: this.customerdata.property_details.contact_details.brand,
  //       hotel_name: this.customerdata.property_details.contact_details.hotel_name,
  //       property_size: this.customerdata.property_details.property_address.property_size,
  //       is_email_opt_in: false
  //     },
  //     "shipping": {
  //       "shipping_address_count": "",
  //       "fixed_shippping_price": false,
  //       "pay_to_logistics": "",
  //       "free_shipping": false,
  //       "shipped_date": "",
  //       "items_total": "",
  //       "items_shipped": "",
  //       "items_total_quantity": "",
  //       "shipping_addresses": [
  //         {
  //           "customer_id": this.customerdata.id,
  //           "alias": "",
  //           "first_name": this.customerdata.first_name,
  //           "gst_number": "",
  //           "last_name": "",
  //           "company_name": "",
  //           "entire_location": this.customerdata.email,
  //           "address1": this.customerdata.property_details.property_address.property_address,
  //           "landmark": "",
  //           "city": "",
  //           "state": "",
  //           "country": "",
  //           "country_code": "104",
  //           "zipcode": "",
  //           "email": "",
  //           "phone_number": "",
  //           "is_preferred_address": false,
  //           "address_type": "",
  //           "latitude": "",
  //           "longitude": ""
  //         }
  //       ],
  //       "delivery_instructions": "",
  //       "shipping_method": {
  //         "name": "",
  //         "delivery_charge": 0,
  //         "pay_to_logistics": 0,
  //         "total_shipping_price": 0
  //       },
  //       "shipping_carrier": {
  //         "shipping_carrier_id": "",
  //         "shipping_carrier_name": "",
  //         "api_integration_id": "",
  //         "api_integration_name": ""
  //       },
  //       "deliveries": [

  //       ],
  //       "geo_info": {

  //       },
  //       "customer_comment": "",
  //       "notes": ""
  //     },
  //     "payment": {
  //       "status_flow": {
  //         "name": "Online Payment",
  //         "title": "Order - Online Payment",
  //         "statuses": [
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 1,
  //             "status_name": "Pending",
  //             "status_system_label": "Pending",
  //             "status_custom_label": "Order Placed",
  //             "process": "Checkout",
  //             "sequence": 1,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 2,
  //             "status_name": "Awaiting Payment",
  //             "status_system_label": "Awaiting Payment",
  //             "status_custom_label": "Awaiting Payment",
  //             "process": "Checkout",
  //             "sequence": 2,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 3,
  //             "status_name": "Confirmed",
  //             "status_system_label": "Confirmed",
  //             "status_custom_label": "Order Confirmed",
  //             "process": "Checkout",
  //             "sequence": 3,
  //             "sms_notification": true,
  //             "email_notification": true,
  //             "push_notification": true
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 4,
  //             "status_name": "Processing",
  //             "status_system_label": "Processing",
  //             "status_custom_label": "Being Prepared",
  //             "process": "Manual",
  //             "sequence": 4,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 5,
  //             "status_name": "Awaiting Shipment",
  //             "status_system_label": "Awaiting Shipment",
  //             "status_custom_label": "Ready for Delivery",
  //             "process": "Manual",
  //             "sequence": 5,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 6,
  //             "status_name": "Shipped",
  //             "status_system_label": "Shipped",
  //             "status_custom_label": "Out for Delivery",
  //             "process": "Manual/API",
  //             "sequence": 6,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 7,
  //             "status_name": "Delivered",
  //             "status_system_label": "Delivered",
  //             "status_custom_label": "Delivered",
  //             "process": "Manual/API",
  //             "sequence": 7,
  //             "sms_notification": true,
  //             "email_notification": true,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 8,
  //             "status_name": "Cancelled",
  //             "status_system_label": "Cancelled",
  //             "status_custom_label": "Cancelled",
  //             "process": "Manual/API",
  //             "sequence": 8,
  //             "sms_notification": true,
  //             "email_notification": true,
  //             "push_notification": false
  //           }
  //         ]
  //       },
  //       "payment_date": "",
  //       "payment_reference_no": "",
  //       "payment_status": ""
  //     },

  //     "delivery": {
  //       "outlet_id": "1",
  //       "outlet_name": "guest ezee",
  //       "email": this.customerdata.property_details.contact_details.email,
  //       "phone_number": this.customerdata.property_details.contact_details.primary_phone_number,
  //       "address": this.customerdata.property_details.property_address.property_address,
  //       "is_email_opt_in": false
  //     },
  //     payment_type: paymentType,
  //     payment_split,
  //     order_review: {
  //       order_summary: {
  //         sub_total: firstInstallment.sub_total,
  //         tax: firstInstallment.tax,
  //         order_total_amount: firstInstallment.order_total_amount
  //       }
  //     },
  //     organization_id: 46,
  //     store_id: 1,
  //     created_by: this.localService.get('UserId'),
  //     is_deleted: false,
  //     is_active: true,
  //     modified_by: 16
  //   };
  //   console.log('Order data:', orderData);
  //   // 7.Upsert order
  //   let requestData = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: { order_creation: orderData },
  //     extras: {
  //       find: {
  //         id: ""
  //       }
  //     }
  //   };
  //   this.hotelenrollmentservice.orderUpsert(requestData).subscribe(resp => {
  //     let res: any = resp;
  //     if (!res.success) return console.error("Order creation failed");
  //     this.upsertData = res.result.data;
  //     // 7.Trigger HDFC payment
  //     let hdfcData = {
  //       domain_name: DOMAIN_NAME,
  //       oid: this.upsertData[0].id,
  //       amount: firstInstallment.order_total_amount
  //     };
  //     this.checkoutApiService.getHDFClink(hdfcData).then(respData3 => {
  //       let res3: any = respData3;
  //       if (!res3) return console.error("Payment link generation failed");
  //       // 8.Create and submit payment form
  //       var form = document.createElement("form");
  //       var element1 = document.createElement("input");
  //       var element2 = document.createElement("input");
  //       form.method = "POST";
  //       form.action = res3.link;
  //       form.target = '_self';
  //       element1.value = res3.encrequest;
  //       element1.name = "encRequest";
  //       form.appendChild(element1);
  //       element2.value = res3.accesscode;
  //       element2.name = "access_code";
  //       form.appendChild(element2);
  //       document.body.appendChild(form);
  //       form.submit();
  //       // Handle payment success callback
  //       // if (res3.status === "success") {
  //       //   const order = this.upsertData[0];
  //       //   const nextIndex = order.payment_split.findIndex((p: any)=> p.status === "Not Paid");
  //       //   if (nextIndex !== -1) {
  //       //     const now = new Date().toISOString();
  //       //     order.payment_split[nextIndex].paid_date_time = now;
  //       //     order.payment_split[nextIndex].status = "Paid";
  //       //     // Update order with paid installment
  //       //     let orderUpdateData = { domain_name: DOMAIN_NAME, user_id: USER_ID, payload: { order_creation: order }, extras: { find: { id: order.id } } };
  //       //     this.hotelenrollmentservice.orderUpsert(orderUpdateData).subscribe(orderResp => {
  //       //       if (orderResp.success === 1) console.log(`Installment ${nextIndex} marked Paid at ${now}`);
  //       //     });
  //       //     // Update order_review to next unpaid installment or first if all paid
  //       //     const nextInstallment = order.payment_split.find((p: any )=> p.status === "Not Paid") || order.payment_split[0];
  //       //     order.order_review.order_summary = {
  //       //       sub_total: nextInstallment.sub_total,
  //       //       tax: nextInstallment.tax,
  //       //       order_total_amount: nextInstallment.order_total_amount
  //       //     };
  //       //     // Update customer subscription_end_date
  //       //     const subscriptionEndDate = order.payment_split[nextIndex].subscription_end_date;
  //       //     let updateCustomerData = {
  //       //       domain_name: DOMAIN_NAME,
  //       //       user_id: USER_ID,
  //       //       extras: { find: { id: this.customerdata.id } },
  //       //       payload: { customer_update: { payment_split: order.payment_split, subscription_end_date: subscriptionEndDate } }
  //       //     };
  //       //     this.hotelenrollmentservice.updateCustomerFcm(updateCustomerData).subscribe(custRes => {
  //       //       if (custRes.success === 1) console.log("Customer subscription_end_date updated after payment");
  //       //     });
  //       //   }
  //       // }
  //     });
  //   });

  // }



  // async payNow() {
  //   // 1️⃣ Fetch last order
  //   await this.getLastOrderForCustomer();
  //   const lastOrder = this.orderdata || null;
  //   console.log('Last Order:', lastOrder);
  //   let payment_split: any[] = [];
  //   let paymentType = "";
  //   let installments = 1;
  //   let orderAmount = 1;
  //   if (!lastOrder) {
  //     // 🆕 First order → calculate paymentType, orderAmount, installments
  //     const sizeMap: any = {
  //       "01-50 Rooms": 4,
  //       "51-101 Rooms": 5,
  //       "101-150 Rooms": 6,
  //       "50 and above Rooms": 7
  //     };
  //     orderAmount = sizeMap[this.customerdata.property_details.property_address.property_size] || 1;

  //     if (this.selectedIndex === 0) { paymentType = "quarterly"; installments = 4; }
  //     if (this.selectedIndex === 1) { paymentType = "half-yearly"; installments = 2; }
  //     if (this.selectedIndex === 2) { paymentType = "full"; installments = 1; }

  //     const subTotalPerInstallment = orderAmount / installments;
  //     const taxPerInstallment = subTotalPerInstallment * 0.18;
  //     const totalPerInstallment = subTotalPerInstallment + taxPerInstallment;
  //     let baseDate = new Date();
  //     for (let i = 0; i < installments; i++) {
  //       let tempDate = new Date(baseDate);
  //       if (paymentType === "quarterly") tempDate.setMonth(tempDate.getMonth() + (3 * (i + 1)));
  //       if (paymentType === "half-yearly") tempDate.setMonth(tempDate.getMonth() + (6 * (i + 1)));
  //       if (paymentType === "full") tempDate.setFullYear(tempDate.getFullYear() + 1);
  //       const subscription_end_date = `${String(tempDate.getDate()).padStart(2, '0')}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${tempDate.getFullYear()}`;
  //       payment_split.push({
  //         // sub_total: subTotalPerInstallment,
  //         // tax: taxPerInstallment,
  //         // order_total_amount: totalPerInstallment,
  //         sub_total: 0.70,
  //         tax: 0.30,
  //         order_total_amount: 1.00,
  //         paid_date_time: null,
  //         status: "Not Paid",
  //         subscription_end_date
  //       });
  //     }
  //   } else {
  //     // Existing order → reuse everything
  //     payment_split = lastOrder.payment_split.map((p: any) => ({ ...p }));
  //     paymentType = lastOrder.payment_type;   // reused
  //     installments = payment_split.length;    // reused
  //     orderAmount = payment_split.reduce((sum, p) => sum + p.order_total_amount, 0); // optional
  //   }
  //   console.log('Payment Split:', payment_split);
  //   console.log('Payment Type:', paymentType);
  //   // 2️⃣ Find next unpaid installment
  //   const nextUnpaidIndex = payment_split.findIndex(p => p.status === "Not Paid");
  //   if (nextUnpaidIndex === -1) {
  //     // console.log("All installments are already paid!");
  //     return;
  //   }
  //   const nextUnpaid = payment_split[nextUnpaidIndex];
  //   // 3️⃣ Prepare order_review
  //   const order_review = {
  //     order_summary: {
  //       sub_total: nextUnpaid.sub_total,
  //       tax: nextUnpaid.tax,
  //       order_total_amount: nextUnpaid.order_total_amount
  //     }
  //   };
  //   // 4️⃣ Prepare new order
  //   const orderData = {
  //     customer_id: this.customerdata.id,
  //     status: "Awaiting Payment",
  //     status_id: "1",
  //     system_label: "Pending",
  //     orderConfirmDate: new Date(),
  //     subscription_end_date: nextUnpaid.subscription_end_date,
  //     customer: {
  //       customer_id: this.customerdata.id,
  //       customer_name: this.customerdata.first_name,
  //       email: this.customerdata.email,
  //       customer_type: "business customer",
  //       phone_number: this.customerdata.phone_number,
  //       address: this.customerdata.property_details.property_address.property_address,
  //       brand: this.customerdata.property_details.contact_details.brand,
  //       hotel_name: this.customerdata.property_details.contact_details.hotel_name,
  //       property_size: this.customerdata.property_details.property_address.property_size,
  //       is_email_opt_in: false
  //     },
  //     "shipping": {
  //       "shipping_address_count": "",
  //       "fixed_shippping_price": false,
  //       "pay_to_logistics": "",
  //       "free_shipping": false,
  //       "shipped_date": "",
  //       "items_total": "",
  //       "items_shipped": "",
  //       "items_total_quantity": "",
  //       "shipping_addresses": [
  //         {
  //           "customer_id": this.customerdata.id,
  //           "alias": "",
  //           "first_name": this.customerdata.first_name,
  //           "gst_number": "",
  //           "last_name": "",
  //           "company_name": "",
  //           "entire_location": this.customerdata.email,
  //           "address1": this.customerdata.property_details.property_address.property_address,
  //           "landmark": "",
  //           "city": "",
  //           "state": "",
  //           "country": "",
  //           "country_code": "104",
  //           "zipcode": "",
  //           "email": "",
  //           "phone_number": "",
  //           "is_preferred_address": false,
  //           "address_type": "",
  //           "latitude": "",
  //           "longitude": ""
  //         }
  //       ],
  //       "delivery_instructions": "",
  //       "shipping_method": {
  //         "name": "",
  //         "delivery_charge": 0,
  //         "pay_to_logistics": 0,
  //         "total_shipping_price": 0
  //       },
  //       "shipping_carrier": {
  //         "shipping_carrier_id": "",
  //         "shipping_carrier_name": "",
  //         "api_integration_id": "",
  //         "api_integration_name": ""
  //       },
  //       "deliveries": [

  //       ],
  //       "geo_info": {

  //       },
  //       "customer_comment": "",
  //       "notes": ""
  //     },
  //     "payment": {
  //       "status_flow": {
  //         "name": "Online Payment",
  //         "title": "Order - Online Payment",
  //         "statuses": [
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 1,
  //             "status_name": "Pending",
  //             "status_system_label": "Pending",
  //             "status_custom_label": "Order Placed",
  //             "process": "Checkout",
  //             "sequence": 1,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 2,
  //             "status_name": "Awaiting Payment",
  //             "status_system_label": "Awaiting Payment",
  //             "status_custom_label": "Awaiting Payment",
  //             "process": "Checkout",
  //             "sequence": 2,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 3,
  //             "status_name": "Confirmed",
  //             "status_system_label": "Confirmed",
  //             "status_custom_label": "Order Confirmed",
  //             "process": "Checkout",
  //             "sequence": 3,
  //             "sms_notification": true,
  //             "email_notification": true,
  //             "push_notification": true
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 4,
  //             "status_name": "Processing",
  //             "status_system_label": "Processing",
  //             "status_custom_label": "Being Prepared",
  //             "process": "Manual",
  //             "sequence": 4,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 5,
  //             "status_name": "Awaiting Shipment",
  //             "status_system_label": "Awaiting Shipment",
  //             "status_custom_label": "Ready for Delivery",
  //             "process": "Manual",
  //             "sequence": 5,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 6,
  //             "status_name": "Shipped",
  //             "status_system_label": "Shipped",
  //             "status_custom_label": "Out for Delivery",
  //             "process": "Manual/API",
  //             "sequence": 6,
  //             "sms_notification": false,
  //             "email_notification": false,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 7,
  //             "status_name": "Delivered",
  //             "status_system_label": "Delivered",
  //             "status_custom_label": "Delivered",
  //             "process": "Manual/API",
  //             "sequence": 7,
  //             "sms_notification": true,
  //             "email_notification": true,
  //             "push_notification": false
  //           },
  //           {
  //             "name": "",
  //             "title": "",
  //             "status_id": 8,
  //             "status_name": "Cancelled",
  //             "status_system_label": "Cancelled",
  //             "status_custom_label": "Cancelled",
  //             "process": "Manual/API",
  //             "sequence": 8,
  //             "sms_notification": true,
  //             "email_notification": true,
  //             "push_notification": false
  //           }
  //         ]
  //       },
  //       "payment_date": "",
  //       "payment_reference_no": "",
  //       "payment_status": ""
  //     },

  //     "delivery": {
  //       "outlet_id": "1",
  //       "outlet_name": "guest ezee",
  //       "email": this.customerdata.property_details.contact_details.email,
  //       "phone_number": this.customerdata.property_details.contact_details.primary_phone_number,
  //       "address": this.customerdata.property_details.property_address.property_address,
  //       "is_email_opt_in": false
  //     },
  //     payment_type: paymentType,   // always from first order or reused
  //     payment_split,
  //     order_review,
  //     organization_id: 46,
  //     store_id: 1,
  //     created_by: this.localService.get('UserId'),
  //     is_deleted: false,
  //     is_active: true,
  //     modified_by: 16
  //   };
  //   console.log('Order Data:', orderData);
  //   // 5️⃣ Upsert order
  //   const requestData = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: { order_creation: orderData },
  //     extras: { find: { id: "" } }
  //   };
  //   this.hotelenrollmentservice.orderUpsert(requestData).subscribe(resp => {
  //     if (!resp.success) return console.error("Order creation failed");
  //     this.upsertData = resp.result.data;
  //     const hdfcData = {
  //       domain_name: DOMAIN_NAME,
  //       oid: this.upsertData[0].id,
  //       amount: nextUnpaid.order_total_amount
  //     };
  //     this.checkoutApiService.getHDFClink(hdfcData).then(responseData3 => {
  //       let respData3: any = responseData3;
  //       if (!respData3) return console.error("Payment link generation failed");
  //       const form = document.createElement("form");
  //       form.method = "POST";
  //       form.action = respData3.link;
  //       form.target = "_self";
  //       const input1 = document.createElement("input");
  //       input1.name = "encRequest";
  //       input1.value = respData3.encrequest;
  //       form.appendChild(input1);
  //       const input2 = document.createElement("input");
  //       input2.name = "access_code";
  //       input2.value = respData3.accesscode;
  //       form.appendChild(input2);
  //       document.body.appendChild(form);
  //       form.submit();
  //     });
  //   });
  // }

  async payNow() {
    // console.log('Pay now');
    await this.getCustomerById();
    // await this.getActiveSubscription();
    // console.log('Customer Data(doing payment):', this.customerdata);
    // 1 Fetch last order
    await this.getLastOrderForCustomer();
    const lastOrder = this.orderdata || null;
    // console.log('Last Order:', lastOrder);
    let payment_split: any[] = [];
    let paymentType = "";
    let installments = 1;
    let orderAmount = 1;
    // 2 Determine if we have previous cycles
    if (!lastOrder) {
      payment_split = [];
    } else {
      payment_split = lastOrder.payment_split.map((cycle: any) => ({ ...cycle }));
    }
    // 3 Check if all cycles are fully paid
    const allPaid = payment_split.length === 0 || payment_split.every(cycle =>
      cycle.installments.every((inst: any) => inst.status === "Paid")
    );
    if (allPaid) {
      //  Newly added & commented 
      // const perRoomCost = this.activeSubscription?.perRoomCost
      // ended
      // Create a new cycle based on selected payment type
      // const sizeMap: any = {
      //   "01-50 Rooms": 50,
      //   "51-100 Rooms": 100,
      //   "101-150 Rooms": 150,
      //   "50 and above Rooms": 200
      // };
      // // Newly added & commented 
      // const propertySize = this.customerdata?.property_details?.property_address?.property_size;
      // const totalRooms = sizeMap[propertySize] || 50;
      // console.log('perRoomCost:', perRoomCost);
      // console.log('totalRooms:', totalRooms);
      // Calculate total yearly cost = perRoomCost × rooms × 12 months
      // const yearlyCost = perRoomCost * totalRooms * 12;
      // console.log('yearlyCost:', yearlyCost);
      // // ended
      // orderAmount = sizeMap[this.customerdata?.property_details?.property_address?.property_size] || 1;
      // --- Calculate discounted per-room cost ---
      // const perRoomCost = Number(this.activeSubscription?.perRoomCost).toFixed(2);
      // const discountType = this.activeSubscription?.discountType|| "";
      // const discountValue = Number(this.activeSubscription?.discountValue).toFixed(2);
      // const numberOfRooms = Number(this.customerdata?.property_details?.property_address?.number_of_rooms);
      // let discountedCost = perRoomCost.toFixed(2);
      // if (discountType.toLowerCase() === "percentage") {
      //   discountedCost = perRoomCost - (perRoomCost * discountValue / 100);
      // } else if (discountType.toLowerCase() === "flat") {
      //   discountedCost = perRoomCost - discountValue;
      // }
      // console.log('Gst per room:', (discountedCost * 0.18).toFixed(2));
      // // --- Compute yearly cost ---
      // const yearlyCost = discountedCost * numberOfRooms * 12;
      // console.log('perRoomCost:', perRoomCost);
      // console.log('discountType:', discountType);
      // console.log('discountValue:', discountValue);
      // console.log('discountedCost:', discountedCost.toFixed(2));
      // console.log('numberOfRooms:', numberOfRooms);
      // console.log('yearlyCost:', yearlyCost.toFixed(2));
      // if (this.selectedIndex === 0) { paymentType = "quarterly"; installments = 4; }
      // if (this.selectedIndex === 1) { paymentType = "half-yearly"; installments = 2; }
      // if (this.selectedIndex === 2) { paymentType = "full"; installments = 1; }
      // // Newly added & commented 
      // // const subTotalPerInstallment = orderAmount / installments;
      // const subTotalPerInstallment = yearlyCost / installments;
      // console.log('subTotalPerInstallment:', subTotalPerInstallment);
      // // ended
      // const taxPerInstallment = subTotalPerInstallment * 0.18;
      // console.log('taxPerInstallment:', taxPerInstallment);
      // const totalPerInstallment = subTotalPerInstallment + taxPerInstallment;
      // console.log('totalPerInstallment:', totalPerInstallment);
      const perRoomCost = Number(this.activeSubscription?.perRoomCost || 0);
      const discountType = (this.activeSubscription?.discountType || "").toLowerCase();
      const discountValue = Number(this.activeSubscription?.discountValue || 0);
      const numberOfRooms = Number(this.customerdata?.property_details?.property_address?.number_of_rooms || 0);
      let discountedCost = perRoomCost;
      if (discountType === "percentage") {
        discountedCost = perRoomCost - (perRoomCost * discountValue / 100);
      } else if (discountType === "flat") {
        discountedCost = perRoomCost - discountValue;
      }
      discountedCost = Number(discountedCost.toFixed(2));
      // GST per room (based on discounted cost)
      const gstPerRoom = Number((discountedCost * 0.18).toFixed(2));
      //  yearly cost (base only, no GST) ---
      const yearlyCost = Number((discountedCost * numberOfRooms * 12).toFixed(2));
      // Compute yearly GST separately ---
      const yearlyGst = Number((gstPerRoom * numberOfRooms * 12).toFixed(2));
      // Compute total yearly amount (base + tax) ---
      const totalYearlyAmount = Number((yearlyCost + yearlyGst).toFixed(2));
      // console.log('Discounted Cost per Room:', discountedCost);
      // console.log('GST per Room:', gstPerRoom);
      // console.log('Yearly Base Cost:', yearlyCost);
      // console.log('Yearly GST:', yearlyGst);
      // console.log('Total Yearly Amount:', totalYearlyAmount);
      let paymentType = '';
      let installments = 1;
      if (this.selectedIndex === 0) { paymentType = "quarterly"; installments = 4; }
      if (this.selectedIndex === 1) { paymentType = "half-yearly"; installments = 2; }
      if (this.selectedIndex === 2) { paymentType = "full"; installments = 1; }
      // --- Divide for installment ---
      const subTotalPerInstallment = Number((yearlyCost / installments).toFixed(2));
      const taxPerInstallment = Number((yearlyGst / installments).toFixed(2));
      const totalPerInstallment = Number((subTotalPerInstallment + taxPerInstallment).toFixed(2));
      // console.log('SubTotal (Base) per Installment:', subTotalPerInstallment);
      // console.log('Tax (GST) per Installment:', taxPerInstallment);
      // console.log('Total per Installment:', totalPerInstallment);
      let baseDate = new Date();
      const installmentArr = [];
      for (let i = 0; i < installments; i++) {
        let tempDate = new Date(baseDate);
        if (paymentType === "quarterly") tempDate.setMonth(tempDate.getMonth() + (3 * (i + 1)));
        if (paymentType === "half-yearly") tempDate.setMonth(tempDate.getMonth() + (6 * (i + 1)));
        if (paymentType === "full") tempDate.setFullYear(tempDate.getFullYear() + 1);
        const subscription_end_date = `${String(tempDate.getDate()).padStart(2, '0')}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${tempDate.getFullYear()}`;
        installmentArr.push({
          status: "Not Paid",
          // sub_total: 0.70,
          // tax: 0.30,
          // order_total_amount: 1.00,
          sub_total: subTotalPerInstallment,
          tax: taxPerInstallment,
          order_total_amount: totalPerInstallment,
          subscription_end_date
        });
      }
      payment_split.push({
        name: paymentType,
        installments: installmentArr
      });
    } else {
      // If not all paid, reuse last order's next unpaid installment
      const nextUnpaidCycleIndex = payment_split.findIndex(cycle =>
        cycle.installments.some((inst: any) => inst.status === "Not Paid")
      );
      if (nextUnpaidCycleIndex === -1) {
        // console.log("All installments are already paid!");
        return;
      }
      paymentType = payment_split[nextUnpaidCycleIndex].name;
    }
    // console.log('Payment Split:', payment_split);
    // console.log('Payment Type:', paymentType);
    // 4 Find next unpaid installment
    let nextUnpaid;
    for (let cycle of payment_split) {
      nextUnpaid = cycle.installments.find((inst: any) => inst.status === "Not Paid");
      if (nextUnpaid) break;
    }
    if (!nextUnpaid) {
      // console.log("All installments are already paid!");
      return;
    }
    // 5 Prepare order_review
    const order_review = {
      order_summary: {
        // sub_total: nextUnpaid.sub_total,
        // tax: nextUnpaid.tax,
        // order_total_amount: nextUnpaid.order_total_amount
        sub_total: Number(nextUnpaid.sub_total.toFixed(2)),
        tax: Number(nextUnpaid.tax.toFixed(2)),
        order_total_amount: Number(nextUnpaid.order_total_amount.toFixed(2))
        // order_total_amount: 1
      }
    };
    // console.log('Brand error', this.customerdata);
    // console.log('Amount to be paid:', Number(nextUnpaid.order_total_amount.toFixed(2)));
    // 6 Prepare orderData (kept exactly as you provided)
    const isIndia = this.customerdata?.property_details?.property_address?.property_country === 'India';
    const taxInfo = isIndia
      ? { gst_number: this.customerdata?.property_details?.property_address?.property_gst || "" }
      : { vat_number: this.customerdata?.property_details?.property_address?.property_vat || "" };

    const orderData = {
      customer_id: this.customerdata?.id,
      status: "Awaiting Payment",
      status_id: "1",
      system_label: "Pending",
      orderConfirmDate: new Date(),
      subscription_end_date: nextUnpaid.subscription_end_date,
      customer: {
        customer_id: this.customerdata?.id,
        customer_name: this.customerdata?.first_name,
        email: this.customerdata?.email,
        customer_type: "business customer",
        phone_number: this.customerdata?.phone_number,
        address: this.customerdata?.property_details?.property_address?.property_address,
        brand: this.customerdata?.property_details?.contact_details?.brand,
        hotel_name: this.customerdata?.property_details?.contact_details?.hotel_name,
        property_size: this.customerdata?.property_details?.property_address?.property_size,
        is_email_opt_in: false
      },
      "shipping": {
        "shipping_address_count": "",
        "fixed_shippping_price": false,
        "pay_to_logistics": "",
        "free_shipping": false,
        "shipped_date": "",
        "items_total": "",
        "items_shipped": "",
        "items_total_quantity": "",
        "shipping_addresses": [
          {
            "customer_id": this.customerdata?.id,
            "alias": "",
            "first_name": this.customerdata?.first_name,
            ...taxInfo,
            "last_name": "",
            "company_name": "",
            "entire_location": this.customerdata?.email,
            "address1": this.customerdata?.property_details?.property_address?.property_address,
            "landmark": "",
            "city": "",
            "state": "",
            "country": "",
            "country_code": "104",
            "zipcode": "",
            "email": "",
            "phone_number": "",
            "is_preferred_address": false,
            "address_type": "",
            "latitude": "",
            "longitude": ""
          }
        ],
        "delivery_instructions": "",
        "shipping_method": {
          "name": "",
          "delivery_charge": 0,
          "pay_to_logistics": 0,
          "total_shipping_price": 0
        },
        "shipping_carrier": {
          "shipping_carrier_id": "",
          "shipping_carrier_name": "",
          "api_integration_id": "",
          "api_integration_name": ""
        },
        "deliveries": [

        ],
        "geo_info": {

        },
        "customer_comment": "",
        "notes": ""
      },
      "payment": {
        "status_flow": {
          "name": "Online Payment",
          "title": "Order - Online Payment",
          "statuses": [
            {
              "name": "",
              "title": "",
              "status_id": 1,
              "status_name": "Pending",
              "status_system_label": "Pending",
              "status_custom_label": "Order Placed",
              "process": "Checkout",
              "sequence": 1,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 2,
              "status_name": "Awaiting Payment",
              "status_system_label": "Awaiting Payment",
              "status_custom_label": "Awaiting Payment",
              "process": "Checkout",
              "sequence": 2,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 3,
              "status_name": "Confirmed",
              "status_system_label": "Confirmed",
              "status_custom_label": "Order Confirmed",
              "process": "Checkout",
              "sequence": 3,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": true
            },
            {
              "name": "",
              "title": "",
              "status_id": 4,
              "status_name": "Processing",
              "status_system_label": "Processing",
              "status_custom_label": "Being Prepared",
              "process": "Manual",
              "sequence": 4,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 5,
              "status_name": "Awaiting Shipment",
              "status_system_label": "Awaiting Shipment",
              "status_custom_label": "Ready for Delivery",
              "process": "Manual",
              "sequence": 5,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 6,
              "status_name": "Shipped",
              "status_system_label": "Shipped",
              "status_custom_label": "Out for Delivery",
              "process": "Manual/API",
              "sequence": 6,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 7,
              "status_name": "Delivered",
              "status_system_label": "Delivered",
              "status_custom_label": "Delivered",
              "process": "Manual/API",
              "sequence": 7,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 8,
              "status_name": "Cancelled",
              "status_system_label": "Cancelled",
              "status_custom_label": "Cancelled",
              "process": "Manual/API",
              "sequence": 8,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": false
            }
          ]
        },
        "payment_date": "",
        "payment_reference_no": "",
        "payment_status": ""
      },

      "delivery": {
        "outlet_id": "1",
        "outlet_name": "guest ezee",
        "email": this.customerdata?.property_details?.contact_details?.email,
        "phone_number": this.customerdata?.property_details?.contact_details?.primary_phone_number,
        "address": this.customerdata?.property_details?.property_address?.property_address,
        "is_email_opt_in": false
      },
      payment_type: paymentType,
      payment_split,
      order_review,
      customer_member_id: this.customerdata?.customer_member_id,
      organization_id: 46,
      store_id: 1,
      created_by: this.localService.get('UserId'),
      is_deleted: false,
      is_active: true,
      modified_by: 16,
      // Newly added
      is_registration: true,
      send_sms: true
    };
    // console.log('Order Data:', orderData);
    //  Upsert order and generate payment link
    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { order_creation: orderData },
      extras: { find: { id: "" } }
    };
    this.hotelenrollmentservice.orderUpsert(requestData).subscribe(resp => {
      if (!resp.success) return console.error("Order creation failed");
      this.upsertData = resp.result.data;
      const hdfcData = {
        domain_name: DOMAIN_NAME,
        oid: this.upsertData[0].id,
        amount: nextUnpaid.order_total_amount
      };

      this.checkoutApiService.getHDFClink(hdfcData).then(responseData3 => {
        let respData3: any = responseData3;
        if (!respData3) return console.error("Payment link generation failed");

        const form = document.createElement("form");
        form.method = "POST";
        form.action = respData3.link;
        form.target = "_self";

        const input1 = document.createElement("input");
        input1.name = "encRequest";
        input1.value = respData3.encrequest;
        form.appendChild(input1);

        const input2 = document.createElement("input");
        input2.name = "access_code";
        input2.value = respData3.accesscode;
        form.appendChild(input2);

        document.body.appendChild(form);
        form.submit();
      });
    });
  }

  openModal() {
    this.isPaymentModalOpen = true;
    window.history.pushState(null, '', window.location.href);
    // Lazy‑create the Bootstrap modal instance when first opened
    if (!this.modalInstance && this.paymentModal) {
      this.modalInstance = new bootstrap.Modal(this.paymentModal.nativeElement, {
        backdrop: 'static',
        keyboard: false
      });
    }
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  ngAfterViewInit(): void {
    // Optionally pre‑create instance if element is already in DOM
    if (this.paymentModal) {
      this.modalInstance = new bootstrap.Modal(this.paymentModal.nativeElement);
    }
    /* //  Ecom Integration Settings - prevent close on outside click
    this.ecomIntegrationModalInstance = new bootstrap.Modal(this.ecomIntegrationModal.nativeElement, {
      backdrop: 'static',  // do not close on backdrop click
      keyboard: false      // optional: also prevent Esc key from closing
    }); */
  }

  closeModal() {
    this.isPaymentModalOpen = false;
    this.modalInstance.hide();
  }

  @HostListener('window:popstate', ['$event'])
  onBrowserBack(event: any) {
    if (this.isPaymentModalOpen) {
      window.history.pushState(null, '', window.location.href);
    }
  }

  //Ecom Integration Settings 
  // Check if Ecom settings are enabled for this technical info (based on DB state)
  isEcomSettingsEnabled(data: any): boolean {
    if (!data) return false;
    const id = Number(data.id);
    return !!id && this.enabledCustomerTechnicalInfoIds.has(id);
  }

  // Handle click on Ecom settings icon
  onEcomSettingsClick(data: any): void {
    // console.log('Ecom settings clicked', data);
    if (!this.isEcomSettingsEnabled(data)) {
      // console.log('Ecom settings not enabled', data);
      // Disabled state: do nothing
      return;
    }
    this.openEcomIntegrationModal(data);
  }

  // Helper: returns true if the currently opened integration is WIN HMS or Oracle.
  // Hotel_Code locking only applies to these two integrations.
  isHotelCodeIntegration(): boolean {
    if (!this.selectedEcomIntegrationData) return false;
    const type = (this.selectedEcomIntegrationData.type || '').toString().trim().toLowerCase();
    const name = (this.selectedEcomIntegrationData.name || '').toString().trim().toLowerCase();
    return type === 'pos' || name === 'win hms' || name === 'oracle';
  }

  // Open Ecom Integration Settings Modal
  openEcomIntegrationModal(data: any): void {
    // console.log('Ecom settings opened', data);
    this.selectedEcomIntegrationData = data;
    // Populate form with data
    this.ecomIntegrationForm.patchValue({
      name: data.name || '',
      type: data.type || '',
      api_url: data.api_url || ''
    });
    // Populate technical info form array
    const techInfoArray = this.ecomTechnicalInfoForm.get('technicalInfo') as FormArray;
    techInfoArray.clear();

    let attributesToDisplay = data.attributes ? [...data.attributes] : [];

    // Automatically ensure Hotel_Code is present for WIN HMS and Oracle integrations
    // OLD: was checked by tab (selectedTab === 'pos') — now checked by integration name
    // if (this.selectedTab === 'pos') {
    if (this.isHotelCodeIntegration()) {
      const hasHotelCode = attributesToDisplay.some((attr: any) =>
        attr && typeof attr.key === 'string' && attr.key.trim().toLowerCase() === 'hotel_code'
      );
      if (!hasHotelCode) {
        // Add default Hotel_Code attribute at the beginning
        attributesToDisplay.unshift({ key: 'Hotel_Code', value: '' });
      }
    }

    if (attributesToDisplay.length) {
      attributesToDisplay.forEach((attr: any) => {
        techInfoArray.push(this.createEcomAttributeGroup(attr.key || '', attr.value || ''));
      });
    } else {
      // At least one empty row
      techInfoArray.push(this.createEcomAttributeGroup());
    }
    /*
        if (data.attributes && Array.isArray(data.attributes) && data.attributes.length) {
          data.attributes.forEach((attr: any) => {
            techInfoArray.push(this.createEcomAttributeGroup(attr.key || '', attr.value || ''));
          });
        } else {
          // At least one empty row
          techInfoArray.push(this.createEcomAttributeGroup());
        }
    */
    // Ensure modal instance exists and element is present
    if (!this.ecomIntegrationModalInstance && this.ecomIntegrationModal) {
      this.ecomIntegrationModalInstance = new bootstrap.Modal(this.ecomIntegrationModal.nativeElement, {
        backdrop: 'static',
        keyboard: false
      });
    }
    if (this.ecomIntegrationModalInstance) {
      // console.log('Ecom integration modal instance', this.ecomIntegrationModalInstance);
      this.ecomIntegrationModalInstance.show();
    }
  }

  // Close Ecom Integration Settings Modal
  closeEcomIntegrationModal(): void {
    if (this.ecomIntegrationModalInstance) {
      this.ecomIntegrationModalInstance.hide();
    }
    this.selectedEcomIntegrationData = null;
    // Reset forms
    this.ecomIntegrationForm.reset();
    const techInfoArray = this.ecomTechnicalInfoForm.get('technicalInfo') as FormArray;
    techInfoArray.clear();
  }

  // Get technical info form array
  getEcomTechnicalInfoControls(): FormArray {
    return this.ecomTechnicalInfoForm.get('technicalInfo') as FormArray;
  }

  // Add new field to technical info
  addEcomField(): void {
    const techInfoArray = this.ecomTechnicalInfoForm.get('technicalInfo') as FormArray;
    techInfoArray.push(this.createEcomAttributeGroup());
  }

  // Remove field from technical info
  removeEcomField(index: number): void {
    const techInfoArray = this.ecomTechnicalInfoForm.get('technicalInfo') as FormArray;
    // Prevent removal of Hotel_Code only for WIN HMS and Oracle integrations
    // OLD: was checked by tab (selectedTab === 'pos') — now checked by integration name
    // if (this.selectedTab === 'pos') {
    if (this.isHotelCodeIntegration()) {
      const fieldControl = techInfoArray.at(index);
      if (fieldControl) {
        // Use getRawValue to read disabled controls (Hotel_Code key is disabled)
        const rawKey = (fieldControl as FormGroup).getRawValue()?.key ?? '';
        const keyVal = rawKey.toString().trim().toLowerCase();
        if (keyVal === 'hotel_code') {
          this.alertsService.error('Hotel_Code label cannot be removed.', this.options);
          return;
        }
      }
    }
    techInfoArray.removeAt(index);
  }

  // Create a FormGroup for Ecom attribute with conditional validation:
  // if key is entered, value becomes required.
  // Hotel_Code key is disabled only when in the PMS (pos) tab.
  createEcomAttributeGroup(key: string = '', value: string = ''): FormGroup {
    // Disable the key field only for Hotel_Code AND only for WIN HMS / Oracle integrations
    // OLD: was checked by tab (selectedTab === 'pos') — now checked by integration name
    // const isHotelCodeOnPms = this.selectedTab === 'pos' && key.trim().toLowerCase() === 'hotel_code';
    const isHotelCodeOnPms = this.isHotelCodeIntegration() && key.trim().toLowerCase() === 'hotel_code';
    // Newly added for hotel code value disabled
    /*  const group = this.fb.group({
      key: [{ value: key, disabled: isHotelCodeOnPms }],
      value: [ value: value]
    }); */
    const isValueDisabled = this.customerStatus === 'approved';
    const group = this.fb.group({
      key: [{ value: key, disabled: isHotelCodeOnPms }],
      value: [{ value: value, disabled: isValueDisabled }]
    });
    // End of newly added for hotel code value disabled
    /*
    // OLD: disabled Hotel_Code key on ALL tabs (not just PMS)
    const isHotelCode = key.trim().toLowerCase() === 'hotel_code'.toLowerCase();
    const group_old = this.fb.group({
      key: [{ value: key, disabled: isHotelCode }],
      value: [value]
    });
    */
    group.valueChanges.subscribe(() => {
      this.validateEcomAttributeGroup(group);
    });
    // Run once initially to set correct state
    this.validateEcomAttributeGroup(group);
    return group;
  }

  validateEcomAttributeGroup(group: AbstractControl | null): void {
    if (!group) return;
    const keyCtrl = group.get('key');
    const valueCtrl = group.get('value');
    if (!keyCtrl || !valueCtrl) return;
    const keyVal = (keyCtrl.value ?? '').toString().trim();
    const valueVal = (valueCtrl.value ?? '').toString().trim();
    const errors = { ...(valueCtrl.errors || {}) };
    if (keyVal && !valueVal) {
      errors['requiredWhenKey'] = true;
    } else {
      delete errors['requiredWhenKey'];
    }
    if (Object.keys(errors).length) {
      valueCtrl.setErrors(errors);
    } else {
      valueCtrl.setErrors(null);
    }
  }

  // Save Ecom Integration Settings (API Url + Attributes) for selected integration
  async saveEcomIntegration(): Promise<void> {
    if (!this.selectedEcomIntegrationData) {
      return;
    }
    const integrationFormValue = this.ecomIntegrationForm.getRawValue();
    // Re-run validation for all attribute rows before checking validity
    const techInfoArray = this.getEcomTechnicalInfoControls();
    techInfoArray.controls.forEach(ctrl => this.validateEcomAttributeGroup(ctrl));
    this.ecomTechnicalInfoForm.updateValueAndValidity({ onlySelf: false, emitEvent: false });
    // Validate main Ecom Integration fields (API URL)
    if (this.ecomIntegrationForm.invalid) {
      this.ecomIntegrationForm.markAllAsTouched();
      return;
    }
    // Validate Ecom technical info fields (Key / Value)
    if (this.ecomTechnicalInfoForm.invalid) {
      this.ecomTechnicalInfoForm.markAllAsTouched();
      return;
    }
    // Use getRawValue() to include disabled controls (like Hotel_Code key)
    const technicalInfoValue = (this.ecomTechnicalInfoForm.getRawValue().technicalInfo || []).map((attr: any) => ({
      key: attr.key || '',
      value: attr.value || ''
    }));
    /*
    const technicalInfoValue = this.ecomTechnicalInfoForm.value.technicalInfo || [];
    */
    // Update the selected item locally (customer-specific list)
    this.selectedEcomIntegrationData.api_url = integrationFormValue.api_url;
    this.selectedEcomIntegrationData.attributes = technicalInfoValue;
    // Update in generalTechInfoData (cards list)
    if (this.generalTechInfoData && Array.isArray(this.generalTechInfoData)) {
      const idx = this.generalTechInfoData.findIndex((item: any) => item.id === this.selectedEcomIntegrationData.id);
      if (idx > -1) {
        this.generalTechInfoData[idx] = {
          ...this.generalTechInfoData[idx],
          api_url: integrationFormValue.api_url,
          attributes: technicalInfoValue
        };
      }
    }
    // Update in allinfoData (full customer_technical_info payload)
    if (this.allinfoData && Array.isArray(this.allinfoData)) {
      const idxAll = this.allinfoData.findIndex((item: any) => item.id === this.selectedEcomIntegrationData.id);
      if (idxAll > -1) {
        this.allinfoData[idxAll] = {
          ...this.allinfoData[idxAll],
          api_url: integrationFormValue.api_url,
          attributes: technicalInfoValue
        };
      }
    }
    // Persist only for this customer using dedicated Ecom update function.
    // Customer (Hotel_Code) will be updated inside this method *after* technical info update succeeds.
    await this.updateCustomerEcomIntegrationSettings(this.selectedEcomIntegrationData, technicalInfoValue);
    this.closeEcomIntegrationModal();
  }

  // Update customer.Hotel_Code based on Ecom attributes (Hotel_Code key)
  async updateCustomerHotelCodeFromEcomAttributes(attributes: any[], integrationNameInput?: string, integrationTypeInput?: string): Promise<void> {
    // Use provided integration name or fall back to the one from the modal data
    const integrationName = (integrationNameInput !== undefined ? integrationNameInput : (this.selectedEcomIntegrationData?.name || '')).toString().toLowerCase();
    const integrationType = (integrationTypeInput !== undefined ? integrationTypeInput : (this.selectedEcomIntegrationData?.type || '')).toString().toLowerCase();

    console.log('[HotelCodeSync] Starting check for integration:', { integrationName, integrationType });
    console.log('[HotelCodeSync] Input Attributes:', attributes);

    // Hotel_Code is relevant for all PMS/POS (pos) integrations, and WIN HMS / Oracle
    if (integrationType !== 'pos' && integrationName !== 'win hms' && integrationName !== 'oracle') {
      console.log('[HotelCodeSync] Bypassing: Integration is not a PMS/POS or WIN HMS/Oracle system.');
      return;
    }

    // Determine new Hotel_Code value and whether the key still exists.
    let hasHotelCodeKey = false;
    let newHotelCode: string | null = null;
    if (attributes && attributes.length) {
      const hotelCodeAttr = attributes.find((attr: any) =>
        attr &&
        typeof attr.key === 'string' &&
        attr.key.trim().toLowerCase() === 'hotel_code'.toLowerCase()
      );
      if (hotelCodeAttr) {
        hasHotelCodeKey = true;
        if (hotelCodeAttr.value !== undefined && hotelCodeAttr.value !== null) {
          newHotelCode = String(hotelCodeAttr.value).trim();
        } else {
          newHotelCode = '';
        }
      }
    }
    // Always fetch latest customer data so we compare against the real current Hotel_Code
    try {
      await this.getCustomerById();
    } catch (e) {
      console.error('[HotelCodeSync] Failed to fetch customer record:', e);
      return;
    }
    const existingHotelCode: string =
      (this.customerdata && this.customerdata.Hotel_Code)
        ? String(this.customerdata.Hotel_Code)
        : '';

    console.log('[HotelCodeSync] Comparison details:', {
      hasHotelCodeKey,
      newHotelCode,
      existingHotelCode
    });

    // Decide whether and what to update on the customer:
    // 1. If Hotel_Code key exists in technical and its value changed -> update to that value (even empty string).
    // 2. If Hotel_Code key does NOT exist anymore but customer currently has a Hotel_Code -> set it to empty string.
    // 3. Otherwise, do nothing.
    let shouldUpdateCustomer = false;
    let valueToSend = existingHotelCode;
    if (hasHotelCodeKey) {
      const valueForCompare = newHotelCode ?? '';
      if (valueForCompare !== existingHotelCode) {
        shouldUpdateCustomer = true;
        valueToSend = valueForCompare;
      }
    } else {
      // key renamed/removed in technical info
      if (existingHotelCode) {
        shouldUpdateCustomer = true;
        valueToSend = '';
      }
    }

    console.log('[HotelCodeSync] Update decision:', { shouldUpdateCustomer, valueToSend });

    if (!shouldUpdateCustomer) {
      return;
    }
    try {
      // Prepare minimal payload: only Hotel_Code field, no need to send full customer object
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          customer_update: {
            Hotel_Code: valueToSend
          }
        },
        extras: {
          find: {
            customer_member_id: this.memberId
          }
        }
      };
      console.log('[HotelCodeSync] Sending request body to updateCustomerSettings:', requestBody);
      await new Promise<void>((resolve) => {
        this.hotelenrollmentservice.updateCustomerSettings(requestBody).subscribe(
          (resp: any) => {
            console.log('[HotelCodeSync] API response:', resp);
            // Confirm API actually succeeded before treating it as success
            if (!(resp?.success === 1 && resp?.status_code === 200)) {
              this.alertsService.error(
                resp?.message || 'Failed to update customer Hotel_Code',
                this.options
              );
            } else {
              // Ensure we reflect the updated Hotel_Code in our local memory immediately
              if (this.customerdata) {
                this.customerdata.Hotel_Code = valueToSend;
              }
            }
            resolve();
          },
          (err: any) => {
            console.error('[HotelCodeSync] API Error:', err);
            this.alertsService.error(
              err?.error?.message || 'Failed to update customer Hotel_Code',
              this.options
            );
            resolve();
          }
        );
      });
    } catch (error) {
      console.error('Failed to update customer Hotel_Code from Ecom attributes', error);
    }
  }
  // Update only current customer's Ecom integration settings
  updateCustomerEcomIntegrationSettings(selectedIntegration: any, attributesForSelected: any[]): Promise<void> {
    const { _id, id, created_on, is_deleted, modified_on, ...cleanedIntegration } = selectedIntegration;
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        integration_settings: cleanedIntegration
      },
      extras: {
        find: {
          id: id
        }
      }
    };
    return new Promise<void>((resolve) => {
      this.technicalInfoService.updateTechnicalInfo(requestBody).subscribe(
        async (resp: any) => {
          this.loaderService.emitComplete();
          if (resp?.success === 1 && resp?.status_code === 200) {
            this.alertsService.success(resp.message, this.options);
            // Refresh enabled ids from the updated integration (now persisted)
            if (selectedIntegration) {
              if (selectedIntegration.is_enabled === true) {
                this.enabledCustomerTechnicalInfoIds.add(Number(id));
              } else {
                this.enabledCustomerTechnicalInfoIds.delete(Number(id));
              }
            }
            // Only after technical info is successfully updated, update customer with Hotel_Code if present
            await this.updateCustomerHotelCodeFromEcomAttributes(attributesForSelected, this.selectedEcomIntegrationData?.name, this.selectedEcomIntegrationData?.type);
          } else {
            this.alertsService.error(resp?.message || 'Update failed', this.options);
          }
          resolve();
        },
        (err: any) => {
          this.loaderService.emitComplete();
          this.alertsService.error(err?.error?.message || 'Something went wrong!', this.options);
          resolve();
        }
      );
    });
  }
  // End of Ecom Integration Settings 

  // closeModal() {
  //   console.log('closing Modal');
  //   const modalEl: any = document.getElementById('paymentType');
  //   console.log('modalEl', modalEl);
  //   const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  //   console.log('modal', modal);
  //   modal.hide();
  // 
  // }

  /*  nextTabInfo() {
 
     const enabledIntegrations = this.allinfoData.filter(
       (item: any) =>
         item.type === this.selectedTab &&
         item.is_enabled === true
     );
 
     if (enabledIntegrations.length > 1) {
       this.alertsService.error(
         `Only one ${this.selectedTab === 'lock' ? 'Lock' : 'PMS'} integration can be enabled at a time.`,
         this.options
       );
       return;
     }
 
     const changedRecords = this.allinfoData.filter(
       (item: any) =>
         this.originalEnabledState[item.id] !== item.is_enabled
     );
 
     if (changedRecords.length === 0) {
 
       // No changes, just navigate
       this.navigateNextTab();
       return;
     }
 
     let completedCount = 0;
 
     changedRecords.forEach((item: any) => {
 
       this.updateTechnicalInfo(item, () => {
 
         completedCount++;
 
         if (completedCount === changedRecords.length) {
 
           this.alertsService.success(
             'Technical information updated successfully.',
             this.options
           );
 
           // Refresh original state
           changedRecords.forEach((record: any) => {
             this.originalEnabledState[record.id] =
               record.is_enabled;
           });
 
           this.navigateNextTab();
         }
 
       });
 
     });
   }
 
   navigateNextTab() {
 
     switch (this.activeTab) {
 
       case 1:
         this.selectTab('pos');
         this.secondTabCount();
         break;
 
       case 2:
         this.selectTab('other');
         this.thirdTabCount();
         break;
     }
   }
 
   updateTechnicalInfo(
     technicalInfo: any,
     callback?: () => void
   ): void {
 
     const requestBody = {
       domain_name: DOMAIN_NAME,
       user_id: USER_ID,
       payload: {
         integration_settings: technicalInfo
       },
       extras: {
         find: {
           id: technicalInfo.id
         }
       }
     };
 
     this.technicalInfoService.updateTechnicalInfo(requestBody)
       .subscribe(
         (resp: any) => {
 
           if (
             resp?.success === 1 &&
             resp?.status_code === 200
           ) {
 
             callback?.();
 
           } else {
 
             this.alertsService.error(
               resp?.message || 'Update failed',
               this.options
             );
 
           }
         },
         (err: any) => {
 
           this.alertsService.error(
             err?.error?.message || 'Something went wrong!',
             this.options
           );
 
         }
       );
   }
 
   save() {
     this.openModal();
     const changedRecords = this.allinfoData.filter(
       (item: any) =>
         this.originalEnabledState[item.id] !== item.is_enabled
     );
     if (changedRecords.length === 0) {
       this.alertsService.warn(
         'No changes found to save.',
         this.options
       );
       return;
     }
 
     let completedCount = 0;
 
     changedRecords.forEach((item: any) => {
 
       this.updateTechnicalInfo(item, () => {
 
         completedCount++;
 
         if (completedCount === changedRecords.length) {
 
           this.alertsService.success(
             'Technical information updated successfully.',
             this.options
           );
 
           changedRecords.forEach((record: any) => {
             this.originalEnabledState[record.id] =
               record.is_enabled;
           });
 
         }
 
       });
 
     });
 
   }
 
   getAllTechnicalInfo() {
     const requestBody = {
       domain_name: DOMAIN_NAME,
       user_id: USER_ID,
       extras: {
         find: {
           member_id: this.memberId
         }
       }
     };
 
     this.hotelenrollmentservice.getAllTechnicalInfo(requestBody).subscribe(
       (resp: any) => {
         this.loaderService.emitComplete();
         this.isLoading = false;
 
         if (resp && resp.success === 1 && resp.status_code === 200) {
 
           const technicalInfoList = resp.result.data || [];
 
           this.technicalInfodatalength = technicalInfoList.length;
 
           this.showEdit = this.technicalInfodatalength > 0;
           this.isTechnicalInfoExists = this.technicalInfodatalength > 0;
           this.isCustomerChoosen = this.technicalInfodatalength > 0;
 
           this.technicalInfos = technicalInfoList.filter(
             (item: any) =>
               item.is_active === true &&
               !["SMS Delivery Template", "HDFC Gateway"].includes(item.name)
           );
 
           // Store original is_enabled values from API
           this.originalEnabledState = {};
 
           this.technicalInfos.forEach((item: any) => {
             this.originalEnabledState[item.id] = item.is_enabled;
           });
 
           this.allinfoData = [...this.technicalInfos];
 
           this.generalTechInfoData = this.technicalInfos.filter(
             (item: any) => item.type === this.selectedTab
           );
         }
       },
       (err: any) => {
         this.isLoading = false;
         this.loaderService.emitComplete();
 
         if (err.error?.statusCode === 403) {
           this.alertsService.error(
             'Session Time Out! Please login Again',
             this.options
           );
 
           this.router.navigate(['/login'], {
             skipLocationChange: false
           });
 
         } else if (err.error?.message) {
 
           this.alertsService.error(
             err.error.message,
             this.options
           );
 
         } else {
 
           this.alertsService.error(
             'Something bad happened. Please try again!',
             this.options
           );
         }
       }
     );
   }
 
   onCustomerToggleSwitch(event: any, technicalInfo: any): void {
 
     const inputElement = event.target as HTMLInputElement;
     const isChecked = inputElement.checked;
 
     if (!Array.isArray(this.allinfoData)) {
       this.allinfoData = [];
     }
 
     const getIsEnabled = (item: any): boolean => {
 
       if (item.id === technicalInfo.id) {
         return isChecked;
       }
 
       // Single selection for same type
       if (
         isChecked &&
         item.type === technicalInfo.type &&
         item.id !== technicalInfo.id
       ) {
         return false;
       }
 
       return item.is_enabled === true;
     };
 
     this.generalTechInfoData = this.generalTechInfoData.map((item: any) => ({
       ...item,
       is_enabled: getIsEnabled(item)
     }));
 
     this.technicalInfos = this.technicalInfos?.map((item: any) => ({
       ...item,
       is_enabled: getIsEnabled(item)
     }));
 
     this.allinfoData = this.allinfoData.map((item: any) => ({
       ...item,
       is_enabled: getIsEnabled(item)
     }));
 
     // Store only modified records
     const modifiedRecord = this.allinfoData.find(
       (item: any) => item.id === technicalInfo.id
     );
 
     if (modifiedRecord) {
 
       const existingIndex = this.modifiedTechnicalInfos.findIndex(
         (item: any) => item.id === modifiedRecord.id
       );
 
       if (existingIndex > -1) {
         this.modifiedTechnicalInfos[existingIndex] = { ...modifiedRecord };
       } else {
         this.modifiedTechnicalInfos.push({ ...modifiedRecord });
       }
     }
 
     console.log('Modified Records', this.modifiedTechnicalInfos);
   } */
  onCustomerToggleSwitch(event: any, technicalInfo: any): void {

    const isChecked = event.target.checked;

    const getIsEnabled = (item: any): boolean => {

      if (item.id === technicalInfo.id) {
        return isChecked;
      }

      // Single select within same type
      if (
        isChecked &&
        item.type === technicalInfo.type &&
        item.id !== technicalInfo.id
      ) {
        return false;
      }

      return item.is_enabled === true;
    };

    this.generalTechInfoData = this.generalTechInfoData.map((item: any) => ({
      ...item,
      is_enabled: getIsEnabled(item)
    }));

    this.technicalInfos = this.technicalInfos.map((item: any) => ({
      ...item,
      is_enabled: getIsEnabled(item)
    }));

    this.allinfoData = this.allinfoData.map((item: any) => ({
      ...item,
      is_enabled: getIsEnabled(item)
    }));
  }

  getAllTechnicalInfo() {

    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: this.memberId
        }
      }
    };

    this.hotelenrollmentservice.getAllTechnicalInfo(requestBody).subscribe(
      (resp: any) => {

        this.loaderService.emitComplete();
        this.isLoading = false;

        if (
          resp &&
          resp.success === 1 &&
          resp.status_code === 200
        ) {

          const technicalInfoList = resp.result.data || [];

          this.technicalInfodatalength = technicalInfoList.length;

          this.showEdit = this.technicalInfodatalength > 0;
          this.isTechnicalInfoExists = this.technicalInfodatalength > 0;
          this.isCustomerChoosen = this.technicalInfodatalength > 0;

          this.technicalInfos = technicalInfoList.filter(
            (item: any) =>
              item.is_active === true &&
              !["SMS Delivery Template", "HDFC Gateway"].includes(item.name)
          );

          this.originalEnabledState = {};
          this.enabledCustomerTechnicalInfoIds = new Set<number>();

          this.technicalInfos.forEach((item: any) => {
            this.originalEnabledState[item.id] = item.is_enabled;
            if (item.is_enabled === true || item.is_enabled === 'true') {
              this.enabledCustomerTechnicalInfoIds.add(Number(item.id));
            }
          });

          this.allinfoData = [...this.technicalInfos];

          this.generalTechInfoData = this.technicalInfos.filter(
            (item: any) => item.type === this.selectedTab
          );
        }
      },
      (err: any) => {

        this.isLoading = false;
        this.loaderService.emitComplete();

        if (err.error?.statusCode === 403) {

          this.alertsService.error(
            'Session Time Out! Please login Again',
            this.options
          );

          this.router.navigate(['/login'], {
            skipLocationChange: false
          });

        } else if (err.error?.message) {

          this.alertsService.error(
            err.error.message,
            this.options
          );

        } else {

          this.alertsService.error(
            'Something bad happened. Please try again!',
            this.options
          );
        }
      }
    );
  }

  updateTechnicalInfo(
    technicalInfo: any,
    callback?: () => void
  ): void {

    const { _id, id, created_on, is_deleted, modified_on, ...cleanedTechnicalInfo } = technicalInfo;

    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        integration_settings: cleanedTechnicalInfo
      },
      extras: {
        find: {
          id: id
        }
      }
    };

    this.technicalInfoService
      .updateTechnicalInfo(requestBody)
      .subscribe(
        (resp: any) => {

          if (
            resp?.success === 1 &&
            resp?.status_code === 200
          ) {

            this.originalEnabledState[technicalInfo.id] =
              technicalInfo.is_enabled;

            if (technicalInfo.is_enabled === true || technicalInfo.is_enabled === 'true') {
              this.enabledCustomerTechnicalInfoIds.add(Number(technicalInfo.id));
            } else {
              this.enabledCustomerTechnicalInfoIds.delete(Number(technicalInfo.id));
            }

            callback?.();

          } else {

            this.alertsService.error(
              resp?.message || 'Update failed',
              this.options
            );
          }
        },
        (err: any) => {

          this.alertsService.error(
            err?.error?.message || 'Something went wrong!',
            this.options
          );
        }
      );
  }

  navigateNextTab() {
    switch (this.activeTab) {
      case 1:
        this.selectTab('pos');
        this.secondTabCount();
        break;
      case 2:
        this.selectTab('other');
        this.thirdTabCount();
        break;
    }
  }

  async syncCustomerHotelCodeFromActivePms(): Promise<void> {
    if (this.selectedTab !== 'pos') {
      return;
    }
    const activePms = this.generalTechInfoData?.find(
      (item: any) => item.type === 'pos' && item.is_enabled === true
    );
    if (activePms) {
      await this.updateCustomerHotelCodeFromEcomAttributes(activePms.attributes || [], activePms.name, activePms.type);
    } else {
      await this.updateCustomerHotelCodeFromEcomAttributes([], '', 'pos');
    }
  }

  nextTabInfo() {

    const enabledIntegrations = this.generalTechInfoData.filter(
      (item: any) => item.is_enabled === true
    );

    if (enabledIntegrations.length > 1) {
      const tabName = this.selectedTab === 'lock' ? 'Lock' : (this.selectedTab === 'pos' ? 'PMS' : 'Other');
      this.alertsService.error(
        `Only one ${tabName} integration can be enabled at a time.`,
        this.options
      );

      return;
    }
    const changedRecords = this.generalTechInfoData.filter(
      (item: any) =>
        this.originalEnabledState[item.id] !== item.is_enabled
    );

    if (changedRecords.length === 0) {

      this.navigateNextTab();
      return;
    }

    let completedCount = 0;

    changedRecords.forEach((item: any) => {

      this.updateTechnicalInfo(item, async () => {

        completedCount++;

        if (completedCount === changedRecords.length) {

          this.alertsService.success(
            'Technical information updated successfully.',
            this.options
          );

          await this.syncCustomerHotelCodeFromActivePms();
          this.navigateNextTab();
        }

      });

    });
  }

  save() {

    const enabledIntegrations = this.generalTechInfoData.filter(
      (item: any) => item.is_enabled === true
    );

    if (enabledIntegrations.length > 1) {
      const tabName = this.selectedTab === 'lock' ? 'Lock' : (this.selectedTab === 'pos' ? 'PMS' : 'Other');
      this.alertsService.error(
        `Only one ${tabName} integration can be enabled at a time.`,
        this.options
      );

      return;
    }
    // Newly added for is_technical_info_exists key updation
    if (!this.customerdata?.is_technical_info_exists) {
      this.updateCustomer();
    }
    // End of is_technical_info_exists key updation
    const changedRecords = this.generalTechInfoData.filter(
      (item: any) =>
        this.originalEnabledState[item.id] !== item.is_enabled
    );

    if (changedRecords.length === 0) {
      // Newly added for not opening payment modal once done
      // this.openModal();
      if (this.paymentDone) {
        this.continue.emit();
      }
      else {
        this.openModal();
      }
      // End of not opening payment modal once done
      return;
    }

    let completedCount = 0;

    changedRecords.forEach((item: any) => {

      this.updateTechnicalInfo(item, async () => {

        completedCount++;

        if (completedCount === changedRecords.length) {

          this.alertsService.success(
            'Technical information updated successfully.',
            this.options
          );

          await this.syncCustomerHotelCodeFromActivePms();
          // Newly added for not opening payment modal once done
          // this.openModal();
          if (this.paymentDone) {
            this.continue.emit();
          } else {
            this.openModal();
          }
          // End of not opening payment modal once done
        }

      });

    });
  }

}


