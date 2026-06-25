import { Component, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { ProductDetailService } from './product-detail.service';
import { LocalStorageService } from "../auth-services/local-storage.service";
import { ENDPOINTS } from '../app.config';
// import { ENDPOINTS } from 'src/app/app.config';
import { Validators } from '@angular/forms';
import { AlertsService } from '../shared/alerts/alerts.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Route, ActivatedRoute } from '@angular/router';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { PermissionService, ModulePermission } from '../services/permission.service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, AlertsComponent, FormsModule],
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})

export class ProductDetailsComponent {
  companyForm: FormGroup;
  categoryForm: FormGroup;
  collectedId: any;
  valueofExisting: any;
  is_renewed: boolean = false;
  imgFile: any;
  isAvailable: boolean = false;
  brands = [
    { brandName: '', productCategory: '', qty: '', value: '', country: '' }
  ];
  // uploadedFiles = [
  //   { name: "Image 1", fileName: "", fileUrl: "", fileSelected: null },
  //   { name: "Image 2", fileName: "", fileUrl: "", fileSelected: null },
  //   { name: "Image 3", fileName: "", fileUrl: "", fileSelected: null },
  //   { name: "Image 4", fileName: "", fileUrl: "", fileSelected: null }
  // ];
  totalQuantity: number = 0;
  categories: any[] = [];
  totalValue: number = 0;
  isUploading: boolean = false;
  // Newly added
  is_available: boolean = true;
  isPaymentDone: boolean = false;
  newProduct: boolean = true;
  currentStage = 0;
  selectedImageUrl: string | null = null;
  isModalOpen = false;
  uploadedFiles = [
    { name: "Image 1", fileName: "", fileUrl: "", fileSelected: null },
    { name: "Image 2", fileName: "", fileUrl: "", fileSelected: null },
    { name: "Image 3", fileName: "", fileUrl: "", fileSelected: null }
  ];
  allCategories: any = [];
  allProducts: any = [];
  customerId: any;
  // Product update
  isEditMode: boolean = false;
  productId: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  defaultImageUrl = '../../assets/images/guestezee/menu.jpg';
  outlet_id: number = 0;
  // File uploading
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('reuploadInput') reuploadInput!: ElementRef;
  isModalOpen1 = false;
  memberId: any;
  isExitModalOpen: boolean = false;
  allProductsData: any = [];
  currentPage: number = 1;
  pageSize: number = 10 // Show 10 roles per page
  totalProducts: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  isViewMode: boolean = false;
  isEditCategoryMode: boolean = false;
  selectedCategoryToEdit: any = null;
  isDeleteCategoryModalOpen: boolean = false;
  categoryToDelete: any = null;

