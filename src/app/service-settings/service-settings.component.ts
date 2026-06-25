import { Component, OnInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceSettingsService } from './service-settings.service';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { AlertsService } from '../shared/alerts/alerts.service';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { DepartmentListService } from '../department-list/department-list.service';
import { FormsModule } from '@angular/forms';
import { HostListener } from '@angular/core';
import { ServiceTabListService } from '../service-tab-list/service-tab-list.service';
import { PermissionService, ModulePermission } from '../services/permission.service';

@Component({
  selector: 'app-service-settings',
  standalone: true,
  imports: [CommonModule, AlertsComponent, FormsModule],
  templateUrl: './service-settings.component.html',
  styleUrl: './service-settings.component.scss'
})

export class ServiceSettingsComponent implements OnInit {
  @ViewChild('deleteModal') deleteModal!: ElementRef;
  @ViewChild('filterBox') filterBox: any;
  @HostListener('document:click', ['$event'])
  idlistToDelete: any = [];
  service_type: any = "Services";
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  // Loader flag - used to show loader until data is loaded
  isLoading: boolean = false;
  alertOptions = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isModalHidden: boolean = true;
  isDefault: boolean = false;
  isServiceTab: boolean = true;
  member_id: any;
  departments: any[] = [];
  @ViewChild('rightButtons') rightButtons!: ElementRef;
  filterWidth: number = 0;
  showDropdown = false;
  filteredDepartments: any[] = [];
  selectedDepartment: string = '';
  allServicesList: any[] = [];   // store full list
  serviceList: any[] = [];       // visible list
  activeTab: string = 'Services';
  // Pagination (general tab / services list)
  pageSize: number = 10;
  currentPage: number = 1;
  showDeleteModal: boolean = false;
  serviceTabs: any[] = [];

