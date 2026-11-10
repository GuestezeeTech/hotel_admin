import { DepartmentCard, EscalationRow, TodayDepartmentPanels } from './hotel-overview-dashboard.service';

/** Everything the Hotel Overview home view shows, in plain values. */
export type OverviewExportData = {
  periodLabel: string;
  kpis: { label: string; value: string; note: string }[];
  revenueTotal: string;
  revenueLegend: { name: string; amount: string; pct: string }[];
  departments: DepartmentCard[];
  upsell: {
    totalOffers: number;
    offersSold: number;
    conversionPct: number;
    revenueLabel: string;
    items: { name: string; amount: string; count: number }[];
  };
  todayPanels: TodayDepartmentPanels;
  foKeyServices: { label: string; value: number }[];
  revenueTrend: { label: string; count: number; amount: number }[];
  appRevenue: {
    count: number;
    gross: number;
    discount: number;
    net: number;
    aov: number;
    byPurpose: { label: string; count: number; amount: number }[];
  };
  escalations: EscalationRow[];
  staff: { name: string; employeeId: string; department: string }[];
  guestSatisfaction: {
    total: number;
    averageRating: number;
    positive: number;
    positivePct: number;
    negative: number;
    withEscalation: number;
    withDelay: number;
  };
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

/** Adds rows, or a single "none" row when the list is empty. */
function addRows(sheet: any, rows: any[][], empty: string): void {
  if (rows.length) {
    rows.forEach((row) => sheet.addRow(row));
  } else {
    sheet.addRow([empty]);
  }
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

function inr(row: any, ...columns: number[]): void {
  columns.forEach((c) => (row.getCell(c).numFmt = INR_FORMAT));
}

function pct(row: any, ...columns: number[]): void {
  columns.forEach((c) => (row.getCell(c).numFmt = '0%'));
}

/** One sheet per dashboard section. Takes the ExcelJS module, so it runs outside the browser too. */
export function buildOverviewWorkbook(ExcelJS: any, data: OverviewExportData): any {
  const workbook = new ExcelJS.Workbook();
  const period = data.periodLabel || '';

  // Summary
  const summary = addSheet(workbook, 'Summary', `Hotel Overview - ${period}`);
  addHeader(summary, ['Metric', 'Value', 'Details']);
  data.kpis.forEach((kpi) => {
    const row = summary.addRow([kpi.label, amountOf(kpi.value), kpi.note]);
    if (String(kpi.value).includes('₹')) {
      inr(row, 2);
    }
  });
  fitColumns(summary);

  // Revenue Breakdown
  const revenue = addSheet(workbook, 'Revenue Breakdown', `Revenue Breakdown - Total ${data.revenueTotal} - Order Confirmed - ${period}`);
  addHeader(revenue, ['Source', 'Amount', 'Share']);
  data.revenueLegend.forEach((item) => {
    const row = revenue.addRow([item.name, amountOf(item.amount), percentOf(item.pct)]);
    inr(row, 2);
    pct(row, 3);
  });
  fitColumns(revenue);

  // Department Overview
  const departments = addSheet(workbook, 'Department Overview', 'Department Overview');
  addHeader(departments, ['Department', 'Total', 'Measure', 'Completed / Delivered', 'Pending', 'Escalated', 'Timing']);
  data.departments.forEach((dept) => {
    departments.addRow([
      dept.name, dept.total, dept.totalLabel, dept.completed, dept.pending, dept.escalated,
      String(dept.extra ?? '').replace(/　/g, ': ')
    ]);
  });
  fitColumns(departments);

  // Upselling / Offers Performance
  const upsell = addSheet(workbook, 'Upselling', `Upselling / Offers Performance - ${period}`);
  addHeader(upsell, ['Metric', 'Value']);
  upsell.addRow(['Total Upsells (catalog)', data.upsell.totalOffers]);
  upsell.addRow(['Upsells Sold', data.upsell.offersSold]);
  pct(upsell.addRow(['Conversion', (Number(data.upsell.conversionPct) || 0) / 100]), 2);
  inr(upsell.addRow(['Upsell Revenue', amountOf(data.upsell.revenueLabel)]), 2);
  upsell.addRow([]);
  addHeader(upsell, ['Upsell', 'Orders', 'Revenue']);
  addRows(upsell, data.upsell.items.map((item) => [item.name, item.count, amountOf(item.amount)]), 'No confirmed upsell orders');
  upsell.eachRow((row: any, n: number) => {
    if (n > 9 && typeof row.getCell(3).value === 'number') {
      inr(row, 3);
    }
  });
  fitColumns(upsell);

  // Department status (F&B, Housekeeping, Front Office)
  const panels = [
    { name: 'F&B', panel: data.todayPanels.fnb },
    { name: 'Housekeeping', panel: data.todayPanels.hk },
    { name: 'Front Office', panel: data.todayPanels.fo }
  ];
  const status = addSheet(workbook, 'Department Status', `Department Status - ${period}`);
  addHeader(status, ['Department', 'Total', 'Completed', 'Completed %', 'Pending', 'Pending %', 'Cancelled / Escalated', 'Type', 'Cancelled / Escalated %']);
  panels.forEach(({ name, panel }) => {
    pct(status.addRow([
      name, panel.total, panel.completed, panel.completedPct / 100, panel.pending, panel.pendingPct / 100,
      panel.thirdCount, panel.thirdLabel, panel.thirdPct / 100
    ]), 4, 6, 9);
  });
  status.addRow([]);
  addHeader(status, ['Department', 'Service', 'Requests']);
  addRows(status, panels.flatMap(({ name, panel }) => panel.serviceBars.map((bar) => [name, bar.label, bar.count])), 'No services for this period');
  status.addRow([]);
  addHeader(status, ['Front Office Key Service', 'Count']);
  addRows(status, data.foKeyServices.map((s) => [s.label, s.value]), 'No key services');
  fitColumns(status);

  // Revenue Trend
  const trend = addSheet(workbook, 'Revenue Trend', 'Revenue Trend - last 6 months (Food + Upsell confirmed orders)');
  addHeader(trend, ['Month', 'Orders', 'Amount']);
  addRows(trend, data.revenueTrend.map((m) => [m.label, m.count, m.amount]), 'No monthly order data');
  trend.eachRow((row: any, n: number) => {
    if (n > 3 && typeof row.getCell(3).value === 'number') {
      inr(row, 3);
    }
  });
  fitColumns(trend);

  // App Revenue
  const app = addSheet(workbook, 'App Revenue', `App Revenue - ${period}`);
  addHeader(app, ['Metric', 'Value']);
  app.addRow(['Orders', data.appRevenue.count]);
  inr(app.addRow(['Gross Revenue', data.appRevenue.gross]), 2);
  inr(app.addRow(['Discount', data.appRevenue.discount]), 2);
  inr(app.addRow(['Net Revenue', data.appRevenue.net]), 2);
  inr(app.addRow(['Average Order Value', data.appRevenue.aov]), 2);
  app.addRow([]);
  addHeader(app, ['Purpose', 'Orders', 'Amount']);
  addRows(app, data.appRevenue.byPurpose.map((p) => [p.label, p.count, p.amount]), 'No app orders for this period');
  app.eachRow((row: any, n: number) => {
    if (n > 10 && typeof row.getCell(3).value === 'number') {
      inr(row, 3);
    }
  });
  fitColumns(app);

  // Escalations
  const escalations = addSheet(workbook, 'Escalations', 'Escalations');
  addHeader(escalations, ['Order ID', 'Date & Time', 'Department', 'Details / Room', 'Status', 'ETA / Delay']);
  addRows(escalations, data.escalations.map((r) => [r.orderId, r.datetime, r.dept, r.details, r.status, r.eta]), 'No escalation history');
  fitColumns(escalations);

  // Staff
  const staff = addSheet(workbook, 'Staff', 'Staff');
  addHeader(staff, ['Name', 'Employee ID', 'Department']);
  addRows(staff, data.staff.map((s) => [s.name, s.employeeId, s.department]), 'No staff loaded');
  fitColumns(staff);

  // Guest Satisfaction
  const gs = data.guestSatisfaction;
  const satisfaction = addSheet(workbook, 'Guest Satisfaction', `Guest Satisfaction - ${period}`);
  addHeader(satisfaction, ['Metric', 'Value']);
  satisfaction.addRow(['Reviews', gs.total]);
  satisfaction.addRow(['Average Rating (out of 5)', Number((Number(gs.averageRating) || 0).toFixed(1))]);
  satisfaction.addRow(['Positive (4-5 stars)', gs.positive]);
  pct(satisfaction.addRow(['Positive Share', (Number(gs.positivePct) || 0) / 100]), 2);
  satisfaction.addRow(['Low Ratings (1-2 stars)', gs.negative]);
  satisfaction.addRow(['With Escalation', gs.withEscalation]);
  satisfaction.addRow(['With Delay', gs.withDelay]);
  fitColumns(satisfaction);

  // Insights & Focus
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