  constructor(private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private http: HttpClient,
    private localService: LocalStorageService,
    private productDetailService: ProductDetailService,
    private alertService: AlertsService,
    private route: ActivatedRoute,
    private permissionService: PermissionService
  ) {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      // sku: ['', Validators.required],
      offer_price: ['', Validators.required],
      price: ['', Validators.required],
      description: [''],
      uploadedDocuments: [[]] // Placeholder for uploaded documents
    });
    this.categoryForm = this.fb.group({
      selectedCategory: ['', Validators.required],
      name: ['']
    })
  }

  ngOnInit(): void {
    // Customer id
    this.customerId = Number(this.localService.get('UserId'));
    this.memberId = this.localService.get('MemberId');

    // Check if in view mode from navigation state
    const navState = window.history.state as any;
    this.isViewMode = navState?.mode === 'view';
    /*  this.route.paramMap.subscribe(params => {
       const id = params.get('id');
       this.outlet_id = Number(id)
       if (id) {
         // console.log('Editing Outlet with ID:', id);
         this.outlet_id = Number(id);
         // fetch and patch data
       }
       else {
         // console.log('Creating new product');
       }
     }); */
    this.route.paramMap.subscribe(params => {
      const outlet_id = params.get('outlet_id');
      const id = params.get('id');
      // console.log('Outlet id:', outlet_id);
      // console.log('Product id:', id);
      if (outlet_id) {
        // console.log('Product list ofOutlet(ID):', outlet_id);
        this.outlet_id = Number(outlet_id);
        this.localService.set('outlet_id', outlet_id);
      }
      else if (id) {
        // console.log('Editing product(Id):', id);
        this.productId = Number(id);
        this.getAllProductsList(this.productId);
        this.isEditMode = true;
        this.newProduct = false;
      }
      else {
        // console.log('Creating new product');
        this.newProduct = false;
        this.isEditMode = false;
      }
    });
    // Check if payment done or not
    this.isPaymentDone = (this.localService.get('isPaymentDone') == 'true') ? true : false;
    // Category List
    this.getAllCategories();
    // Product List
    this.getAllProducts();

    // Disable forms if in view mode
    if (this.isViewMode) {
      this.companyForm.disable({ emitEvent: false });
      this.categoryForm.disable({ emitEvent: false });
    }
  }

  get canReadOutlets(): boolean {
    const permission = this.permissionService.getModulePermission('OUTLETS');
    return permission?.has_read_permission ?? false;
  }

  get canAddOutlets(): boolean {
    const permission = this.permissionService.getModulePermission('OUTLETS');
    return permission?.has_add_permission ?? false;
  }

  get canEditOutlets(): boolean {
    const permission = this.permissionService.getModulePermission('OUTLETS');
    return permission?.has_edit_permission ?? false;
  }

  get canDeleteOutlets(): boolean {
    const permission = this.permissionService.getModulePermission('OUTLETS');
    return permission?.has_delete_permission ?? false;
  }

  // addProduct() {
  //   this.newProduct = false;
  // }

  cancelProduct() {
    this.categoryForm.reset();
    this.companyForm.reset();
    // this.uploadedFiles = [];
    this.uploadedFiles = [
      { name: "Image 1", fileName: "", fileUrl: "", fileSelected: null },
      { name: "Image 2", fileName: "", fileUrl: "", fileSelected: null },
      { name: "Image 3", fileName: "", fileUrl: "", fileSelected: null }
    ];
    this.isAvailable = false;
    this.newProduct = true;
  }

  editProduct(id: any) {
    // console.log('Editing product ID:', id);
    this.router.navigate(['/product-detail', id]);
  }

  viewProduct(id: any) {
    this.router.navigate(['/product-detail', id], { state: { mode: 'view' } });
  }

  deleteProduct(id: any) {
    if (!this.canDeleteOutlets) return;
    let requestBody = {
      "domain_name": "https://www.guestezee.com",
      "user_id": 1,
      "payload": {
        "delete_data": {},
        "variants": []
      },
      "extras": {
        "find": {
          "id": [id]
        }
      }
    }
    this.productDetailService.postApiCall1(requestBody, ENDPOINTS.DELETE_PRODUCT).subscribe((res: any) => {
      if (res && res.success === 1) {
        this.alertService.success('Product deleted successfully!', this.options);
        this.getAllProducts();
      }
      else {
        this.alertService.error('Product deletion failed!', this.options);
      }
    })
  }

  setInitialValues(id: any) {
    const product = this.allProducts.find((p: any) => p.id === id);
    // console.log('Product details based on id:', product);
    if (product) {
      this.router.navigate(['/product-detail', id]);
      this.isEditMode = true;
      this.newProduct = false;
      this.companyForm.patchValue({
        name: product.name || '',
        // sku: product.sku || '',
        price: product?.pricing?.raw?.price || '',
        offer_price: product?.pricing?.raw?.sale_price || '',
        description: product?.description?.title || ''
      });
      // Toggle button
      this.setAvailabilityToggle(product);
      // Category
      const category = product?.categories?.[0];
      const matchedCategory = this.categories.find(c => c.id === category?.id);
      this.categoryForm.patchValue({
        selectedCategory: matchedCategory || 'othercat'
      });
      // Set uploaded image files - ensure we always have 3 slots
      const assetsArray = product.assets || [];
      this.uploadedFiles = [];
      for (let i = 0; i < 3; i++) {
        if (i < assetsArray.length && assetsArray[i]) {
          const img = assetsArray[i];
          const fullName = img.image_source?.split('/').pop() || '';
          const namePart = fullName.split('%20-%20')[1]?.split('.')[0] || `Image ${i + 1}`;
          const hasImage = img.image_source && img.image_source.trim() !== '';
          this.uploadedFiles.push({
            name: `Image ${i + 1}`,
            fileName: hasImage ? namePart : '',
            fileUrl: hasImage ? img.image_source : '',
            fileSelected: null
          });
        } else {
          // Empty slot
          this.uploadedFiles.push({
            name: `Image ${i + 1}`,
            fileName: '',
            fileUrl: '',
            fileSelected: null
          });
        }
      }
    }
  }

  getAllCategories() {
    this.productDetailService.getAllCategories(
      {
        "domain_name": 'https://www.guestezee.com',
        "user_id": 1,
        "extras": {
          "find": {
            outlet_id: Number(this.localService.get('outlet_id'))
          },
          "pagination": false,
          "paginationDetails": {
            "limit": 100,
            "pageSize": 1
          },
          "sorting": true,
          "sortingDetails": {
            "name": -1
          }
        }
      }
    ).subscribe(response => {
      if (response && response.success == 1) {
        this.categories = response.result.data;
        // console.log("Categoies list:", this.categories)
      }
      else {
        // console.log(response.message);
      }
    }
    )
  }

  getAllProducts() {
    let requestBody = {
      "domain_name": "https://www.guestezee.com",
      "user_id": 1,
      "extras": {
        "find": {
          "outlet_id": Number(this.localService.get('outlet_id')),
          // Newly added for getting member id for customer type
          // "customer_id": this.customerId,
          "member_id": this.localService.get('MemberId')
        },
        // "pagination": true,
        // "paginationDetails": {
        //   "limit": ,
        //   "page": this.currentPage   
        // },
        // "sorting": true,
        // "sortingDetails": {
        //   "id": 1
        // }
      }
    }
    this.productDetailService.postApiCall1(requestBody, ENDPOINTS.GET_ALL_PRODUCTS).subscribe(resp => {
      if (resp && resp.success === 1) {
        this.allProducts = resp.result.data;
        // console.log("All Products Raw:", this.allProducts);
        this.totalProducts = this.allProducts.length;
        // console.log("Total Products:", this.totalProducts);
        this.totalPages = Math.ceil(this.totalProducts / this.pageSize);
        // console.log("Total Pages:", this.totalPages);
        this.updatePaginatedProducts();
      } else {
        console.error("Error fetching products", resp?.message);
      }
    })
  }

  triggerFileInput1(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  triggerFileInput() {
    if (!this.isUploading && this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  // To get the index of image name
  getNextUploadIndex(): number {
    return this.uploadedFiles.findIndex(file => !file.fileName);
  }

  // To get the image name
  getNextUploadLabel(): string {
    const index = this.getNextUploadIndex();
    return index !== -1 ? this.uploadedFiles[index].name : 'Image (All uploaded)';
  }

  // To upload the file
  /*   onFileUpload(event: any) {
      const file = event.target.files[0];
      if (!file) return;
      this.isUploading = true; // Show loader
      const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.alertService.error("Invalid file type! Only PDF, JPEG, JPG, and PNG files are allowed.", this.options);
        this.isUploading = false;
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.alertService.error("File size exceeds 2MB. Please select a smaller file.", this.options);
        this.isUploading = false;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.uploadedFiles[this.currentStage].fileName = file.name;
        this.imgFile = file;
        const formData = new FormData();
        formData.append('upload', this.imgFile);
        let headers = new HttpHeaders()
          .set("source", "Certificate")
          .set("domain_name", "https://www.guestezee.com");
        this.productDetailService.sendImage(formData, headers).subscribe(resp => {
          if (resp && resp.success === 1 && resp.status_code === 200) {
            let imgVariable = resp.result.data[0];
            let signImage = imgVariable.location;
            this.uploadedFiles[this.currentStage].fileUrl = signImage;
            this.companyForm.patchValue({ uploadedDocuments: [...this.uploadedFiles] });
            if (this.currentStage < this.uploadedFiles.length - 1) {
              this.currentStage++;
            }
          }
          this.isUploading = false; // Hide loader
        }, () => {
          this.isUploading = false; // Hide loader on error
        });
      };
      reader.readAsDataURL(file);
    }
  
    onIndividualFileUpload(event: any, index: number) {
      const file = event.target.files[0];
      let headers = new HttpHeaders()
        .set("source", "Certificate")
        .set("domain_name", "https://www.guestezee.com");
      if (!file) return;
      // Allowed file types
      const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.alertService.error("Invalid file type! Only PDF, JPEG, JPG, and PNG files are allowed.", this.options);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.alertService.error("File size exceeds 2MB. Please select a smaller file.", this.options);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.uploadedFiles[index].fileName = file.name;
        this.imgFile = file;
        let formData = new FormData();
        formData.append('upload', this.imgFile);
        this.productDetailService.sendImage(formData, headers).subscribe(resp => {
          if (resp && resp.success === 1 && resp.status_code === 200) {
            let uploadedData = resp.result.data[0];
            this.uploadedFiles[index].fileUrl = uploadedData.location;
            this.companyForm.patchValue({ uploadedDocuments: [...this.uploadedFiles] });
            // Update currentStage to next pending file
            const nextIndex = this.uploadedFiles.findIndex(f => !f.fileUrl);
            this.currentStage = nextIndex === -1 ? this.uploadedFiles.length : nextIndex;
          }
        });
      };
      reader.readAsDataURL(file);
    } */

  // To open the image(modal)/pdf(blank)
  openImageModal(fileUrl: string) {
    // Don't open modal if no file URL or if it's the default image
    if (!fileUrl || fileUrl.trim() === '' || fileUrl === this.defaultImageUrl) {
      return;
    }
    if (fileUrl.toLowerCase().endsWith(".pdf")) {
      // Open PDF in a new tab
      window.open(fileUrl, "_blank");
    } else {
      // Shows image in modal
      this.selectedImageUrl = fileUrl;
      this.isModalOpen = true;
    }
  }

  // To remove the uploaded file
  removeFile(index: number) {
    if (this.isViewMode) return; // Prevent removal in view mode
    this.uploadedFiles[index].fileName = "";
    this.uploadedFiles[index].fileUrl = "";
    this.uploadedFiles[index].fileSelected = null;

    // Recalculate currentStage to the first empty slot
    const nextEmpty = this.uploadedFiles.findIndex(f => !f.fileUrl || f.fileUrl.trim() === '');
    this.currentStage = nextEmpty === -1 ? this.uploadedFiles.length : nextEmpty;

    // Synchronize form
    this.companyForm.patchValue({ uploadedDocuments: [...this.uploadedFiles] });

    // Clear file inputs so same file can be re-selected if needed
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    // We can't easily reach the individual file inputs via ViewChild if they are in a loop with same name,
    // but clearing the main one and relying on index update is usually enough if they use the main button.
    // For individual ones, the change event will still fire if they select a different file or if we clear it in the event handler.

    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
  }

  opencate() {
    if (this.isViewMode) return; // Prevent opening category modal in view mode
    this.isEditCategoryMode = false;
    this.selectedCategoryToEdit = null;
    this.isModalOpen1 = true;
    // Add required validator when modal opens
    this.categoryForm.get('name')?.setValidators([Validators.required]);
    this.categoryForm.get('name')?.updateValueAndValidity();
  }

  closeModal1() {
    this.isModalOpen1 = false;
    this.isEditCategoryMode = false;
    this.selectedCategoryToEdit = null;
    // Remove required validator when modal closes
    this.categoryForm.get('name')?.clearValidators();
    this.categoryForm.get('name')?.updateValueAndValidity();
    // resets the name field if needed
    this.categoryForm.get('name')?.reset();
  }

  // uploadIndividualFile(index: number) {
  //   const file = this.uploadedFiles[index].fileSelected;
  //   if (!file) {
  //     alert("No file selected for upload.");
  //     return;
  //   }
  //   let headers = new HttpHeaders()
  //     .set("source", "Certificate")
  //     .set("domain_name", "https://www.guestezee.com");
  //   let formData = new FormData();
  //   formData.append('upload', file);
  //   this.appService.sendImage(formData, headers).subscribe(resp => {
  //     if (resp && resp.success === 1 && resp.status_code === 200) {
  //       let imgVariable = resp.result.data[0];
  //       this.uploadedFiles[index].fileUrl = imgVariable.location;
  //       this.uploadedFiles[index].fileSelected = null; // Reset selected file
  //       this.companyForm.patchValue({ uploadedDocuments: [...this.uploadedFiles] });
  //       alert("File uploaded successfully!");
  //     }
  //   });
  // }

  selectCategory(category: any) {
    if (category === 'othercat') {
      this.categoryForm.get('selectedCategory')?.setValue('othercat');
      // this.opencate();
      this.categoryForm.get('selectedCategory')?.markAsTouched();
    } else {
      this.categoryForm.get('selectedCategory')?.setValue(category);
      this.categoryForm.get('selectedCategory')?.markAsTouched();
    }
  }

  editCategory(category: any, event: Event) {
    event.stopPropagation();
    if (this.isViewMode) return;
    this.selectedCategoryToEdit = category;
    this.isEditCategoryMode = true;
    this.isModalOpen1 = true;
    this.categoryForm.get('name')?.setValue(category.name);
    this.categoryForm.get('name')?.setValidators([Validators.required]);
    this.categoryForm.get('name')?.updateValueAndValidity();
  }

  deleteCategory(category: any, event: Event) {
    event.stopPropagation();
    if (this.isViewMode || !this.canDeleteOutlets) return;
    this.categoryToDelete = category;
    this.isDeleteCategoryModalOpen = true;
  }

  closeDeleteCategoryModal() {
    this.isDeleteCategoryModalOpen = false;
    this.categoryToDelete = null;
  }

  confirmDeleteCategory() {
    if (!this.categoryToDelete) return;
    // Logic to delete category
    // let requestBody = {
    //     domain_name: 'https://www.guestezee.com',
    //     user_id: 1,
    //     // payload: {
    //     //     delete_data: {},
    //     //     variants: []
    //     // },
    //     extras: {
    //         find: {
    //             id: this.categoryToDelete.id
    //         }
    //     }
    // };
    let requestBody = {
      "domain_name": "https://www.guestezee.com",
      "user_id": 1,
      "payload": {},
      "extras": {
        "find": {
          // "id": 26
          "id": this.categoryToDelete.id
        }
      }
    };

    this.productDetailService.postApiCall1(requestBody, ENDPOINTS.DELETE_CATEGORY).subscribe(
      (res: any) => {
        if (res && res.success === 1) {
          this.alertService.success('Category deleted successfully!', this.options);
          if (this.categoryForm.get('selectedCategory')?.value?.id === this.categoryToDelete.id) {
            this.categoryForm.get('selectedCategory')?.setValue('');
          }
          this.getAllCategories();
          this.closeDeleteCategoryModal();
        } else {
          this.alertService.error('Category deletion failed!', this.options);
          this.closeDeleteCategoryModal();
        }
      },
      error => {
        this.alertService.error('Category deletion failed or API not available', this.options);
        this.closeDeleteCategoryModal();
      }
    );
  }

  createcat() {
    // If name is empty, show error and stop
    if (!this.categoryForm.value.name || this.categoryForm.value.name.trim() === '') {
      this.categoryForm.get('name')?.setErrors({ required: true });
      this.categoryForm.get('name')?.markAsTouched();
      return;
    }
    let orderDetails = this.categoryForm.value.name;

    if (this.isEditCategoryMode && this.selectedCategoryToEdit) {
      let updateRequest = {
        domain_name: 'https://www.guestezee.com',
        user_id: 1,
        payload: {
          category_updation: {
            "id": this.selectedCategoryToEdit.id,
            "name": this.categoryForm.value.name,
            "is_active": true
          }
        },
        extras: {
          find: {
            id: this.selectedCategoryToEdit.id
          }
        }
      };
      this.productDetailService.postApiCall1(updateRequest, ENDPOINTS.UPDATE_CATEGORY).subscribe(
        resp => {
          if (resp && resp.success === 1) {
            this.alertService.success('Category Updated Successfully', this.options);
            this.getAllCategories();

            // If the edited category is the currently selected one, update its display name
            let selected = this.categoryForm.get('selectedCategory')?.value;
            if (selected && selected.id === this.selectedCategoryToEdit.id) {
              selected.name = this.categoryForm.value.name;
              this.categoryForm.get('selectedCategory')?.setValue(selected);
            }
            this.closeModal1();
          }
          else {
            this.alertService.error(resp?.message || 'Update failed', this.options);
          }
        }
      );

    } else {
      let jsonRequest = {
        domain_name: 'https://www.guestezee.com',
        user_id: 1,
        payload: {
          category_creation: {
            "name": this.categoryForm.value.name,
            "path": "",
            "parent": [
              {
                "id": 0,
                "name": "No Parent Category"
              }
            ],
            "image": "",
            "imageName": "",
            "category_icon": "",
            "iconimageName": "",
            "vertical_name": [],
            "horizontal_name": [],
            "filter_name": [],
            "language": "EN",
            "outlet_id": Number(this.localService.get('outlet_id')),
            "tags": "",
            "column": "",
            "is_active": true,
            "sort_order": 1,
            "is_top": false,
            "meta_keywords": "",
            "meta_title": ""
          }
        }
      }
      this.productDetailService.addCategory(jsonRequest).subscribe(
        resp => {
          if (resp && resp.success === 1 && resp.status_code == 200) {
            this.alertService.success('Category Created Successfully', this.options);
            this.getAllCategories();
            this.closeModal1();
          }
          else {
            this.alertService.error(resp.message, this.options);
          }
        },
        error => {
          this.alertService.error('Category creation failed or API not available', this.options);
        }
      )

    }
  }

  toggleAvailability(event: Event): void {
    if (this.isViewMode) return; // Prevent toggling in view mode
    this.isAvailable = (event.target as HTMLInputElement).checked;
    // console.log('Available status:', this.isAvailable);
  }

  setAvailabilityToggle(product: any): void {
    this.isAvailable = product?.stock_status === 'Available' ? true : false;
    // console.log('Available status:', this.isAvailable);
  }

  onSubmit() {
    if (this.isViewMode) return; // Prevent submission in view mode
    // Mark forms touched for error display
    // this.categoryForm.markAllAsTouched();
    this.categoryForm.get('selectedCategory')?.markAsTouched();
    this.companyForm.markAllAsTouched();
    // Validate
    if (this.categoryForm.invalid || this.companyForm.invalid) {
      this.alertService.error("Please fill all mandatory fields", this.options);
      return;
    }
    const selected = this.categoryForm.get('selectedCategory')?.value;
    const productName = this.companyForm.get('name')?.value;
    const generatedSku = this.generateSku(productName);
    let orderDetails = {
      customer_id: this.customerId,
      member_id: this.memberId,
      outlet_id: Number(this.localService.get('outlet_id')),
      name: this.companyForm.get('name')?.value,
      product_type: "Simple",
      stock_status: this.isAvailable ? "Available" : "Out of Stock",
      sku: generatedSku,
      slug: "",
      sort_order: "",
      url: `/${this.companyForm.get('name')?.value}/`,
      quantity: 0,
      hsn: "",
      sac: "",
      is_active: true,
      barcode: null,
      manufacture_details: null,
      stock: null,
      categories: [
        {
          id: Number(selected?.id),
          categories: selected?.name,
          path: selected?.path
        }
      ],
      brand: {
        id: 0,
        name: "",
        image: ""
      },
      description: {
        language: "EN",
        is_title_as_name: true,
        title: this.companyForm.get('description')?.value,
        short_desc: this.companyForm.get('description')?.value,
        description: this.companyForm.get('description')?.value,
        bullet_points: "",
        instruction_title: "",
        instruction_description: "",
        other_description: this.companyForm.get('description')?.value,
        is_desc_as_meta_desc: false,
        tags: "",
        meta_title: "",
        meta_description: "",
        meta_keywords: ""
      },
      assets: this.uploadedFiles.map((file: any) => ({
        image_source: file.fileUrl,
        image_width: 0,
        image_height: 0
      })),
      videos: [],
      pricing: {
        currency: [
          {
            iso2: "IN",
            currency_code: "INR"
          }
        ],
        tax_class_name: "Default Tax Class",
        tax_class_id: 1,
        raw: {
          cost: Number(this.companyForm.get('price')?.value),
          msrp: Number(this.companyForm.get('offer_price')?.value),
          price: Number(this.companyForm.get('price')?.value),
          sale_price: Number(this.companyForm.get('offer_price')?.value),
          base_price: 0,
          fixed_price: 0,
          percentage: 0,
          total_price: 0,
          minimumorderquantity: 0,
          incrementvalue: 0,
          decrementvalue: 0,
          price_range_from: 0,
          price_range_to: 0,
          tax_class: [
            {
              id: 1,
              name: "Default Tax Class"
            }
          ]
        }
      },
      attributes: [],
      shipping: {
        fixed_shipping_price: 0,
        free_shipping: false,
        weight: 0,
        height: 0,
        width: 0,
        depth: 0,
        product_weight: "",
        product_width: "",
        product_height: "",
        product_length: "",
        diameter: 0,
        material: "",
        weight_to_consider: ""
      },
      bundle_products: {
        include_in_bundle: null,
        make_bundle: null,
        no_of_products: null,
        products: [],
        chargable: null
      },
      customise_products: {
        customisedProducts: [],
        customised: null,
        include_in_customisation: null
      },
      related_products: [],
      is_featured_products: false,
      is_new_arrival: false,
      additional_info: {
        how_to_store: null,
        ingredients: null,
        license_no: null,
        shelf_life: null,
        shelf_life_description: null,
        manufacture: null
      },

    };
    if (!this.isEditMode) {
      let requestData = {
        domain_name: 'https://www.guestezee.com',
        user_id: 1,
        payload: {
          product_creation: orderDetails
        }
      }
      this.productDetailService.postApiCall1(requestData, ENDPOINTS.ADD_PRODUCT).subscribe(
        respData => {
          if (respData?.success === 1) {
            this.alertService.success('Product added successfully', this.options);
            setTimeout(() => {
              this.categoryForm.reset();
              this.companyForm.reset();
              this.uploadedFiles = [
                { name: "Image 1", fileName: "", fileUrl: "", fileSelected: null },
                { name: "Image 2", fileName: "", fileUrl: "", fileSelected: null },
                { name: "Image 3", fileName: "", fileUrl: "", fileSelected: null }
              ];
              this.isAvailable = false;
              this.router.navigate([`/product-list`, Number(this.localService.get('outlet_id'))]);
              this.getAllProducts()
              this.newProduct = true;
            }, 1000)
          }
          else {
            this.alertService.error(respData?.message, this.options);
          }
          // this.router.navigate([`/list-view/products`]);
        })
    }
    else {
      let requestData = {
        domain_name: 'https://www.guestezee.com',
        user_id: 1,
        extras: {
          find: {
            id: this.productId
          }
        },
        payload: {
          productUpdate: orderDetails
        }
      }
      this.productDetailService.postApiCall1(requestData, ENDPOINTS.UPDATE_PRODUCT).subscribe(
        respData => {
          if (respData?.success === 1) {
            this.alertService.success('Product updated successfully', this.options);
            setTimeout(() => {
              this.categoryForm.reset();
              this.companyForm.reset();
              this.uploadedFiles = [
                { name: "Image 1", fileName: "", fileUrl: "", fileSelected: null },
                { name: "Image 2", fileName: "", fileUrl: "", fileSelected: null },
                { name: "Image 3", fileName: "", fileUrl: "", fileSelected: null }
              ];
              this.isAvailable = false;
              this.router.navigate([`/product-list`, Number(this.localService.get('outlet_id'))]);
              this.getAllProducts()
              this.newProduct = true;
            }, 1000)
          }
          else {
            this.alertService.error(respData?.message, this.options);
          }
          // this.router.navigate([`/list-view/products`]);
        })
    }
  }

  generateSku(productName: string): string {
    const baseName = productName.trim().replace(/\s+/g, '-'); // Replace spaces with dashes
    const matchingSkus = this.allProducts
      .filter((p: any) => p.name?.toLowerCase() === productName.toLowerCase())
      .map((p: any) => p.sku);
    let nextNumber = 1;
    const existingNumbers = matchingSkus.map((sku: string) => {
      const match = sku?.match(/-(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
    if (existingNumbers.length > 0) {
      nextNumber = Math.max(...existingNumbers) + 1;
    }
    const paddedNumber = nextNumber.toString().padStart(2, '0'); // e.g., 01, 02
    // console.log()
    return `${baseName}-${paddedNumber}`;
  }

  addProduct1() {
    if (!this.canAddOutlets) return;
    this.router.navigate(['/add-menu', Number(this.localService.get('outlet_id'))])
    this.newProduct = false;
    this.isEditMode = false;
  }

  // Newly added
  getAllProductsList(productId: any) {
    let requestBody = {
      "domain_name": "https://www.guestezee.com",
      "user_id": 1,
      "extras": {
        "find": {
          "outlet_id": Number(this.localService.get('outlet_id')),
          // Newly added for getting member id for customer type
          // "customer_id": this.customerId,
          "member_id": this.localService.get('MemberId')
        },
        "pagination": true,
        "paginationDetails": {
          "limit": 10,
          "pageSize": 1
        },
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    }
    this.productDetailService.postApiCall1(requestBody, ENDPOINTS.GET_ALL_PRODUCTS).subscribe(resp => {
      if (resp && resp.success === 1) {
        this.allProducts = resp.result.data;
        // console.log("All Products Raw(While taking list):", this.allProducts);
        this.setInitialValues(this.productId);
      } else {
        console.error("Error fetching products", resp?.message);
      }
    })
  }

  onFileUpload(event: any) {
    if (this.isViewMode) return; // Prevent upload in view mode
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = ''; // Clear input to allow re-selection of same file if removed
    this.isUploading = true; // Show loader
    const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      this.alertService.error("Invalid file type! Only PDF, JPEG, JPG, and PNG files are allowed.", this.options);
      this.isUploading = false;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.alertService.error("File size exceeds 2MB. Please select a smaller file.", this.options);
      this.isUploading = false;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 500 || img.height !== 500) {
          this.alertService.error("Invalid image dimensions! Only 500 x 500px images are allowed.", this.options);
          this.isUploading = false;
          return;
        }
        this.uploadedFiles[this.currentStage].fileName = file.name;
        this.imgFile = file;
        const formData = new FormData();
        formData.append('upload', this.imgFile);
        let headers = new HttpHeaders()
          .set("source", "Certificate")
          .set("domain_name", "https://www.guestezee.com");
        this.productDetailService.sendImage(formData, headers).subscribe({
          next: (resp) => {
            if (resp && resp.success === 1 && resp.status_code === 200) {
              const uploadedData = resp.result.data[0];
              this.uploadedFiles[this.currentStage].fileUrl = uploadedData.location;
              this.companyForm.patchValue({ uploadedDocuments: [...this.uploadedFiles] });
              this.alertService.success(`File uploaded successfully! Please save the changes to reflect it.`, this.options);
              // Update currentStage to next pending file
              const nextIndex = this.uploadedFiles.findIndex(f => !f.fileUrl || f.fileUrl.trim() === '');
              this.currentStage = nextIndex === -1 ? this.uploadedFiles.length : nextIndex;
            } else {
              this.alertService.error(`Upload failed. Please try again.`, this.options);
            }
            this.isUploading = false;
          },
          error: () => {
            this.isUploading = false;
            this.alertService.error(`Upload failed. Please try again.`, this.options);
          }
        });
      };
      img.onerror = () => {
        this.alertService.error("Could not read image dimensions. Please try another image file.", this.options);
        this.isUploading = false;
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      this.alertService.error("Error reading file.", this.options);
      this.isUploading = false;
    };
    reader.readAsDataURL(file);
  }

  onIndividualFileUpload(event: any, index: number) {
    if (this.isViewMode) return; // Prevent upload in view mode
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = ''; // Clear input to allow re-selection of same file if removed
    this.isUploading = true;
    const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      this.alertService.error("Invalid file type! Only PDF, JPEG, JPG, and PNG files are allowed.", this.options);
      this.isUploading = false;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.alertService.error("File size exceeds 2MB. Please select a smaller file.", this.options);
      this.isUploading = false;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 500 || img.height !== 500) {
          this.alertService.error("Invalid image dimensions! Only 500 x 500px images are allowed.", this.options);
          this.isUploading = false;
          return;
        }
        this.uploadedFiles[index].fileName = file.name;
        this.imgFile = file;
        const formData = new FormData();
        formData.append('upload', this.imgFile);
        const headers = new HttpHeaders()
          .set("source", "Certificate")
          .set("domain_name", "https://www.guestezee.com");
        this.productDetailService.sendImage(formData, headers).subscribe({
          next: (resp) => {
            if (resp && resp.success === 1 && resp.status_code === 200) {
              const uploadedData = resp.result.data[0];
              this.uploadedFiles[index].fileUrl = uploadedData.location;
              this.companyForm.patchValue({ uploadedDocuments: [...this.uploadedFiles] });
              this.alertService.success(`File uploaded successfully! Please save the changes to reflect it.`, this.options);
              // Update currentStage to next pending file
              const nextIndex = this.uploadedFiles.findIndex(f => !f.fileUrl);
              this.currentStage = nextIndex === -1 ? this.uploadedFiles.length : nextIndex;
            } else {
              this.alertService.error(`Upload failed. Please try again.`, this.options);
            }
            this.isUploading = false;
          },
          error: () => {
            this.isUploading = false;
            this.alertService.error(`Upload failed. Please try again.`, this.options);
          }
        });
      };
      img.onerror = () => {
        this.alertService.error("Could not read image dimensions. Please try another image file.", this.options);
        this.isUploading = false;
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      this.alertService.error("Error reading file.", this.options);
      this.isUploading = false;
    };
    reader.readAsDataURL(file);
  }

  // Get the name of the next file to upload
  getUploadButtonText(): string {
    const nextFile = this.uploadedFiles.find(file => !file.fileUrl || file.fileUrl.trim() === '');
    return nextFile ? `Upload ${nextFile.name}` : 'All files uploaded';
  }

  // Checks if all files have been uploaded
  allFilesUploaded(): boolean {
    return this.uploadedFiles.every(file => file.fileUrl && file.fileUrl.trim() !== '');
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getAllProducts();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getAllProducts();
    }
  }

  updatePaginatedProducts() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allProductsData = this.allProducts.slice(startIndex, endIndex);
    // console.log('Current Page:', this.currentPage);
    // console.log("Paginated Products:", this.allProductsData);
  }

  addProduct() {
    if (!this.canAddOutlets) return;
    this.router.navigate(['/add-product']);
  }

  navigateToList() {
    this.localService.remove('outlet_id');
    this.router.navigateByUrl('outlet-list');
  }

  allowOnlyNumbers(event: any) {
    const charCode = event.which ? event.which : event.keyCode;
    // Block keyboard entry
    if (event.type === "keypress") {
      if (charCode < 48 || charCode > 57) {
        event.preventDefault();
        return false;
      }
    }
    // Block paste (CTRL+V)
    if (event.type === "paste") {
      const pasteData = event.clipboardData.getData('text');
      if (!/^\d+$/.test(pasteData)) {
        event.preventDefault();
        return false;
      }
    }
    return true;
  }

  openExitModal() {
    if (this.isViewMode) {
      this.navigateToProduct(); // Bypass confirmation in view mode
      return;
    }
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }

  confirmExit() {
    this.isExitModalOpen = false;
    this.navigateToProduct();
  }

  navigateToProduct() {
    this.router.navigate(['/product-list', Number(this.localService.get('outlet_id'))])
  }

}


