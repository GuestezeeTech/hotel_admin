import { Injectable } from '@angular/core';
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DOMAIN_NAME, ENDPOINTS } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  dbSchema: string = "";
  private baseUrl = 'https://www.guestezee.com:5520/api/Email';

  constructor
    (
      private http: HttpClient,
      private authTokenService: AuthTokenService,
      private router: Router
    ) { }

  // SET HEADERS
  httpOptions = new HttpHeaders().set('Content-Type', 'application/json');
  // httpOptions = new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())

  // MAKE API SERVICE CALLS HERE...

  // API CALLS

  // POST
  postApiCall(dataObj: any, api_endpoint: any): Observable<any> {
    return this.http.post(api_endpoint, dataObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
  }



  // GET
  getApiCall(jsonObj: any, api_endpoint: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      //console.log(api_endpoint)
      return this.http.post(api_endpoint, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }


  // LOGIN SERVICE
  login(loginObj: any): Observable<any> {
    return this.http.post(ENDPOINTS.LOGIN_TWO, loginObj, { headers: new HttpHeaders().set('Content-Type', 'application/json') });
  }


  getToken(tokenObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      return this.http.post(ENDPOINTS.GETNEWACCESSTOKEN, tokenObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
    }
  }

  commonRequestData = {
    "domain_name": DOMAIN_NAME,
    "extras": {
      "find": {
      }
    }
  }
  checkoutAPICall(endPoint: string, reqData?: any) {
    return new Promise((resolve) => {
      var respObject = {
        success: true,
        data: {},
        message: ""
      }
      this.otpApiCall(reqData ? reqData : this.commonRequestData, endPoint).subscribe(
        resp1 => {
          let resp = resp1;
          if (resp.success === 1) {
            respObject.success = true;
            if (resp.result) {
              respObject.data = resp.result.data;
            }
            else {
              respObject = resp;
            }
            if (resp.message) {
              respObject.message = resp.message;
            }
            resolve(respObject);
          }
          else if (resp.success === 0) {
            if (resp.result) {
              if (resp.result.data.deliveryCharge) {
                respObject.success = true;
                if (resp.result) {
                  respObject.data = resp.result.data;
                }
                else {
                  respObject = resp;
                }
                if (resp.message) {
                  respObject.message = resp.message;
                }
                resolve(respObject);
              }
              else {
                respObject.success = false;
                respObject.data = resp;
                if (resp.message) {
                  respObject.message = resp.message;
                }
                resolve(respObject)
              }
            }
            else {
              respObject.success = false;
              respObject.data = resp;
              if (resp.message) {
                respObject.message = resp.message;
              }
              resolve(respObject)
            }
          }
          else {
            respObject.success = false;
            if (resp.message) {
              respObject.message = resp.message;
            }
            else {
              respObject.message = 'Something bad happened; Please try again!';
            }
            resolve(respObject);
          }
        },
        err => {
          respObject.success = false;
          if (err.error.statusCode === 401) {
            respObject.message = "Your password is invalid. Please try again."
          }
          else if (err.error.statusCode === 500) {
            respObject.message = err.error.message;
          }
          else if (err.error.error) {
            if (err.error.error.message) {
              respObject.message = err.error.error.message
            }
          }
          else {
            respObject.message = 'Something bad happened; Please try again!';
          }
          resolve(respObject);
        })
    })
  }

  otpApiCall(dataObj: any, api_endpoint: any): Observable<any> {
    return this.http.post(api_endpoint, dataObj, {
      headers: new HttpHeaders().set("Content-Type", "application/json"),
    });
  }


  checkoutAPICall1(endPoint: string, reqData?: any) {
    return new Promise((resolve, reject) => {
      var respObject = {
        success: true,
        data: {},
        message: ""
      }
      this.postApiCall1(reqData ? reqData : this.commonRequestData, endPoint).subscribe(
        resp1 => {
          let resp = resp1;
          if (resp.success === 1) {
            respObject.success = true;
            if (resp.result) {
              respObject.data = resp.result.data;
            }
            else {
              respObject = resp;
            }
            if (resp.message) {
              respObject.message = resp.message;
            }
            resolve(respObject);
          }
          else if (resp.success === 0) {
            if (resp.result) {
              if (resp.result.data.deliveryCharge) {
                respObject.success = true;
                if (resp.result) {
                  respObject.data = resp.result.data;
                }
                else {
                  respObject = resp;
                }
                if (resp.message) {
                  respObject.message = resp.message;
                }
                resolve(respObject);
              }
              else {
                respObject.success = false;
                respObject.data = resp;
                if (resp.message) {
                  respObject.message = resp.message;
                }
                resolve(respObject)
              }
            }
            else {
              respObject.success = false;
              respObject.data = resp;
              if (resp.message) {
                respObject.message = resp.message;
              }
              resolve(respObject)
            }
          }
          else {
            respObject.success = false;
            if (resp.message) {
              respObject.message = resp.message;
            }
            else {
              respObject.message = 'Something bad happened; Please try again!';
            }
            resolve(respObject);
          }
        },
        err => {
          respObject.success = false;
          if (err.error.statusCode === 401) {
            respObject.message = "Your password is invalid. Please try again."
          }
          else if (err.error.statusCode === 500) {
            respObject.message = err.error.message;
          }
          else if (err.error.error) {
            if (err.error.error.message) {
              respObject.message = err.error.error.message
            }
          }
          else {
            respObject.message = 'Something bad happened; Please try again!';
          }
          resolve(respObject);
        })
    })
  }

  postApiCall1(dataObj: any, api_endpoint: any): Observable<any> {
    return this.http.post(api_endpoint, dataObj, {
      headers: new HttpHeaders().set("Content-Type", "application/json"),
    });
  }

  /*  sendWelcomeEmail(payload: any): Observable<any> {
     return this.http.post(`${this.baseUrl}/enrollmentsuccessemail`, payload);
   } */


  sendWelcomeEmail(payload: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      return this.http.post(ENDPOINTS.SEND_WELCOME_EMAIL, payload, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
    }
  }

  sendSMS(tokenObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      return this.http.post(ENDPOINTS.GENERATE_SMS_PHONE, tokenObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
    }
  }

  staffLogin(loginObj: any): Observable<any> {
    return this.http.post(ENDPOINTS.STAFF_LOGIN, loginObj, { headers: new HttpHeaders().set('Content-Type', 'application/json') });
  }

}








