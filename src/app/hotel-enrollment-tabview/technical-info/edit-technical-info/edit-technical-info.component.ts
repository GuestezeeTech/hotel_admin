

import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';

import { TechnicalInfoService } from '../technical-info.service';
import { FormGroup, FormControl, FormBuilder, FormArray } from '@angular/forms';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthTokenService } from '../../../auth-services/auth-token.service';
import { LocalStorageService } from '../../../auth-services/local-storage.service';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../../app.config';
import { AlertsService } from '../../../shared/alerts/alerts.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';




@Component({
  selector: 'app-edit-technical-info',
  standalone: true,
  imports: [AlertsComponent, CommonModule, ReactiveFormsModule],
  templateUrl: './edit-technical-info.component.html',
  styleUrl: './edit-technical-info.component.scss'
})
export class EditTechnicalInfoComponent implements OnInit {
  @Input() infoData: any;
  filterInfo = "lock";

  previewImgUrl: string | null = null;
  techInfoForm: FormGroup = new FormGroup({});
  imageName: string = '';
  enableEdit: boolean = true;
  imgFile: File | null = null;
  logo_image: string = '';
  techInfoDataForm: FormGroup;
  service_image: any;
  tech_info_id: any;
  ecomData: any;
  uploadedFileName: string | null = null;
  techInfoData: any;
  technicalInfoData: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  showEdit: boolean = true;
  memberId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authTokenService: AuthTokenService,
    private technicalInfoService: TechnicalInfoService,
    private alertService: AlertsService,
    private router: Router,
    private route: ActivatedRoute,
    private localStorageService: LocalStorageService
  ) {


    this.techInfoDataForm = this.fb.group({
      technicalInfo: this.fb.array([]),
    })
  }
  ngOnInit(): void {
    this.memberId = this.localStorageService.get('MemberId');
    this.techInfoForm = new FormGroup({
      api_url: new FormControl('', Validators.required),
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      // console.log('Reactive ID:', id);
      if (id != undefined) {
        this.tech_info_id = Number(id);
        this.getTechInfoById();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['infoData'] && this.infoData) {
      // Example condition: infoData.type === 'lock'

      this.getTechInfoById();

    }
  }


  employees(): FormArray {
    ////console.log(this.techInfoDataForm.get("technicalInfo") as FormArray);
    const values = this.techInfoDataForm.value.technicalInfo;
    ////console.log("123456", values);


    return this.techInfoDataForm.get("technicalInfo") as FormArray

  }


  newEmployee(): FormGroup {

    return this.fb.group({
      key: '',
      value: '',
      // skills:this.fb.array([])
    })
  }


  addEmployee() {
    ////console.log("Adding a employee");
    this.employees().push(this.newEmployee());
  }


  removeEmployee(empIndex: number) {
    this.employees().removeAt(empIndex);
  }


  addApiIntegration() {

    let createobj =
    {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "payload": {
        "integration_settings": {

          "api_url": this.techInfoForm.get('api_url')?.value,

          "attributes": this.techInfoDataForm.value.technicalInfo
        }
      },
      "extras": {
        "find": {
          "id": ""
        }
      }
    }

    this.technicalInfoService.apiCall(createobj, ENDPOINTS.CREATE_APIINTEGRATION_SETTINGS).subscribe(
      resp => {
        ////console.log("test", "123")
        if (resp) {
          this.techInfoData = resp.result.data[0];
          this.tech_info_id = resp.result.data[0]?.id;
          this.router.navigate(['/tech-info-list'])






        }

      },
      err => {

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
  updateApiIntegration() {
    let createobj =
    {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "payload": {
        "integration_settings": {
          "name": this.techInfoForm.get('name')?.value,
          "type": this.techInfoForm.get('type')?.value,
          "title": this.techInfoForm.get('name')?.value,
          "api_url": this.techInfoForm.get('api_url')?.value,
          "is_enabled": this.techInfoForm.get('is_enabled')?.value,

          "description": "",
          "attributes": this.techInfoDataForm.value.technicalInfo
        }
      },
      "extras": {
        "find": {
          // Newly added for getting member id for customer type
          // "customer_id": this.tech_info_id
          "member_id": this.memberId
        }
      }
    }

    this.technicalInfoService.apiCall(createobj, ENDPOINTS.EDIT_APIINTEGRATION_SETTINGS).subscribe(
      resp => {
        ////console.log("test", "123")
        if (resp) {
          // this.techInfoData = resp.result.data[0];
          // this.tech_info_id = resp.result.data[0].id;
          var closebt = document.getElementById("closetechInfo");
          if (closebt) {
            closebt.click();

          }

          // this.router.navigate(['/tech-info-list'])







        }

      },
      err => {

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




  saveData() {

    ////console.log("000");
    if (this.techInfoForm.valid) {
      ////console.log("Form Submitted");
      ////console.log("##########");
      ////console.log(this.tech_info_id, "this.tech_info_id")
      // if (this.tech_info_id == 0 || this.tech_info_id == undefined) {
      //   this.addApiIntegration();

      // }
      {
        this.updateApiIntegration();
      }




    }
    else {
      ////console.log("111");
      ////console.log("Form is invalid!");
    }
  }



  imageupload(event: any): void {
    ////console.log("1234")
    let dragEvent = false
    let file_data = { name: "", size: 0 }
    //CHECKING DRAG EVENT OR UPLOAD EVENT
    if (event.target && event.target.files && event.target.files[0]) {

      file_data = event.target.files[0]
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadedFileName = file.name;
        // Optionally handle actual upload or validation logic here
      }
    }
    else {
      file_data = event.dataTransfer.files[0]
      dragEvent = true
    }
    // this.validateImage = true;
    var reader = new FileReader();

    this.imageName = file_data.name
    let splitFileName = this.imageName.split(".")
    //CHECKING FILE NAME
    // if (splitFileName.length == 0) {
    //   this.userRegistartionForm.controls['imageFile'].setErrors({ 'invalid': true });
    //   return
    // }

    // if (file_data.size == 0) {
    //   this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizezero': true });
    //   return
    // }

    if (Math.round((file_data.size / 1000)) > 2000) {
      this.techInfoForm.controls['image'].setErrors({ 'sizehigh': true });
      return
    }

    //CHECKING FILE TYPE
    if (!["jpg", "jpeg", "png", "gif", "JPG", "JPEG", "PNG", "GIF"].includes(splitFileName[splitFileName.length - 1])) {
      this.techInfoForm.controls['image'].setErrors({ 'type': true });
      return
    }


    reader.onload = (evt: any) => {
      this.previewImgUrl = evt.target.result;
      // this.techInfoForm.controls['image'].setValue(evt.target.result)
      this.imgFile = event.target.files[0];
    }

    //BASED ON EVENT READ FILE
    if (!dragEvent) {
      reader.readAsDataURL(event.target.files[0]);
      this.imgFile = event.target.files[0];

    }
    else {
      reader.readAsDataURL(event.dataTransfer.files[0]);
      this.imgFile = event.dataTransfer.files[0];
    }


    let headers = new HttpHeaders().set("source", "Brand").set("domain_name", DOMAIN_NAME)
    let formData_imageCate = new FormData();
    if (this.imgFile !== null) {
      formData_imageCate.append('upload', this.imgFile)
    }
    this.technicalInfoService.sendImage(formData_imageCate, headers).subscribe(resp => {
      if (resp && resp.success === 1 && resp.status_code === 200) {
        let imgVariable = resp.result.data[0];
        if (this.imgFile !== null) {
          this.service_image = imgVariable.location;
          ////console.log("this.service_image" + this.service_image)
          // Store profile image in localStorage


        }
      }
    })
  }


  clearImage(): void {
    this.uploadedFileName = null;
    this.techInfoForm.get('image')?.reset();
  }



  getTechInfoById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            // customer_id: this.tech_info_id
            member_id: this.memberId
          }
        }
      };

      this.technicalInfoService.apiCall(requestBody, ENDPOINTS.APIINTEGRATION_BY_ID).subscribe(
        resp => {

          if (resp) {

            const customerInfo = resp?.result?.data[0]?.customer_technical_info;
            if (resp?.result?.data[0]?.customer_technical_info == undefined) {
              this.showEdit = false;

            }
            else {
              this.showEdit = true;
            }
            if (this.infoData != undefined) {
              this.filterInfo = this.infoData;

            }

            const lockIndex = customerInfo?.findIndex((item: any) => item.type === this.filterInfo);
            if (customerInfo && lockIndex !== undefined && lockIndex !== -1) {
              this.ecomData = customerInfo[lockIndex];
            } else {
              this.ecomData = null;
            }

            this.techInfoForm.reset();
            if (!this.ecomData) {
              resolve();
              return;
            }

            this.techInfoForm.patchValue({
              name: this.ecomData.name,
              type: this.ecomData.type,

              image: "",
              api_url: this.ecomData.api_url,
              is_enabled: this.ecomData.is_enabled,

              description: this.ecomData.description
            });
            ////console.log(this.techInfoForm.value,)

            const attributesArray = this.fb.array(
              this.ecomData.attributes.map((attr: any) =>
                this.fb.group({
                  key: [attr.key],
                  value: [attr.value]
                })
              )
            );
            this.techInfoDataForm.setControl('technicalInfo', attributesArray);




            resolve();  // Resolve promise when data is set
          }
        },
        err => {
          // this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            // this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }



  getAllTechnicalInfo() {
    let checkExistingTechnicalInfoAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID, //Default user id
      "extras": {
        "find": {
          // Newly added for getting member id for customer type
          // "customer_id": this.tech_info_id
          "member_id": this.memberId
        }
      }
    }
    this.technicalInfoService.getAllTechnicalInfo(checkExistingTechnicalInfoAvailbility).subscribe(
      (resp: any) => {
        // this.loaderService.emitComplete();
        if (resp) {
          ////console.log("111", resp.result.data.length)

          this.technicalInfoData = resp.result.data;









        }
      },
      (err: any) => {
        // this.loaderService.emitComplete();
        // ////console.error('getCustomerById error:', err);
        if (err.error.statusCode === 403) {
          // this.alertsService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate([`/login`], { skipLocationChange: false });
        } else if (err.error.message) {
          // this.alertsService.error(err.error.message, this.options);
        } else {
          // this.alertsService.error('Something bad happened. Please try again!', this.options);
        }
      }
    );
  }

}






