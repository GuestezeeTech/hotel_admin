/**
 * Turns what a dashboard view shows on screen into a workbook:
 *  - "Summary" sheet: every visible card, KPI and list, in reading order (headings in bold)
 *  - one sheet per visible table, named after the heading above it
 * Buttons, inputs, icons, the period picker and anything marked [data-export-ignore] are left out.
 */

const SKIP_SELECTOR = [
  'button', 'input', 'select', 'textarea', 'svg', 'canvas', 'script', 'style', 'img',
  'app-dashboard-export', 'app-dashboard-period-controls', 'app-dashboard-refresh', 'app-alerts',
  '[data-export-ignore]', '[aria-hidden="true"]', '.ds-block'
].join(',');

const HEADING = /^H[1-6]$/;
const INR_FORMAT = '[$₹-4009]#,##0.00';
const BRAND = 'FF800020';

type Cell = string | number;
type SummaryRow = { cells: Cell[]; kind: 'heading' | 'text' | 'table-ref' };
type TableData = { name: string; header: string[]; rows: Cell[][] };

function isSkipped(el: Element): boolean {
  return el.matches(SKIP_SELECTOR);
}

function isVisible(el: Element): boolean {
  if (!(el as HTMLElement).getClientRects || el.getClientRects().length === 0) {
    return false;
  }
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

function clean(text: string | null | undefined): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/** Visible text of an element, leaving out buttons, icons and other skipped parts. */
function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  const el = node as Element;
  if (isSkipped(el)) {
    return '';
  }
  let out = '';
  el.childNodes.forEach((child) => {
    const piece = textOf(child);
    if (piece) {
      out += (out && !/\s$/.test(out) && !/^\s/.test(piece) && child.nodeType === Node.ELEMENT_NODE ? ' ' : '') + piece;
    }
  });
  return out;
}

function isInline(el: Element): boolean {
  return getComputedStyle(el).display.startsWith('inline');
}

function hasBlockDescendant(el: Element): boolean {
  for (const child of Array.from(el.children)) {
    if (isSkipped(child) || !isVisible(child)) {
      continue;
    }
    if (!isInline(child) || hasBlockDescendant(child)) {
      return true;
    }
  }
  return false;
}

/** "₹1,23,456.50" / "1,234" / "45%" become real numbers so Excel can sum and sort them. */
export function toCell(text: string): { value: Cell; format?: string } {
  const t = clean(text);
  // IDs, phone numbers and codes stay text (leading zeros, very long digit runs)
  const looksLikeId = /^0\d/.test(t) || t.replace(/\D/g, '').length > 12;
  if (!looksLikeId && /^-?[\d,]+(\.\d+)?$/.test(t) && /\d/.test(t)) {
    return { value: Number(t.replace(/,/g, '')) };
  }
  const money = t.match(/^(-?)₹\s?([\d,]+(\.\d+)?)$/);
  if (money) {
    return { value: Number(money[1] + money[2].replace(/,/g, '')), format: INR_FORMAT };
  }
  const percent = t.match(/^(-?\d+(\.\d+)?)\s?%$/);
  if (percent) {
    return { value: Number(percent[1]) / 100, format: '0%' };
  }
  return { value: t };
}

