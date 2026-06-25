
import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})

export class FeaturesComponent implements OnInit {
  customerType: any;

  constructor(
    private routerUrl: Router,
    private localService: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.customerType = this.localService.get('CustomerType');
    // console.log('Customer Type:', this.customerType);
  }

  navigateToRestaurants() {
    this.routerUrl.navigate(['/restaurants-list']);
  }


}
