import { USER_ID } from './../app.config';
import { LocalStorageService } from './../auth-services/local-storage.service';
import { Component, OnInit, ChangeDetectorRef, Input, ViewChild } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { MenuBarComponent } from '../shared/menu-bar/menu-bar.component';
import { OfficeDetailsComponent } from './office-details/office-details.component';
import { PropertyDetails1Component } from './property-details1/property-details1.component';
import { ServiceDetailsComponent } from './service-details/service-details.component';
import { HierarchyDetailsComponent } from './hierarchy-details/hierarchy-details.component';
import { TechnicalInfoComponent } from './technical-info/technical-info.component';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { HotelEnrollmentTabviewService } from './hotel-enrollment-tabview.service';
import { LoaderService } from '../shared/loader/loader.service';
import { AlertsService } from '../shared/alerts/alerts.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { DOMAIN_NAME } from '../app.config';
import { HierarchyDetailService } from './hierarchy-details/hierarchy-details.service';
import { TechnicalInfoService } from './technical-info/technical-info.service';
import { ServiceDetailService } from './service-details/service-details.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { Subscription } from 'rxjs';
import { NavigationStart } from '@angular/router';

export let browserRefresh = false;

@Component({
  selector: 'app-hotel-enrollment-tabview',
  standalone: true,
  imports: [HeaderComponent, MenuBarComponent, OfficeDetailsComponent, PropertyDetails1Component, CommonModule, ServiceDetailsComponent, HierarchyDetailsComponent, TechnicalInfoComponent],
  templateUrl: './hotel-enrollment-tabview.component.html',
  styleUrl: './hotel-enrollment-tabview.component.scss'
})

export class HotelEnrollmentTabviewComponent implements OnInit {
  @ViewChild(OfficeDetailsComponent) officeDetailsComp!: OfficeDetailsComponent;
  @ViewChild(PropertyDetails1Component) propertyDetailsComp!: PropertyDetails1Component;
  private currentRoute$ = new BehaviorSubject<string>('');
  hotelId: Number | null = null;
  customerdata: any;
  orderdata: any;
  isHierarchyExist: boolean = false;
  isServiceExist: boolean = false;
  isTechnicalInfoExist: boolean = false;
  isOrderExist: boolean = false;
  static alreadyChecked = false;
  getCustomerData: any;
  callonce = true;
  idlistToDelete: any = []
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  hasCheckedTabs = false;
  isReadyToRender = false;
  // Newly added
  tabTitles = [
    'Registered Office Details',
    'Property Details',
    'Services',
    'Hierarchy',
    'Technical Info',
    'Status',
  ];
  currentTab = 0;
  maxTabReached = 0;
  password: any;
  memberId: string | null = null;
  @Input() isVisible = false;
  iscancelVisible = false;
  // Newly added for payment verification
  paymentDone: boolean = false;
  // Newly added for back navigation
  skipAutoTabCheck !: boolean;
  hierarchyTab: boolean = false;
  customer: any;
  order: any;
  order_review: any;


