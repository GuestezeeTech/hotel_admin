import { DepartmentCard, EscalationRow, TodayDepartmentPanels } from './hotel-overview-dashboard.service';

export type OverviewExportData = {
  selectedPeriod: string;
  kpis: { label: string; value: string; note: string }[];
  revenueTotal: string;
  revenueLegend: { name: string; amount: string; pct: string }[];
  departments: DepartmentCard[];
  offerSummary: { totalOffers: number; activeOffers: number; offersSold: number; conversion: string; revenue: string };
  offerItems: { name: string; amount: string }[];
  todayPanels: TodayDepartmentPanels;
  revenueTrend: { subtitle: string; dates: string[]; legend: string[] };
  escalations: EscalationRow[];
  insights: string[];
  focusAreas: string[];
};

const INR_FORMAT = '[$₹-4009]#,##0.00';
const BRAND = 'FF800020';

/** "₹1,23,456.50" -> 123456.5. Text that is not an amount (such as "—") is kept as it is. */
function amountOf(text: string): number | string {
  const digits = String(text ?? '').replace(/[^0-9.-]/g, '');
  return digits && !isNaN(Number(digits)) ? Number(digits) : text;
}

/** "58%" -> 0.58, for Excel's percent format. */
function percentOf(text: string): number | string {
  const value = amountOf(text);
  return typeof value === 'number' ? value / 100 : text;
}

function addSheet(workbook: any, name: string, title: string): any {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow([title]).font = { bold: true, size: 14 };
  sheet.addRow([]);
  return sheet;
}

function addHeader(sheet: any, headers: string[]): void {
  const row = sheet.addRow(headers);
  row.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  });
}

/** Column widths from the table cells; the long title row is left out. */
function fitColumns(sheet: any): void {
  sheet.columns.forEach((column: any) => {
    let longest = 10;
    column.eachCell({ includeEmpty: false }, (cell: any) => {
      if (Number(cell.row) > 1) {
        longest = Math.max(longest, String(cell.text ?? '').length);
      }
    });
    column.width = Math.min(longest + 3, 70);
  });
}

