import { AlertsService } from './../shared/alerts/alerts.service';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { DepartmentListService } from './department-list.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';

interface Department {
  id: number;
  name: string;
  description?: string;
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

  ngOnInit() {
    this.member_id = this.localService.get('MemberId');
    console.log('Member Id:', this.member_id);
    this.hotel_id = Number(this.localService.get('UserId'));
    console.log('Hotel Id:', this.hotel_id);
    if (this.member_id) {
      this.getDepartmentById(this.member_id);
    }
  }

  constructor(
    private localService: LocalStorageService,
    private departmentService: DepartmentListService,
    private alertsService: AlertsService
  ) { }

  getDepartmentById(memberId: any) {
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
          this.departments = resp.result.data;
          console.log('Department Data:', this.departments);
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

  saveDepartment() {
    const name = this.newDepartmentName.trim();
    const description = this.newDepartmentDescription.trim();
    if (!name) {
      this.nameError = true;
      return;
    }
    if (this.isEditMode && this.editingIndex !== null) {
      this.updateDepartment(name, description);
    }
    else {
      this.createDepartment(name, description);
    }
  }

  // Creation methods
  openAddModal() {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.newDepartmentName = '';
    this.newDepartmentDescription = '';
    this.nameError = false;
  }

  createDepartment(name: string, description: string) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        department_creation: {
          customer_id: this.hotel_id,
          member_id: this.member_id,
          name: name,
          description,
        },
      },
    };
    this.departmentService.createDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.alertsService.success('Department created successfully!', this.alertOptions);
          this.closeModal();
          this.getDepartmentById(this.member_id);
        } 
        else if (resp.success === 0 && resp.status_code === 200)  {
          this.alertsService.error('Department name already exists for this member!', this.alertOptions);
        }
        else {
          this.alertsService.error('Failed to create department!', this.alertOptions);
        }
      },
      (error: any) => {
        this.alertsService.error('Error creating department!', this.alertOptions);
      }
    );
  }

  // Update methods
  openEditModal(dept: Department, index: number) {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.newDepartmentName = dept.name;
    this.newDepartmentDescription = dept.description || '';
    this.editingIndex = index;
    console.log('Editing index while opening editor modal:', this.editingIndex);
    this.nameError = false;
  }

  updateDepartment(name: string, description: string) {
    console.log('Editing index while updating:', this.editingIndex);
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: this.editingIndex
        }
      },
      payload: {
        department_updation: {
          name: name,
          description,
          member_id: this.member_id,
          customer_id: this.hotel_id,
        },
      },
    };
    this.departmentService.updateDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.alertsService.success('Department updated successfully!', this.alertOptions);
          this.closeModal();
          this.getDepartmentById(this.member_id); // Refresh department list from server();
        }
        else if (resp.success === 0 && resp.status_code === 200)  {
          this.alertsService.error('Department name already exists for this member!', this.alertOptions);
        }
        else {
          this.alertsService.error('Failed to update department!', this.alertOptions);
        }
      },
      (error: any) => {
        this.alertsService.error('Error updating department!', this.alertOptions);
      }
    );
  }

  closeModal() {
    this.isModalOpen = false;
    this.newDepartmentName = '';
    this.newDepartmentDescription = '';
    this.editingIndex = null;
    this.nameError = false;
  }

  // Hide error message as soon as user types
  onNameInputChange() {
    if (this.newDepartmentName.trim()) {
      this.nameError = false;
    }
  }

  // Delete methods
  openDeleteModal(dept: Department, index: number) {
    this.selectedDepartment = dept;
    this.deleteIndex = index;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.selectedDepartment = null;
    this.deleteIndex = null;
  }

  confirmDelete() {
    if (this.deleteIndex !== null) {
      this.deleteDepartment(this.deleteIndex);
    }
    this.closeDeleteModal();
  }

  deleteDepartment(deleteIndex: number) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: deleteIndex
        }
      },
      payload: {}
    };
    this.departmentService.deleteDepartment(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.alertsService.success('Department deleted successfully!', this.alertOptions);
          this.getDepartmentById(this.member_id);
        } 
        else {
          this.alertsService.error('Failed to delete department!', this.alertOptions);
        }
      },
      (error: any) => {
        this.alertsService.error('Error deleting department!', this.alertOptions);
      }
    );
  }
}