  ngOnInit(): void {
    // Newly added for back navigation
    this.route.queryParams.subscribe(params => {
      console.log('queryParams', params);
      const tabIndex = +params['tab'];
      if (!isNaN(tabIndex) && tabIndex == 3) {
        // this.skipAutoTabCheck = true; //  prevent override
        this.hierarchyTab = true;
        this.goToTab(tabIndex, true);
      }
      // Removes tab param from URL
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: null },
        queryParamsHandling: 'merge'
      });
    });
    const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navigationEntries.length > 0) {
      console.log("navigationEntries", navigationEntries);
      const navType = navigationEntries[0].type;
      const loader = document.getElementById('loader-overlay');
      //  Show loader
      if (loader) {
        loader.classList.remove('d-none', 'hide');
        //  Wait for 2 seconds (2000 ms), then hide the loader
        setTimeout(() => {
          loader.classList.add('d-none', 'hide');
          //console.log("Loader hidden after 2 seconds");
        }, 2000);
      } else {
        //console.warn("Loader element not found!");
      }
      if (navType === "reload" && !this.router.url.includes('confirmation')) {
        //console.log("Page was reloaded");
        setTimeout(() => {
          console.log("✔️ checkAndActivateInvalidTab ran after 3 seconds");
          // console.log('Auto check:', this.skipAutoTabCheck);
          // Newly added for back navigation - skipAutoTabCheck
          if (!this.skipAutoTabCheck) {
            this.checkAndActivateInvalidTabOnLoad();
            //console.log("checkAndActivateInvalidTab ran after 3 seconds");
          }
        }, 2000); // 3000 ms = 3 seconds
        this.isReadyToRender = true;
      } else if (navType === "navigate" && !this.router.url.includes('confirmation')) {
        //console.log("Page was loaded normally (navigation)");
        setTimeout(() => {
          console.log("✔️ checkAndActivateInvalidTab ran after 3 seconds from edit");
          console.log('Auto check:', this.skipAutoTabCheck);
          // Newly added for back navigation - skipAutoTabCheck
          if (!this.skipAutoTabCheck) {
            this.checkAndActivateInvalidTabOnLoad();
            console.log("✔️ checkAndActivateInvalidTab ran after 3 seconds");
          }
        }, 2000); // 3000 ms = 3 seconds
      } else if (navType === "back_forward" && !this.router.url.includes('confirmation')) {
        //console.log("Page was accessed via back or forward button");
        setTimeout(() => {
          this.checkAndActivateInvalidTabOnLoad();
          //console.log("✔️ checkAndActivateInvalidTab ran after 3 seconds");
        }, 2000); // 3000 ms = 3 seconds
      } else {
        //console.log("Page load type:", navType);
      }
    }
    //   if(this.callonce==true){
    // this.callonce=false;
    //   }
    // if (isReloaded || !sessionStorage.getItem('alreadyChecked')) {
    //   sessionStorage.setItem('alreadyChecked', 'true');
    //   const initialTab = this.currentTab;  // Store the tab before setTimeout
    //   //console.log(this.currentTab,initialTab,"tab check")
    //   setTimeout(() => {
    //     // Only run if currentTab hasn't been manually changed
    //     if (this.currentTab === initialTab) {
    //       this.checkAndActivateInvalidTab();
    //       //console.log("✔️ checkAndActivateInvalidTab ran on page load or reload");
    //     } else {
    //       //console.log("❌ checkAndActivateInvalidTab skipped due to manual tab navigation");
    //     }
    //   }, 2000);
    // }
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        console.log('Current Route Updated:', event.urlAfterRedirects);
        this.currentRoute$.next(event.urlAfterRedirects);
      });
    this.hotelId = Number(this.localService.get('UserId'));
    if (this.hotelId == 0) {
      this.route.queryParams.subscribe(params => {
        this.hotelId = params['customer_id'];
        // console.log('Customer ID:',  this.hotelId);  
      });
    }
    // const customerId = this.route.snapshot.paramMap.get('customer_id');
    // this.hotelId = customerId ? +customerId : Number(this.localService.get('UserId')) || 0;
    // if (this.hotelId !== 0) {
    //   this.getCustomerById()
    //     .then(() => {
    //       console.log('✅ After getCustomerById -> hotelId =', this.hotelId);
    //       this.getOrderById(Number(this.hotelId));
    //     })
    //     .catch(err => console.error('❌ getCustomerById failed', err));
    // } else {
    //   console.error('❌ Invalid hotelId. Cannot proceed.');
    // }
    // console.log('🚀 ngOnInit: this.hotelId =', this.hotelId);
    //console.log('Hotel ID:', this.hotelId);

    this.memberId = this.localService.get('MemberId');
    const currentUrl = this.router.url;
    const searchValue = 'confirmation'; // Replace with your actual value
    // if (currentUrl.includes(searchValue)) {
    //   //console.log(`Value "${searchValue}" found in the URL.`);
    //     //
    //   this.isVisible = true;
    // } 
    // else {
    //   //console.log(`Value "${searchValue}" NOT found in the URL.`);
    // }
    this.getCustomerById()
      .then(() => {
        // First function succeeded
        this.getOrderById(); // Call second function return this.getOrderById(); // Return the promise so it can be chained
      })

      .catch(err => {
        // Handle any error from getCustomerById
        //console.error('Failed to get customer by ID:', err);
      });
    this.password = this.localService.get('Password');
    this.router.events.subscribe(event => {
      // if (event instanceof NavigationEnd) {
      //   const currentUrl = event.url; // Get the current URL
      //   //console.log('Current URL:', currentUrl); // Debugging (Optional)
      //   if (currentUrl.includes('confirmation')) {
      //     this.currentTab = 5;
      //   }
      // }
    });

  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authTokenService: AuthTokenService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alertService: AlertsService, private cdr: ChangeDetectorRef,
    private localService: LocalStorageService,
    private technicalInfoService: TechnicalInfoService,
    private hierarchyService: HierarchyService,
    private serviceDetails: ServiceDetailService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.url; // Get the current URL
        //console.log('Current URL:', currentUrl); // Debugging (Optional)
        // Enable showSidebar if URL contains "confirmation"
        this.isVisible = currentUrl.includes('confirmation');
        if (this.isVisible == true) {
          this.currentTab = 5;
          this.localService.set('CustomerType', 'Customer');
          console.log('Type:', this.localService.get('CustomerType'));
          const currentUrl = this.router.url;
          //console.log(currentUrl, "currentUrl");
          this.route.queryParams.subscribe(params => {
            let id = params['id'];
            let customerId = params['customer_id'];
            this.isReadyToRender = true;
            //console.log('ID:', id);
            //console.log('Customer ID:', customerId);
            this.router.navigate(['/hotel-registration/confirmation'], {
              queryParams: {
                id: id,
                customer_id: customerId
              }
            });
          });
          //  this.router.navigateByUrl('/hotel-registration'+currentUrl);
          const loader = document.getElementById('loader-overlay');
          //console.log(loader, "loader12")
          if (loader) {
            //console.log("Checking tabs... loader");
            loader.classList.add('hide');
            setTimeout(() => loader.remove(), 300); // remove after fade-out
          }
        }
      }
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          const currentUrl = event.url; // Get the current URL
          //console.log('Current L:', currentUrl); // Debugging (Optional)
          // Enable showSidebar if URL contains "confirmation"
          this.iscancelVisible = currentUrl.includes('cancellation');
          this.route.queryParams.subscribe(params => {
            this.hotelId = params['customer_id'];
            //console.log('Customer ID:', this.hotelId);  // → '48'
          });
        }
      });
    });
    // this.currentRoute$ = new BehaviorSubject<string>(this.router.url);
    //      this.subscription = router.events.subscribe((event) => {
    //       //console.log("111")
    //         if (event instanceof NavigationEnd) {
    //             //console.log("111")
    //           browserRefresh = !router.navigated;
    //           setTimeout(() => {
    //   this.checkAndActivateInvalidTab();
    // }, 2000);
    //         }
    //     });
  }



  // async goToTab(index: number) {
  //   this.callonce = false;
  //   this.handleAsyncClick();

  //   const formComponents = [
  //     this.officeDetailsComp,
  //     this.propertyDetailsComp
  //   ];

  //   // Step 1: Validate form tabs
  //   let firstInvalidTabIndex = -1;
  //   for (let i = 0; i < formComponents.length; i++) {
  //     const comp = formComponents[i];
  //     if (!comp || typeof comp.isFormValid !== 'function' || !comp.isFormValid()) {
  //       firstInvalidTabIndex = i;
  //       break;
  //     }
  //   }

  //   // Step 2: If form tabs are valid, check async flags
  //   if (firstInvalidTabIndex === -1) {
  //     await this.getServiceByIdAsync();
  //     await this.checkIfHierarchyExists();
  //     await this.getTechnicalInfoByIdAsync();

  //     const boolFlags = [
  //       this.isServiceExist,        // Tab 2 (index 2)
  //       this.isHierarchyExist,      // Tab 3 (index 3)
  //       this.isTechnicalInfoExist,  // Tab 4 (index 4)
  //       this.isOrderExist           // Tab 5 (index 5)
  //     ];

  //     for (let i = 0; i < boolFlags.length; i++) {
  //       if (!boolFlags[i]) {
  //         firstInvalidTabIndex = i + formComponents.length; // convert to actual tab index
  //         break;
  //       }
  //     }
  //   }

  //   // Step 3: Allow navigation only up to the first invalid tab
  //   if (firstInvalidTabIndex === -1 || index <= firstInvalidTabIndex) {
  //     this.currentTab = index;
  //     //console.log(`✅ Navigated to tab ${index}`);
  //   } else {
  //     this.currentTab = firstInvalidTabIndex;
  //     //console.warn(`⛔ Cannot access tab ${index} before completing tab ${firstInvalidTabIndex}`);
  //   }

  //   //console.log("Current Tab:", this.currentTab);
  // }



  async goToTab(index: number, force: boolean = false) {
    // Newly added for back navigation - skipAutoTabCheck
    console.log('Index:', index, 'Force:', force);
    // Newly added - hotelId missed
    this.hotelId = Number(this.localService.get('UserId'));
    if (force) {
      this.currentTab = index;
      console.log(`Force-navigated to tab ${index}`);
      return; // Skips validations
    }
    else {
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
            this.getCustomerData = resp.result.data[0];
            //console.log(this.customerdata, "RESPDATA");
            //console.log(Array.isArray(this.customerdata));
            // //console.log(index, "index", this.getCustomerData.is_property_details_exists)
            if (index == 0) {
              this.currentTab = 0;
              setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
            }
            if (index == 1) {
              if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
                this.currentTab = 0;
                this.alertService.error('Please fill the Registered Office Details', this.options);
              }
              else {
                this.currentTab = 1;
                setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
              }
            }
            if (index == 2) {
              if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
                this.currentTab = 0;
                this.alertService.error('Please fill the Registered Office Details', this.options);
              }
              else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
                this.currentTab = 1;
                // setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
                this.alertService.error('Please fill the Property Details', this.options);
              }
              else {
                this.currentTab = 2
              }
            }
            if (index == 3) {
              if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
                this.currentTab = 0;
                this.alertService.error('Please fill the Registered Office Details', this.options);
              }
              else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
                this.currentTab = 1;
                // setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
                this.alertService.error('Please fill the Property Details', this.options);
              }
              else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
                this.currentTab = 2;
                this.alertService.error('select the services you do not want. If you want all services, click "Save and Continue".', this.options);
              }
              else {
                this.currentTab = 3;
              }
            }
            if (index == 4) {
              if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
                this.currentTab = 0;
                this.alertService.error('Please fill the Registered Office Details', this.options);
              }
              else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
                this.currentTab = 1;
                // setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
                this.alertService.error('Please fill the Property Details', this.options);
              }
              else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
                this.currentTab = 2;
                this.alertService.error('select the services you do not want. If you want all services, click "Next Service".', this.options);
              }
              else if (this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) {
                this.currentTab = 3;
                this.alertService.error('Please choose the Hierarchy', this.options);
              }
              else {
                this.currentTab = 4;
              }
            }
            console.log('Index:', index);
            if (index == 5) {
              //console.log("errr", this.getCustomerData.customer_member_id)
              if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
                this.currentTab = 0;
                this.alertService.error('Please fill the Registered Office Details', this.options);
              }
              else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
                this.currentTab = 1;
                //  setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
                this.alertService.error('Please fill the Property Details', this.options);
                //console.log("errr", this.getCustomerData.customer_member_id);
                //console.log("errr", this.getCustomerData.customer_member_id);
              }
              else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
                this.currentTab = 2;
                this.alertService.error('select the services you do not want. If you want all services, click "Next Service".', this.options);
              }
              else if (this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) {
                this.currentTab = 3;
                this.alertService.error('Please choose the Hierarchy', this.options);
                //console.log("errr", this.getCustomerData.customer_member_id)
              }
              else if (this.getCustomerData.is_technical_info_exists == false || this.getCustomerData.is_technical_info_exists == undefined) {
                this.currentTab = 4;
                this.alertService.error('Please select the technical Info', this.options);
                //console.log("errr", this.getCustomerData.customer_member_id)
              }
              // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id == undefined) {
              //   this.currentTab = 4;
              //   this.alertService.error('Please click "Save and Continue" to proceed with payment', this.options);
              //console.log("errr");
              // }
              // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id != undefined) {
              //   this.currentTab = 5;
              //console.log("errr", this.getCustomerData.customer_member_id)
              // }
              // Newly added for member id check - removed member id logic bcos member id will be generated at initiailly
              else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && !this.paymentDone) {
                this.currentTab = 4;
                this.alertService.error('Please click "Save and Continue" to proceed with payment', this.options);
                console.log("errr");
              }
              else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.paymentDone) {
                this.currentTab = 5;
                console.log("errr", this.getCustomerData.customer_member_id)
              }
              else {
                //console.log("errr", this.getCustomerData.customer_member_id)
              }
            }
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
        }
      );
    }
    //   if(this.getCustomerData.is_office_details_exists==false || this.getCustomerData.is_office_details_exists==undefined){
    //   this.currentTab=0;
    //   this.alertService.error('Please fill the Registered Office Details', this.options);
    // }
    // else if (this.getCustomerData.is_property_details_exists ==false || this.getCustomerData.is_property_details_exists ==undefined){
    //    this.currentTab=1;
    //     this.alertService.error('Please fill the Property Details', this.options);
    // }
    //  else if (this.getCustomerData.is_service_exists==false || this.getCustomerData.is_service_exists==undefined){
    //     this.currentTab=2;
    //        this.alertService.error('Deselect the services you do not want. If you want all services, click "Save and Continue".', this.options);
    // }
    // else if (this.getCustomerData.is_hierarchy_exists==false || this.getCustomerData.is_hierarchy_exists==undefined){
    //     this.currentTab=3;
    //      this.alertService.error('Please choose the Hierarchy', this.options);
    // }
    // else if (this.getCustomerData.is_technical_info_exists==false || this.getCustomerData.is_technical_info_exists==undefined ){
    //     this.currentTab=4
    // }
    // else if (this.getCustomerData.is_technical_info_exists==true && this.getCustomerData.is_hierarchy_exists ==true && this.getCustomerData.is_service_exists==true && this.getCustomerData.is_property_details_exists==true && this.getCustomerData.is_office_details_exists==true && this.getCustomerData.customer_member_id!=undefined ){
    //   this.currentTab=5;
    // }
    // this.checkAndActivateInvalidTab();
  }

  getOrderById() {
    // console.log('🛑 getOrderById called with hotelId:', this.hotelId);
    let formatJson = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_id: this.hotelId
          // id: Number(this.parameters['id'])
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
    this.hotelenrollmentservice.orderDetailsGetById(formatJson).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp && resp.result.data.length > 0) {
          this.orderdata = resp.result.data[0];
          console.log('hi')
          if (this.orderdata.status == "Order Confirmed" || this.orderdata.status == 'Confirmed') {
            this.isOrderExist = true;
          }
          const memberId = this.orderdata.customer_member_id;
          this.localService.set('MemberId', memberId);
          //console.log(memberId, "MEMBERID");
          //console.log(this.orderdata, "RESPDATA");
          // Check if payment is done based on presence of status value
          this.paymentDone = (this.orderdata.status == 'Order Confirmed' || this.orderdata.status == 'Confirmed');
          this.localService.set('paymentDone', this.paymentDone);
          console.log('Status:', this.orderdata?.status);
          console.log('Payment done:', this.paymentDone);
          // Newly added for payment and order update
          // --- Only trigger update logic if URL contains confirmation and params ---
          // const queryParams = this.route.snapshot.queryParams;
          // const orderIdFromUrl = queryParams['id'];
          // const customerIdFromUrl = queryParams['customer_id'];
          // if (
          //   this.router.url.includes('confirmation') &&
          //   orderIdFromUrl &&
          //   customerIdFromUrl
          // ) {
          //   // Find next unpaid installment
          //   const nextIndex = this.orderdata.payment_split.findIndex((p: any) => p.status === "Not Paid");
          //   if (nextIndex === -1) {
          //     console.log("All installments already paid");
          //     return; // nothing to update
          //   }
          //   // Mark current installment as paid
          //   const now = new Date().toISOString();
          //   this.orderdata.payment_split[nextIndex].status = "Paid";
          //   this.orderdata.payment_split[nextIndex].paid_date_time = now;
          //   //  Update subscription_end_date to the current installment's end date
          //   const currentInstallmentEndDate = this.orderdata.payment_split[nextIndex].subscription_end_date;
          //   this.orderdata.subscription_end_date = currentInstallmentEndDate;
          //   // Update order_review to the **next unpaid installment**, if it exists
          //   const nextUnpaid = this.orderdata.payment_split[nextIndex + 1];
          //   if (nextUnpaid) {
          //     this.orderdata.order_review.order_summary = {
          //       sub_total: nextUnpaid.sub_total,
          //       tax: nextUnpaid.tax,
          //       order_total_amount: nextUnpaid.order_total_amount
          //     };
          //   } else {
          //     // No more unpaid installments → use current paid installment for review
          //     this.orderdata.order_review.order_summary = {
          //       sub_total: this.orderdata.payment_split[nextIndex].sub_total,
          //       tax: this.orderdata.payment_split[nextIndex].tax,
          //       order_total_amount: this.orderdata.payment_split[nextIndex].order_total_amount
          //     };
          //   }
          //   console.log('nextUnpaid', nextUnpaid);
          //   console.log('this.orderdata', this.orderdata);
          //   // Prepare order update payload
          //   const orderPayload = { ...this.orderdata };
          //   delete orderPayload._id;
          //   delete orderPayload.id;
          //   const orderUpdateData = {
          //     domain_name: DOMAIN_NAME,
          //     user_id: USER_ID,
          //     payload: { order_creation: orderPayload },
          //     extras: { find: { id: this.orderdata.id } }
          //   };
          //   // Update order
          //   this.hotelenrollmentservice.orderUpsert(orderUpdateData).subscribe(orderResp => {
          //     if (orderResp.success === 1) {
          //       console.log("Order updated after payment", orderResp);
          //       // Update customer subscription_end_date
          //       const customerUpdateData = {
          //         domain_name: DOMAIN_NAME,
          //         user_id: USER_ID,
          //         extras: { find: { id: this.customerdata.id } },
          //         payload: {
          //           customer_update: {
          //             payment_split: this.orderdata.payment_split,
          //             subscription_end_date: currentInstallmentEndDate
          //           }
          //         }
          //       };
          //       this.hotelenrollmentservice.updateCustomerFcm(customerUpdateData).subscribe(custRes => {
          //         if (custRes.success === 1) console.log("Customer subscription_end_date updated", custRes);
          //         else console.error("Failed to update customer", custRes.message);
          //       });
          //     } else console.error("Failed to update order", orderResp.message);
          //   });
          //   this.updateHeaderPayNowButton();
          // }
          const queryParams = this.route.snapshot.queryParams;
          const orderIdFromUrl = queryParams['id'];
          const customerIdFromUrl = queryParams['customer_id'];
          if (
            this.router.url.includes('confirmation') &&
            orderIdFromUrl &&
            customerIdFromUrl
          ) {
            // Flatten installments
            const allCycles: any[] = this.orderdata.payment_split || [];
            let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
              cycle.installments.some((inst: any) => inst.status === "Not Paid")
            );
            if (nextUnpaidCycleIndex === -1) {
              console.log("All installments already paid");
              return; // nothing to update
            }
            const nextCycle = allCycles[nextUnpaidCycleIndex];
            console.log('nextCycle', nextCycle);
            const nextUnpaidIndex = nextCycle.installments.findIndex((inst: any) => inst.status === "Not Paid");
            console.log('nextUnpaidIndex', nextUnpaidIndex);
            const nextInstallment = nextCycle.installments[nextUnpaidIndex];
            console.log('nextInstallment', nextInstallment);
            // Mark installment as paid
            nextInstallment.status = "Paid";
            nextInstallment.paid_date_time = new Date().toISOString();
            // Update subscription_end_date
            this.orderdata.subscription_end_date = nextInstallment.subscription_end_date;
            console.log('Orderdata subscription enddate', this.orderdata.subscription_end_date);
            // Update order_review to the next unpaid installment, or current if none left
            let nextUnpaidInstallment = nextCycle.installments.find((inst: any) => inst.status === "Not Paid");
            console.log('nextUnpaidInstallment', nextUnpaidInstallment);
            if (!nextUnpaidInstallment) {
              // Check next cycle
              const futureCycle = allCycles.slice(nextUnpaidCycleIndex + 1).find(c =>
                c.installments.some((inst: any) => inst.status === "Not Paid")
              );
              nextUnpaidInstallment = futureCycle?.installments.find((inst: any) => inst.status === "Not Paid") || nextInstallment;
            }
            this.orderdata.order_review.order_summary = {
              sub_total: nextUnpaidInstallment.sub_total,
              tax: nextUnpaidInstallment.tax,
              order_total_amount: nextUnpaidInstallment.order_total_amount
            };
            // Prepare payload
            const orderPayload = { ...this.orderdata };
            console.log('Order payload', orderPayload);
            delete orderPayload._id;
            delete orderPayload.id;
            const orderUpdateData = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: { order_creation: orderPayload },
              extras: { find: { id: this.orderdata.id } }
            };
            this.hotelenrollmentservice.orderUpsert(orderUpdateData).subscribe(orderResp => {
              if (orderResp.success === 1) {
                console.log("Order updated after payment", orderResp);
                // Update customer subscription_end_date
                const customerUpdateData = {
                  domain_name: DOMAIN_NAME,
                  user_id: USER_ID,
                  extras: { find: { id: this.customerdata.id } },
                  payload: {
                    customer_update: {
                      payment_split: this.orderdata.payment_split,
                      subscription_end_date: nextInstallment.subscription_end_date
                    }
                  }
                };
                this.hotelenrollmentservice.updateCustomerFcm(customerUpdateData).subscribe(custRes => {
                  if (custRes.success === 1) console.log("Customer subscription_end_date updated", custRes);
                  else console.error("Failed to update customer", custRes.message);
                });
              } else console.error("Failed to update order", orderResp.message);
            });
            this.updateHeaderPayNowButton();
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error.statusCode === 403) {
          // this.alertsService.error('Session Time Ot! Please login Again', this.options);
          this.router.navigate([`/login`], { skipLocationChange: false });
        } else if (err.error.message) {
          // this.alertsService.error(err.error.message, this.options);
        } else {
          // this.alertsService.error('Something  happened. Please try again!', this.options);
        }
        // Reject promise if there is an error
      }
    );

    // this.appService.orderDetailsGetById(formatJson).subscribe(
    //   resp => {
    //   }
    // )
  }

  // updateHeaderPayNowButton() {
  //   if (!this.orderdata || !this.orderdata.payment_split) {
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   const paymentSplit = this.orderdata.payment_split;
  //   const totalInstallments = paymentSplit.length;
  //   if (totalInstallments <= 1) {
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   const nextUnpaidIndex = paymentSplit.findIndex((p: any) => p.status === "Not Paid");
  //   // Show button only after first installment
  //   if (nextUnpaidIndex <= 0) {
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   // Enable button only 1 week before subscription_end_date
  //   const prevInstallment = paymentSplit[nextUnpaidIndex - 1];
  //   const [day, month, year] = prevInstallment.subscription_end_date.split('-').map(Number);
  //   const subEndDate = new Date(year, month - 1, day);
  //   const today = new Date();
  //   // const enableDate = new Date(subEndDate);
  //   // enableDate.setDate(enableDate.getDate() - 7);
  //   const enableDate = new Date(2025, 9, 3);
  //   console.log('enableDate', enableDate);
  //   const showButton = true;
  //   console.log('showButton', showButton);
  //   const enabled = today >= enableDate;
  //   console.log('enabled', enabled);
  //   const installmentText = `Pay Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
  //   console.log('installmentText', installmentText);
  //   // Persist button state
  //   this.localService.set('State', JSON.stringify({ show: showButton, enabled, installmentText }));
  //   console.log('payNowButtonState', this.localService.get('payNowButtonState'));
  //   this.technicalInfoService.updatePayNowButton(showButton, enabled, installmentText);
  // }

  updateHeaderPayNowButton() {
    if (!this.orderdata || !this.orderdata.payment_split) {
      this.technicalInfoService.updatePayNowButton(false, false);
      return;
    }
    const allCycles: any[] = this.orderdata.payment_split;
    let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
      cycle.installments.some((inst: any) => inst.status === "Not Paid")
    );
    console.log('nextUnpaidCycleIndex', nextUnpaidCycleIndex);
    if (nextUnpaidCycleIndex === -1) {
      // All paid
      this.technicalInfoService.updatePayNowButton(false, false);
      this.localService.remove('payNowButtonState');
      return;
    }
    const nextCycle = allCycles[nextUnpaidCycleIndex];
    console.log('nextCycle', nextCycle);
    const nextUnpaidIndex = nextCycle.installments.findIndex((inst: any) => inst.status === "Not Paid");
    console.log('nextUnpaidIndex', nextUnpaidIndex);
    const totalInstallments = nextCycle.installments.length;
    console.log('totalInstallments', totalInstallments);
    if (nextUnpaidIndex <= 0) {
      this.technicalInfoService.updatePayNowButton(false, false);
      return;
    }
    // Enable button 1 week before previous installment's end date
    const prevInstallment = nextCycle.installments[nextUnpaidIndex - 1];
    const [day, month, year] = prevInstallment.subscription_end_date.split('-').map(Number);
    const subEndDate = new Date(year, month - 1, day);
    const today = new Date();
    // const enableDate = new Date(subEndDate);
    // enableDate.setDate(enableDate.getDate() - 7);
    const enableDate = new Date(2025, 9, 3);
    console.log('enableDate', enableDate);
    const showButton = true;
    const enabled = today >= enableDate;
    //  Added cycle name for clarity
    const cycleName = nextCycle.name ? this.capitalizeFirstLetter(nextCycle.name) : 'Installment';
    const installmentText = `${cycleName} - Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
    // const installmentText = `Pay Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
    console.log('installmentText', installmentText);
    this.localService.set('payNowButtonState', JSON.stringify({ show: showButton, enabled, installmentText }));
    console.log('payNowButtonState', this.localService.get('payNowButtonState'));
    this.technicalInfoService.updatePayNowButton(showButton, enabled, installmentText);
  }

  capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getOrderByIdAsync(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const formatJson = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            customer_id: this.hotelId
            // id: Number(this.parameters['id'])
          }
        },
        pagination: false,
        paginationDetails: {
          limit: 0,
          pageSize: 10
        },
        sorting: true,
        sortingDetails: {
          sortfield: "",
          sortorder: -1
        }
      };

      this.hotelenrollmentservice.orderDetailsGetById(formatJson).subscribe(
        resp => {
          this.loaderService.emitComplete();
          const data = resp?.result?.data;
          if (data && data.length > 0) {
            if (data.status == "Order Confirmed" || data.status == 'Confirmed') {
              this.isOrderExist = true;
            }



            const memberId = this.orderdata.customer_member_id;
            this.localService.set('MemberId', memberId);

            resolve(true);
          } else {
            this.isOrderExist = false;
            resolve(false);
          }
        },
        err => {
          this.loaderService.emitComplete();

          if (err.error?.statusCode === 403) {
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else {
            // Optional: handle other error messages
          }

          resolve(false); // Resolve false on error, do not reject to avoid unhandled Promise errors
        }
      );
    });
  }

  // ngAfterViewInit() {

  //   this.checkAndActivateInvalidTab();
  // }

  ngAfterViewInit(): void {
  }

  handleContinue() {
    //console.log('test123')
    this.maxTabReached = Math.max(this.maxTabReached, this.currentTab + 1);
    this.currentTab++;
    // Save progress to local storage
    this.localService.set('maxTabReached', this.maxTabReached);
    this.localService.set('currentTab', this.currentTab);
  }

  // checkAndActivateInvalidTab() {
  //   //console.log("Checking tabs...");
  // const loader = document.getElementById('loader-overlay');
  //   //console.log(loader, "loader12")
  //   if (loader) {
  //     //console.log("Checking tabs... loader");
  //     loader.classList.add('hide');
  //     setTimeout(() => loader.classList.add('d-none')); // immediately hides
  //   }
  //   const components = [
  //     this.officeDetailsComp,
  //     this.propertyDetailsComp,
  //   ];
  //   let allValid = true;
  //   for (let i = 0; i < components.length; i++) {
  //     const comp = components[i];
  //     //console.log(`Component ${i}`, comp);
  //     if (comp && typeof comp.isFormValid === 'function') {
  //       //console.log(`isFormValid function exists on component ${i}`);
  //       const valid = comp.isFormValid();
  //       //console.log(`Form valid status of component ${i}:`, valid);
  //       if (!valid) {
  //         this.currentTab = i;
  //         //console.log('Setting current tab to', this.currentTab);
  //         allValid = false;
  //         return;
  //       }
  //     } else {
  //       //console.warn(`isFormValid method NOT found on component at index ${i}`);
  //       allValid = false;
  //       return;
  //     }
  //   }
  //   if (allValid) {
  //     //console.log("All forms are valid. Proceeding to call APIs...");
  //     this.runSequentialChecks().then(() => {
  //       if (this.isServiceExist && this.isHierarchyExist && this.isTechnicalInfoExist && this.isOrderExist) {
  //         //console.log("✅ All checks passed. Navigating to tab 5.");
  //         this.currentTab = 5;
  //       }
  //       else if (this.isServiceExist && this.isHierarchyExist && this.isTechnicalInfoExist) {
  //         //console.log("✅ All checks passed. Navigating to tab 5.");
  //         this.currentTab = 4;
  //       }
  //     });
  //   }
  //   // if(this.isTechnicalInfoExist==true){
  //   //   this.currentTab=5;
  //   // }
  //   // window.addEventListener('load', () => {
  //   // });
  // }

  checkAndActivateInvalidTab() {
    //console.log("checj")
    if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
      this.currentTab = 0;
      this.alertService.error('Please fill the Registered Office Details', this.options);
    }
    else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
      this.currentTab = 1;
      this.alertService.error('Please fill the Property Details', this.options);
    }
    else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
      this.currentTab = 2;
      this.alertService.error('select the services you do not want. If you want all services, click "Save and Continue".', this.options);
    }
    else if (this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) {
      this.currentTab = 3;
      this.alertService.error('Please choose the Hierarchy', this.options);
    }
    else if (this.getCustomerData.is_technical_info_exists == false || this.getCustomerData.is_technical_info_exists == undefined) {
      this.currentTab = 4
    }
    else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id != undefined) {
      this.currentTab = 5;
    }
  }

  async checkAndActivateInvalidTabOnLoad() {
    console.log('Hierarchy Tab', this.hierarchyTab);
    if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
      this.currentTab = 0;
      //console.log("checj")
      // this.alertService.error('Please fill the Registered Office Details', this.options);
    }
    else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
      this.currentTab = 1;
      // this.alertService.error('Please fill the Property Details', this.options);
    }
    else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
      this.currentTab = 2;
      //  this.alertService.error('Deselect the services you do not want. If you want all services, click "Save and Continue".', this.options);

    }
    // Newly added hierarchyTab for back navigation
    else if ((this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) || this.hierarchyTab) {
      this.currentTab = 3;
      //  this.alertService.error('Please choose the Hierarchy', this.options);
    }
    else if (this.getCustomerData.is_technical_info_exists == false || this.getCustomerData.is_technical_info_exists == undefined) {
      this.currentTab = 4

    }
    // Newly commented & added for member id check & back navigation
    // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id != undefined) {
    //   this.currentTab = 5;
    // }
    // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id == undefined) {
    //   this.currentTab = 4;
    // }
    else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.paymentDone) {
      this.currentTab = 5;
    }
    else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true) {
      this.currentTab = 4;
    }


    const loader1 = document.getElementById('loader-overlay');
    this.isReadyToRender = true;

    // ✅ Show loader
    if (loader1) {
      // loader1.classList.add('d-none', 'hide');
    }

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
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            this.getCustomerData = resp.result.data[0];
            this.hotelId = this.customerdata.id;
            this.localService.set('CustomerType', 'Customer');
            resolve();
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


  //  getCustomerDById(): Promise<void> {
  //   return new Promise((resolve, reject) => {

  //   });
  // }

  onContinue() {
    this.isVisible = false;
    // this.currentTab = 5;
    this.router.navigate(['/edit-new-hotel', this.hotelId], { skipLocationChange: false });
  }



  getServiceByIdAsync(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const checkExistingServiceAvailbility = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            customer_id: Number(this.localService.get('UserId')) != 0 ? Number(this.localService.get('UserId')) : this.hotelId
          }
        }
      };

      this.serviceDetails.getAllServices(checkExistingServiceAvailbility).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp.result?.data?.length > 0) {
            this.isServiceExist = true;
            resolve(true);
          } else {
            this.isServiceExist = false;
            resolve(false); // No service found
          }
        },
        err => {
          this.loaderService.emitComplete();
          this.handleCommonError(err);
          resolve(false); // Still resolve false to stop execution
        }
      );
    });
  }
  checkIfHierarchyExists(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            customer_id: this.hotelId
          }
        }
      };

      this.hierarchyService.getAllHierarchy(requestBody).subscribe(
        resp => {
          const length = resp?.result?.data?.length || 0;
          if (resp.result?.data?.length > 0) {
            this.isHierarchyExist = true;

          }
          // this.isHierarchyExist = length > 0;

          //console.log('Hierarchy Exist:', this.isHierarchyExist);
          resolve(this.isHierarchyExist);
        },
        err => {
          this.handleCommonError(err);
          resolve(false); // Resolve false to stop chain
        }
      );
    });
  }
  getTechnicalInfoByIdAsync(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            customer_id: Number(this.localService.get('UserId')) != 0 ? Number(this.localService.get('UserId')) : this.hotelId
          }
        }
      };

      this.technicalInfoService.getAllTechnicalInfo(request).subscribe(
        resp => {
          this.loaderService.emitComplete();
          const length = resp?.result?.data?.length || 0;
          this.isTechnicalInfoExist = length > 0;
          resolve(this.isTechnicalInfoExist);
        },
        err => {
          this.loaderService.emitComplete();
          this.handleCommonError(err);
          resolve(false);
        }
      );
    });
  }
  handleCommonError(err: any): void {
    if (err.error?.statusCode === 403) {
      this.alertService.error('Session Time Out! Please login Again', this.options);
      this.router.navigate(['/login'], { skipLocationChange: false });
    } else if (err.error?.message) {
      this.alertService.error(err.error.message, this.options);
    } else {
      this.alertService.error('Something bad happened. Please try again!', this.options);
    }
  }

  /**
   * Runs all sequential checks: service, hierarchy, technical info, and order.
   * If any of them does not exist, it sets the current tab to the next one in
   * the sequence and returns.
   * If all exist, it logs a success message and returns.
   */
  async runSequentialChecks() {
    const serviceExists = await this.getServiceByIdAsync();
    if (!serviceExists) {
      this.currentTab = 2;
      // //console.warn('Service does not exist. Halting.');
      return;
    }

    const hierarchyExists = await this.checkIfHierarchyExists();
    if (!hierarchyExists) {
      this.currentTab = 3;
      // //console.warn('Hierarchy does not exist. Halting.');
      return;
    }

    const techInfoExists = await this.getTechnicalInfoByIdAsync();
    if (!techInfoExists) {
      this.currentTab = 4;
      // //console.warn('Technical info does not exist. Halting.');
      return;
    }
    const orderExists = await this.getOrderByIdAsync();
    if (!orderExists) {
      this.currentTab = 5;
      // //console.warn('order info does not exist. Halting.');
      return;
    }

    //console.log('✅ All data exists. Proceed with next steps.');
  }
  async runSequentialChecksNav() {
    const validationResults: boolean[] = [];

    const serviceExists = await this.getServiceByIdAsync();
    validationResults.push(serviceExists);

    if (!serviceExists) {
      this.currentTab = 2; // Blocked at service check
      //console.warn('Service does not exist. Halting at Tab 2.');
      return;
    }

    const hierarchyExists = await this.checkIfHierarchyExists();
    validationResults.push(hierarchyExists);

    if (!hierarchyExists) {
      this.currentTab = 3; // Blocked at hierarchy check
      //console.warn('Hierarchy does not exist. Halting at Tab 3.');
      return;
    }

    const techInfoExists = await this.getTechnicalInfoByIdAsync();
    validationResults.push(techInfoExists);

    if (!techInfoExists) {
      this.currentTab = 4; // Blocked at technical info check
      //console.warn('Technical info does not exist. Halting at Tab 4.');
      return;
    }

    //console.log('✅ All data exists. Proceed with next steps.');
  }

  showLoader() {
    const loader = document.getElementById('loader-overlay');
    //console.log("loader", loader)

    if (loader) {
      //console.log("loader")
      loader.classList.remove('d-none');
      loader.classList.remove('hide');
      //console.log("loader", loader)
    }
  }

  hideLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
      loader.classList.add('d-none');
      loader.classList.add('hide');
    }
  }


  async handleAsyncClick() {
    this.showLoader();
    try {
      // Simulate 2-second delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      this.hideLoader();
    }
  }

}