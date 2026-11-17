import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
  /** Hotel already approved for Go Live by the superadmin */
  isLive = false;

  constructor(
    private setupProgress: SetupProgressService,
    private localService: LocalStorageService,
    private router: Router
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

  /**
   * Onboarding "Set up": open the registration page (if not already on it) and scroll
   * to its tabs (#onboarding-tabs), which sit below this card.
   */
  openOnboarding(step: SetupStep, event: MouseEvent): void {
    event.preventDefault();
    const currentPath = this.router.url.split(/[?#]/)[0];
    const opened = currentPath === step.route ? Promise.resolve(true) : this.router.navigateByUrl(step.route);
    opened.then(() => this.scrollToOnboardingTabs());
  }

  /** The tabs render only after the page has loaded the hotel, so wait for them (up to ~6s) */
  private scrollToOnboardingTabs(tries = 0): void {
    const tabs = document.getElementById('onboarding-tabs');
    if (tabs) {
      tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (tries < 40) {
      setTimeout(() => this.scrollToOnboardingTabs(tries + 1), 150);
    }
  }

  refresh(memberId =this.localService.get('MemberId') as string): void {
    this.loading = true;
    this.failed = false;
    this.setupProgress.load(memberId)
      .then((steps) => {
        this.steps = steps;
        this.isLive = this.setupProgress.lastLoadWasLive;
        // Once everything is done, start collapsed to keep the page tidy
        this.expanded = !this.complete;
      })
      .catch(() => (this.failed = true))
      .finally(() => (this.loading = false));
  }
}
