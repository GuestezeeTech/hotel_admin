import { LoginService } from './../login/login.service';
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
import { SharedDataService } from '../shared/shared-data.service';

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
  @ViewChild(TechnicalInfoComponent) technicalInfoComp!: TechnicalInfoComponent;
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
  /** True after the full-page Hotels loader overlay is hidden; used so Technical Info doesn't show its loader at the same time. */
  parentLoaderDone = false;
  // Newly added
  tabTitles = [
    'Registered Office Details',
    'Property Details',
    // 'Services',
    // 'Hierarchy',
    'Technical Info',
    'Status',
  ];
  // Newlya dded & commented for submenu active
  // currentTab = 0;
  private _currentTab = 0;
  get currentTab(): number {
    return this._currentTab;
  }

  set currentTab(value: number) {
    this._currentTab = value;
    this.sharedDataService.setTab(value);
  }
  // End for submenu active
  maxTabReached = 0;
  password: any;
  memberId: string | null = null;
  @Input() isVisible = false;
  iscancelVisible = false;
  // Newly added for payment verification
  paymentDone: boolean = false;
  // Newly added for back navigation
  // Newly added for skip auto tab check
  // skipAutoTabCheck !: boolean;
  skipAutoTabCheck: boolean = false;
  hierarchyTab: boolean = false;
  customer: any;
  order: any;
  order_review: any;
  // Newly added for customer status(hint)
  customerStatus: any = '';
  paymentStatusInfo = { text: 'Not Paid', isPaid: false };
  isFirstPayment: boolean = true;
  lastGeneratedInvoiceOrderId: number | null = null;



  ngOnInit(): void {
    this.memberId = this.localService.get('MemberId');
    // Newly added for payment route id initialization
    this.route.queryParams.subscribe(params => {
      const customerId = params['customer_id'];
      if (customerId) {
        this.hotelId = Number(customerId);
      }
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.hotelId = Number(id);
      }
    });
    // Handle tab query param from menu (e.g. /edit-new-hotel/:id?tab=1) so submenu navigates to the correct tab
    // Old: only handled tab == 3: if (!isNaN(tabIndex) && tabIndex == 3) { this.hierarchyTab = true; this.goToTab(tabIndex, true); }
    this.route.queryParams.subscribe(params => {
      const tabIndex = +params['tab'];
      const validTabIndex = !isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 3;
      if (validTabIndex) {
        if (tabIndex === 3) {
          this.hierarchyTab = true;
        }
        // Newly added for skip auto tab check
        this.skipAutoTabCheck = true;
        this.isReadyToRender = true; // show tabs immediately when opening via submenu
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
      // console.log("navigationEntries", navigationEntries);
      const navType = navigationEntries[0].type;
      const loader = document.getElementById('loader-overlay');
      //  Show loader
      if (loader) {
        loader.classList.remove('d-none', 'hide');
        //  Wait for 2 seconds (2000 ms), then hide the loader
        setTimeout(() => {
          loader.classList.add('d-none', 'hide');
          this.parentLoaderDone = true;
          this.cdr.detectChanges();
        }, 2000);
      } else {
        this.parentLoaderDone = true;
      }
      // Ensure loggedOut flag is removed during active enrollment session
      this.localService.remove('loggedOut');
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
        // console.log('Current Route Updated:', event.urlAfterRedirects);
        this.currentRoute$.next(event.urlAfterRedirects);
      });
    // Newly commented for getting customer id for customer type
    /* this.hotelId = Number(this.localService.get('UserId'));
    if (this.hotelId == 0) {
      this.route.queryParams.subscribe(params => {
        this.hotelId = params['customer_id'];
        // console.log('Customer ID:',  this.hotelId);  
      });
    } */
    //  End of newly commented for getting customer id for customer type
    // const customerId = this.route.snapshot.paramMap.get('customer_id');
    // this.hotelId = customerId ? +customerId : Number(this.localService.get('UserId')) || 0;
    // if (this.hotelId !== 0) {
    //   this.getCustomerById()
    //     .then(() => {
    //       // console.log('✅ After getCustomerById -> hotelId =', this.hotelId);
    //       this.getOrderById(Number(this.hotelId));
    //     })
    //     .catch(err => console.error('❌ getCustomerById failed', err));
    // } else {
    //   console.error('❌ Invalid hotelId. Cannot proceed.');
    // }
    // console.log('🚀 ngOnInit: this.hotelId =', this.hotelId);
    //console.log('Hotel ID:', this.hotelId);

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
    private serviceDetails: ServiceDetailService,
    private loginService: LoginService,
    private sharedDataService: SharedDataService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.url; // Get the current URL
        //console.log('Current URL:', currentUrl); // Debugging (Optional)
        // Enable showSidebar if URL contains "confirmation"
        this.isVisible = currentUrl.includes('confirmation');
        if (this.isVisible == true) {
          // this.currentTab = 5;
          this.currentTab = 3;
          this.localService.set('CustomerType', 'Customer');
          this.localService.remove('loggedOut');
          // console.log('Type:', this.localService.get('CustomerType'));
          const currentUrl = this.router.url;
          //console.log(currentUrl, "currentUrl");
          this.route.queryParams.subscribe(params => {
            let id = params['id'];
            let customerId = params['customer_id'];
            this.isReadyToRender = true;
            //console.log('ID:', id);
            //console.log('Customer ID:', customerId);

            // Call invoice generator if not already called for this order ID
            if (id && Number(id) !== this.lastGeneratedInvoiceOrderId) {
              this.lastGeneratedInvoiceOrderId = Number(id);
              const invoicePayload = {
                order_id: Number(id),
                domain_name: DOMAIN_NAME,
                user_id: String(USER_ID)
              };
              this.hotelenrollmentservice.invoiceGenerator(invoicePayload).subscribe(
                invoiceResp => {
                  if (invoiceResp && invoiceResp.success === 1 && invoiceResp.status_code === 200) {
                    console.log('Invoice generated successfully:', invoiceResp);
                  }
                  else {
                    console.log('Invoice not generated successfully:', invoiceResp);
                  }
                },
                invoiceErr => {
                  console.error('Error generating invoice:', invoiceErr);
                }
              );
            }

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
            this.hotelId = params['customer_id'] ? Number(params['customer_id']) : this.hotelId;
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
    // console.log('Index:', index, 'Force:', force);
    // console.log('Current Tab:', this.currentTab);

    // Newly added - hotelId missed
    if (!this.hotelId) {
      this.hotelId = Number(this.localService.get('UserId'));
    }
    this.memberId = this.localService.get('MemberId');
    // console.log('Member id(goToTab):', this.memberId);
    if (force) {
      this.currentTab = index;
      // console.log(`Force-navigated to tab ${index}`);
      return; // Skips validations
    }
    else {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: this.isPaymentRoute()
            ? { id: Number(this.hotelId) }
            : { customer_member_id: this.memberId }
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
            // console.log('Exists:', this.getCustomerData.is_office_details_exists, this.getCustomerData.is_property_details_exists,  this.getCustomerData.is_technical_info_exists, this.paymentDone);
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
                this.alertService.error('Please fill the Property Details', this.options);
              }
              else {
                this.currentTab = 2;
                setTimeout(() => this.technicalInfoComp?.refreshData(), 100);
              }
            }
            // if (index == 3) {
            //   if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
            //     this.currentTab = 0;
            //     this.alertService.error('Please fill the Registered Office Details', this.options);
            //   }
            //   else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
            //     this.currentTab = 1;
            //     // setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
            //     this.alertService.error('Please fill the Property Details', this.options);
            //   }
            //   else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
            //     this.currentTab = 2;
            //     this.alertService.error('select the services you do not want. If you want all services, click "Save and Continue".', this.options);
            //   }
            //   else {
            //     this.currentTab = 3;
            //   }
            // }
            // if (index == 4) {
            //   if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
            //     this.currentTab = 0;
            //     this.alertService.error('Please fill the Registered Office Details', this.options);
            //   }
            //   else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
            //     this.currentTab = 1;
            //     // setTimeout(() => this.propertyDetailsComp?.refreshData(), 100);
            //     this.alertService.error('Please fill the Property Details', this.options);
            //   }
            //   else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
            //     this.currentTab = 2;
            //     this.alertService.error('select the services you do not want. If you want all services, click "Next Service".', this.options);
            //   }
            //   else if (this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) {
            //     this.currentTab = 3;
            //     this.alertService.error('Please choose the Hierarchy', this.options);
            //   }
            //   else {
            //     this.currentTab = 4;
            //   }
            // }
            // console.log('Index:', index);
            if (index == 3) {
              //console.log("errr", this.getCustomerData.customer_member_id)
              if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
                this.currentTab = 0;
                this.alertService.error('Please fill the Registered Office Details', this.options);
              }
              else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
                this.currentTab = 1;
                this.alertService.error('Please fill the Property Details', this.options);
              }
              // else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
              //   this.currentTab = 2;
              //   this.alertService.error('select the services you do not want. If you want all services, click "Next Service".', this.options);
              // }
              // else if (this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) {
              //   this.currentTab = 3;
              //   this.alertService.error('Please choose the Hierarchy', this.options);
              //   //console.log("errr", this.getCustomerData.customer_member_id)
              // }
              else if (this.getCustomerData.is_technical_info_exists == false || this.getCustomerData.is_technical_info_exists == undefined) {
                this.currentTab = 2;
                this.alertService.error('Please save the technical Info', this.options);
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
              // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && !this.paymentDone) {
              //   this.currentTab = 4;
              //   this.alertService.error('Please click "Save and Continue" to proceed with payment', this.options);
              //   console.log("errr");
              // }
              // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.paymentDone) {
              //   this.currentTab = 5;
              //   console.log("errr", this.getCustomerData.customer_member_id)
              // }

              else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && !this.paymentDone) {
                this.currentTab = 2;
                this.alertService.error('Please click "Save and Continue" to proceed with payment', this.options);
              }
              else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.paymentDone) {
                this.currentTab = 3;
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

  isPaymentRoute(): boolean {
    const url = this.router.url.toLowerCase();
    return url.includes('confirmation') || url.includes('cancellation');
  }


  getOrderById() {
    this.memberId = this.localService.get('MemberId');
    // let findObj = (this.iscancelVisible || this.isVisible)
    let findObj = (this.isPaymentRoute() || (this.hotelId && !isNaN(Number(this.hotelId))))
      ? { customer_id: Number(this.hotelId) }
      : { customer_member_id: this.memberId };
    // console.log('Member id(getOrderById):', this.memberId);
    // console.log('🛑 getOrderById called with hotelId:', this.hotelId);
    let formatJson = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find:
          // {
          // id: Number(this.parameters['id'])
          // Newly added for getting customer id for customer type
          // customer_id: this.hotelId
          // customer_member_id: this.memberId
          findObj
        // }
      },
      "pagination": false,
      /* "paginationDetails": {
        "limit": 0,
        "pageSize": 10
      }, */
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
          // this.orderdata = resp.result.data[0];
          // Newly added & commented for calling sms only on first confirmed order
          // const confirmedOrder = resp.result.data.find(
          //   (order: any) => order.status === 'Order Confirmed' || order.status === 'Confirmed'
          // );
          // this.orderdata = confirmedOrder || resp.result.data[0];
          // console.log('Confirmed Order Data:', this.orderdata);
          // if (this.orderdata.status == "Order Confirmed" || this.orderdata.status == 'Confirmed') {
          //   this.isOrderExist = true;
          // }
          // Get all confirmed orders
          const confirmedOrders = resp.result.data.filter(
            (order: any) => order.status === 'Order Confirmed' || order.status === 'Confirmed'
          );
          // Assign first confirmed order or fallback
          this.orderdata = confirmedOrders[0] || resp.result.data[0];
          // Check if this is the first payment (registration) or a subsequent one
          this.isFirstPayment = confirmedOrders.length <= 1;

          // console.log('Confirmed Order Data:', this.orderdata);
          // Flag for order existence
          this.isOrderExist = confirmedOrders.length > 0;
          // Payment done flag
          this.paymentDone = this.isOrderExist;
          this.localService.set('paymentDone', this.paymentDone);
          // console.log('Payment done:', this.paymentDone);
          // Consolidated Update Logic
          let shouldUpdateOrder = false;
          let isPaymentProcessed = false;
          let paymentProcessedInstallment: any = null;
          // SMS Block: Update send_sms flag if exactly one confirmed order needs it
          if (confirmedOrders.length === 1 && confirmedOrders[0].send_sms === true) {
            this.sendMessage(this.customerdata);
            this.sendStatusMessage(this.customerdata);
            this.orderdata.send_sms = false;
            shouldUpdateOrder = true;
          }

          // Confirmation Block: Update payment split status if on confirmation route
          const queryParams = this.route.snapshot.queryParams;
          const orderIdFromUrl = queryParams['id'];
          const customerIdFromUrl = queryParams['customer_id'];
          if (
            this.router.url.includes('confirmation') &&
            orderIdFromUrl &&
            customerIdFromUrl
          ) {
            const allCycles: any[] = this.orderdata.payment_split || [];
            let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
              cycle.installments.some((inst: any) => inst.status === "Not Paid")
            );

            if (nextUnpaidCycleIndex !== -1) {
              const nextCycle = allCycles[nextUnpaidCycleIndex];
              const nextUnpaidIndex = nextCycle.installments.findIndex((inst: any) => inst.status === "Not Paid");
              const nextInstallment = nextCycle.installments[nextUnpaidIndex];

              // Mark installment as paid
              nextInstallment.status = "Paid";
              nextInstallment.paid_date_time = new Date().toISOString();
              // Update subscription_end_date
              this.orderdata.subscription_end_date = nextInstallment.subscription_end_date;

              // Update order_review to the next unpaid installment, or current if none left
              let nextUnpaidInstallment = nextCycle.installments.find((inst: any) => inst.status === "Not Paid");
              if (!nextUnpaidInstallment) {
                const futureCycle = allCycles.slice(nextUnpaidCycleIndex + 1).find(c =>
                  c.installments.some((inst: any) => inst.status === "Not Paid")
                );
                nextUnpaidInstallment = futureCycle?.installments.find((inst: any) => inst.status === "Not Paid") || nextInstallment;
              }

              this.orderdata.order_review.order_summary = {
                sub_total: Number(nextUnpaidInstallment.sub_total.toFixed(2)),
                tax: Number(nextUnpaidInstallment.tax.toFixed(2)),
                order_total_amount: Number(nextUnpaidInstallment.order_total_amount.toFixed(2))
              };

              shouldUpdateOrder = true;
              isPaymentProcessed = true;
              paymentProcessedInstallment = nextInstallment;
            }
          }

          // Execute a single Upsert if any changes were made
          if (shouldUpdateOrder) {
            const orderPayload = { ...this.orderdata };
            delete orderPayload._id;
            delete orderPayload.id;

            // Remove _id from nested objects to avoid backend issues
            orderPayload.payment_split?.forEach((cycle: any) => {
              delete cycle._id;
              cycle.installments?.forEach((inst: any) => delete inst._id);
            });

            const orderUpdateData = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: { order_creation: orderPayload },
              extras: { find: { id: this.orderdata.id } }
            };

            this.hotelenrollmentservice.orderUpsert(orderUpdateData).subscribe(
              (orderResp: any) => {
                if (orderResp.success === 1) {
                  // console.log('Order consolidated update successful');
                  if (isPaymentProcessed && paymentProcessedInstallment) {
                    const customerUpdateData = {
                      domain_name: DOMAIN_NAME,
                      user_id: USER_ID,
                      extras: { find: { id: this.customerdata.id } },
                      payload: {
                        customer_update: {
                          payment_split: this.orderdata.payment_split,
                          subscription_end_date: paymentProcessedInstallment.subscription_end_date
                        }
                      }
                    };
                    this.hotelenrollmentservice.updateCustomerFcm(customerUpdateData).subscribe(custRes => {
                      if (custRes.success === 1) console.log("Customer subscription_end_date updated after payment", custRes);
                      else console.error("Failed to update customer", custRes.message);
                    });

                    // Call enableHotel to reactivate the account
                    const enablePayload = {
                      domain_name: DOMAIN_NAME,
                      user_id: USER_ID,
                      extras: {
                        find: {
                          member_id: this.orderdata.customer_member_id || this.customerdata?.customer_member_id || this.localService.get('MemberId')
                        }
                      }
                    };
                    this.hotelenrollmentservice.enableHotel(enablePayload).subscribe({
                      next: (enableRes: any) => {
                        if (enableRes.success === 1 && enableRes.status_code === 200) {
                          console.log("Hotel enabled successfully after payment:", enableRes);
                        } else {
                          console.error("Failed to enable hotel after payment:", enableRes.message);
                        }
                      },
                      error: (err: any) => {
                        console.error("Error enabling hotel after payment:", err);
                      }
                    });

                    this.updateHeaderPayNowButton();
                  }
                } else {
                  console.error('Failed to update order in consolidated call', orderResp.message);
                }
              },
              err => {
                console.error('Error in consolidated order update', err);
              }
            );
          }

          // Shared logic after data fetch (always run)
          const memberId = this.orderdata.customer_member_id;
          this.localService.set('MemberId', memberId);
        } else {
          this.orderdata = null;
          this.isOrderExist = false;
          this.paymentDone = false;
          this.localService.set('paymentDone', false);
        }
        this.updatePaymentStatusInfo();
        this.checkNavigationAndActivateTab();
      },
      err => {
        this.loaderService.emitComplete();
        this.orderdata = null;
        this.isOrderExist = false;
        this.paymentDone = false;
        this.localService.set('paymentDone', false);
        if (err.error.statusCode === 403) {
          // this.alertsService.error('Session Time Ot! Please login Again', this.options);
          this.router.navigate([`/login`], { skipLocationChange: false });
        } else if (err.error.message) {
          // this.alertsService.error(err.error.message, this.options);
        } else {
          // this.alertsService.error('Something  happened. Please try again!', this.options);
        }
        this.updatePaymentStatusInfo();
        this.checkNavigationAndActivateTab();
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

  // updateHeaderPayNowButton() {
  //   if (!this.orderdata || !this.orderdata.payment_split) {
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   const allCycles: any[] = this.orderdata.payment_split;
  //   let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
  //     cycle.installments.some((inst: any) => inst.status === "Not Paid")
  //   );
  //   console.log('nextUnpaidCycleIndex', nextUnpaidCycleIndex);
  //   if (nextUnpaidCycleIndex === -1) {
  //     // All paid
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     this.localService.remove('payNowButtonState');
  //     return;
  //   }
  //   const nextCycle = allCycles[nextUnpaidCycleIndex];
  //   console.log('nextCycle', nextCycle);
  //   const nextUnpaidIndex = nextCycle.installments.findIndex((inst: any) => inst.status === "Not Paid");
  //   console.log('nextUnpaidIndex', nextUnpaidIndex);
  //   const totalInstallments = nextCycle.installments.length;
  //   console.log('totalInstallments', totalInstallments);
  //   if (nextUnpaidIndex <= 0) {
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   // Enable button 1 week before previous installment's end date
  //   const prevInstallment = nextCycle.installments[nextUnpaidIndex - 1];
  //   const [day, month, year] = prevInstallment.subscription_end_date.split('-').map(Number);
  //   const subEndDate = new Date(year, month - 1, day);
  //   const today = new Date();
  //   // const enableDate = new Date(subEndDate);
  //   // enableDate.setDate(enableDate.getDate() - 7);
  //   const enableDate = new Date(2025, 9, 3);
  //   console.log('enableDate', enableDate);
  //   const showButton = true;
  //   const enabled = today >= enableDate;
  //   //  Added cycle name for clarity
  //   const cycleName = nextCycle.name ? this.capitalizeFirstLetter(nextCycle.name) : 'Installment';
  //   const installmentText = `${cycleName} - Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
  //   // const installmentText = `Pay Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
  //   console.log('installmentText', installmentText);
  //   this.localService.set('payNowButtonState', JSON.stringify({ show: showButton, enabled, installmentText }));
  //   console.log('payNowButtonState', this.localService.get('payNowButtonState'));
  //   this.technicalInfoService.updatePayNowButton(showButton, enabled, installmentText);
  // }

  // updateHeaderPayNowButton() {
  //   if (!this.orderdata || !this.orderdata.payment_split) {
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   const allCycles: any[] = this.orderdata.payment_split;
  //   // Find first unpaid cycle
  //   let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
  //     cycle.installments.some((inst: any) => inst.status === "Not Paid")
  //   );
  //   console.log('nextUnpaidCycleIndex', nextUnpaidCycleIndex);
  //   // CASE 1: All installments paid — allow new payment cycle creation
  //   if (nextUnpaidCycleIndex === -1) {
  //     const showButton = true;
  //     const enabled = true;
  //     const installmentText = "Start New Payment Cycle";
  //     this.localService.set('payNowButtonState', JSON.stringify({ show: showButton, enabled, installmentText }));
  //     this.technicalInfoService.updatePayNowButton(showButton, enabled, installmentText);
  //     // console.log("All installments paid. Showing 'Start New Payment Cycle' button.");
  //     return;
  //   }
  //   // CASE 2: Some installments unpaid — continue normal flow
  //   const nextCycle = allCycles[nextUnpaidCycleIndex];
  //   console.log('nextCycle', nextCycle);
  //   const nextUnpaidIndex = nextCycle.installments.findIndex(
  //     (inst: any) => inst.status === "Not Paid"
  //   );
  //   console.log('nextUnpaidIndex', nextUnpaidIndex);
  //   const totalInstallments = nextCycle.installments.length;
  //   console.log('totalInstallments', totalInstallments);
  //   if (nextUnpaidIndex <= 0) {
  //     this.technicalInfoService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   // Enable button 1 week before previous installment end date
  //   const prevInstallment = nextCycle.installments[nextUnpaidIndex - 1];
  //   console.log('prev Installment:', prevInstallment);
  //   const [day, month, year] = prevInstallment.subscription_end_date.split('-').map(Number);
  //   console.log('day, month, year', day, month, year);
  //   const subEndDate = new Date(year, month - 1, day);
  //   console.log('Sub end Date', subEndDate);
  //   const today = new Date();
  //   const enableDate = new Date(subEndDate);
  //   console.log('enableDate before format', enableDate);
  //   enableDate.setDate(enableDate.getDate() - 7); // 7 days before due date
  //   // const enableDate = new Date(2025, 9, 3);
  //   console.log('enableDate', enableDate);
  //   const showButton = true;
  //   const enabled = today >= enableDate;
  //   const cycleName = nextCycle.name
  //     ? this.capitalizeFirstLetter(nextCycle.name)
  //     : 'Installment';
  //   const installmentText = `${cycleName} - Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
  //   const buttonState = { show: showButton, enabled, installmentText };
  //   this.localService.set('payNowButtonState', JSON.stringify(buttonState));
  //   this.technicalInfoService.updatePayNowButton(showButton, enabled, installmentText);
  //   console.log('Pay Now Button:', buttonState);
  // }

  updateHeaderPayNowButton() {
    if (!this.orderdata || !this.orderdata.payment_split) {
      this.technicalInfoService.updatePayNowButton(false, false);
      return;
    }
    const allCycles: any[] = this.orderdata.payment_split;
    // Find first unpaid cycle
    let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
      cycle.installments.some((inst: any) => inst.status === "Not Paid")
    );
    // console.log('Next Unpaid Cycle Index', nextUnpaidCycleIndex);
    let lastRelevantInstallment: any;
    if (nextUnpaidCycleIndex === -1) {
      // console.log('All Installments Paid');
      // CASE: All installments paid
      // Pick the last paid installment
      const lastCycle = allCycles[allCycles.length - 1];
      lastRelevantInstallment = lastCycle.installments[lastCycle.installments.length - 1];
    } else {
      // console.log('Some Installments Unpaid');
      // CASE: Some unpaid installments
      const nextCycle = allCycles[nextUnpaidCycleIndex];
      const nextUnpaidIndex = nextCycle.installments.findIndex((inst: any) => inst.status === "Not Paid");
      lastRelevantInstallment = nextUnpaidIndex > 0
        ? nextCycle.installments[nextUnpaidIndex - 1]
        : null;
    }
    if (!lastRelevantInstallment) {
      this.technicalInfoService.updatePayNowButton(false, false);
      return;
    }
    // Enable button 7 days before subscription_end_date of lastRelevantInstallment
    const [day, month, year] = lastRelevantInstallment.subscription_end_date.split('-').map(Number);
    // console.log('day, month, year', day, month, year);
    const subEndDate = new Date(year, month - 1, day);
    // console.log('Sub end Date', subEndDate);
    const enableDate = new Date(subEndDate);
    // console.log('enableDate before format', enableDate);
    enableDate.setDate(enableDate.getDate() - 7);
    const today = new Date();
    // console.log('enableDate due date', enableDate);
    const enabled = today >= enableDate;
    // console.log('Enable date', enabled);
    // Prepare button text
    let installmentText = 'Start New Payment Cycle';
    if (nextUnpaidCycleIndex !== -1) {
      const totalInstallments = allCycles[nextUnpaidCycleIndex].installments.length;
      const nextUnpaidIndex = allCycles[nextUnpaidCycleIndex].installments.findIndex((inst: any) => inst.status === "Not Paid");
      const cycleName = allCycles[nextUnpaidCycleIndex].name || 'Installment';
      installmentText = `${this.capitalizeFirstLetter(cycleName)} - Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
    }
    const showButton = true;
    this.localService.set('payNowButtonState', JSON.stringify({ show: showButton, enabled, installmentText }));
    this.technicalInfoService.updatePayNowButton(showButton, enabled, installmentText);
    // console.log('Pay Now Button:', { showButton, enabled, installmentText });
  }


  capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  updatePaymentStatusInfo() {
    if (!this.orderdata) {
      this.paymentStatusInfo = { text: 'Not Paid', isPaid: false };
      return;
    }

    const overallStatus = this.orderdata.status;
    if (overallStatus !== 'Order Confirmed' && overallStatus !== 'Confirmed') {
      this.paymentStatusInfo = { text: 'Not Paid', isPaid: false };
      return;
    }

    const allCycles: any[] = this.orderdata.payment_split || [];
    if (allCycles.length === 0) {
      this.paymentStatusInfo = { text: 'Paid', isPaid: true };
      return;
    }

    // Find the first cycle that contains any unpaid installment
    let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
      cycle.installments && cycle.installments.some((inst: any) => inst.status === "Not Paid")
    );

    if (nextUnpaidCycleIndex === -1) {
      // All installments in all cycles are paid!
      const lastCycle = allCycles[allCycles.length - 1];
      const cycleName = lastCycle.name ? this.capitalizeFirstLetter(lastCycle.name) : '';
      const text = cycleName && cycleName.toLowerCase() !== 'full' ? `Paid (${cycleName})` : 'Paid';
      this.paymentStatusInfo = { text, isPaid: true };
      return;
    }

    // There is an unpaid installment.
    const nextCycle = allCycles[nextUnpaidCycleIndex];

    // Find the last paid installment in the cycle(s) to see if the paid period has expired
    let lastPaidInstallment: any = null;
    for (let i = 0; i <= nextUnpaidCycleIndex; i++) {
      for (const inst of (allCycles[i].installments || [])) {
        if (inst.status === 'Paid') {
          lastPaidInstallment = inst;
        }
      }
    }

    const cycleLabel = nextCycle.name ? this.capitalizeFirstLetter(nextCycle.name) : '';

    if (!lastPaidInstallment) {
      // Not even the first installment has been paid
      const text = cycleLabel && cycleLabel.toLowerCase() !== 'full' ? `Not Paid (${cycleLabel})` : 'Not Paid';
      this.paymentStatusInfo = { text, isPaid: false };
      return;
    }

    // Parse last paid installment's subscription_end_date (format DD-MM-YYYY)
    try {
      const parts = lastPaidInstallment.subscription_end_date.split('-');
      if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]);
        const year = Number(parts[2]);
        const expiryDate = new Date(year, month - 1, day);
        const today = new Date();
        
        // Reset times to compare only dates
        expiryDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (today > expiryDate) {
          // Subscription has expired, and the next installment is unpaid (Overdue)
          const text = cycleLabel && cycleLabel.toLowerCase() !== 'full' ? `Not Paid (${cycleLabel} - Overdue)` : 'Not Paid (Overdue)';
          this.paymentStatusInfo = { text, isPaid: false };
          return;
        } else {
          // Still in the paid period of the last installment, but future installments are pending
          const text = cycleLabel && cycleLabel.toLowerCase() !== 'full' ? `Paid (${cycleLabel})` : 'Paid';
          this.paymentStatusInfo = { text, isPaid: true };
          return;
        }
      }
    } catch (e) {
      console.error('Error parsing subscription end date', e);
    }

    // Fallback if date parsing fails
    const defaultCycleLabel = nextCycle.name ? this.capitalizeFirstLetter(nextCycle.name) : '';
    const fallbackText = defaultCycleLabel && defaultCycleLabel.toLowerCase() !== 'full' ? `Paid (${defaultCycleLabel})` : 'Paid';
    this.paymentStatusInfo = { text: fallbackText, isPaid: true };
  }

  getOrderByIdAsync(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let findObj = this.isPaymentRoute()
        ? { customer_id: Number(this.hotelId) }
        : { customer_member_id: this.memberId };
      const formatJson = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // id: Number(this.parameters['id'])
            // Newly added for getting customer id for customer type
            // customer_id: this.hotelId
            // customer_member_id: this.memberId
            findObj
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
    if (this.currentTab === 2) {
      setTimeout(() => this.technicalInfoComp?.refreshData(), 100);
    }
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
    // else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
    //   this.currentTab = 2;
    //   this.alertService.error('select the services you do not want. If you want all services, click "Save and Continue".', this.options);
    // }
    // else if (this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) {
    //   this.currentTab = 3;
    //   this.alertService.error('Please choose the Hierarchy', this.options);
    // }
    else if (this.getCustomerData.is_technical_info_exists == false || this.getCustomerData.is_technical_info_exists == undefined) {
      this.currentTab = 2;
    }
    else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id != undefined) {
      this.currentTab = 3;
    }
  }

  checkNavigationAndActivateTab() {
    const isConfirmation = this.router.url.includes('confirmation');
    const isCancellation = this.router.url.includes('cancellation');

    if (isCancellation) {
      this.isReadyToRender = true;
      this.currentTab = 2; // Technical Info tab where they pay
      return;
    }

    const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navigationEntries.length > 0) {
      const navType = navigationEntries[0].type;

      if (!isConfirmation) {
        if (!this.skipAutoTabCheck) {
          this.checkAndActivateInvalidTabOnLoad();
        } else {
          this.isReadyToRender = true;
        }
      }
    } else {
      this.isReadyToRender = true;
    }
  }

  async checkAndActivateInvalidTabOnLoad() {
    // console.log('Hierarchy Tab', this.hierarchyTab);
    if (this.getCustomerData.is_office_details_exists == false || this.getCustomerData.is_office_details_exists == undefined) {
      this.currentTab = 0;
      //console.log("checj")
      // this.alertService.error('Please fill the Registered Office Details', this.options);
    }
    else if (this.getCustomerData.is_property_details_exists == false || this.getCustomerData.is_property_details_exists == undefined) {
      this.currentTab = 1;
      // this.alertService.error('Please fill the Property Details', this.options);
    }
    // else if (this.getCustomerData.is_service_exists == false || this.getCustomerData.is_service_exists == undefined) {
    //   this.currentTab = 2;
    //   //  this.alertService.error('Deselect the services you do not want. If you want all services, click "Save and Continue".', this.options);

    // }
    // Newly added hierarchyTab for back navigation
    // else if ((this.getCustomerData.is_hierarchy_exists == false || this.getCustomerData.is_hierarchy_exists == undefined) || this.hierarchyTab) {
    //   this.currentTab = 3;
    //   //  this.alertService.error('Please choose the Hierarchy', this.options);
    // }
    else if (this.getCustomerData.is_technical_info_exists == false || this.getCustomerData.is_technical_info_exists == undefined) {
      this.currentTab = 2;

    }
    // Newly commented & added for member id check & back navigation
    // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id != undefined) {
    //   this.currentTab = 5;
    // }
    // else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_hierarchy_exists == true && this.getCustomerData.is_service_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.getCustomerData.customer_member_id == undefined) {
    //   this.currentTab = 4;
    // }
    else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true && this.paymentDone) {
      this.currentTab = 3;
    }
    else if (this.getCustomerData.is_technical_info_exists == true && this.getCustomerData.is_property_details_exists == true && this.getCustomerData.is_office_details_exists == true) {
      this.currentTab = 2;
    }


    const loader1 = document.getElementById('loader-overlay');
    this.isReadyToRender = true;

    // ✅ Show loader
    if (loader1) {
      // loader1.classList.add('d-none', 'hide');
    }

  }

  getCustomerById(): Promise<void> {
    this.memberId = this.localService.get('MemberId');
    // console.log('Member id(getCustomerById):', this.memberId);
    // let findObj = (this.iscancelVisible || this.isVisible)
    let findObj = (this.isPaymentRoute() || (this.hotelId && !isNaN(Number(this.hotelId))))
      ? { id: Number(this.hotelId) }
      : { customer_member_id: this.memberId };

    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find:
            // {
            // Newly added for getting customer id for customer type
            // id: this.hotelId
            // customer_member_id: this.memberId
            findObj
          // }
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            this.getCustomerData = resp.result.data[0];
            // this.hotelId = this.customerdata.id;
            this.hotelId = resp.result.data[0].id;
            this.localService.set('CustomerType', 'Customer');
            this.localService.remove('loggedOut');
            // Newly added for customer status(hint)
            this.customerStatus = this.customerdata.status;
            // Newly added for member id
            this.memberId = this.customerdata.customer_member_id;
            this.localService.set('MemberId', this.memberId);
            // Newly added for refreshing after payment
            if (this.isPaymentRoute()) {
              this.localService.set('roleId', this.customerdata.role_id);
            }
            // End for refreshing after payment
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
            // Newly added for getting customer id for customer type
            // customer_id: Number(this.localService.get('UserId')) != 0 ? Number(this.localService.get('UserId')) : this.hotelId
            member_id: this.memberId
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
            // Newly added for getting customer id for customer type
            // customer_id: this.hotelId
            member_id: this.memberId
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
            // Newly added for getting customer id for customer type
            // customer_id: Number(this.localService.get('UserId')) != 0 ? Number(this.localService.get('UserId')) : this.hotelId
            member_id: this.memberId
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

  sendMessage(customerData: any) {
    const payload = {
      "domain_name": 'https://www.guestezee.com',
      "customer_member_id": customerData.customer_member_id,
      "templateCode": "enrollment",
      "user_id": 1
      /*   OrganizationId: 30,
        Mobile: customerData.phone_number */
    };
    this.hotelenrollmentservice.sendSMS(payload).subscribe({
      next: (res) => {
        if (res && (res.success === 1)) {
          console.log('Welcome SMS sent successfully:', res);
          this.updateCustomerWelcomeSms(customerData.id);
        }
        else {
          console.log('Failed to send welcome SMS:', res);
        }
      },
      error: (err) => {
        console.error('Email API error:', err);
      }
    });
  }

  async updateCustomerWelcomeSms(customerId: any): Promise<boolean> {
    const updateBody = {
      domain_name: "https://www.guestezee.com",
      user_id: USER_ID,
      extras: {
        find: {
          id: customerId
        }
      },
      payload: {
        customer_update: {
          send_welcome_sms: true
        }
      }
    };
    return await new Promise<boolean>((resolve) => {
      this.hotelenrollmentservice
        .updateCustomercFcmToken(updateBody)
        .subscribe(
          (resp: any) => {
            if (resp.success === 1 && resp.status_code === 200) {
              resolve(true);
            } else {
              console.error('Failed to update customer welcome sms status:', resp?.message);
              resolve(false);
            }
          },
          (err: any) => {
            console.error('Error updating customer welcome sms status:', err);
            resolve(false);
          }
        );
    });
  }

  sendStatusMessage(customerData: any) {
    const payload = {
      "domain_name": "https://www.guestezee.com",
      "data": {
        "otp": {
          "countrycode": "+91",
          "mobile": customerData.phone_number,
          "otppurpose": "Pending"
        }
      }
    };
    this.hotelenrollmentservice.sendPendingSMS(payload).subscribe({
      next: (res) => {
        // console.log('Email API response:', res);
      },
      error: (err) => {
        console.error('Email API error:', err);
      }
    });
  }

}