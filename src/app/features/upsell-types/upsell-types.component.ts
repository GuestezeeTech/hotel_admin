import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { PermissionService } from '../../services/permission.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { UpsellType, UpsellTypeService } from '../upsell-type.service';

/** Upsell Names: the hotel's own list of names for the Upselling "Name" dropdown */
@Component({
  selector: 'app-upsell-types',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertsComponent],
  templateUrl: './upsell-types.component.html',
  styleUrl: './upsell-types.component.scss'
})
export class UpsellTypesComponent implements OnInit {
  memberId: any;
  types: UpsellType[] = [];
  loaded = false;
  search = '';

  isFormOpen = false;
  editingId: any = null;
  formName = '';
  formDescription = '';
  formActive = true;
  formError = '';
  saving = false;

  deleteTarget: UpsellType | null = null;
  deleting = false;

  options = { autoClose: true, keepAfterRouteChange: false };

  constructor(
    private upsellTypeService: UpsellTypeService,
    private localService: LocalStorageService,
    private alertService: AlertsService,
    private permissionService: PermissionService,
    private loaderService: LoaderService,
    private router: Router
  ) { }

  get canAdd(): boolean {
    return this.permissionService.getModulePermission('FEATURES')?.has_add_permission ?? false;
  }

  get canEdit(): boolean {
    return this.permissionService.getModulePermission('FEATURES')?.has_edit_permission ?? false;
  }

  get canDelete(): boolean {
    return this.permissionService.getModulePermission('FEATURES')?.has_delete_permission ?? false;
  }

  get filteredTypes(): UpsellType[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.types.filter(t => t.name.toLowerCase().includes(q)) : this.types;
  }

  ngOnInit(): void {
    this.memberId = this.localService.get('MemberId');
    this.loadTypes();
  }

  loadTypes() {
    this.loaderService.emitLoading();
    this.upsellTypeService.getAll(this.memberId).subscribe({
      next: (resp: any) => {
        this.loaderService.emitComplete();
        this.loaded = true;
        const data = resp?.success && Array.isArray(resp?.result?.data) ? resp.result.data : [];
        this.types = data.map((t: any) => ({ ...t, name: UpsellTypeService.nameOf(t) }));
      },
      error: (err) => {
        this.loaderService.emitComplete();
        this.loaded = true;
        this.types = [];
        this.alertService.error(err?.error?.message || 'Could not load upsell names.', this.options);
      }
    });
  }

  backToUpselling() {
    this.router.navigate(['/features']);
  }

  openAdd() {
    if (!this.canAdd) return;
    this.editingId = null;
    this.formName = '';
    this.formDescription = '';
    this.formActive = true;
    this.formError = '';
    this.isFormOpen = true;
  }

  /** Loads the latest copy with getbyid, then opens the form */
  openEdit(item: UpsellType) {
    if (!this.canEdit) return;
    this.editingId = item.id;
    this.fillForm(item);
    this.isFormOpen = true;
    this.upsellTypeService.getById(item.id, this.memberId).subscribe({
      next: (resp: any) => {
        const data = resp?.result?.data;
        const fresh = Array.isArray(data) ? data[0] : data;
        if (resp?.success && fresh && this.editingId === item.id) {
          this.fillForm({ ...fresh, name: UpsellTypeService.nameOf(fresh) });
        }
      },
      error: () => { /* keep the list copy */ }
    });
  }

  private fillForm(item: UpsellType) {
    this.formName = item.name || '';
    this.formDescription = item.description || '';
    this.formActive = item.is_active !== false;
    this.formError = '';
  }

  closeForm() {
    this.isFormOpen = false;
    this.saving = false;
  }

  save() {
    const name = this.formName.trim().replace(/\s+/g, ' ');
    if (!name) {
      this.formError = 'Please enter a name.';
      return;
    }
    const duplicate = this.types.some(t => t.id !== this.editingId && t.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      this.formError = `"${name}" is already in the list.`;
      return;
    }
    this.formError = '';
    this.saving = true;
    const data = {
      name,
      description: this.formDescription.trim(),
      is_active: this.formActive,
      member_id: this.memberId
    };
    const request = this.editingId
      ? this.upsellTypeService.update(this.editingId, this.memberId, data)
      : this.upsellTypeService.create(data);
    this.loaderService.emitLoading();
    request.subscribe({
      next: (resp: any) => {
        this.loaderService.emitComplete();
        this.saving = false;
        if (resp?.success) {
          this.alertService.success(this.editingId ? 'Upsell name updated.' : 'Upsell name added.', this.options);
          this.closeForm();
          this.loadTypes();
        } else {
          this.formError = resp?.message || 'Could not save. Please try again.';
        }
      },
      error: (err) => {
        this.loaderService.emitComplete();
        this.saving = false;
        this.formError = err?.error?.message || 'Could not save. Please try again.';
      }
    });
  }

  askDelete(item: UpsellType) {
    if (!this.canDelete) return;
    this.deleteTarget = item;
  }

  cancelDelete() {
    this.deleteTarget = null;
    this.deleting = false;
  }

  confirmDelete() {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.loaderService.emitLoading();
    this.upsellTypeService.delete(this.deleteTarget.id, this.memberId).subscribe({
      next: (resp: any) => {
        this.loaderService.emitComplete();
        const name = this.deleteTarget?.name;
        this.cancelDelete();
        if (resp?.success) {
          this.alertService.success(`"${name}" deleted.`, this.options);
          this.loadTypes();
        } else {
          this.alertService.error(resp?.message || 'Could not delete. Please try again.', this.options);
        }
      },
      error: (err) => {
        this.loaderService.emitComplete();
        this.cancelDelete();
        this.alertService.error(err?.error?.message || 'Could not delete. Please try again.', this.options);
      }
    });
  }
}
