import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})

export class NotFoundComponent {
  constructor(private router: Router) { }

  goBack(): void {
    const lastValidUrl = localStorage.getItem('lastValidUrl');
    if (lastValidUrl) {
      this.router.navigateByUrl(lastValidUrl);
    } else {
      const customerType = localStorage.getItem('CustomerType');
      if (customerType === 'Staff') {
        this.router.navigate(['/task-management']);
      } else if (customerType === 'Customer') {
        this.router.navigate(['/profile']);
      } else {
        this.router.navigate(['/login']);
      }
    }
  }
}
