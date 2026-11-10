import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { AlertsService } from '../alerts/alerts.service';
import { buildDashboardWorkbook, readDashboard } from './dashboard-dom-export';

/**
 * "Report" (PDF of the view on screen) and "Download Excel" buttons for dashboards.
 * Place it in a view's header; it exports the element marked [data-export-root] around it,
 * else the nearest <section>, else `target`.
 */
@Component({
  selector: 'app-dashboard-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" class="dx-btn dx-btn--report" [disabled]="disabled || !!busy" (click)="downloadReport()"
      title="Download this view as a PDF report">
      <i class="bi bi-file-earmark-pdf" aria-hidden="true"></i>
      {{ busy === 'pdf' ? 'Preparing…' : 'Report' }}
    </button>
    <button type="button" class="dx-btn dx-btn--excel" [disabled]="disabled || !!busy || excelBusy" (click)="downloadExcel()"
      title="Download the data on this view as an Excel file">
      <i class="bi bi-file-earmark-spreadsheet" aria-hidden="true"></i>
      {{ busy === 'excel' || excelBusy ? 'Downloading…' : 'Download Excel' }}
    </button>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto; flex-wrap: wrap; }
    .dx-btn {
      display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 8px 14px;
      font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer; line-height: 1.2;
      transition: background-color .2s ease, color .2s ease;
    }
    .dx-btn--report { background: #fff; color: #800020; border: 1px solid #800020; }
    .dx-btn--report:hover:not(:disabled) { background: #fbeef1; }
    .dx-btn--excel { background: #800020; color: #fff; border: 1px solid #800020; }
    .dx-btn--excel:hover:not(:disabled) { background: #66001a; }
    .dx-btn:disabled { opacity: .6; cursor: not-allowed; }
  `]
})
export class DashboardExportComponent {
  /** Name used for the file and the report title. */
  @Input() title = 'Dashboard';
  /** Element to export; defaults to [data-export-root] / the nearest <section> around the buttons. */
  @Input() target?: HTMLElement | null;
  /** When true, "Download Excel" only emits (excel) so the page can build its own workbook. */
  @Input() customExcel = false;
  @Input() excelBusy = false;
  @Input() disabled = false;

  @Output() excel = new EventEmitter<void>();

  busy: 'pdf' | 'excel' | null = null;

  constructor(private host: ElementRef<HTMLElement>, private alerts: AlertsService) {}

  private root(): HTMLElement {
    const el = this.host.nativeElement;
    return this.target
      || el.closest<HTMLElement>('[data-export-root]')
      || el.closest<HTMLElement>('section')
      || el.parentElement
      || document.body;
  }

  /** Period picked in the view's period controls, if it has them. */
  private periodLabel(root: HTMLElement): string {
    const controls = root.querySelector('app-dashboard-period-controls');
    if (!controls) {
      return '';
    }
    const select = controls.querySelector('select') as HTMLSelectElement | null;
    const label = select?.selectedOptions?.[0]?.textContent?.trim() ?? '';
    const dates = Array.from(controls.querySelectorAll<HTMLInputElement>('input[type="date"]'))
      .map((i) => i.value).filter(Boolean);
    return dates.length === 2 ? `${label} (${dates[0]} to ${dates[1]})` : label;
  }

  private fileBase(): string {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return `${(this.title || 'Dashboard').replace(/[^\w&-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}_${date}`;
  }

  private fail(what: string, err: unknown): void {
    console.error(`${what} failed`, err);
    this.alerts.error(`Unable to download the ${what}. Please try again.`, { autoClose: true, keepAfterRouteChange: false });
  }

  async downloadExcel(): Promise<void> {
    if (this.customExcel) {
      this.excel.emit();
      return;
    }
    if (this.busy) {
      return;
    }
    this.busy = 'excel';
    try {
      const root = this.root();
      const data = readDashboard(root);
      const module: any = await import('exceljs');
      const workbook = buildDashboardWorkbook(module.default ?? module, data, {
        title: this.title,
        period: this.periodLabel(root),
        generatedAt: new Date().toLocaleString('en-IN')
      });
      const buffer = await workbook.xlsx.writeBuffer();
      this.save(new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }), `${this.fileBase()}.xlsx`);
    } catch (err) {
      this.fail('Excel file', err);
    } finally {
      this.busy = null;
    }
  }

  async downloadReport(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = 'pdf';
    const root = this.root();
    root.classList.add('dashboard-exporting');
    try {
      const module: any = await import('html2pdf.js');
      const html2pdf = module.default ?? module;
      const title = this.title;
      const period = this.periodLabel(root);
      const generated = new Date().toLocaleString('en-IN');
      await html2pdf()
        .set({
          margin: [8, 8, 12, 8],
          filename: `${this.fileBase()}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: Math.max(root.scrollWidth, 1100),
            ignoreElements: (el: Element) =>
              !!el.matches?.('app-dashboard-export, app-dashboard-refresh, [data-export-ignore], .back-link')
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(root)
        .toPdf()
        .get('pdf')
        .then((pdf: any) => {
          const pages = pdf.internal.getNumberOfPages();
          const width = pdf.internal.pageSize.getWidth();
          const height = pdf.internal.pageSize.getHeight();
          pdf.setFontSize(8);
          pdf.setTextColor(120);
          for (let i = 1; i <= pages; i++) {
            pdf.setPage(i);
            pdf.text(`${title}${period ? ' · ' + period : ''} · Generated ${generated}`, 8, height - 5);
            pdf.text(`Page ${i} of ${pages}`, width - 8, height - 5, { align: 'right' });
          }
        })
        .save();
    } catch (err) {
      this.fail('report', err);
    } finally {
      root.classList.remove('dashboard-exporting');
      this.busy = null;
    }
  }

  private save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
