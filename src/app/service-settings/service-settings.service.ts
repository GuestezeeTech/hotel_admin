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
   
}
