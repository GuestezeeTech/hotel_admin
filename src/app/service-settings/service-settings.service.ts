import { Component } from '@angular/core';
import { AuthTokenService } from '../../app/auth-services/auth-token.service';
import { throwError, Observable } from 'rxjs';
import { Router } from "@angular/router";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { ENDPOINTS } from "../app.config";
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServiceSettingsService {

  constructor( private authTokenService: AuthTokenService,
      private router: Router,
      private http: HttpClient,) { 
    
  }

   sendImage(jsonObj: any, headers: any): Observable<any> {
      return this.http.post(ENDPOINTS.SEND_IMAGE, jsonObj, { headers: headers });
    }
    createService(AddServiceObj: any): Observable<any> {
      if(this.authTokenService.isTokenExpired()){
        this.router.navigate([`/login`], {skipLocationChange: false});
        return new Observable(); 
      }
      else{
      return this.http.post(ENDPOINTS.CREATE_SERVICE, AddServiceObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
      }
    }
    updateService(updateServiceObj: any): Observable<any> {
      if(this.authTokenService.isTokenExpired()){
        this.router.navigate([`/login`], {skipLocationChange: false});
        return new Observable(); 
      }
      else{
      return this.http.post(ENDPOINTS.UPDATE_SERVICE, updateServiceObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
      }
    }
    getAllService(Obj: any): Observable<any> {
      if(this.authTokenService.isTokenExpired()){
        this.router.navigate([`/login`], {skipLocationChange: false});
        return new Observable(); 
      }
      else{
      return this.http.post(ENDPOINTS.GETALL_SERVICE, Obj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
      }
    }
    getServiceByid(Obj: any): Observable<any> {
      if(this.authTokenService.isTokenExpired()){
        this.router.navigate([`/login`], {skipLocationChange: false});
        return new Observable(); 
      }
      else{
      return this.http.post(ENDPOINTS.GETBYID_SERVICE, Obj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
      }
    }
    deleteService(Obj: any): Observable<any> {
      if(this.authTokenService.isTokenExpired()){
        this.router.navigate([`/login`], {skipLocationChange: false});
        return new Observable(); 
      }
      else{
      return this.http.post(ENDPOINTS.DELETE_SERVICE, Obj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
      }
    }
}
