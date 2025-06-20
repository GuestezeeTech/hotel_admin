import { CommonModule } from '@angular/common';
import { Component} from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-subscription-management',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './payment-subscription-management.component.html',
  styleUrl: './payment-subscription-management.component.scss'
})
export class PaymentSubscriptionManagementComponent {
  
  constructor(private routerUrl: Router) {}

  plans = [
    {
      name: 'Bronze',
      price: 50,
      isCurrent: false,
      theme: 'success',
      discounted: null,
      features: [
        'Basic analytics dashboard',
        '100 product listings',
        'Email support',
        '1 user access',
        'No custom branding'
      ]
    },
    {
      name: 'Silver',
      price: 65,
      isCurrent: false,
      theme: 'success',
      discounted: null,
      features: [
        'Advanced analytics dashboard',
        '500 product listings',
        'Priority email support',
        '5 user access',
        'Basic custom branding'
      ]
    },
    {
      name: 'Gold',
      price: 80,
      isCurrent: false,
      theme: 'success',
      discounted: null,
      features: [
        'Full analytics with reports',
        'Unlimited product listings',
        '24/7 live chat support',
        'Unlimited user access',
        'Advanced custom branding'
      ]
    },
    {
      name: 'Platinum',
      price: 98,
      discounted: 56,
      isCurrent: true,
      theme: 'danger',
      features: [
        'All Gold features plus',
        'Dedicated account manager',
        'Early access to new features',
        'Custom integrations',
        'Premium white-label support'
      ]
    }
  ];

  billingDetails = {
    nextPaymentDate: '28 March 2025',
    nextPaymentAmount: 56.00,
    lastPayment: {
      status: 'Payment Successful',
      cardNumber: '**** **** **** 5714',
      cardType: 'VISA',
      amount: 56.00
    },
    lastBilling: {
      name: 'Aswin Kumar R',
      date: '28 Feb, 2025',
      address: '#46 Ambattur, Chennai, Tamil Nadu 600058'
    }
  };

  goBack() {
    this.routerUrl.navigate(['/settings'])
  }
}
