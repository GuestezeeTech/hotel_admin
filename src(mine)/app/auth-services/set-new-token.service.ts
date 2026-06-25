import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginService } from '../login/login.service';
import { AuthTokenService } from './auth-token.service';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class SetNewTokenService {

  constructor(
    private router: Router,
    private appService: LoginService,
    private authTokenService: AuthTokenService,
    private localService: LocalStorageService
  ) { }
  
  // MAKE SERVICE CALL TO GET NEW ACCESS TOKEN
  getNewAccessToken(){
    var refreshToken = {
      refresh_token: this.authTokenService.getRefreshToken()
    }
    this.appService.getToken(refreshToken).subscribe(
      resp => {
        if (resp.success === 1){
          let accessToken = resp.access_token;
          this.localService.remove('accessToken');
          this.localService.remove('expireTime');
          this.authTokenService.setAccessToken(accessToken);
          this.authTokenService.setExpiryTime(new Date().getTime() + (7200*1000))
        }
        else{
          this.router.navigate([`/login`],{ skipLocationChange: false });
        }
      },
      err => {
        // REDIRECT TO LOGIN SCREEN IN CASE OF ANY FAILURES
        this.router.navigate([`/login`],{ skipLocationChange: false });
      }
    )
  }
}
