import { Component, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
import { Route,ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-product-details',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
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
  defaultImageUrl = '../../assets/images/common/default.jpg';
  outlet_id:number=0;

  constructor(private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private http: HttpClient,
    private localService: LocalStorageService,
    private productDetailService: ProductDetailService,
    private alertService: AlertsService,
    private route:ActivatedRoute
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
      selectedCategory: [null, Validators.required],
      name: ['']
    })
  }

  ngOnInit(): void {
    // Customer id
    this.customerId = Number(this.localService.get('customerId'));
    
    this.route.paramMap.subscribe(params => {
  const id = params.get('id');
  this.outlet_id= Number(id)
  if (id) {
    console.log('Editing Outlet with ID:', id);
    this.outlet_id = Number(id);
    // fetch and patch data
  } else {
    console.log('Creating new Outlet');
  }
});

    // Check if payment done or not
    this.isPaymentDone = (this.localService.get('isPaymentDone') == 'true') ? true : false;
    // Category List
    this.getAllCategories();
    // Product List
    this.getAllProducts();
    // this.allProducts = [{
    //   name: "Demo Product",
    //   sku: "SKU123456",
    //   product_type: "Simple",
    //   stock_status: "Available",
    //   categories: [
    //     {
    //       id: 101,
    //       categories: "Electronics",
    //       path: "Home > Electronics > Gadgets"
    //     }
    //   ],
    //   pricing: {
    //     currency: [
    //       {
    //         iso2: "IN",
    //         currency_code: "INR"
    //       }
    //     ],
    //     tax_class: [
    //       {
    //         id: 1.0,
    //         name: "Default Tax Class"
    //       }
    //     ],
    //     raw: {
    //       price: 999.99,
    //       msrp: 1299.99,
    //       sale_price: 999.99
    //     }
    //   },
    //   description: {
    //     is_title_as_name: true,
    //     title: "This is a sample product description."
    //   },
    //   outlet_id: 1234,
    //   assets: [
    //     {
    //       image_source: "../../assets/images/common/banner.png",
    //       image_width: 0,
    //       image_height: 0,
    //       image_source_thumbnail: "",
    //       thumbnail_image: false
    //     },
    //     {
    //       image_source: "https://example.com/images/image2.jpg",
    //       image_width: 0,
    //       image_height: 0,
    //       image_source_thumbnail: "",
    //       thumbnail_image: false
    //     },
    //     {
    //       image_source: "https://example.com/images/image3.jpg",
    //       image_width: 0,
    //       image_height: 0,
    //       image_source_thumbnail: "",
    //       thumbnail_image: false
    //     }
    //   ],
    //   uploadedDocuments: [
    //     {
    //       fileName: "doc1.pdf",
    //       fileUrl: "../../assets/images/common/ecr.png"
    //     },
    //     {
    //       fileName: "doc2.pdf",
    //       fileUrl: "https://example.com/docs/doc2.pdf"
    //     },
    //     {
    //       fileName: "doc3.pdf",
    //       fileUrl: "https://example.com/docs/doc3.pdf"
    //     }
    //   ],
    //   available: true
    // }];
  }

  addProduct() {
    this.newProduct = false;
  }

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
    console.log('Edit Product ID:', id);
    this.setInitialValues(id);
    this.productId = id;
    this.isEditMode = true;
    this.newProduct = false;
  }

  deleteProduct(id: any) {
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
    console.log('Product:', product);
    if (product) {
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
      // Set uploaded image files
      this.uploadedFiles = product.assets.map((img: any, index: number) => {
        const fullName = img.image_source?.split('/').pop() || '';
        const namePart = fullName.split('%20-%20')[1]?.split('.')[0] || `Image ${index + 1}`;
        return {
          name: `Image ${index + 1}`,
          fileName: namePart,
          fileUrl: img.image_source && img.image_source.trim() !== '' ? img.image_source : this.defaultImageUrl
        };
      });
    }
  }

  // getAllCategories() {
  //   let jsonRequest = {
  //     domain_name: 'https://www.guestezee.com',
  //     user_id: 1,
  //     extras: {
  //       find: {},
  //     }

  //   }
  //   this.appService.getAllCategories(jsonRequest).subscribe(resp => {
  //     if (resp && resp.success === 1) {
  //       this.allCategories = resp.result.data; // stores in a separate variable
  //       console.log("All Layouts Raw:", this.allCategories);
  //     } else {
  //       console.error("Error fetching layouts", resp?.message);
  //     }
  //   })
  // }

  getAllCategories() {
    this.productDetailService.getAllCategories(
      {
        "domain_name": 'https://www.guestezee.com',
        "user_id": 1,
        "extras": {
          "find": {
            outlet_id:this.outlet_id
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
        console.log("Categoies", this.categories)
      }
      else {
        console.log(response.message);
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
          "customer_id": this.customerId,
          "outlet_id":this.outlet_id
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
        console.log("All Products Raw:", this.allProducts);
      } else {
        console.error("Error fetching products", resp?.message);
      }
    })
  }

  // File uploading
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('reuploadInput') reuploadInput!: ElementRef;

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
  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.isUploading = true; // Show loader
    const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      alert("Invalid file type! Only PDF, JPEG, JPG, and PNG files are allowed.");
      this.isUploading = false;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB. Please select a smaller file.");
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
      alert("Invalid file type! Only PDF, JPEG, JPG, and PNG files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB. Please select a smaller file.");
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
        }
      });
    };
    reader.readAsDataURL(file);
  }

  // To open the image(modal)/pdf(blank)
  openImageModal(fileUrl: string) {
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
    this.uploadedFiles[index].fileName = "";
    this.uploadedFiles[index].fileUrl = "";
    if (index <= this.currentStage) {
      this.currentStage = index;
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  // To open/close the category modal
  isModalOpen1 = false;

  opencate() {
    this.isModalOpen1 = true;
    // Add required validator when modal opens
    this.categoryForm.get('name')?.setValidators([Validators.required]);
    this.categoryForm.get('name')?.updateValueAndValidity();
  }

  closeModal1() {
    this.isModalOpen1 = false;
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

  onCategoryChange(event: any) {
    const selectedValue = event.target.value;
    console.log("Selected Value", selectedValue)
    if (selectedValue === '0: othercat') {
      this.opencate();
    }
  }

  createcat() {
    let orderDetails = this.categoryForm.value.name;
    // console.log('Order:', orderDetails);
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
          "outlet_id":this.outlet_id,
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
        if (resp) {
          this.alertService.success('Category Created Successfully', this.options);
          this.getAllCategories();
          this.isModalOpen1 = false;
        }
        else {
          this.alertService.error(resp.message, this.options);
        }
      })
  }

  toggleAvailability(event: Event): void {
    this.isAvailable = (event.target as HTMLInputElement).checked;
    console.log('Available status:', this.isAvailable);
  }


  

  setAvailabilityToggle(product: any): void {
    this.isAvailable = product?.stock_status === 'Available' ? true : false;
    console.log('Available status:', this.isAvailable);
  }

  onSubmit() {
    const selected = this.categoryForm.get('selectedCategory')?.value;
    const productName = this.companyForm.get('name')?.value;
    const generatedSku = this.generateSku(productName);
    // let orderDetails = {
    //   name: this.companyForm.get('name')?.value,
    //   sku: this.companyForm.get('sku')?.value,
    //   product_type: "Simple",
    //   stock_status: this.isAvailable ? "Available" : "Out of Stock",
    //   categories: [
    //     {
    //       id: Number(selected?.id),
    //       categories: selected?.name,
    //       path: selected?.path
    //     }
    //   ],
    //   pricing: {
    //     currency: [
    //       {
    //         iso2: "IN",
    //         currency_code: "INR"
    //       }
    //     ],
    //     tax_class: [
    //       {
    //         id: 1.0,
    //         name: "Default Tax Class"
    //       }
    //     ],
    //     raw: {
    //       price: Number(this.companyForm.get('price')?.value),
    //       msrp: Number(this.companyForm.get('offer_price')?.value),
    //       sale_price: Number(this.companyForm.get('price')?.value),
    //     }
    //   },
    //   description: {
    //     is_title_as_name: true,
    //     title: this.companyForm.get('description')?.value,
    //   },
    //   // delivery_date: this.companyForm.get('delivery_date')?.value,
    //   outlet_id: Number(this.localService.get('outletfor_id')),
    //   assets: [
    //     {
    //       image_source: this.uploadedFiles[0].fileUrl,
    //       image_width: 0,
    //       image_height: 0,
    //       image_source_thumbnail: "",
    //       thumbnail_image: false
    //     },
    //     {
    //       image_source: this.uploadedFiles[1].fileUrl,
    //       image_width: 0,
    //       image_height: 0,
    //       image_source_thumbnail: "",
    //       thumbnail_image: false
    //     },
    //     {
    //       image_source: this.uploadedFiles[2].fileUrl,
    //       image_width: 0,
    //       image_height: 0,
    //       image_source_thumbnail: "",
    //       thumbnail_image: false
    //     }
    //     // {
    //     //   image_source: this.uploadedFiles[3].fileUrl,
    //     //   image_width: 0,
    //     //   image_height: 0,
    //     //   image_source_thumbnail: "",
    //     //   thumbnail_image: false
    //     // }
    //   ],
    //   uploadedDocuments: this.uploadedFiles,
    //   available: this.isAvailable,
    // }
    let orderDetails = {
      customer_id: this.customerId,
      outlet_id:this.outlet_id,
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
            this.categoryForm.reset();
            this.companyForm.reset();
             this.uploadedFiles = [
                { name: "Image 1", fileName: "", fileUrl: "", fileSelected: null },
                { name: "Image 2", fileName: "", fileUrl: "", fileSelected: null },
                { name: "Image 3", fileName: "", fileUrl: "", fileSelected: null }
              ];
              this.isAvailable = false;
            this.getAllProducts()
            this.newProduct = true;
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
    console.log()
    return `${baseName}-${paddedNumber}`;
  }

  // brand() {
  //   this.router.navigate([`/list-view/member-detailsbrand`])
  // }

  // addBrand() {
  //   this.brands.push({ brandName: '', productCategory: '', qty: '', value: '', country: 'India' });
  //   this.calculateTotals();
  // }

  // removeBrand(index: number) {
  //   this.brands.splice(index, 1);
  //   this.calculateTotals();
  // }

  // Calculate total quantity
  // calculateTotals() {
  //   this.totalQuantity = this.brands.reduce((sum, brand) => sum + Number(brand.qty), 0);
  //   this.totalValue = this.brands.reduce((sum, brand) => sum + Number(brand.value), 0);
  // }

  // saveCategory() {
  // }

addProduct1(){
   this.newProduct = false;
   this.isEditMode=false;
   this.router.navigate([`/product-detail`, this.outlet_id])
}

}
