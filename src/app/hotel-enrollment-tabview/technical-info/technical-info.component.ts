import { CommonModule } from '@angular/common';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { Component, Output, EventEmitter, AfterViewInit, Input, OnInit } from '@angular/core';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ProfileService } from '../../profile/profile.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview.service';
import { CheckoutApiService } from '../checkout.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
// Newly added
import { TechnicalInfoService } from './technical-info.service';
import { EditTechnicalInfoComponent } from './edit-technical-info/edit-technical-info.component';
// Newly added for payment
import { Subscription } from 'rxjs';


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

  constructor(
    private localService: LocalStorageService,
    private router: Router,
    private alertsService: AlertsService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private profileSrvice: ProfileService,
    private activatedRoute: ActivatedRoute,
    private checkoutApiService: CheckoutApiService,
    private technicalInfoService: TechnicalInfoService) {


  }

  async ngOnInit(): Promise<void> {
    this.hotelId = Number(this.localService.get('UserId'));
    if (this.hotelId !== 0) {
      try {
        // this.getInfoData();
        await this.getCustomerById();
        this.getAllTechnicalInfo();
        // Newly added for payment

      } catch (err) {
        ////console.error('Failed to get customer by ID:', err);
      }
    }
    // Nelwy added for Payment
    // Subscribe to "Pay Now" events from header
    this.payNowSub = this.technicalInfoService.payNow$.subscribe(() => {
      this.payNow(); // call your existing payNow method
    });
  }

  // Nelwy added for Payment
  ngOnDestroy() {
    this.payNowSub.unsubscribe();
  }


  // onSubmit() {
  //   this.customerUpdate();
  // }

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
          id: this.hotelId
        }
      }
    }
    this.hotelenrollmentservice.updateCustomer(requestBody).subscribe(
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
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            this.status = this.customerdata.status;
            this.isMemberid = this.customerdata.status == 'Order Confirmed' ? true : false;
            this.Memberid = this.customerdata.customer_member_id;
            console.log(this.Memberid, "Member id");
            ////console.log('Status:', this.status)
            ////console.log(this.customerdata, "RESPDATA");
            ////console.log(Array.isArray(this.customerdata));
            resolve();  // Resolve promise when data is set
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertsService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertsService.error(err.error.message, this.options);
          } else {
            this.alertsService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }


  async executePayment() {
    await this.getCustomerById();
    await this.payNow();
  }
  // // Newly added
  getAllTechnicalInfo() {
    let checkExistingTechnicalInfoAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID, //Default user id
      "extras": {
        "find": {
          "customer_id": this.hotelId
        }
      }
    }
    this.hotelenrollmentservice.getAllTechnicalInfo(checkExistingTechnicalInfoAvailbility).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp) {
          this.technicalInfodatalength = resp.result.data.length;
          ////console.log('Technical Info Length Based On Customer Id:', this.technicalInfodatalength);
          if (this.technicalInfodatalength > 0) {
            const customerData = resp.result.data[0];
            const customerTechInfo = customerData.customer_technical_info || [];
            // Step 1: Get only enabled customer-specific technical info
            const enabledCustomerTechInfo = customerTechInfo.filter((item: any) => item.is_enabled === true);
            const enabledCustomerIds = new Set(enabledCustomerTechInfo.map((item: any) => item.id));
            this.generalTechInfoData = customerTechInfo.filter((item: any) => item.type == this.selectedTab);
            this.technicalInfoData = customerData;
            this.showEdit = true;
            this.isTechnicalInfoExists = true;
            this.isCustomerChoosen = true;
            // Step 2: Fetch and filter common technical info
            const commonReq = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              extras: {
                find: {}
              }
            };
            this.hotelenrollmentservice.getAllTechnicalInfo(commonReq).subscribe(
              (commonResp: any) => {
                if (commonResp.success === 1 && commonResp.status_code === 200) {
                  const allCommonData = commonResp.result.data || [];
                  const rawCommonTechInfo = allCommonData.filter((item: any) => item.customer_id === undefined);
                  // Step 3: Filter only those common items where is_enabled is missing or false,
                  // and not already in customer's enabled info
                  const filteredCommonTechInfo = rawCommonTechInfo.filter(
                    (item: any) =>
                      (!item.hasOwnProperty('is_enabled') || item.is_enabled === false) &&
                      !enabledCustomerIds.has(item.id)
                  );
                  // Step 4: Combine both sets
                  this.technicalInfos = [...enabledCustomerTechInfo, ...filteredCommonTechInfo];
                  this.allinfoData = this.technicalInfos;
                  ////console.log('Final Technical Info List:', this.technicalInfos);
                }
              })
          }
          if (this.technicalInfodatalength == 0) {
            let requestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              "extras": {
                "find": {}
              }
            }
            this.hotelenrollmentservice.getAllTechnicalInfo(requestBody).subscribe(
              (resp: any) => {
                this.loaderService.emitComplete();
                ////console.log('All Technical Info Length:', resp.result.data.length);
                if (resp.success === 1 && resp.status_code === 200) {
                  this.showEdit = false;
                  this.isTechnicalInfoExists = false;
                  ////console.log('TechnicalInfo Exists:', this.isTechnicalInfoExists);
                  // ////console.log('All Technical Info(without customer id checking):', resp.result.data);
                  if (resp.result.data.length > 0) {
                    this.technicalInfos = resp.result.data.filter((technicaalInfo: any) => technicaalInfo.customer_id == undefined);
                    this.allinfoData = this.technicalInfos;
                    ////console.log('Common Technical Info(without customer_id):', this.technicalInfos)
                    this.generalTechInfoData = this.technicalInfos.filter((item: any) => item.type == this.selectedTab);
                    // ////console.log(this.technicalInfos, 'Common Technical Info Data(with customer id checking)');
                  }
                }
              },
              (err: any) => {
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
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        // ////console.error('getCustomerById error:', err);
        if (err.error.statusCode === 403) {
          this.alertsService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate([`/login`], { skipLocationChange: false });
        } else if (err.error.message) {
          this.alertsService.error(err.error.message, this.options);
        } else {
          this.alertsService.error('Something bad happened. Please try again!', this.options);
        }
      }
    );
  }

  getIsActive(technicalInfo: any): boolean {
    if (!this.selectedTechnicalInfoToCreate || !Array.isArray(this.selectedTechnicalInfoToCreate)) {
      return false;
    }
    const match = this.selectedTechnicalInfoToCreate.find(
      (item: any) => item.id === technicalInfo.id
    );
    return match ? match.is_active : false;
  }

  async technicalInfoCreate(selectedTechnicalInfoToCreate: any): Promise<void> {
    const memberId = this.localService.get('MemberId');
    console.log(memberId, 'Tech member id');
    // delete this.selectedTechnicalInfoToCreate._id
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          create_technical_info: {
            customer_id: this.hotelId,
            customer_technical_info: selectedTechnicalInfoToCreate,
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
              this.updateCustomer();
              this.customerdata();
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

  updateTechnicalInfo(updatedTechnicalInfo: any): void {
    // if (!this.technicalInfoData) {
    //   this.alertsService.error('Customer technical info data not found. Please fetch first.', this.options);
    //   return;
    // }
    // const updatedCustomerTechnicalInfo = updtaedTechnicalInfo;
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_technical_info: {
          customer_technical_info: updatedTechnicalInfo
        }
      },
      extras: {
        find: {
          customer_id: this.hotelId
        }
      }
    };
    ////console.log('Called 1')
    ////console.log("Final payload:", requestBody);
    this.technicalInfoService.updateTechnicalInfo(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp?.status_code === 200) {
          this.alertsService.success(resp.message, this.options);
          this.updateCustomer();
          this.customerdata();

          // this.payNow();
          this.localService.set('maxTabReached', 4);
        } else {
          this.alertsService.error(resp?.message || 'Update failed', this.options);
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        this.alertsService.error(err?.error?.message || 'Something went wrong!', this.options);
      }
    );
  }

  save() {
    ////console.log("111", this.isTechnicalInfoExists)
    if (this.isTechnicalInfoExists) {
      ////console.log('Called')
      this.updateTechnicalInfo(this.allinfoData);
    }
    else {
      if (this.allinfoData.length > 0) {
        ////console.log('Creating technical info with:', this.allinfoData);
        this.technicalInfoCreate(this.allinfoData);
      }
      else {
        this.alertsService.warn('Please choose a technical info before proceeding.', this.options);
      }
    }
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    const uniqueInfos = this.technicalInfos.filter(
      (item: any, index: any, self: any) => index === self?.findIndex((t: any) => t.id === item.id)
    );
    this.generalTechInfoData = uniqueInfos.filter((item: any) => item.type === this.selectedTab);
    // Optional: update allinfoData with deduplicated latest data
    this.allinfoData = [
      ...this.allinfoData.filter((existing: any) => !this.generalTechInfoData.some((newItem: any) => newItem.id === existing.id)),
      ...this.generalTechInfoData,
    ];
  }

  onCustomerToggleSwitch(event: any, technicalInfo: any): void {
    const inputElement = event.target as HTMLInputElement;
    const isChecked = inputElement.checked;
    if (!Array.isArray(this.allinfoData)) {
      this.allinfoData = [];
    }
    // Remove old entry if it exists
    this.allinfoData = this.allinfoData.filter((item: any) => item.id !== technicalInfo.id);
    // Add updated entry with new is_enabled value
    this.allinfoData.push({
      ...technicalInfo,
      is_enabled: isChecked
    });
    // Update technicalInfos
    for (let i = 0; i < this.technicalInfos.length; i++) {
      if (technicalInfo.id === this.technicalInfos[i].id) {
        this.technicalInfos[i].is_enabled = isChecked;
      }
    }
    // Update generalTechInfoData
    for (let i = 0; i < this.generalTechInfoData.length; i++) {
      if (technicalInfo.id === this.generalTechInfoData[i].id) {
        this.generalTechInfoData[i].is_enabled = isChecked;
      }
    }
    // Ensure all items in allinfoData have an is_enabled key
    this.allinfoData = this.allinfoData.map((item: any) => {
      if (!item.hasOwnProperty('is_enabled')) {
        return { ...item, is_enabled: false };
      }
      return item;
    });
    // Force change detection
    this.generalTechInfoData = [...this.generalTechInfoData];
    ////console.log('All info data after toggling:', this.allinfoData);
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


  // chooseTechnicalInfo(technicalInfo: any): void {
  //   const index = this.selectedTechnicalInfoToCreate.findIndex(
  //     (item: any) => item.id === technicalInfo.id
  //   );
  //   if (index === -1) {
  //     // Not found, add new with is_active: true
  //     this.selectedTechnicalInfoToCreate.push({
  //       ...technicalInfo,
  //       is_active: true
  //     });
  //   } else {
  //     if (this.isTechnicalInfoExists) {
  //       this.selectedTechnicalInfoToCreate[index].is_active =
  //         !this.selectedTechnicalInfoToCreate[index].is_active;
  //     }
  //     else {
  //       // Found, remove if toggled off
  //       this.selectedTechnicalInfoToCreate.splice(index, 1);
  //     }
  //   }
  //   ////console.log('Selected technical info array:', this.selectedTechnicalInfoToCreate);
  // }

  // getActive(technicalInfo: any): boolean {
  //   if (!this.generalTechInfoData || !Array.isArray(this.generalTechInfoData)) {
  //     return false;
  //   }
  //   const match = this.generalTechInfoData.find(
  //     (item: any) => item.id === technicalInfo.id
  //   );
  //   return match ? match.is_active : false;
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


  // onContinue() {
  //   // this.continue.emit()
  //   this.router.navigate(['/edit-new-hotel', this.hotelId]).then(
  //     success => {
  //       if (success) {
  //         // this.continue.emit();
  //         this.localService.set('maxTabReached', 4);
  //         // this.localService.set('currentTab', 4);
  //         // Optional: call next function here
  //       } else {
  //         ////console.log('Navigation failed!');
  //       }
  //     }
  //   ).catch(err => {
  //     ////console.error('Navigation error:', err);
  //   });
  //   // this.localService.set('currentTab', 6);
  // }

  // getInfoData() {
  //   let checkExistingTechnicalInfoAvailbility = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     "extras": {
  //       "find": {
  //       }
  //     }
  //   }
  //   this.technicalInfoService.getAllTechnicalInfo(checkExistingTechnicalInfoAvailbility).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp) {
  //         this.technicalInfoData = resp.result.data[0];

  //         ////console.log(this.generalTechInfoData, '  this.generalTechInfoData')
  //         ////console.log('Customer technicalInfo data', this.technicalInfoData);
  //         this.technicalInfodatalength = resp.result.data.length;
  //         ////console.log('checkExistingtechnicalInfoAvailbility', this.technicalInfodatalength);
  //         if (this.technicalInfodatalength == 0) {
  //           let requestBody = {
  //             domain_name: DOMAIN_NAME,
  //             user_id: USER_ID,
  //             "extras": {
  //               "find": {}
  //             }
  //           }
  //           this.technicalInfoService.getAllTechnicalInfo(requestBody).subscribe(
  //             (resp: any) => {
  //               this.loaderService.emitComplete();
  //               if (resp.success === 1 && resp.status_code === 200) {
  //                 this.isTechnicalInfoExists = false;
  //                 ////console.log('TechnicalInfo Exists:', this.isTechnicalInfoExists);
  //                 ////console.log('All Technical Info(without customer id checking):', resp.result.data);
  //                 ////console.log('All Technical Info Length:', resp.result.data.length);
  //                 if (resp.result.data.length > 0) {
  //                   this.technicalInfos = resp.result.data.filter((technicaalInfo: any) => technicaalInfo.customer_id === undefined);
  //                   this.generalTechInfoData = this.technicalInfos.filter((item: any) => item.type == this.selectedTab);
  //                   ////console.log(this.technicalInfos, 'Common Technical Info Data(with customer id checking)');
  //                 }
  //               }
  //             },
  //             (err: any) => {
  //               if (err.error.statusCode === 403) {
  //                 this.alertsService.error('Session Time Out! Please login Again', this.options)
  //                 this.router.navigate([`/login`], { skipLocationChange: false });
  //               }
  //               else if (err.error.message) {
  //                 this.alertsService.error(err.error.message, this.options)
  //               }
  //               else {
  //                 this.alertsService.error('Something bad happened. Please try again!', this.options);
  //               }
  //             }
  //           )
  //         }
  //         else {
  //           this.isTechnicalInfoExists = true;
  //           let requestBody = {
  //             domain_name: DOMAIN_NAME,
  //             user_id: USER_ID,
  //             "extras": {
  //               "find": {}
  //             }
  //           }
  //           this.technicalInfoService.getAllTechnicalInfo(requestBody).subscribe(
  //             (resp: any) => {
  //               this.loaderService.emitComplete();
  //               if (resp.success === 1 && resp.status_code === 200) {
  //                 if (resp.result.data.length > 0) {
  //                   this.technicalInfos = resp.result.data;
  //                   this.isTechnicalInfoExists = true;
  //                   this.generalTechInfoData = this.technicalInfos.filter((item: any) => item.type == this.selectedTab);
  //                 }
  //               }
  //             },
  //             (err: any) => {
  //               if (err.error.statusCode === 403) {
  //                 this.alertsService.error('Session Time Out! Please login Again', this.options)
  //                 this.router.navigate([`/login`], { skipLocationChange: false });
  //               }
  //               else if (err.error.message) {
  //                 this.alertsService.error(err.error.message, this.options)
  //               }
  //               else {
  //                 this.alertsService.error('Something bad happened. Please try again!', this.options);
  //               }
  //             }
  //           )
  //         }
  //       }
  //     },
  //     (err: any) => {
  //       this.loaderService.emitComplete();
  //       // ////console.error('getCustomerById error:', err);
  //       if (err.error.statusCode === 403) {
  //         this.alertsService.error('Session Time Out! Please login Again', this.options);
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       } else if (err.error.message) {
  //         this.alertsService.error(err.error.message, this.options);
  //       } else {
  //         this.alertsService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   );
  // }

  // onCustomerToggleSwitch(event: any, technicalInfo: any): void {
  //   ////console.log(technicalInfo, "technicalInfo")
  //   const inputElement = event.target as HTMLInputElement;
  //   const isChecked = inputElement.checked;
  //   if (!Array.isArray(this.allinfoData)) {
  //     this.allinfoData = [];
  //   }
  //   // Remove old entry for this item if exists
  //   this.allinfoData = this.allinfoData.filter((item: any) => item.id !== technicalInfo.id);
  //   // Push the updated entry
  //   this.allinfoData.push({
  //     ...technicalInfo,
  //     is_enabled: isChecked
  //   });
  //   // Optional: log the result
  //   ////console.log('After toggle:', this.allinfoData, this.generalTechInfoData, this.technicalInfos);
  //   for (let i = 0; i < this.technicalInfos.length; i++) {
  //     if (technicalInfo.id === this.technicalInfos[i].id) {
  //       this.technicalInfos[i].is_enabled = true;
  //       // this.generalTechInfoData[i].is_enabled=true;
  //       ////console.log("111 enabled", this.technicalInfos, this.generalTechInfoData)
  //     }
  //   }
  //   for (let i = 0; i < this.generalTechInfoData.length; i++) {
  //     if (technicalInfo.id === this.generalTechInfoData[i].id) {
  //       this.generalTechInfoData[i].is_enabled = true;
  //       // this.generalTechInfoData[i].is_enabled=true;
  //       ////console.log("111 enabled", this.technicalInfos, this.generalTechInfoData)
  //     }
  //   }
  //   ////console.log('All info data after toggling:', this.allinfoData)
  // }

  // getTechInfoBasedOnCustomer() {
  //   let checkExistingTechnicalInfoAvailbility = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID, //Default user id
  //     "extras": {
  //       "find": {
  //         "customer_id": this.hotelId
  //       }
  //     }
  //   }
  //   this.hotelenrollmentservice.getAllTechnicalInfo(checkExistingTechnicalInfoAvailbility).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp) {
  //         this.customerTechInfo = resp.result.data[0];
  //         ////console.log(this.customerTechInfo, '  this.customerTechInfo');
  //         ////console.log('Customer technicalInfo data', this.technicalInfoData);
  //         this.technicalInfodatalength = resp.result.data.length;
  //         ////console.log('checkExistingtechnicalInfoAvailbility', this.technicalInfodatalength);
  //         // this.checkExistingtechnicalInfoChoosen = this.technicalInfoData;
  //       }
  //     },
  //     (err: any) => {
  //       this.loaderService.emitComplete();
  //       // ////console.error('getCustomerById error:', err);
  //       if (err.error.statusCode === 403) {
  //         this.alertsService.error('Session Time Out! Please login Again', this.options);
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       } else if (err.error.message) {
  //         this.alertsService.error(err.error.message, this.options);
  //       } else {
  //         this.alertsService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   );
  // }

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
          id: this.hotelId
        }
      }
    }
    this.hotelenrollmentservice.updateCustomer(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // ////console.log(resp);
            this.hotelenrollmentservice.clearAdminFormEvent();
            ////console.log(resp.message, "resp.message")
            this.alertsService.success(resp.message, this.options);


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

  nextTabInfo() {
    console.log('Before navigation: activeTab =', this.activeTab);
    this.isTechnicalInfoExists
      ? this.updateTechnicalInfo(this.allinfoData)
      : this.technicalInfoCreate(this.allinfoData);
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
    console.log('After navigation: activeTab =', this.activeTab);
  }

  // Newly added for back
  back() {
    if (this.activeTab == 1) {
      var back = document.getElementById('Hierarchy');
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


  // Newly added for payment
  getLastOrderForCustomer(): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { customer_id: this.customerdata.id }
        }
      };
      this.hotelenrollmentservice.orderDetailsGetById(req).subscribe({
        next: (res: any) => {
          this.orderdata = res?.result?.data?.[0] || null;
          console.log('Latest order data of customer:', this.orderdata);
          resolve(this.orderdata);
        },
        error: (err: any) => {
          console.error('Error fetching last order:', err);
          reject(err);
        }
      });
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
  //     console.log("All installments are already paid!");
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
    // 1️⃣ Fetch last order
    await this.getLastOrderForCustomer();
    const lastOrder = this.orderdata || null;
    console.log('Last Order:', lastOrder);

    let payment_split: any[] = [];
    let paymentType = "";
    let installments = 1;
    let orderAmount = 1;
    // 2️⃣ Determine if we have previous cycles
    if (!lastOrder) {
      payment_split = [];
    } else {
      payment_split = lastOrder.payment_split.map((cycle: any) => ({ ...cycle }));
    }
    // 3️⃣ Check if all cycles are fully paid
    const allPaid = payment_split.length === 0 || payment_split.every(cycle =>
      cycle.installments.every((inst: any) => inst.status === "Paid")
    );
    if (allPaid) {
      // 🔹 Create a new cycle based on selected payment type
      const sizeMap: any = {
        "01-50 Rooms": 4,
        "51-101 Rooms": 5,
        "101-150 Rooms": 6,
        "50 and above Rooms": 7
      };
      orderAmount = sizeMap[this.customerdata.property_details.property_address.property_size] || 1;
      if (this.selectedIndex === 0) { paymentType = "quarterly"; installments = 4; }
      if (this.selectedIndex === 1) { paymentType = "half-yearly"; installments = 2; }
      if (this.selectedIndex === 2) { paymentType = "full"; installments = 1; }
      const subTotalPerInstallment = orderAmount / installments;
      const taxPerInstallment = subTotalPerInstallment * 0.18;
      const totalPerInstallment = subTotalPerInstallment + taxPerInstallment;
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
          sub_total: 0.70,
          tax: 0.30,
          order_total_amount: 1.00,
          subscription_end_date
        });
      }

      payment_split.push({
        name: paymentType,
        installments: installmentArr
      });
    } else {
      // 🔹 If not all paid, reuse last order's next unpaid installment
      const nextUnpaidCycleIndex = payment_split.findIndex(cycle =>
        cycle.installments.some((inst: any) => inst.status === "Not Paid")
      );
      if (nextUnpaidCycleIndex === -1) {
        console.log("All installments are already paid!");
        return;
      }
      paymentType = payment_split[nextUnpaidCycleIndex].name;
    }

    console.log('Payment Split:', payment_split);
    console.log('Payment Type:', paymentType);

    // 4️⃣ Find next unpaid installment
    let nextUnpaid;
    for (let cycle of payment_split) {
      nextUnpaid = cycle.installments.find((inst: any) => inst.status === "Not Paid");
      if (nextUnpaid) break;
    }
    if (!nextUnpaid) {
      console.log("All installments are already paid!");
      return;
    }

    // 5️⃣ Prepare order_review
    const order_review = {
      order_summary: {
        sub_total: nextUnpaid.sub_total,
        tax: nextUnpaid.tax,
        order_total_amount: nextUnpaid.order_total_amount
      }
    };

    // 6️⃣ Prepare orderData (kept exactly as you provided)
    const orderData = {
      customer_id: this.customerdata.id,
      status: "Awaiting Payment",
      status_id: "1",
      system_label: "Pending",
      orderConfirmDate: new Date(),
      subscription_end_date: nextUnpaid.subscription_end_date,
      customer: {
        customer_id: this.customerdata.id,
        customer_name: this.customerdata.first_name,
        email: this.customerdata.email,
        customer_type: "business customer",
        phone_number: this.customerdata.phone_number,
        address: this.customerdata.property_details.property_address.property_address,
        brand: this.customerdata.property_details.contact_details.brand,
        hotel_name: this.customerdata.property_details.contact_details.hotel_name,
        property_size: this.customerdata.property_details.property_address.property_size,
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
            "customer_id": this.customerdata.id,
            "alias": "",
            "first_name": this.customerdata.first_name,
            "gst_number": "",
            "last_name": "",
            "company_name": "",
            "entire_location": this.customerdata.email,
            "address1": this.customerdata.property_details.property_address.property_address,
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
        "email": this.customerdata.property_details.contact_details.email,
        "phone_number": this.customerdata.property_details.contact_details.primary_phone_number,
        "address": this.customerdata.property_details.property_address.property_address,
        "is_email_opt_in": false
      },
      payment_type: paymentType,
      payment_split,
      order_review,
      organization_id: 46,
      store_id: 1,
      created_by: this.localService.get('UserId'),
      is_deleted: false,
      is_active: true,
      modified_by: 16
    };

    console.log('Order Data:', orderData);

    // 7️⃣ Upsert order and generate payment link
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



}


