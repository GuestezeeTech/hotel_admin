import { Component } from '@angular/core';
import { ActivatedRoute,Router,NavigationEnd } from '@angular/router';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-cancellation',
  standalone: true,
  imports: [],
  templateUrl: './cancellation.component.html',
  styleUrl: './cancellation.component.scss'
})
export class CancellationComponent implements OnInit {
   customerId: string | null = null;
constructor(private route: ActivatedRoute,private router:Router) {


   this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          const currentUrl = event.url; // Get the current URL
          //console.log('Current URL:', currentUrl); // Debugging (Optional)
          // Enable showSidebar if URL contains "confirmation"
          // this.isVisible = currentUrl.includes('confirmation');
          if (currentUrl.includes('cancellation')) {
            // this.currentTab = 5;
            const currentUrl = this.router.url;
            //console.log(currentUrl, "currentUrl");
            this.route.queryParams.subscribe(params => {
              let id = params['id'];
              let customerId = params['customer_id'];
  
              //console.log('ID:', id);
              //console.log('Customer ID:', customerId);
              this.router.navigate(['/hotel-registration/cancellation'], {
                queryParams: {
                  id: id,
                  customer_id: customerId
                }
              });
  
            });
            //  this.router.navigateByUrl('/hotel-registration'+currentUrl);
  
            
          }
  
        }
      });
}
ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.customerId = params.get('customer_id');
      //console.log('Customer ID:', this.customerId);
    });
  }
  back(){
    //console.log("1212")
     this.router.navigateByUrl('/login');
  }
}
