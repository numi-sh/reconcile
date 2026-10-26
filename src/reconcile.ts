/** The reconciled band, both ends included: segment revenue over reported revenue from 95% to 105%. */
export const RECONCILED_MIN = 0.95;
export const RECONCILED_MAX = 1.05;

/** The axis key of the rows that carry no axis, in a list where other rows carry one. */
export const UNLABELLED = 'unlabelled';

export type Status = 'reconciled' | 'over' | 'under';
export type Verdict = 'reconciled' | 'mixed_axes_likely' | 'incomplete';

export interface SegmentRow {
  /** The name of the row: a segment, a product line, a region or a reconciling item. */
  name: string;
  /** The revenue of the row, in the unit of `total`. An elimination is negative. */
  revenue: number;
  /** The breakdown that the row belongs to, such as business, product or geography. */
  axis?: string;
  /** `reconciling` for an elimination or a corporate item. It counts toward the sum like any other row. */
  kind?: 'segment' | 'reconciling';
}

export interface SegmentsInput {
  /** The revenue that the filing reports for the whole company. */
  total: number;
  segments: SegmentRow[];
}

export interface Sum {
  sum: number;
  /** `sum` over `total`. */
  ratio: number;
  status: Status;
}

export interface CheckResult {
  /** One entry per axis that the rows name. Empty when no row names one. */
  byAxis: Record<string, Sum>;
  /** Every row added up, whatever its axis. */
  overall: Sum;
  verdict: Verdict;
}

function statusOf(ratio: number): Status {
  if (ratio < RECONCILED_MIN) return 'under';
  if (ratio > RECONCILED_MAX) return 'over';
  return 'reconciled';
}

function sumOf(rows: SegmentRow[], total: number): Sum {
  const sum = rows.reduce((acc, row) => acc + row.revenue, 0);
  const ratio = sum / total;
  return { sum, ratio, status: statusOf(ratio) };
}

/**
 * Adds up segment revenue and compares it with reported revenue: each axis on its own when the rows name their axes,
 * or the whole list when they do not. The verdict is `incomplete` when a sum is under the band, `mixed_axes_likely`
 * when one is over it, which is what rows of more than one breakdown counted together look like, and `reconciled`
 * when every sum is in the band.
 */
export function checkSegments(input: SegmentsInput): CheckResult {
  const { total, segments } = input;
  if (!Number.isFinite(total) || total <= 0) throw new RangeError('total must be a positive number');
  for (const row of segments) {
    if (!Number.isFinite(row.revenue)) throw new RangeError(`the revenue of ${row.name} must be a finite number`);
  }

  const overall = sumOf(segments, total);
  const groups = new Map<string, SegmentRow[]>();
  if (segments.some((row) => row.axis !== undefined)) {
    for (const row of segments) {
      const key = row.axis ?? UNLABELLED;
      const rows = groups.get(key);
      if (rows === undefined) groups.set(key, [row]);
      else rows.push(row);
    }
  }
  // Object.fromEntries makes each axis an own key, even one such as __proto__.
  const byAxis = Object.fromEntries([...groups].map(([axis, rows]) => [axis, sumOf(rows, total)]));

  const statuses = groups.size === 0 ? [overall.status] : Object.values(byAxis).map((sum) => sum.status);
  const verdict: Verdict = statuses.includes('under')
    ? 'incomplete'
    : statuses.includes('over')
      ? 'mixed_axes_likely'
      : 'reconciled';
  return { byAxis, overall, verdict };
}
