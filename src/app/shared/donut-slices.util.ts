export type DonutSliceInput = {
  label: string;
  value: number;
  color: string;
};

export type DonutSliceView = DonutSliceInput & {
  pct: number;
  d: string;
};

/** Build SVG donut slice paths (outer → inner arc) for hoverable charts. */
export function buildDonutSlices(
  items: DonutSliceInput[],
  opts: { cx?: number; cy?: number; r?: number; ir?: number } = {}
): DonutSliceView[] {
  const cx = opts.cx ?? 70;
  const cy = opts.cy ?? 70;
  const r = opts.r ?? 62;
  const ir = opts.ir ?? 38;
  const usable = (items || []).filter((i) => Number(i.value) > 0);
  const total = usable.reduce((sum, i) => sum + Math.max(0, Number(i.value) || 0), 0);

  if (!total) {
    return [];
  }

  let angle = -Math.PI / 2;
  return usable.map((item) => {
    const value = Math.max(0, Number(item.value) || 0);
    const sweep = (value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const pct = Math.round((value / total) * 100);
    return {
      ...item,
      value,
      pct,
      d: donutPath(cx, cy, r, ir, start, end)
    };
  });
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function donutPath(
  cx: number,
  cy: number,
  r: number,
  ir: number,
  start: number,
  end: number
): string {
  const large = end - start > Math.PI ? 1 : 0;
  // Full circle edge case
  if (Math.abs(end - start) >= Math.PI * 2 - 1e-6) {
    const mid = start + Math.PI;
    const [x1, y1] = polar(cx, cy, r, start);
    const [x2, y2] = polar(cx, cy, r, mid);
    const [ix1, iy1] = polar(cx, cy, ir, start);
    const [ix2, iy2] = polar(cx, cy, ir, mid);
    return [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 1 1 ${x2} ${y2}`,
      `A ${r} ${r} 0 1 1 ${x1} ${y1}`,
      `L ${ix1} ${iy1}`,
      `A ${ir} ${ir} 0 1 0 ${ix2} ${iy2}`,
      `A ${ir} ${ir} 0 1 0 ${ix1} ${iy1}`,
      'Z'
    ].join(' ');
  }

  const [ox1, oy1] = polar(cx, cy, r, start);
  const [ox2, oy2] = polar(cx, cy, r, end);
  const [ix2, iy2] = polar(cx, cy, ir, end);
  const [ix1, iy1] = polar(cx, cy, ir, start);
  return [
    `M ${ox1} ${oy1}`,
    `A ${r} ${r} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1}`,
    'Z'
  ].join(' ');
}