/** One sheet per dashboard section. Takes the ExcelJS module, so it runs outside the browser too. */
export function buildOverviewWorkbook(ExcelJS: any, data: OverviewExportData): any {
  const workbook = new ExcelJS.Workbook();

  const summary = addSheet(workbook, 'Summary', 'Hotel Overview');
  addHeader(summary, ['Metric', 'Value', 'Details']);
  data.kpis.forEach((kpi) => {
    const row = summary.addRow([kpi.label, amountOf(kpi.value), kpi.note]);
    if (kpi.value.includes('₹')) {
      row.getCell(2).numFmt = INR_FORMAT;
    }
  });
  fitColumns(summary);

  const revenue = addSheet(
    workbook, 'Revenue Breakdown', `Revenue Breakdown - Total ${data.revenueTotal} - ${data.selectedPeriod}`
  );
  addHeader(revenue, ['Source', 'Amount', 'Share']);
  data.revenueLegend.forEach((item) => {
    const row = revenue.addRow([item.name, amountOf(item.amount), percentOf(item.pct)]);
    row.getCell(2).numFmt = INR_FORMAT;
    row.getCell(3).numFmt = '0%';
  });
  fitColumns(revenue);

  const departments = addSheet(workbook, 'Department Overview', 'Department Overview');
  addHeader(departments, ['Department', 'Total', 'Measure', 'Completed', 'Pending', 'Escalated', 'Timing']);
  data.departments.forEach((dept) => {
    departments.addRow([
      dept.name, dept.total, dept.totalLabel, dept.completed, dept.pending, dept.escalated,
      String(dept.extra ?? '').replace(/　/g, ': ')
    ]);
  });
  fitColumns(departments);

  const offers = addSheet(workbook, 'Upselling & Offers', 'Upselling / Offers Performance');
  addHeader(offers, ['Metric', 'Value']);
  offers.addRow(['Total Offers', data.offerSummary.totalOffers]);
  offers.addRow(['Active Offers', data.offerSummary.activeOffers]);
  offers.addRow(['Offers Sold', data.offerSummary.offersSold]);
  offers.addRow(['Conversion', percentOf(data.offerSummary.conversion)]).getCell(2).numFmt = '0%';
  offers.addRow(['Revenue', amountOf(data.offerSummary.revenue)]).getCell(2).numFmt = INR_FORMAT;
  offers.addRow([]);
  addHeader(offers, ['Offer', 'Revenue']);
  data.offerItems.forEach((item) => {
    offers.addRow([item.name, amountOf(item.amount)]).getCell(2).numFmt = INR_FORMAT;
  });
  fitColumns(offers);

  const panels = [
    { name: 'F&B', panel: data.todayPanels.fnb },
    { name: 'Housekeeping', panel: data.todayPanels.hk },
    { name: 'Front Office', panel: data.todayPanels.fo }
  ];
  const today = addSheet(workbook, 'Today Status', `Today - ${data.todayPanels.dateLabel}`);
  addHeader(today, ['Department', 'Total', 'Completed', 'Completed %', 'Pending', 'Pending %', 'Cancelled / Escalated', 'Type', 'Cancelled / Escalated %']);
  panels.forEach(({ name, panel }) => {
    const row = today.addRow([
      name, panel.total, panel.completed, panel.completedPct / 100, panel.pending, panel.pendingPct / 100,
      panel.thirdCount, panel.thirdLabel, panel.thirdPct / 100
    ]);
    [4, 6, 9].forEach((column) => row.getCell(column).numFmt = '0%');
  });
  today.addRow([]);
  addHeader(today, ['Department', 'Service', 'Requests today']);
  const serviceRows = panels.flatMap(({ name, panel }) =>
    panel.serviceBars.map((bar) => [name, bar.label, bar.count]));
  if (serviceRows.length) {
    serviceRows.forEach((row) => today.addRow(row));
  } else {
    today.addRow(['No services today']);
  }
  fitColumns(today);

  const trend = addSheet(workbook, 'Revenue Trend', `Revenue Trend - ${data.revenueTrend.subtitle}`);
  addHeader(trend, ['Chart dates']);
  data.revenueTrend.dates.forEach((date) => trend.addRow([date]));
  trend.addRow([]);
  addHeader(trend, ['Chart series']);
  data.revenueTrend.legend.forEach((name) => trend.addRow([name]));
  fitColumns(trend);

  const escalations = addSheet(workbook, 'Recent Escalations', 'Recent Escalations');
  addHeader(escalations, ['Date & Time', 'Department', 'Request ID', 'Details', 'Status', 'ETA/Delay']);
  if (data.escalations.length) {
    data.escalations.forEach((row) => {
      escalations.addRow([row.datetime, row.dept, row.id, row.details, row.status, row.eta]);
    });
  } else {
    escalations.addRow(['No recent escalations']);
  }
  fitColumns(escalations);

  const insights = addSheet(workbook, 'Insights & Focus', 'Quick Actions / Insights');
  addHeader(insights, ['Insight']);
  data.insights.forEach((text) => insights.addRow([text]));
  insights.addRow([]);
  addHeader(insights, ['Focus Areas for GM - Priority actions']);
  data.focusAreas.forEach((text, index) => insights.addRow([`${index + 1}. ${text}`]));
  fitColumns(insights);

  return workbook;
}

/** ExcelJS is large, so it loads only when someone downloads. */
export async function downloadOverviewWorkbook(data: OverviewExportData): Promise<void> {
  const module: any = await import('exceljs');
  const workbook = buildOverviewWorkbook(module.default ?? module, data);
  const buffer = await workbook.xlsx.writeBuffer();

  const url = URL.createObjectURL(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }));
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `Hotel_Overview_${date}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
