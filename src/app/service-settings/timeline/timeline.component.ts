import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [ CommonModule],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})
export class TimelineComponent {
  constructor(private router: Router) { }

  // Timeline - Order details array
  orderDetails = {
    productName: 'Baby Powder',
    quantity: 2,
    roomNo: 400,
    customerName: 'Aswin',
    roomType: 'Gold',
    department: 'Housekeeping',
    orderPlacedTime: '11:54am',
    expectedDeliveryTime: '12:15pm',
    deliveredTime: '12:20pm',
    productImage: '../../assets/images/guestezee/Powder.png'
  };

  // Timeline data
  timelineData = [
    {
      title: 'Order Received (Room No:400)',
      details: 'Desk in person - Sam 11:54am',
      status: 'scheduled',
      escalated: false
    },
    {
      title: 'Task Processed',
      details: 'Desk arranged new assignee - Siva 11:55am',
      status: 'processing',
      escalated: false
    },
    {
      title: 'Escalated',
      details: "Service person didn't accept order - Siva 11:58am",
      status: 'processing',
      escalated: true
    },
    {
      title: 'Re-Assigned',
      details: 'Supervisor arranged new assignee - Vijay 11:59am',
      status: 'reassigned',
      escalated: false
    },
  ];

  // Timeline review data
  reviews = [
    {
      name: 'Aswin ',
      profileImage: '../../assets/images/guestezee/profile.png', // replace with actual path
      timeAgo: '30 min ago',
      rating: 4,
      comment: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.`,
      liked: true
    }
  ];

  statusIcons: { [key: string]: string } = {
    'Assigned': '../../assets/images/guestezee/assigned.png',
    'Scheduled': '../../assets/images/guestezee/assigned.png',
    'Processing': '../../assets/images/guestezee/assigned.png',
    'Delivered': '../../assets/images/guestezee/assigned.png',
    'Reassigned': '../../assets/images/guestezee/reassigned.png',
    'Escalated': '../../assets/images/guestezee/escalated.png',
  };

  getStatusIcon(item: any): string {
    if (item.escalated) {
      return this.statusIcons['Escalated'];
    }
    else {
      return this.statusIcons['Assigned'];
    }
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  navigateToCart() {
    this.router.navigate(['/task-management']);
  }

  

}
