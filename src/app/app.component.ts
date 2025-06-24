import { ProfileService } from './profile/profile.service';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { MenuBarComponent } from './shared/menu-bar/menu-bar.component';
import { HeaderComponent } from './shared/header/header.component';
import { LocalStorageService } from './auth-services/local-storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuBarComponent, HeaderComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent implements OnInit {
  showSidebar = true;
  title = 'GUESTEZEE_ADMIN';
  selectedMenuItem: string = '';
  private routesWithoutSidebar = ['/login', '/', '/view']; // Add routes where sidebar is required

  constructor(private router: Router, private localservice: LocalStorageService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showSidebar = this.routesWithoutSidebar.some(route => {
          return route === event.url;
        });
        ////console.log(this.showSidebar, " this.showSidebar", event.url);
        if (event.url == '/hotel-list' || event.url == '/add-new-hotel') {
          this.selectedMenuItem = "Hotels"
        }
        if (event.url == '/role-list' || event.url == '/role') {
          this.selectedMenuItem = "Roles"
        }
        if (event.url == '/user-list' || event.url == '/user') {
          this.selectedMenuItem = "Users"
        }
        if (event.url == '/staff-list' || event.url == '/staff') {
          this.selectedMenuItem = "Staff"
        }
        if (event.url == '/bookings') {
          this.selectedMenuItem = "Bookings"
        }
        if (event.url == '/bookings-management') {
          this.selectedMenuItem = "Bookings & Guest Management"
        }
        if (event.url == '/late-checkout') {
          this.selectedMenuItem = "Late Checkout"
        }
        if (event.url == '/settings') {
          this.selectedMenuItem = "Settings"
        }
        // Newly added
        if (event.url.startsWith('/view-hierarchy')) {
          this.showSidebar = true;
        }
        if (event.url.startsWith('/view-customer-hierarchy')) {
          this.showSidebar = true;
        }
      }
    });
  }

  updateMenu(value: string) {
    this.selectedMenuItem = value; // Update selected menu value
    ////console.log(this.selectedMenuItem, "Menu Items");
  }
  
  ngOnInit(): void {
    // Use URLSearchParams since queryParams might not be available immediately
    const queryParams = new URLSearchParams(window.location.search);
    const customerIdFromUrl = queryParams.get('customer_id');

    // const customerIdInLocal = this.localservice.get('UserId');
    // this.localservice.set('UserId',customerIdFromUrl);
    ////console.log(customerIdFromUrl,"customerIdInLocal")
    if (customerIdFromUrl != undefined && customerIdFromUrl != null && customerIdFromUrl != "") {
      // ////console.log("1111")
      localStorage.setItem('customer_id', customerIdFromUrl);
      this.localservice.set('UserId', customerIdFromUrl);
      ////console.log('customer_id restored in localStorage:', customerIdFromUrl);
    }




    const urlParams = new URLSearchParams(window.location.search);
    const IdFromUrl = urlParams.get('id');


  }
}