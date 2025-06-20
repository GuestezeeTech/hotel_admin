import { Injectable } from '@angular/core';
import { Base64 } from 'js-base64';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})

export class AuthTokenService {
   private readonly tokenKey = '';
  constructor(
    private localStorageService: LocalStorageService
  ) { }

  setAccessToken(token: string) {
    if (token) {
      var encodedToken = Base64.encode(token);
      this.localStorageService.set('accessToken', encodedToken);
    }
  }
  sessionIsValid(): boolean {
  const accessToken = this.localStorageService.get('accessToken');
  if (!accessToken) return false;

  // If token exists but is expired
  if (this.isTokenExpired()) return false;

  return true; // Token exists and is not expired
}

  setRefreshToken(rtoken: string) {
    if (rtoken) {
      var encodedrToken = Base64.encode(rtoken);
      this.localStorageService.set('refreshToken', encodedrToken)
    }
  }
   isLoggedIn(): boolean {
    const token = this.localStorageService.get('accessToken') ? this.localStorageService.get('accessToken') : null;
    return !!token; // true if token exists, false if null
  }


  getAccessAPIToken() {
    var token = this.localStorageService.get('accessToken') ? this.localStorageService.get('accessToken') : "";
    // @ts-ignore: Object is possibly 'null'.
    var decodedToken = Base64.decode(token);
    return decodedToken ? decodedToken : null;
  }

  getRefreshToken() {
    var rtoken = this.localStorageService.get('refreshToken') ? this.localStorageService.get('refreshToken') : "";
    // @ts-ignore: Object is possibly 'null'.
    var decodedRToken = Base64.decode(rtoken);
    return decodedRToken ? decodedRToken : null;
  }

  setExpiryTime(expTime: any) {
    this.localStorageService.set('expireTime', expTime);
  }

  getExpiryTime(): number {
    // @ts-ignore: Object is possibly 'null'.
    return parseInt(this.localStorageService.get('expireTime'));
  }

  setRTokenExpireTime(rexpTime: any) {
    this.localStorageService.set('rexpireTime', rexpTime);
  }

  getRTokenExpireTime() {

    return (this.localStorageService.get('rexpireTime'));
  }

  getUserName() {

    return this.localStorageService.get('UserName')
  }

  getUserId(): number {
    // @ts-ignore: Object is possibly 'null'.
    return parseInt(this.localStorageService.get('UserId'));
  }

  getDomain(): string {
    // @ts-ignore: Object is possibly 'null'.
    return this.localStorageService.get('domainName');
  }

  isTokenExpired(): boolean {
    const expiryTime: number = this.getExpiryTime();
    if (expiryTime) {
      var milli_seconds = new Date().getTime();
      if (parseInt(milli_seconds.toString()) > expiryTime) {
        return true;
      }
      else {
        return false;
      }
    } else {
      return false;
    }
  }

  isRTokenExpired(): boolean {
    const rexpiryTime: number = Number(this.getRTokenExpireTime());
    if (rexpiryTime) {
      var milli_seconds = new Date().getTime();
      if (parseInt(milli_seconds.toString()) > rexpiryTime) {
        return true;
      }
      else {
        return false;
      }
    } else {
      return false;
    }
  }
}