function headingFor(table: Element, root: Element): string {
  let node: Element | null = table.parentElement;
  while (node && node !== root.parentElement) {
    const headings = Array.from(node.querySelectorAll('h1,h2,h3,h4,h5,h6,.card-title,.panel-title'))
      .filter((h) => !h.closest('table') && isVisible(h)
        && (h.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (headings.length) {
      return clean(textOf(headings[headings.length - 1]));
    }
    node = node.parentElement;
  }
  return '';
}

function readTable(table: HTMLTableElement): { header: string[]; rows: Cell[][] } {
  const rows = Array.from(table.rows).filter((tr) => isVisible(tr));
  const headRows = rows.filter((tr) => tr.parentElement?.tagName === 'THEAD');
  const bodyRows = rows.filter((tr) => tr.parentElement?.tagName !== 'THEAD');
  const expand = (tr: HTMLTableRowElement): string[] =>
    Array.from(tr.cells).flatMap((cell) => {
      const text = clean(textOf(cell));
      return [text, ...Array(Math.max(0, cell.colSpan - 1)).fill('')];
    });

  let header = headRows.length ? expand(headRows[headRows.length - 1]) : [];
  let body = bodyRows;
  if (!header.length && bodyRows.length && Array.from(bodyRows[0].cells).every((c) => c.tagName === 'TH')) {
    header = expand(bodyRows[0]);
    body = bodyRows.slice(1);
  }
  let rowsOut = body.map((tr) => expand(tr)).filter((r) => r.some((c) => c !== ''));
  // Drop columns with no data at all, such as an "Action" column of buttons
  const width = Math.max(header.length, ...rowsOut.map((r) => r.length));
  const keep = Array.from({ length: width }, (_, i) => i).filter((i) =>
    rowsOut.some((r) => (r[i] ?? '') !== '') || ((header[i] ?? '') !== '' && !/^actions?$/i.test(header[i])));
  header = header.length ? keep.map((i) => header[i] ?? '') : header;
  rowsOut = rowsOut.map((r) => keep.map((i) => r[i] ?? ''));
  return { header, rows: rowsOut as Cell[][] };
}

/** A label row followed by a lone number ("Completed" / "42") becomes one row: Completed | 42. */
function pairLabels(rows: SummaryRow[]): SummaryRow[] {
  const out: SummaryRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const next = rows[i + 1];
    if (row.kind === 'text' && row.cells.length === 1 && next?.kind === 'text' && next.cells.length === 1
      && typeof toCell(String(row.cells[0])).value === 'string'
      && typeof toCell(String(next.cells[0])).value === 'number') {
      out.push({ kind: 'text', cells: [row.cells[0], next.cells[0]] });
      i++;
      continue;
    }
    out.push(row);
  }
  return out;
}

/** Reads everything the view shows into plain rows and tables. */
export function readDashboard(root: HTMLElement): { summary: SummaryRow[]; tables: TableData[] } {
  const summary: SummaryRow[] = [];
  const tables: TableData[] = [];
  const usedNames = new Set<string>(['summary']);
  let pending: string[] = [];

  const flush = () => {
    const cells = pending.map(clean).filter(Boolean);
    pending = [];
    if (!cells.length) {
      return;
    }
    const last = summary[summary.length - 1];
    if (last && last.cells.join('|') === cells.join('|')) {
      return;
    }
    summary.push({ cells, kind: 'text' });
  };

  const sheetName = (wanted: string): string => {
    const base = (clean(wanted).replace(/[\\/?*[\]:]/g, ' ').trim() || `Table ${tables.length + 1}`).slice(0, 28);
    let name = base;
    let n = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = `${base.slice(0, 26)} ${n++}`;
    }
    usedNames.add(name.toLowerCase());
    return name;
  };

  const walk = (el: Element) => {
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        if (clean(child.textContent)) {
          pending.push(child.textContent ?? '');
        }
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const node = child as Element;
      if (isSkipped(node) || !isVisible(node)) {
        return;
      }
      if (node.tagName === 'TABLE') {
        flush();
        const data = readTable(node as HTMLTableElement);
        if (data.header.length || data.rows.length) {
          const name = sheetName(headingFor(node, root));
          tables.push({ name, ...data });
          summary.push({ cells: [`Table: ${name} (${data.rows.length} rows, see the "${name}" sheet)`], kind: 'table-ref' });
        }
        return;
      }
      if (HEADING.test(node.tagName)) {
        flush();
        const text = clean(textOf(node));
        if (text) {
          summary.push({ cells: [text], kind: 'heading' });
        }
        return;
      }
      if (isInline(node) && !hasBlockDescendant(node)) {
        const text = textOf(node);
        if (clean(text)) {
          pending.push(text);
        }
        return;
      }
      flush();
      walk(node);
      flush();
    });
  };

  walk(root);
  flush();
  return { summary: pairLabels(summary), tables };
}

function styleHeader(row: any): void {
  row.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  });
}

function addTypedRow(sheet: any, cells: Cell[]): any {
  const typed = cells.map((c) => (typeof c === 'number' ? { value: c } : toCell(String(c))));
  const row = sheet.addRow(typed.map((t) => t.value));
  typed.forEach((t, i) => {
    if (t.format) {
      row.getCell(i + 1).numFmt = t.format;
    }
  });
  return row;
}

function fitColumns(sheet: any, skipRows = 1): void {
  sheet.columns.forEach((column: any) => {
    let longest = 10;
    column.eachCell({ includeEmpty: false }, (cell: any) => {
      if (Number(cell.row) > skipRows) {
        longest = Math.max(longest, String(cell.text ?? '').length);
      }
    });
    column.width = Math.min(longest + 3, 60);
  });
}

/** Builds the workbook. Takes the ExcelJS module so it can run outside the browser too. */
export function buildDashboardWorkbook(
  ExcelJS: any,
  data: { summary: SummaryRow[]; tables: TableData[] },
  meta: { title: string; period?: string; generatedAt: string }
): any {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Summary');
  summary.addRow([meta.title]).font = { bold: true, size: 14 };
  if (meta.period) {
    summary.addRow([`Period: ${meta.period}`]);
  }
  summary.addRow([`Generated: ${meta.generatedAt}`]).font = { italic: true, color: { argb: 'FF666666' } };
  summary.addRow([]);

  data.summary.forEach((row) => {
    if (row.kind === 'heading') {
      if (summary.lastRow?.values?.length) {
        summary.addRow([]);
      }
      const r = summary.addRow(row.cells);
      r.font = { bold: true, size: 12, color: { argb: BRAND } };
      return;
    }
    const r = addTypedRow(summary, row.cells);
    if (row.kind === 'table-ref') {
      r.font = { italic: true, color: { argb: 'FF666666' } };
    }
  });
  if (!data.summary.length) {
    summary.addRow(['Nothing to show for this view']);
  }
  fitColumns(summary, 3);
  summary.getColumn(1).width = Math.max(summary.getColumn(1).width ?? 10, 30);

  data.tables.forEach((table) => {
    const sheet = workbook.addWorksheet(table.name);
    sheet.addRow([table.name]).font = { bold: true, size: 14 };
    sheet.addRow([]);
    if (table.header.length) {
      styleHeader(sheet.addRow(table.header));
    }
    if (table.rows.length) {
      table.rows.forEach((cells) => addTypedRow(sheet, cells));
    } else {
      sheet.addRow(['No records']);
    }
    fitColumns(sheet);
  });

  return workbook;
}
