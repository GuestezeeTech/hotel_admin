import { Component,OnInit } from '@angular/core';
import { OutletCreationService } from '../outlet-creation.service';
import { DOMAIN_NAME,USER_ID } from '../../app.config';
import { ENDPOINTS } from '../../app.config';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../../auth-services/local-storage.service';

@Component({
  selector: 'app-outlet-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './outlet-list.component.html',
  styleUrl: './outlet-list.component.scss'
})
export class OutletListComponent implements OnInit {
  outletdata:any=[];
   options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  constructor(private outletCreationService:OutletCreationService,
      private loaderService:LoaderService,
      private alertService:AlertsService,
       private router: Router,
       private localService:LocalStorageService

    ) {}
  ngOnInit(): void {
    this.outletGetAll();
    
  }
  outletGetAll(){
    let requestBody = {"domain_name":DOMAIN_NAME,
      "user_id":16,
      "extras":{
        "find":{
          customer_id:Number(this.localService.get('UserId'))        },
        "pagination":false,
        "paginationDetails":
        {
          "limit":0,
          "pageSize":2
        },
        "sorting":false
      }}
      
    this.outletCreationService.postApiCall(requestBody, ENDPOINTS.OUTLET_GETALL).subscribe(
              resp => {
                this.loaderService.emitComplete();
                if (resp) {
                  if (resp.success === 1 && resp.status_code === 200) {
                    // ////console.log(resp);
                   
                    this.alertService.success(resp.message, this.options);
                    this.outletdata = resp.result.data;
                    ////console.log(this.customerdata, "cst");
                    // this.router.navigate(["/edit-new-hotel", this.outletdata.id]).then(() => {
                    //   let nextTab = document.getElementById('profile-tab');
                    //   if (nextTab) {
                    //     (nextTab as HTMLAnchorElement).click();
                    //   }
                    // })
                    // this.afterCustomerCreate();
      
                    // setTimeout(() => {
                    //   this.router.navigate([`/all-customers`], { skipLocationChange: false });
                    // }, 1000);
                    // this.router.navigate(['/all-customers'], { state: { result: resp.message }, relativeTo: this.activatedRoute, skipLocationChange: false });
                  }
                  else if (resp.success === 0) {
                    if (resp.message) {
                      this.alertService.error(resp.message, this.options);
                    }
                  }
                  else if (resp.message && resp.status_code !== 200) {
                    this.alertService.error(resp.message, this.options);
                  }
                  else {
                    this.alertService.error('Something bad happened. Please try again!', this.options);
                  }
                }
              },
              err => {
                this.loaderService.emitComplete();
                if (err.error.statusCode === 403) {
                  this.alertService.error('Session Time Out! Please login Again', this.options)
                  this.router.navigate([`/login`], { skipLocationChange: false });
                }
                else if (err.error.message) {
                  this.alertService.error(err.error.message, this.options)
                }
                else {
                  this.alertService.error('Something bad happened. Please try again!', this.options);
                }
              }
            ) 
    

  }
navigateById(id:number){
   this.router.navigate(['/view-outlet', id]);
}
viewProducts(id:number){
    this.router.navigate(['/menu-list', id]);
}
navigateToOutlet(){
   this.router.navigate(['/create-outlet']);
  
}
}
