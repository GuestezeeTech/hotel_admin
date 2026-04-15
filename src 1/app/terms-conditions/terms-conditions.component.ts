import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-terms-conditions',
  standalone: true,
  imports: [],
  templateUrl: './terms-conditions.component.html',
  styleUrl: './terms-conditions.component.scss'
})
export class TermsConditionsComponent {
  constructor(private router: Router) { }

  onBack(): void {
    this.router.navigate(['/settings']);
  }
}
