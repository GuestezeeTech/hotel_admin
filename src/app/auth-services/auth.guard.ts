import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class authGuard implements CanActivate {

    constructor(private router: Router) { }

    canActivate(): boolean {
        const token = localStorage.getItem('accessToken'); 
        console.log('Guard check → token:', token);

        if (token) {
            return true;
        } else {
            this.router.navigate([''], { replaceUrl: true });
            return false;
        }
    }
}