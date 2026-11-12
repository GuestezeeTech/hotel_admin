/** Payment Details page -> Excel: a summary sheet plus one sheet per tab. */

export type PaymentExportRow = {
  paymentNo: number;
  orderId: number | string;
  plan: string;
  status: string;
  sub_total: number;
  tax: number;
  order_total_amount: number;
  subscription_end_date: string;
  paid_date_time: string | null;
  invoiceUrl: string;
};

export type PaymentExportData = {
  /** ISO currency code for the amount format, e.g. USD */
  currencyCode?: string;
  summary: { label: string; value: string | number; money?: boolean }[];
  subscription: PaymentExportRow[];
  app: PaymentExportRow[];
};

const MONEY_FORMATS: Record<string, string> = {
  USD: '[$$-409]#,##0.00',
  INR: '[$₹-4009]#,##0.00',
  EUR: '[$€-x-euro2] #,##0.00',
  GBP: '[$£-809]#,##0.00'
};
/** Set per workbook from data.currencyCode */
let moneyFormat = MONEY_FORMATS['USD'];
const BRAND = 'FF800020';

function header(sheet: any, titles: string[]): void {
  const row = sheet.addRow(titles);
  row.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  });
}

/** "2026-11-10T09:30:00Z" -> a real date cell; anything unreadable stays as text. */
function dateCell(value: string | null): Date | string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date;
}

function fit(sheet: any): void {
  sheet.columns.forEach((column: any) => {
    let longest = 10;
    column.eachCell({ includeEmpty: false }, (cell: any) => {
      if (Number(cell.row) > 1) {
        longest = Math.max(longest, String(cell.text ?? '').length);
      }
    });
    column.width = Math.min(longest + 3, 50);
  });
}

function paymentSheet(workbook: any, name: string, title: string, rows: PaymentExportRow[], withOrderId: boolean): void {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow([title]).font = { bold: true, size: 14 };
  sheet.addRow([]);
  header(sheet, [
    'Payment', ...(withOrderId ? ['Order ID'] : []), withOrderId ? 'Payment Type' : 'Plan', 'Status',
    'Sub Total', 'Tax', 'Amount', 'Subscription End', 'Paid Date', 'Invoice'
  ]);
  if (!rows.length) {
    sheet.addRow([`No ${name.toLowerCase()} payments yet`]);
    fit(sheet);
    return;
  }
  const first = sheet.rowCount + 1;
  rows.forEach((r) => {
    const row = sheet.addRow([
      r.paymentNo, ...(withOrderId ? [String(r.orderId)] : []), r.plan, r.status,
      r.sub_total, r.tax, r.order_total_amount, r.subscription_end_date || '-', dateCell(r.paid_date_time),
      { text: 'Download invoice', hyperlink: r.invoiceUrl }
    ]);
    const offset = withOrderId ? 1 : 0;
    [4, 5, 6].forEach((c) => (row.getCell(c + offset).numFmt = moneyFormat));
    row.getCell(8 + offset).numFmt = 'dd-mm-yyyy';
    row.getCell(9 + offset).font = { color: { argb: 'FF0563C1' }, underline: true };
  });
  const last = sheet.rowCount;
  const offset = withOrderId ? 1 : 0;
  const total = sheet.addRow([]);
  total.getCell(1).value = 'Total';
  const amounts: [number, (r: PaymentExportRow) => number][] = [
    [4, (r) => r.sub_total], [5, (r) => r.tax], [6, (r) => r.order_total_amount]
  ];
  amounts.forEach(([c, pick]) => {
    const col = sheet.getColumn(c + offset).letter;
    const sum = rows.reduce((s, r) => s + Number(pick(r) || 0), 0);
    total.getCell(c + offset).value = { formula: `SUM(${col}${first}:${col}${last})`, result: Number(sum.toFixed(2)) };
    total.getCell(c + offset).numFmt = moneyFormat;
  });
  total.font = { bold: true };
  fit(sheet);
}

export function buildPaymentWorkbook(ExcelJS: any, data: PaymentExportData): any {
  const code = (data.currencyCode || 'USD').toUpperCase();
  moneyFormat = MONEY_FORMATS[code] ?? `"${code} "#,##0.00`;
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet('Summary');
  summary.addRow(['Payment Details']).font = { bold: true, size: 14 };
  summary.addRow([`Generated: ${new Date().toLocaleString('en-IN')}`]).font = { italic: true, color: { argb: 'FF666666' } };
  summary.addRow([]);
  header(summary, ['Detail', 'Value']);
  data.summary.forEach((item) => {
    const row = summary.addRow([item.label, item.value]);
    if (item.money) {
      row.getCell(2).numFmt = moneyFormat;
    }
  });
  fit(summary);
  summary.getColumn(1).width = Math.max(summary.getColumn(1).width ?? 10, 30);

  paymentSheet(workbook, 'Subscription', 'Subscription Payments', data.subscription, false);
  paymentSheet(workbook, 'Payment from App', 'Payments from the App', data.app, true);
  return workbook;
}

/** ExcelJS loads only when someone downloads. */
export async function downloadPaymentWorkbook(data: PaymentExportData): Promise<void> {
  const module: any = await import('exceljs');
  const buffer = await buildPaymentWorkbook(module.default ?? module, data).xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }));
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `Payment_Details_${date}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
