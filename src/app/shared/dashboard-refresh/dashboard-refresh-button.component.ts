import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';

export type DashboardRefreshSource = 'manual' | 'auto';

@Component({
  selector: 'app-dashboard-refresh',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-refresh-button.component.html',
  styleUrl: './dashboard-refresh-button.component.scss'
})
export class DashboardRefreshButtonComponent implements OnInit, OnChanges, OnDestroy {
  /** Parent sets true while data reload is in progress. */
  @Input() refreshing = false;
  /** Auto refresh interval (ms). Default 1 minute. */
  @Input() intervalMs = 60_000;
  @Input() disabled = false;
  @Input() title = 'Refresh';

  @Output() refresh = new EventEmitter<DashboardRefreshSource>();

  spinning = false;
  private autoTimer: ReturnType<typeof setInterval> | null = null;
  private spinStopTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.startAutoRefresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshing']) {
      if (this.refreshing) {
        this.spinning = true;
        this.clearSpinStop();
      } else if (this.spinning) {
        // Keep a short spin so quick responses still show motion
        this.clearSpinStop();
        this.spinStopTimer = setTimeout(() => {
          this.spinning = false;
          this.spinStopTimer = null;
        }, 450);
      }
    }
    if (changes['intervalMs'] && !changes['intervalMs'].firstChange) {
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.clearSpinStop();
  }

  onClick(event?: Event): void {
    event?.stopPropagation();
    if (this.disabled || this.refreshing) {
      return;
    }
    this.spinning = true;
    this.refresh.emit('manual');
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    const ms = Math.max(5_000, Number(this.intervalMs) || 60_000);
    this.autoTimer = setInterval(() => {
      if (this.disabled || this.refreshing) {
        return;
      }
      this.spinning = true;
      this.refresh.emit('auto');
    }, ms);
  }

  private stopAutoRefresh(): void {
    if (this.autoTimer != null) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  private clearSpinStop(): void {
    if (this.spinStopTimer != null) {
      clearTimeout(this.spinStopTimer);
      this.spinStopTimer = null;
    }
  }
}
