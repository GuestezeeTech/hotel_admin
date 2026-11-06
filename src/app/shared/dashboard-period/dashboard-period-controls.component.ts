import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DashboardRefreshButtonComponent,
  DashboardRefreshSource
} from '../dashboard-refresh/dashboard-refresh-button.component';
import { DashboardPeriodStateService } from './dashboard-period-state.service';

@Component({
  selector: 'app-dashboard-period-controls',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardRefreshButtonComponent],
  templateUrl: './dashboard-period-controls.component.html',
  styleUrl: './dashboard-period-controls.component.scss'
})
export class DashboardPeriodControlsComponent implements OnInit, OnChanges {
  @Input() selectedPeriod = 'Today';
  @Input() customFrom = '';
  @Input() customTo = '';
  @Input() refreshing = false;
  @Input() disabled = false;

  @Output() selectedPeriodChange = new EventEmitter<string>();
  @Output() customFromChange = new EventEmitter<string>();
  @Output() customToChange = new EventEmitter<string>();
  @Output() periodChange = new EventEmitter<void>();
  @Output() customRangeChange = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<DashboardRefreshSource>();

  /** Draft From/To for Date Range — API hits only when both are set. */
  draftFrom = '';
  draftTo = '';

  constructor(private periodState: DashboardPeriodStateService) {}

  ngOnInit(): void {
    // Prefer shared session period so every dashboard shows the same dates.
    const snap = this.periodState.snapshot();
    this.selectedPeriod = snap.selectedPeriod;
    this.customFrom = snap.customFrom;
    this.customTo = snap.customTo;
    this.syncDraftFromApplied();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customFrom'] || changes['customTo'] || changes['selectedPeriod']) {
      this.syncDraftFromApplied();
    }
  }

  onPeriodModelChange(value: string): void {
    const isRange = value === 'Date Range' || value === 'Custom Range';
    // Date Range always starts with empty From/To on selection.
    const snap = this.periodState.apply(
      value,
      isRange ? '' : this.customFrom,
      isRange ? '' : this.customTo
    );
    this.selectedPeriod = snap.selectedPeriod;
    this.customFrom = snap.customFrom;
    this.customTo = snap.customTo;
    this.syncDraftFromApplied();
    this.emitBindings();
    this.periodChange.emit();
  }

  onParticularDateChange(value: string): void {
    const snap = this.periodState.setCustomRange(value, value);
    this.customFrom = snap.customFrom;
    this.customTo = snap.customTo;
    this.customFromChange.emit(this.customFrom);
    this.customToChange.emit(this.customTo);
    this.customRangeChange.emit();
  }

  onDraftFromChange(value: string): void {
    this.draftFrom = value || '';
    // Selecting/changing From clears To — wait for both before hitting API.
    this.draftTo = '';
    const snap = this.periodState.setCustomRange(this.draftFrom, '');
    this.customFrom = snap.customFrom;
    this.customTo = snap.customTo;
    this.customFromChange.emit(this.customFrom);
    this.customToChange.emit(this.customTo);
  }

  onDraftToChange(value: string): void {
    this.draftTo = value || '';
    if (!this.draftFrom || !this.draftTo) {
      const snap = this.periodState.setCustomRange(this.draftFrom, this.draftTo);
      this.customFrom = snap.customFrom;
      this.customTo = snap.customTo;
      this.customFromChange.emit(this.customFrom);
      this.customToChange.emit(this.customTo);
      return;
    }
    this.commitDateRangeAndRefresh();
  }

  onRefresh(source: DashboardRefreshSource): void {
    this.refresh.emit(source);
  }

  private commitDateRangeAndRefresh(): void {
    let from = this.draftFrom;
    let to = this.draftTo;
    if (from && to && from > to) {
      const tmp = from;
      from = to;
      to = tmp;
      this.draftFrom = from;
      this.draftTo = to;
    }
    const snap = this.periodState.setCustomRange(from, to);
    this.customFrom = snap.customFrom;
    this.customTo = snap.customTo;
    this.syncDraftFromApplied();
    this.customFromChange.emit(this.customFrom);
    this.customToChange.emit(this.customTo);
    // APIs return all docs; apply From–To on the UI after both are set.
    this.customRangeChange.emit();
  }

  private syncDraftFromApplied(): void {
    this.draftFrom = this.customFrom || '';
    this.draftTo = this.customTo || '';
  }

  private emitBindings(): void {
    this.selectedPeriodChange.emit(this.selectedPeriod);
    this.customFromChange.emit(this.customFrom);
    this.customToChange.emit(this.customTo);
  }
}
