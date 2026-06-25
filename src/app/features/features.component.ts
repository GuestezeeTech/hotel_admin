
import { Component, ViewChild, ElementRef } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { UpsellService } from './upsell.service';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { AlertsService } from '../shared/alerts/alerts.service';
import { Alert } from '../shared/alerts/alerts.model';
import { ServiceSettingsService } from '../service-settings/service-settings.service';
import { DOMAIN_NAME } from '../app.config';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { PermissionService } from '../services/permission.service';


@Component({
  selector: 'app-features',
  standalone: true,
  imports: [ CommonModule, FormsModule, AlertsComponent ],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})

export class FeaturesComponent implements OnInit {
  @ViewChild('iconInput') iconInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('modalContainer') modalContainer!: ElementRef<HTMLDivElement>;
  featuresForm!: FormGroup;
  customerType: any;
  isModalOpen: boolean = false;
  restaurantData: any = {
    name: '',
    description: '',
    icon: null,
    image: null
  };
  iconPreview: string | ArrayBuffer | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  iconError: string = '';
  imageError: string = '';
  upsellList: any[] = [];
  isLoading: boolean = false;
  selectedUpsellId: any = null;
  isDeleteModalOpen: boolean = false;
  itemToDelete: any = null;
  member_id: any;
  submitted: boolean = false;
  nameError: string = '';
  // Toggle for inline image/icon preview
  showInlineImagePreview: boolean = false;
  showInlineIconPreview: boolean = false; //newly added for icon previewse btn in modal

  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };

  upsellingFeaturesList: string[] = [
    'Restaurant',
    'Spa',
    'Gym',
    'Bar',
    'Coffee Shop',
    'Bakery',
    'Swimming Pool',
    'Conference Hall',
    'Banquet Hall',
    'Game Zone',
    // 'Laundry',
    // 'Room Service',
    // 'Travel Desk',
    // 'Activities',
    'Business Center',
    'Salon',
    'Kids Play Area',
    'Sports Arena'
  ];

  constructor(
    private routerUrl: Router,
    private localService: LocalStorageService,
    private upsellService: UpsellService,
    private authTokenService: AuthTokenService,
    private alertService: AlertsService,
    private serviceSettingsService: ServiceSettingsService,
    private permissionService: PermissionService
  ) { }

  get canReadFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_read_permission ?? false;
  }

  get canAddFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_add_permission ?? false;
  }

  get canEditFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_edit_permission ?? false;
  }

  get canDeleteFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_delete_permission ?? false;
  }

  get isModalViewOnly(): boolean {
    if (this.selectedUpsellId) {
      return !this.canEditFeatures;
    }
    return !this.canAddFeatures;
  }

  ngOnInit(): void {
    this.customerType = this.localService.get('CustomerType');
    this.member_id = this.localService.get('MemberId');
    this.getAllUpsells();
  }
  getAllUpsells() {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: this.authTokenService.getUserId(),
      extras: {
        find: {
          member_id: this.member_id
        }
      }
    };
    this.upsellService.getAllUpsells(payload).subscribe(
      resp => {
        if (resp && resp.success === 1) {
          this.upsellList = resp.result.data || [];
        }
      },
      err => {
        console.error('Error fetching upsells:', err);
      }
    );
  }

  // navigateToRestaurants() {
  //   // this.routerUrl.navigate(['/restaurants-list']); // old route - commented out
  //   this.routerUrl.navigate(['/features-list'], { queryParams: { outlet_type: 'Restaurant' } });
  // }

  navigateToUpsell(item: any) {
    this.routerUrl.navigate(['/features-list'], { queryParams: { outlet_type: item.name } });
  }

  openModal() {
    this.isModalOpen = true;
    this.alertService.alert(new Alert({ id: 'modal-alert' }));
  }
  closeModal() {
    this.isModalOpen = false;
    this.submitted = false;
    this.nameError = '';
    this.resetForm();
  }

  editUpsell(item: any) {
    this.selectedUpsellId = item.id;
    this.restaurantData = {
      name: item.name,
      description: item.description,
      icon: item.icon,
      image: item.image
    };
    this.iconPreview = item.icon;
    this.imagePreview = item.image;
    this.openModal();
  }

  deleteUpsell(item: any) {
    this.itemToDelete = item;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.itemToDelete = null;
    this.showInlineImagePreview = false; // Reset preview toggle
    this.showInlineIconPreview = false;  // newly added for icon preview
  }


  confirmDelete() {
    if (!this.itemToDelete) return;

    this.isLoading = true;
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: this.authTokenService.getUserId(),
      payload: {},
      extras: {
        find: {
          id: this.itemToDelete.id,
          member_id: this.member_id
        }
      }
    };

    this.upsellService.deleteUpsell(payload).subscribe(
      resp => {
        this.isLoading = false;
        this.closeDeleteModal();
        if (resp && resp.success === 1) {
          this.alertService.success('Feature deleted successfully', this.options);
          this.getAllUpsells();
        } else {
          this.alertService.error(resp?.message || 'Delete failed', this.options);
        }
      },
      err => {
        this.isLoading = false;
        this.closeDeleteModal();
        this.alertService.error('API Error: ' + err.message, this.options);
      }
    );
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.restaurantData.image = file;
    }
  }
 
  saveFeature() {
    this.submitted = true;
    this.nameError = '';

    if (!this.restaurantData.name) {
      this.nameError = 'Please select a name.';
      return;
    }

    this.isLoading = true;
    try {
      // Save Feature (Create or Update)
      const payloadData: any = {
        name: this.restaurantData.name,
        description: this.restaurantData.description,
        icon: this.restaurantData.icon,
        image: this.restaurantData.image,
        is_active: true,
        member_id: this.member_id
      };

      if (this.selectedUpsellId) {
        // UPDATE
        const updatePayload = {
          domain_name: DOMAIN_NAME,
          user_id: this.authTokenService.getUserId(),
          payload: {
            "upsell updation": payloadData
          },
          extras: {
            find: {
              id: this.selectedUpsellId,
              member_id: this.member_id
            }
          }
        };

        this.upsellService.updateUpsell(updatePayload).subscribe(
          resp => {
            this.isLoading = false;
            if (resp && resp.success === 1) {
              this.alertService.success(resp?.message || 'Upselling feature updated successfully!', this.options);
              this.closeModal();
              this.getAllUpsells();
            } else {
              this.showModalAlert(resp?.message || 'Failed to update feature.');
            }
          },
          err => {
            this.isLoading = false;
            this.showModalAlert('API Error: ' + err.message);
          }
        );
      } else {
        // CREATE
        const createPayload = {
          domain_name: DOMAIN_NAME,
          user_id: this.authTokenService.getUserId(),
          payload: {
            "upsell creation": payloadData
          }
        };

        this.upsellService.createUpsell(createPayload).subscribe(
          resp => {
            this.isLoading = false;
            if (resp && resp.success === 1) {
              this.alertService.success('Upselling feature created successfully!', this.options);
              this.closeModal();
              this.getAllUpsells();
            } else {
              this.showModalAlert(resp?.message || 'Failed to create feature.');
            }
          },
          err => {
            this.isLoading = false;
            this.showModalAlert('API Error: ' + err.message);
          }
        );
      }

    } catch (err: any) {
      this.isLoading = false;
      this.showModalAlert('Process failed: ' + err.message);
    }
  }

  openLogofile() {
    this.iconInput.nativeElement.click();
  }

  openImagefile() {
    this.imageInput.nativeElement.click();
  }

  async logoupload(event: any) {
    let file_data = { name: "", size: 0 };
    if (event.target && event.target.files && event.target.files[0]) {
      file_data = event.target.files[0];
    } else if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      file_data = event.dataTransfer.files[0];
    }

    if (!file_data.name) return;
    this.iconError = '';

    let imageName = file_data.name;
    let splitFileName = imageName.split(".");
    const maxBytes = 2 * 1024 * 1024; // 2 MB

    if (file_data.size > maxBytes) {
      this.showModalAlert('Icon size should not exceed 2 MB.');
      return;
    }

    // CHECKING FILE TYPE (only jpg, jpeg, png)
    if (!["jpg", "jpeg", "png", "JPG", "JPEG", "PNG"].includes(splitFileName[splitFileName.length - 1])) {
      this.showModalAlert('Invalid icon format. Allowed types: JPG, JPEG, PNG.');
      return;
    }

    // Dimension check: 150x150
    const iconImg = new Image();
    const iconUrl = URL.createObjectURL(file_data as any);
    iconImg.onload = async () => {
      const validSize = iconImg.width === 150 && iconImg.height === 150;
      if (!validSize) {
        URL.revokeObjectURL(iconUrl);
        this.showModalAlert('Icon must be exactly 150x150 pixels.');
        if (this.iconInput) {
          this.iconInput.nativeElement.value = '';
        }
        return;
      }
      // Passed all checks, proceed with preview + upload
      this.iconPreview = iconUrl;
      this.iconError = '';
      this.isLoading = true;
      try {
        const uploadHeaders = new HttpHeaders()
          .set("source", "Brand")
          .set("domain_name", DOMAIN_NAME);

        const iconFD = new FormData();
        iconFD.append('upload', file_data as any);
        const iconResp = await this.serviceSettingsService.sendImage(iconFD, uploadHeaders).toPromise();
        if (iconResp && iconResp.success === 1) {
          this.restaurantData.icon = iconResp.result.data[0].location;
          this.showModalAlert('Icon uploaded successfully.', false);
        } else {
          this.restaurantData.icon = null;
          this.iconPreview = null;
          this.showModalAlert('Icon upload failed. Please try again.');
        }
      } catch (err: any) {
        this.restaurantData.icon = null;
        this.iconPreview = null;
        this.showModalAlert('Icon upload failed: ' + err.message);
      } finally {
        this.isLoading = false;
      }
    };
    iconImg.onerror = () => {
      URL.revokeObjectURL(iconUrl);
      this.showModalAlert('Unable to read icon image.');
    };
    iconImg.src = iconUrl;
  }

  async imageupload(event: any) {
    let file_data = { name: "", size: 0 };
    if (event.target && event.target.files && event.target.files[0]) {
      file_data = event.target.files[0];
    } else if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      file_data = event.dataTransfer.files[0];
    }

    if (!file_data.name) return;
    this.imageError = '';

    let imageName = file_data.name;
    let splitFileName = imageName.split(".");
    const maxBytes = 2 * 1024 * 1024; // 2 MB

    if (file_data.size > maxBytes) {
      this.showModalAlert('Image size should not exceed 2 MB.');
      return;
    }

    // CHECKING FILE TYPE (only jpg, jpeg, png)
    if (!["jpg", "jpeg", "png", "JPG", "JPEG", "PNG"].includes(splitFileName[splitFileName.length - 1])) {
      this.showModalAlert('Invalid image format. Allowed types: JPG, JPEG, PNG.');
      return;
    }

    // Dimension check: 1280x720
    const mainImg = new Image();
    const mainUrl = URL.createObjectURL(file_data as any);
    mainImg.onload = async () => {
      const validSize = mainImg.width === 1280 && mainImg.height === 720;
      if (!validSize) {
        URL.revokeObjectURL(mainUrl);
        this.showModalAlert('Image must be exactly 1280x720 pixels.');
        if (this.imageInput) {
          this.imageInput.nativeElement.value = '';
        }
        return;
      }
      // Passed all checks, proceed with preview + upload
      this.imagePreview = mainUrl;
      this.imageError = '';
      this.isLoading = true;
      try {
        const uploadHeaders = new HttpHeaders()
          .set("source", "Brand")
          .set("domain_name", DOMAIN_NAME);

        const imageFD = new FormData();
        imageFD.append('upload', file_data as any);
        const imageResp = await this.serviceSettingsService.sendImage(imageFD, uploadHeaders).toPromise();
        if (imageResp && imageResp.success === 1) {
          this.restaurantData.image = imageResp.result.data[0].location;
          this.showModalAlert('Image uploaded successfully.', false);
        } else {
          this.restaurantData.image = null;
          this.imagePreview = null;
          this.showModalAlert('Image upload failed. Please try again.');
        }
      } catch (err: any) {
        this.restaurantData.image = null;
        this.imagePreview = null;
        this.showModalAlert('Image upload failed: ' + err.message);
      } finally {
        this.isLoading = false;
      }
    };
    mainImg.onerror = () => {
      URL.revokeObjectURL(mainUrl);
      this.showModalAlert('Unable to read image.');
    };
    mainImg.src = mainUrl;
  }
  viewFile(src: any, isIcon: boolean = false) {
    if (src) {
      if (isIcon) {
        this.showInlineIconPreview = !this.showInlineIconPreview;// newly added for icon preview
      } else {
        this.showInlineImagePreview = !this.showInlineImagePreview;
      }
    }
  }

  // 2. Method to remove Icon
  removeIcon() {
    this.restaurantData.icon = null;
    this.iconPreview = null;
    if (this.iconInput) {
      this.iconInput.nativeElement.value = '';
    }
    this.showModalAlert('Icon removed successfully.', false);
  }
  // 3. Method to remove Image
  removeImage() {
    this.restaurantData.image = null;
    this.imagePreview = null;
    if (this.imageInput) {
      this.imageInput.nativeElement.value = '';
    }
    this.showModalAlert('Image removed successfully.', false);
  }
  // 4. Unified Reset
  resetForm() {
    this.restaurantData = { name: '', description: '', icon: null, image: null };
    this.iconPreview = null;
    this.imagePreview = null;
    this.selectedUpsellId = null;
    this.iconError = '';
    this.imageError = '';
    this.nameError = '';
    this.submitted = false;
    this.showInlineImagePreview = false;
    this.showInlineIconPreview = false; //newly added for icon preview close btn in modal
    this.alertService.alert(new Alert({ id: 'modal-alert' }));
  }

  showModalAlert(message: string, isError: boolean = true) {
    if (isError) {
      this.alertService.error(message, { ...this.options, id: 'modal-alert' });
    } else {
      this.alertService.success(message, { ...this.options, id: 'modal-alert' });
    }
    setTimeout(() => {
      if (this.modalContainer) {
        this.modalContainer.nativeElement.scrollTop = 0;
      }
    }, 50);
  }
}