  ngOnInit(): void {
    this.member_id = this.localService.get('MemberId');
    if (this.member_id) {
      this.getAllService(this.member_id);
      this.getDepartmentsById(this.member_id);
      this.getServiceTabsById(this.member_id);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.filterWidth = this.rightButtons.nativeElement.offsetWidth;
    }, 100);
  }

  constructor(
    private router: Router,
    private servicesetting: ServiceSettingsService,
    private authTokenService: AuthTokenService,
    private alertService: AlertsService,
    private localService: LocalStorageService,
    private departmentService: DepartmentListService,
    private eRef: ElementRef,
    private serviceTabListService: ServiceTabListService,
    private permissionService: PermissionService
  ) { }

  // -------------
  // Permission helpers for template bindings
  // -------------
  get canReadSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_read_permission ?? false;
  }

  get canAddSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_add_permission ?? false;
  }

  get canEditSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_edit_permission ?? false;
  }

  get canDeleteSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_delete_permission ?? false;
  }

  // -------------
  // Pagination helpers
  // -------------
  get totalItems(): number {
    return this.serviceList.length;
  }

  get totalPages(): number {
    return this.totalItems ? Math.ceil(this.totalItems / this.pageSize) : 1;
  }

  get endItemIndex(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  get paginatedServiceList(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.serviceList.slice(start, end);
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }

  prevPage() {
    this.setPage(this.currentPage - 1);
  }

  nextPage() {
    this.setPage(this.currentPage + 1);
  }

  // getAllService(memberId: any) {
  //   console.log("Service Type Selected:", this.service_type);
  //   // Convert service_type to lowercase array
  //   const lowerTypes = (
  //     Array.isArray(this.service_type) ? this.service_type : [this.service_type]
  //   ).map(t => t.toLowerCase());
  //   // Detect whether the selected type is Checkout or Late Checkout
  //   const isCheckoutType =
  //     lowerTypes.includes('checkout') || lowerTypes.includes('late checkout');
  //   // Prepare request body conditionally
  //   let requestBody: any = {
  //     domain_name: this.authTokenService.getDomain(),
  //     user_id: this.authTokenService.getUserId(),
  //     extras: { find: {} }
  //   };
  //   // CASE 1: Checkout / Late Checkout → remove member_id from find
  //   if (!isCheckoutType) {
  //     requestBody.extras.find.member_id = memberId;
  //   }
  //   console.log("Final Request Body:", requestBody);
  //   this.servicesetting.getAllService(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp) {
  //         this.allServicesList = resp.result.data;
  //         console.log("All services:", this.allServicesList);
  //         this.applyMainFilter();
  //         // CASE 1: Checkout filtering
  //         // if (isCheckoutType) {
  //         //   this.serviceList = allServices.filter((item: any) =>
  //         //     item.customer_id === undefined &&
  //         //     item.department === 'FO' &&
  //         //     (
  //         //       item.belongs_to?.toLowerCase() === 'checkout' ||
  //         //       item.belongs_to?.toLowerCase() === 'late checkout'
  //         //     )
  //         //   );
  //         // }
  //         // CASE 2: Normal department filtering
  //         // else {
  //         //   // this.serviceList = allServices.filter((item: any) => {
  //         //   //   const deptMatch = lowerTypes.includes(item.department?.toLowerCase());
  //         //   //   const name = item.name?.toLowerCase() || '';
  //         //   //   // Exclude checkout types
  //         //   //   const isCheckoutName =
  //         //   //     name === 'checkout' || name === 'late checkout';
  //         //   //   return deptMatch && !isCheckoutName;
  //         //   // });
  //         //   if (this.service_type === 'Menu Ordering') {
  //         //     this.serviceList = allServices.filter((item: any) => {
  //         //       const deptMatch = lowerTypes.includes(item.department?.toLowerCase());
  //         //       const name = item.name?.toLowerCase() || '';
  //         //       // Exclude checkout types
  //         //       const isCheckoutName =
  //         //         name === 'checkout' || name === 'late checkout';
  //         //       return deptMatch && !isCheckoutName;
  //         //     });
  //         //   }
  //         //   else {
  //         //     this.serviceList = allServices.filter((item: any) => {
  //         //       const dept = item.department?.toLowerCase() || '';
  //         //       const name = item.name?.toLowerCase() || '';
  //         //       // Exclude Menu Ordering department
  //         //       const isFnb = dept === 'Menu Ordering';
  //         //       // Exclude checkout types (name-based)
  //         //       const isCheckout = name === 'checkout' || name === 'late checkout';
  //         //       return !isFnb && !isCheckout;
  //         //     });
  //         //   }
  //         // }
  //         // console.log("Filtered services:", this.serviceList);
  //       }
  //     },
  //     (err) => {
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.options);
  //         this.router.navigate(['/login'], { skipLocationChange: false });
  //       } else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.options);
  //       } else {
  //         this.alertService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   );
  // }

  getDepartmentsById(memberId: any) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: memberId
        }
      }
    };
    this.departmentService.getAllDepartments(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          // Assigns department data
          const allDepartments = resp.result.data;
          this.departments = ["Default", ...allDepartments.map((dept: any) => dept.name)];
          // console.log('Department Data:', this.departments);
          this.filteredDepartments = this.departments;
        } else {
          console.error('Failed to fetch department details:', resp.message);
          this.departments = [];
        }
      },
      (error: any) => {
        console.error('Error fetching department details:', error);
      }
    );
  }

  getServiceTabsById(memberId: any) {
    // Show loader when fetching service tabs for the first time / refresh
    this.isLoading = true;
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { member_id: memberId }
      }
    };
    this.serviceTabListService.getAllServiceTabs(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          // Assigns department data
          this.serviceTabs = resp.result.data;
          // console.log('Service Tab Data:', this.serviceTabs);
          this.isLoading = false;
        }
        else {
          this.serviceTabs = [];
          this.alertService.error(resp.message, this.alertOptions);
          this.isLoading = false;
        }
      },
      (error: any) => {
        this.serviceTabs = [];
        this.alertService.error(error.message, this.alertOptions);
        console.error('Error fetching service tab details:', error);
        this.isLoading = false;
      }
    );
  }

  // assignService(data: any) {
  //   this.service_type = data;
  //   // SWITCH TAB BASED ON DEPARTMENT
  //   if (this.service_type === 'Services') {
  //     this.activeTab = 'Services';
  //   }
  //   else if (this.service_type === 'Menu Ordering') {
  //     this.activeTab = 'Menu Ordering';
  //   }
  //   else {
  //     this.activeTab = 'Checkout';
  //   }
  //   // Detect if checkout tab was clicked
  //   if (Array.isArray(data)) {
  //     // Checkout tab sends: ['Checkout', 'Late checkout'] - for disabling create & delete
  //     this.isDefault = true;
  //   } else {
  //     this.isDefault = false;
  //   }
  //   this.getAllService(this.member_id);
  // }

  editService(id: any) {
    this.router.navigate(["/edit-service", id], { state: { mode: 'edit' } });
  }

  viewService(id: any) {
    this.router.navigate(["/view-service", id], { state: { mode: 'view' } });
  }

  navigateTNewService() {
    this.router.navigate([`/add-new-service`], { skipLocationChange: false });
  }

  // Functions to handle deletion
  openModal() {
    this.deleteModal.nativeElement.style.display = 'block';
  }

  closeModal() {
    var modal = document.getElementById("deleteModal"); // Get the element by its ID
    if (modal) {
      modal.style.display = 'none'; // Hide the modal
    }
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }

  getIdToDeleteService(id: number) {
    const index = this.idlistToDelete.indexOf(id);
    if (index === -1) {
      // Add ID if not already selected
      this.idlistToDelete.push(id);
    } else {
      // Remove ID if already selected
      this.idlistToDelete.splice(index, 1);
    }
    // console.log(this.idlistToDelete, "IDs selected for deletion");
  }

  confirmDelete() {
    // Check if any ID is selected
    if (!this.idlistToDelete || this.idlistToDelete.length === 0) {
      this.alertService.error('Please select at least one service to delete!', this.alertOptions);
      // this.closeModal();
      this.closeDeleteModal();
      return;
    }
    // Proceed with API call only if IDs exist
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "payload": {
        "delete_data": {},
        "variants": []
      },
      "extras": {
        "find": {
          "id": this.idlistToDelete
        }
      }
    }
    this.servicesetting.deleteService(requestBody).subscribe(resp => {
      if (resp.status_code === 200 && resp.success === 1) {
        this.alertService.success('Service deleted successfully', this.alertOptions);
        this.getAllService(this.member_id);
        // this.closeModal();
        this.closeDeleteModal();
      }
      else {
        this.alertService.error(resp.message || 'Failed to delete service', this.alertOptions);
      }
    },
      err => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertService.error(err.error.message, this.alertOptions)
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
        }
      });
    // this.closeModal();
    this.closeDeleteModal();
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    // Reset the department list when opening
    if (this.showDropdown) {
      this.filteredDepartments = [...this.departments];
    }
  }

  assignService(data: any) {
    this.service_type = data;
    // Set active tab based on click
    if (data === 'Menu Ordering') {
      this.activeTab = 'Menu Ordering';
      this.isDefault = true;
      this.isServiceTab = false;
    } else if (Array.isArray(data)) {
      this.activeTab = 'Checkout';
      this.isDefault = true;
      this.isServiceTab = false;
    }
    else if (data === 'Default') {
      this.activeTab = 'Default';
      this.isDefault = true;
      this.isServiceTab = false;
    }
    else {
      this.activeTab = 'Services';
      this.isServiceTab = true;
      this.isDefault = false;
    }
    // Reset filter when switching tabs
    this.selectedDepartment = '';
    this.filteredDepartments = [...this.departments];
    this.getAllService(this.member_id);
  }

  getAllService(memberId: any) {
    // Show loader whenever services list is being fetched
    this.isLoading = true;
    // console.log('Service Type:', this.service_type);
    // console.log('Type of service_type:', typeof this.service_type);
    const lowerTypes = (
      Array.isArray(this.service_type) ? this.service_type : [this.service_type]
    ).map(t => t.toLowerCase());
    // console.log('Lowercase Types:', lowerTypes);
    // const isCheckoutType =
    //   lowerTypes.includes('checkout') || lowerTypes.includes('late checkout');
    const isCheckoutType =
      lowerTypes.includes('checkout') ||
      lowerTypes.includes('late checkout') ||
      lowerTypes.includes('menu ordering') ||
      lowerTypes.includes('default');
    // console.log('Is Checkout Type:', isCheckoutType);
    // Build Request
    let requestBody: any = {
      domain_name: this.authTokenService.getDomain(),
      user_id: USER_ID,
      extras: { find: {} }
    };
    // Add member_id ONLY for Services & Menu Ordering
    // if (!isCheckoutType) {
    //   requestBody.extras.find.member_id = memberId;
    // }
    // console.log('Final Request Body:', requestBody);
    this.servicesetting.getAllService(requestBody).subscribe(
      (resp: any) => {
        if (resp) {
          if (isCheckoutType) {
            this.allServicesList = resp.result.data;
            // console.log('All Services of Checkout/Late Checkout/Menu Ordering/ Default:', this.allServicesList);
            this.applyMainFilter();
          }
          else {
            const allData = resp.result.data;
            // First gets only member's own services
            const memberServices = allData.filter(
              (item: any) => item.member_id === memberId
            );
            // Newly commented & added for not showing Help Service
            /*  // Then gets Help Service items only
            const helpServices = allData
              .filter((item: any) => item.belongs_to === 'Help Service')
              .map((item: any) => ({
                ...item,
                isHelpService: true
              }));
            // Merge both lists together 
            this.allServicesList = [...memberServices, ...helpServices]; */
            this.allServicesList = memberServices;
            // End of newly commented & added for not showing Help Service
            // console.log('All Services of Services:', this.allServicesList);
            this.applyMainFilter();
          }
          // Hide loader once data is processed
          this.isLoading = false;
        }
      },
      err => {
        // Hide loader on error as well
        this.isLoading = false;
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate(['/login']);
        } else {
          this.alertService.error(err.error.message || 'Something bad happened!', this.options);
        }
      }
    );
  }

  onFilter(event: any) {
    const value = event.target.value.trim().toLowerCase();
    // console.log('Filter input value:', value);
    this.filteredDepartments = this.departments.filter(d =>
      d.toLowerCase().includes(value)
    );
    // Newly added for filtering
    this.showDropdown = true;
    // Ended
    // If user clears input → reset to original tab filter
    if (!value) {
      this.selectedDepartment = '';
      this.getAllService(this.member_id);
    }
  }

  selectDepartment(dept: string) {
    this.selectedDepartment = dept;
    this.showDropdown = false;
    // AUTO SWITCH TAB BASED ON DEPARTMENT
    const d = dept.toLowerCase();
    // console.log('Selected department (lowercase):', d);
    if (d === 'menu ordering') {
      this.activeTab = 'Menu Ordering';
      this.service_type = 'Menu Ordering';
      this.isDefault = true;
      this.isServiceTab = false;
    }
    else if (d === 'checkout' || d === 'late checkout') {
      this.activeTab = 'Checkout';
      this.service_type = ['Checkout', 'Late checkout'];
      this.isDefault = true;
      this.isServiceTab = false;
    }
    else if (d === 'default') {
      this.activeTab = 'Default';
      this.service_type = 'Default';
      this.isDefault = true;
      this.isServiceTab = false;
    }
    else {
      this.activeTab = 'Services';
      this.service_type = 'Services';
      this.isDefault = false;
      this.isServiceTab = true;
    }
    this.getAllService(this.member_id);
  }

  applyMainFilter() {
    const lowerTypes = (
      Array.isArray(this.service_type) ? this.service_type : [this.service_type]
    ).map(t => t.toLowerCase());
    // console.log('Applying filter for types:', lowerTypes);
    // Unified special types: checkout, late checkout, Menu Ordering
    const specialTypes = ['checkout', 'late checkout', 'menu ordering', 'default'];
    const isSpecialTab = lowerTypes.some(t => specialTypes.includes(t));
    if (isSpecialTab) {
      // if(this.selectedDepartment) {
      //   this.selectedDepartment = this.service_type
      // }
      // else {
      //   this.selectedDepartment = '';
      // }
      this.filteredDepartments = [...this.departments];
      // Filter by matching service_type (Checkout / Late Checkout / Menu Ordering)
      this.serviceList = this.allServicesList.filter((item: any) => {
        const belongsTo = item.belongs_to?.toLowerCase();
        const department = item.department?.toLowerCase();
        // Newly added for getting member id for customer type
        // const customerId = item.customer_id;
        // Only include unassigned services
        // if (customerId !== undefined) return false;
        const memberId = item.member_id;
        if (memberId !== undefined) return false;
        // Ended for getting member id for customer type
        // For Checkout types
        if (lowerTypes.includes('checkout') || lowerTypes.includes('late checkout')) {
          return (belongsTo === 'checkout' || belongsTo === 'late checkout');
        }
        // For Menu Ordering type
        if (lowerTypes.includes('menu ordering')) {
          return belongsTo === 'menu ordering';
        }
        // For Default type
        if (lowerTypes.includes('default')) {
          return department === 'default';
        }
        return false;
      });
      // Reset to first page whenever the filtered list changes
      this.currentPage = 1;
      return;
    }
    // Regular department filter
    if (this.selectedDepartment) {
      this.serviceList = this.allServicesList.filter(
        (s: any) => s.department?.toLowerCase() === this.selectedDepartment.toLowerCase()
      );
      this.currentPage = 1;
      return;
    }
    // Default filters
    /* if (this.service_type?.toLowerCase() === 'Menu Ordering') {
      this.serviceList = this.allServicesList.filter((item: any) => {
        const belongsTo = item.belongs_to?.toLowerCase() === 'menu ordering';
        const name = item.name?.toLowerCase();
        return belongsTo && !(name === 'checkout' || name === 'late checkout');
      });
    }  */
    // else {
    // Services tab: exclude Menu Ordering + checkout
    this.serviceList = this.allServicesList.filter((item: any) => {
      const belongsTo = item.belongs_to?.toLowerCase();
      const name = item.name?.toLowerCase();
      return belongsTo !== 'menu ordering' && !(name === 'checkout' || name === 'late checkout');
    });
    this.currentPage = 1;
    // }
  }

  // Newly added for filtering
  openDropdown() {
    this.showDropdown = true;
  }

  closeDropdownDelayed() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 150);   // delay prevents instant closing
  }
  // Ended

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.showDropdown && this.filterBox && !this.filterBox.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  openDeleteModal() {
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
  }




}
