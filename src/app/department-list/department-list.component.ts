import { AlertsService } from './../shared/alerts/alerts.service';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { DepartmentListService } from './department-list.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { ServiceSettingsService } from '../service-settings/service-settings.service';
import { PermissionService, ModulePermission } from '../services/permission.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';

interface Department {
  _id: string;
  id: number;
  name: string;
  description?: string;
  default_services: string[];
}

interface AssignableService {
  id: number;
  name: string;
  belongs_to: string;
  assignedDept?: string; // selected department
  tempAssignedDept?: string;
}

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [FormsModule, CommonModule, AlertsComponent],
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent {
  alertOptions = {
    autoClose: true,
    keepAfterRouteChange: true
  };
  departments: Department[] = [];
  // Add/Edit modal
  isModalOpen = false;
  isEditMode = false;
  newDepartmentName = '';
  newDepartmentDescription = '';
  editingIndex: number | null = null;
  nameError = false;
  // Delete modal
  isDeleteModalOpen = false;
  selectedDepartment: Department | null = null;
  deleteIndex: number | null = null;
  member_id: any;
  hotel_id: any;
  assignableServices: AssignableService[] = [];
  // Newly added for loader
  isLoading: boolean = false;
  isLoadingServices: boolean = false;
  // View-only mode for modal
  isViewMode: boolean = false;

  /**
   * Enable/disable background page scrolling when any department modal is open.
   */
  private updateBodyScrollLock(): void {
    const anyModalOpen = this.isModalOpen || this.isDeleteModalOpen;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  // Missing services hint
  get unassignedServiceNames(): string[] {
    if (!this.assignableServices?.length) return [];
    return this.assignableServices
      .filter(svc => !this.isServiceAssigned(svc))
      .map(svc => svc.name);
  }

  // Show current saved department for a service in the table
  // getCurrentDepartmentName(service: AssignableService): string {
  //   const dept = this.departments.find(d => d.default_services?.includes(service.name));
  //   return dept ? dept.name : 'Not Assigned';
  // }
  getCurrentDepartmentName(service: AssignableService): string {
    return service.assignedDept || 'Not Assigned';
  }
  

  ngOnInit() {
    this.member_id = this.localService.get('MemberId');
    this.hotel_id = Number(this.localService.get('UserId'));
    // Load permissions for SYSTEM SETTINGS module
    this.getAssignableServices();
    if (this.member_id) {
      this.getDepartmentById(this.member_id);
    }
  }

  constructor(
    private localService: LocalStorageService,
    private departmentService: DepartmentListService,
    private alertsService: AlertsService,
    private serviceSettingsService: ServiceSettingsService,
    private permissionService: PermissionService,
    private hotelEnrollmentTabviewService: HotelEnrollmentTabviewService
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
  // View / Add / Edit helpers
  // -------------
  openAddModal() {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.isViewMode = false;
    this.newDepartmentName = '';
    this.newDepartmentDescription = '';
    this.editingIndex = null;
    this.nameError = false;
    this.updateBodyScrollLock();
  }

  openEditModal(dept: Department, index: number) {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.isViewMode = false;
    this.newDepartmentName = dept.name;
    this.newDepartmentDescription = dept.description || '';
    this.editingIndex = index;
    this.nameError = false;
    this.updateBodyScrollLock();
  }

  openViewModal(dept: Department, index: number) {
    // View-only mode: fields are readonly and save is disabled
    this.isModalOpen = true;
    this.isEditMode = false;
    this.isViewMode = true;
    this.newDepartmentName = dept.name;
    this.newDepartmentDescription = dept.description || '';
    this.editingIndex = index;
    this.nameError = false;
    this.updateBodyScrollLock();
  }

  // ------------------------
  // Fetch departments
  // ------------------------
  getDepartmentById(memberId: any) {
    this.isLoading = true;
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { member_id: memberId }
      }
    };
    this.departmentService.getAllDepartments(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.departments = resp.result.data.map((d: Department) => ({
            ...d,
            default_services: Array.isArray(d.default_services) ? d.default_services : []
          }));
          this.mapAssignedDepartments(); // Map assignedDept for services
        } else {
          this.departments = [];
        }
        this.isLoading = false;
      },
      () => {
        this.departments = [];
        this.isLoading = false;
      }
    );
  }


  // Newly added & commented (without late checkout setting check)
  // getAssignableServicesOld(): void {
  //   this.isLoadingServices = true;
  //   const allowedAssignable = [
  //     'Checkout', 'Late checkout', 'Menu Ordering', 'Help Service'
  //   ];
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { belongs_to: allowedAssignable } }
  //   };
  //   this.serviceSettingsService.getServiceByid(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp?.success === 1 && resp?.status_code === 200) {
  //         const services = resp.result.data || [];
  //         this.assignableServices = services.filter((service: any) =>
  //           allowedAssignable.includes(service.belongs_to)
  //         );
  //         this.mapAssignedDepartments(); // Map assignedDept after services are fetched
  //       } else {
  //         this.assignableServices = [];
  //         this.alertsService.error(resp.message, this.alertOptions);
  //       }
  //       this.isLoadingServices = false;
  //     },
  //     err => {
  //       this.assignableServices = [];
  //       this.alertsService.error(err || 'Failed to load services', this.alertOptions);
  //       this.isLoadingServices = false;
  //     }
  //   );
  // }

  getAssignableServices(): void {
    this.isLoadingServices = true;
    const allowedAssignable = [
      'Checkout', 'Late checkout', 'Menu Ordering', 'Help Service'
    ];
    // First check the hotel settings to see if Late checkout is enabled
    const customerRequestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { customer_member_id: this.member_id }
      }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(customerRequestBody).subscribe(
      (customerResp: any) => {
        // Determine whether Late checkout is enabled in settings
        let lateCheckoutEnabled = false;
        if (
          customerResp?.success === 1 &&
          customerResp?.status_code === 200 &&
          customerResp?.result?.data?.length > 0
        ) {
          const settings = customerResp.result.data[0]?.settings;
          lateCheckoutEnabled = settings?.late_checkout_required === true;
        }
        // Build the effective allowed list based on the setting
        const effectiveAllowed = lateCheckoutEnabled
          ? allowedAssignable
          : allowedAssignable.filter(s => s !== 'Late checkout');
        const requestBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: { find: { belongs_to: effectiveAllowed } }
        };
        this.serviceSettingsService.getServiceByid(requestBody).subscribe(
          (resp: any) => {
            if (resp?.success === 1 && resp?.status_code === 200) {
              const services = resp.result.data || [];
              this.assignableServices = services.filter((service: any) =>
                effectiveAllowed.includes(service.belongs_to)
              );
              this.mapAssignedDepartments(); // Map assignedDept after services are fetched
            } else {
              this.assignableServices = [];
              this.alertsService.error(resp.message, this.alertOptions);
            }
            this.isLoadingServices = false;
          },
          err => {
            this.assignableServices = [];
            this.alertsService.error(err || 'Failed to load services', this.alertOptions);
            this.isLoadingServices = false;
          }
        );
      },
      () => {
        // If we can't fetch settings, proceed without Late checkout to be safe
        const effectiveAllowed = allowedAssignable.filter(s => s !== 'Late checkout');
        const requestBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: { find: { belongs_to: effectiveAllowed } }
        };
        this.serviceSettingsService.getServiceByid(requestBody).subscribe(
          (resp: any) => {
            if (resp?.success === 1 && resp?.status_code === 200) {
              const services = resp.result.data || [];
              this.assignableServices = services.filter((service: any) =>
                effectiveAllowed.includes(service.belongs_to)
              );
              this.mapAssignedDepartments();
            } else {
              this.assignableServices = [];
              this.alertsService.error(resp.message, this.alertOptions);
            }
            this.isLoadingServices = false;
          },
          err => {
            this.assignableServices = [];
            this.alertsService.error(err || 'Failed to load services', this.alertOptions);
            this.isLoadingServices = false;
          }
        );
      }
    );
  }
  // End of newly added & commented code

  // ------------------------
  // Map services to assigned departments for UI
  // ------------------------
  private mapAssignedDepartments() {
    if (!this.departments.length || !this.assignableServices.length) return;

    this.assignableServices.forEach(service => {
      const dept = this.departments.find(d =>
        d.default_services?.includes(service.name)
      );
      service.assignedDept = dept ? dept.name : '';
      service.tempAssignedDept = service.assignedDept; //for showing updated department changes in UI
    });
  }

  

  // ------------------------
  // Create / Update Department
  // ------------------------
  saveDepartment() {
    // In view-only mode, do not attempt to save
    if (this.isViewMode) {
      return;
    }
    const name = this.newDepartmentName.trim();
    const description = this.newDepartmentDescription.trim();
    if (!name) {
      this.nameError = true;
      return;
    }
    if (this.isEditMode && this.editingIndex !== null) {
      this.updateDepartment(name, description);
    } else {
      this.createDepartment(name, description);
    }
  }

  createDepartment(name: string, description: string) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        department_creation: {
          customer_id: this.hotel_id,
          member_id: this.member_id,
          name,
          description,
        }
      }
    };
    this.departmentService.createDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.alertsService.success('Department created successfully!', this.alertOptions);
          this.closeModal();
          this.getDepartmentById(this.member_id);
        } else if (resp.success === 0 && resp.status_code === 200) {
          this.alertsService.error(resp.message, this.alertOptions);
        } else {
          this.alertsService.error(resp.message, this.alertOptions);
        }
      },
      () => this.alertsService.error('Error creating department!', this.alertOptions)
    );
  }

  updateDepartment(name: string, description: string) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: this.editingIndex } },
      payload: {
        department_updation: {
          name,
          description,
          member_id: this.member_id,
          customer_id: this.hotel_id,
        }
      }
    };
    this.departmentService.updateDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.alertsService.success('Department updated successfully!', this.alertOptions);
          this.closeModal();
          this.getDepartmentById(this.member_id);
        } else if (resp.success === 0 && resp.status_code === 200) {
          this.alertsService.error(resp.message, this.alertOptions);
        } else {
          this.alertsService.error(resp.message, this.alertOptions);
        }
      },
      () => this.alertsService.error('Error updating department!', this.alertOptions)
    );
  }

  closeModal() {
    this.isModalOpen = false;
    this.newDepartmentName = '';
    this.newDepartmentDescription = '';
    this.editingIndex = null;
    this.nameError = false;
    this.updateBodyScrollLock();
  }

  onNameInputChange() {
    if (this.newDepartmentName.trim()) this.nameError = false;
  }

  // ------------------------
  // Delete Department
  // ------------------------
  openDeleteModal(dept: Department, index: number) {
    this.selectedDepartment = dept;
    this.deleteIndex = index;
    this.isDeleteModalOpen = true;
    this.updateBodyScrollLock();
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.selectedDepartment = null;
    this.deleteIndex = null;
    this.updateBodyScrollLock();
  }

  confirmDelete() {
    if (this.deleteIndex !== null) this.deleteDepartment(this.deleteIndex);
    this.closeDeleteModal();
  }

  deleteDepartment(deleteIndex: number) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: deleteIndex } },
      payload: {}
    };
    this.departmentService.deleteDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          // Newly added for deletion resp message 
          // this.alertsService.success('Department deleted successfully!', this.alertOptions);
          if (resp.message && resp.message.includes('Record successfully deleted')) {
            this.alertsService.success('Department deleted successfully!', this.alertOptions);
          } else {
            this.alertsService.error(resp.message, this.alertOptions);
          }
          // End of newly added for deletion resp message 
          this.getDepartmentById(this.member_id);
        }
        else {
          this.alertsService.error(resp.message, this.alertOptions);
        }
      },
      () => this.alertsService.error('Error deleting department!', this.alertOptions)
    );
  }

  isServiceAssigned(service: AssignableService): boolean {
    return this.departments.some(d =>
      d.default_services?.includes(service.name)
    );
  }

  // ------------------------
  // Assign / Remove service to department
  // ------------------------
  // assignDepartmentToService(service: AssignableService) {
  //   if (!service.assignedDept) {
  //     this.alertsService.error('Please choose a department to assign!', this.alertOptions);
  //     return;
  //   }
  //   const dept = this.departments.find(d => d.name === service.assignedDept);
  //   if (!dept) {
  //     this.alertsService.error('Selected department not found!', this.alertOptions);
  //     return;
  //   }
  //   dept.default_services = dept.default_services || [];
  //   if (!dept.default_services.includes(service.name)) {
  //     dept.default_services.push(service.name);
  //   }
  //   service.assignedDept = dept.name;
  //   const { _id, ...payloadData } = { ...dept, default_services: dept.default_services };
  //   const jsonObj = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { id: dept.id } },
  //     payload: { department_updation: payloadData }
  //   };
  //   this.departmentService.updateDepartment(jsonObj).subscribe(
  //     (resp: any) => {
  //       if (resp.success === 1 && resp.status_code === 200) {
  //         service.assignedDept = service.tempAssignedDept;// updating UI after successful assignment
  //         this.alertsService.success(`"${service.name}" service is assigned to "${dept.name}" department!`, this.alertOptions);
  //         this.getDepartmentById(this.member_id); // refresh
  //         this.getAssignableServices(); 
  //       } 
        
  //       else {
  //         this.alertsService.error(resp.message || 'Failed to assign service!', this.alertOptions);
  //         dept.default_services = dept.default_services.filter(s => s !== service.name);
  //         service.assignedDept = '';
  //       }
  //     },
  //     () => {
  //       this.alertsService.error('Error assigning service!', this.alertOptions);
  //       dept.default_services = dept.default_services.filter(s => s !== service.name);
  //       service.assignedDept = '';
  //     }
  //   );
  // }

  assignDepartmentToService(service: AssignableService) {
    if (!service.assignedDept) {
      this.alertsService.error('Please choose a department to assign!', this.alertOptions);
      return;
    }
    const dept = this.departments.find(d => d.name === service.assignedDept);
    if (!dept) {
      this.alertsService.error('Selected department not found!', this.alertOptions);
      return;
    }

    // Remove the service from any other department locally so the UI updates properly
    this.departments.forEach(d => {
      if (d.name !== dept.name && d.default_services?.includes(service.name)) {
        d.default_services = d.default_services.filter(s => s !== service.name);
      }
    });

    dept.default_services = dept.default_services || [];
    if (!dept.default_services.includes(service.name)) {
      dept.default_services.push(service.name);
    }
    service.assignedDept = dept.name;

    const { _id, ...payloadData } = { ...dept, default_services: dept.default_services };
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: dept.id } },
      payload: { department_updation: payloadData }
    };

    this.departmentService.updateDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.alertsService.success(`"${service.name}" service is assigned to "${dept.name}" department!`, this.alertOptions);
          this.getDepartmentById(this.member_id); // refresh
          this.getAssignableServices();
        } else {
          this.alertsService.error(resp.message || 'Failed to assign service!', this.alertOptions);
          dept.default_services = dept.default_services.filter(s => s !== service.name);
          service.assignedDept = '';
        }
      },
      () => {
        this.alertsService.error('Error assigning service!', this.alertOptions);
        dept.default_services = dept.default_services.filter(s => s !== service.name);
        service.assignedDept = '';
      }
    );
  }


  removeDepartmentFromService(service: AssignableService) {
    const dept = this.departments.find(d => d.default_services?.includes(service.name));
    if (!dept) return;
    dept.default_services = dept.default_services.filter(s => s !== service.name);
    service.assignedDept = '';
    const { _id, ...payloadData } = { ...dept, default_services: dept.default_services };
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: dept.id } },
      payload: { department_updation: payloadData }
    };
    this.departmentService.updateDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.alertsService.success(`"${service.name}" service is removed from "${dept.name}" department!`, this.alertOptions);
        } else {
          this.alertsService.error(resp.message || 'Failed to remove service!', this.alertOptions);
          dept.default_services.push(service.name);
          service.assignedDept = dept.name;
        }
      },
      () => {
        this.alertsService.error('Error removing service!', this.alertOptions);
        dept.default_services.push(service.name);
        service.assignedDept = dept.name;
      }
    );
  }

  allServicesAssigned(): boolean {
    if (!this.assignableServices.length) return false;
    return this.assignableServices.every(svc => this.isServiceAssigned(svc));
  }
}
