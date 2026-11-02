import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type FoServiceRecord = {
  id: string;
  room: string;
  guest: string;
  type: string;
  staff: string;
  status: string;
  eta: string;
  delay: string;
  date: string;
  time: string;
};

@Component({
  selector: 'app-fo-operations-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fo-operations-dashboard.component.html',
  styleUrl: './fo-operations-dashboard.component.scss'
})
export class FoOperationsDashboardComponent {
  readonly records: FoServiceRecord[] = [
    {
      id: 'H821837',
      room: '205',
      guest: 'Steon Ravny',
      type: 'Regular Check-in',
      staff: 'Staff Assigned',
      status: 'Completed',
      eta: '23 min',
      delay: '-2h',
      date: 'Today',
      time: 'Morning'
    },
    {
      id: 'H821823',
      room: '308',
      guest: 'Paul Fantor',
      type: 'Regular Check-in',
      staff: 'John Selan',
      status: 'Completed',
      eta: '30 min',
      delay: '0',
      date: 'Today',
      time: 'Morning'
    },
    {
      id: 'H821834',
      room: '101',
      guest: 'Elevin Hiraston',
      type: 'Group Check-in',
      staff: 'John Alam',
      status: 'Completed',
      eta: '30 min',
      delay: '0',
      date: 'Today',
      time: 'Morning'
    },
    {
      id: 'H821635',
      room: '402',
      guest: 'May Kanch',
      type: 'Late Check-out',
      staff: 'Janv Sleen',
      status: 'Pending',
      eta: '20 min',
      delay: '-13m',
      date: 'Today',
      time: 'Afternoon'
    },
    {
      id: 'H821637',
      room: '205',
      guest: 'Steon Sanily',
      type: 'Regular Check-in',
      staff: 'Staff Assigned',
      status: 'Pending',
      eta: '20 min',
      delay: '0',
      date: 'Today',
      time: 'Afternoon'
    },
    {
      id: 'H821638',
      room: '308',
      guest: 'May Oridin',
      type: 'Express Check-out',
      staff: 'John Alam',
      status: 'Completed',
      eta: '23 min',
      delay: '-1 min',
      date: 'Today',
      time: 'Afternoon'
    },
    {
      id: 'H821839',
      room: '402',
      guest: 'May Inareson',
      type: 'Late Check-out',
      staff: 'John Selan',
      status: 'Escalated',
      eta: '33 min',
      delay: '-13m',
      date: 'Today',
      time: 'Afternoon'
    },
    {
      id: 'H821880',
      room: '101',
      guest: 'Steran Ravee',
      type: 'Regular Check-in',
      staff: 'John Alam',
      status: 'Processing',
      eta: '25 min',
      delay: '0',
      date: 'Today',
      time: 'Afternoon'
    },
    {
      id: 'H821781',
      room: '205',
      guest: 'Senan Milanner',
      type: 'Regular Check-in',
      staff: 'Janv Sleen',
      status: 'Pending',
      eta: '20 min',
      delay: '0',
      date: 'Yesterday',
      time: 'Morning'
    },
    {
      id: 'H821882',
      room: '308',
      guest: 'Chait Lonray',
      type: 'General Inquiry',
      staff: 'Staff Assigned',
      status: 'Completed',
      eta: '25 min',
      delay: '0',
      date: 'Yesterday',
      time: 'Afternoon'
    },
    {
      id: 'H821833',
      room: '402',
      guest: 'Sesan Senan',
      type: 'Group Check-in',
      staff: 'John Alam',
      status: 'Completed',
      eta: '25 min',
      delay: '0',
      date: 'Yesterday',
      time: 'Morning'
    }
  ];

  dateFilter = '';
  timeFilter = '';
  roomFilter = '';
  guestFilter = '';
  typeFilter = '';
  staffFilter = '';
  statusFilter = '';
  filtersVisible = true;

  showModal = false;
  modalTitle = 'Details';
  modalHtml = '';

  get liveClock(): string {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  get filteredRecords(): FoServiceRecord[] {
    const guest = this.guestFilter.trim().toLowerCase();
    return this.records.filter((r) => {
      if (this.dateFilter && r.date.toLowerCase() !== this.dateFilter.toLowerCase()) {
        return false;
      }
      if (this.timeFilter && r.time.toLowerCase() !== this.timeFilter.toLowerCase()) {
        return false;
      }
      if (this.roomFilter && r.room !== this.roomFilter) {
        return false;
      }
      if (guest && !r.guest.toLowerCase().includes(guest)) {
        return false;
      }
      if (this.typeFilter && r.type.toLowerCase() !== this.typeFilter.toLowerCase()) {
        return false;
      }
      if (this.staffFilter && r.staff.toLowerCase() !== this.staffFilter.toLowerCase()) {
        return false;
      }
      if (this.statusFilter && r.status.toLowerCase() !== this.statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
  }

  statusClass(status: string): string {
    if (status === 'Completed') {
      return 'delivered';
    }
    if (status === 'Pending') {
      return 'pending';
    }
    if (status === 'Escalated') {
      return 'escalated';
    }
    return 'processing';
  }

  delayClass(delay: string): string {
    return delay !== '0' ? 'delay-bad' : 'delay-good';
  }

  viewRequest(record: FoServiceRecord): void {
    this.openModal(
      `Service Request · ${record.id}`,
      `Guest: ${record.guest}<br>Room: ${record.room}<br>Request: ${record.type}<br>Assigned staff: ${record.staff}<br>Status: ${record.status}<br>ETA: ${record.eta}<br>Delay: ${record.delay}`
    );
  }

  quickAction(name: string): void {
    this.openModal(
      name,
      `${name} workflow selected. This is a UI prototype; the action form and backend operation will be added after the screen design is approved.`
    );
  }

  openTeamFocusModal(): void {
    this.openModal(
      'FO Team',
      'Front Office team roster and HOD view will open here when connected to staff and task APIs.'
    );
  }

  openModal(title: string, html: string): void {
    this.modalTitle = title;
    this.modalHtml = html;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
