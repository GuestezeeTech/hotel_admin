import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { SetupProgressService, SetupStep } from './setup-progress.service';

/** Bar plus checklist of how much of the hotel setup is done. Hotel owners only. */
@Component({
  selector: 'app-setup-progress',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './setup-progress.component.html',
  styleUrl: './setup-progress.component.scss'
})
export class SetupProgressComponent implements OnInit {
  steps: SetupStep[] = [];
  loading = true;
  failed = false;
  expanded = true;
  visible = false;

  constructor(
    private setupProgress: SetupProgressService,
    private localService: LocalStorageService
  ) {}

  get doneCount(): number {
    return this.steps.filter(s => s.done === true).length;
  }

  get percent(): number {
    return this.steps.length ? Math.round((this.doneCount / this.steps.length) * 100) : 0;
  }

  get complete(): boolean {
    return this.steps.length > 0 && this.doneCount === this.steps.length;
  }

  ngOnInit(): void {
    const memberId = this.localService.get('MemberId');
    this.visible = this.localService.get('CustomerType') === 'Customer' && !!memberId && memberId !== 'undefined';
    if (this.visible) {
      this.refresh(memberId as string);
    }
  }

  refresh(memberId = this.localService.get('MemberId') as string): void {
    this.loading = true;
    this.failed = false;
    this.setupProgress.load(memberId)
      .then((steps) => {
        this.steps = steps;
        // Once everything is done, start collapsed to keep the page tidy
        this.expanded = !this.complete;
      })
      .catch(() => (this.failed = true))
      .finally(() => (this.loading = false));
  }
}
