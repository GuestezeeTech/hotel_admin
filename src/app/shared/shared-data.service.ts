// shared-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class SharedDataService {
  private userDataSource = new BehaviorSubject<any>(null);
  userData$ = this.userDataSource.asObservable();
  private sharedData = new BehaviorSubject<any>(null); // holds your data
  currentData = this.sharedData.asObservable();        // listen to this in any component

  // Tab navigation
  private tabSubject = new BehaviorSubject<number>(0);
  tab$ = this.tabSubject.asObservable();

  private hotelLogoSource = new BehaviorSubject<string | null | undefined>(undefined);
  hotelLogo$ = this.hotelLogoSource.asObservable();

  setHotelLogo(logoUrl: string | null) {
    this.hotelLogoSource.next(logoUrl);
  }

  setUserData(data: any) {
    this.userDataSource.next(data);
  }

  shareData(data: any) {
    this.sharedData.next(data);
    localStorage.setItem('paymentType', JSON.stringify(data));
  }

  getStoredData(): any {
    const data = localStorage.getItem('paymentType');
    return data ? JSON.parse(data) : null;
  }
  
  // Tab navigation
  setTab(index: number) {
    this.tabSubject.next(index);
  }
}
