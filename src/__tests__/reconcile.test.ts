import { describe, expect, it } from 'vitest';
import { checkSegments, RECONCILED_MAX, RECONCILED_MIN, type SegmentRow } from '../reconcile.js';

// Microsoft's 10-K for the year to June 30, 2026, in $ million: revenue of 331,839, tagged on three axes.
const MSFT_TOTAL = 331_839;
const MSFT: SegmentRow[] = [
  { name: 'Productivity and Business Processes', revenue: 139_996, axis: 'business' },
  { name: 'Intelligent Cloud', revenue: 137_791, axis: 'business' },
  { name: 'More Personal Computing', revenue: 54_052, axis: 'business' },
  { name: 'Server Products and Cloud Services', revenue: 129_425, axis: 'product' },
  { name: 'Microsoft 365 Commercial Products and Cloud Services', revenue: 101_997, axis: 'product' },
  { name: 'Xbox', revenue: 21_790, axis: 'product' },
  { name: 'LinkedIn', revenue: 19_817, axis: 'product' },
  { name: 'Windows and Devices', revenue: 17_084, axis: 'product' },
  { name: 'Search Advertising', revenue: 15_176, axis: 'product' },
  { name: 'Microsoft 365 Consumer Products and Cloud Services', revenue: 9_175, axis: 'product' },
  { name: 'Dynamics Products and Cloud Services', revenue: 9_006, axis: 'product' },
  { name: 'Enterprise and Partner Services', revenue: 8_260, axis: 'product' },
  { name: 'Other Products and Services', revenue: 109, axis: 'product' },
  { name: 'United States', revenue: 170_794, axis: 'geography' },
  { name: 'Other countries', revenue: 161_045, axis: 'geography' },
];

const withoutAxes = (rows: SegmentRow[]): SegmentRow[] => rows.map(({ name, revenue }) => ({ name, revenue }));

describe('checkSegments', () => {
  it('calls a flat list that sums to 143% of revenue mixed_axes_likely', () => {
    // Two business segments that make up revenue, and a product line of another axis on top of them.
    const result = checkSegments({
      total: 100,
      segments: [
        { name: 'Cloud', revenue: 60 },
        { name: 'Devices', revenue: 40 },
        { name: 'Search', revenue: 43 },
      ],
    });
    expect(result.overall).toEqual({ sum: 143, ratio: 1.43, status: 'over' });
    expect(result.byAxis).toEqual({});
    expect(result.verdict).toBe('mixed_axes_likely');
  });

  it('reconciles each axis of a list labelled by axis, though the same rows sum to 300% flat', () => {
    const flat = checkSegments({ total: MSFT_TOTAL, segments: withoutAxes(MSFT) });
    expect(flat.overall.ratio).toBe(3);
    expect(flat.verdict).toBe('mixed_axes_likely');

    const labelled = checkSegments({ total: MSFT_TOTAL, segments: MSFT });
    expect(Object.keys(labelled.byAxis).sort()).toEqual(['business', 'geography', 'product']);
    for (const axis of Object.values(labelled.byAxis)) {
      expect(axis).toEqual({ sum: MSFT_TOTAL, ratio: 1, status: 'reconciled' });
    }
    expect(labelled.verdict).toBe('reconciled');
  });

  it('calls a list that covers 60% of revenue incomplete, flat or as one axis of several', () => {
    const flat = checkSegments({
      total: 100,
      segments: [
        { name: 'A', revenue: 35 },
        { name: 'B', revenue: 25 },
      ],
    });
    expect(flat).toMatchObject({ overall: { sum: 60, ratio: 0.6, status: 'under' }, verdict: 'incomplete' });

    const labelled = checkSegments({
      total: 100,
      segments: [
        { name: 'A', revenue: 60, axis: 'business' },
        { name: 'United States', revenue: 100, axis: 'geography' },
      ],
    });
    expect(labelled.byAxis.business?.status).toBe('under');
    expect(labelled.verdict).toBe('incomplete');
  });

  it('counts a reconciling row with negative revenue, such as an elimination', () => {
    const result = checkSegments({
      total: 100,
      segments: [
        { name: 'Studios', revenue: 70, axis: 'business' },
        { name: 'Networks', revenue: 40, axis: 'business' },
        { name: 'Eliminations', revenue: -10, axis: 'business', kind: 'reconciling' },
      ],
    });
    expect(result.byAxis.business).toEqual({ sum: 100, ratio: 1, status: 'reconciled' });
    expect(result.verdict).toBe('reconciled');
  });

  it('calls a labelled axis above the band mixed_axes_likely, because it likely holds two breakdowns', () => {
    // A product axis that keeps the product lines and also the split into products and services that they add up to.
    const result = checkSegments({
      total: 100,
      segments: [
        { name: 'Cloud', revenue: 70, axis: 'product' },
        { name: 'Devices', revenue: 30, axis: 'product' },
        { name: 'Product', revenue: 40, axis: 'product' },
        { name: 'Service', revenue: 60, axis: 'product' },
      ],
    });
    expect(result.byAxis.product).toEqual({ sum: 200, ratio: 2, status: 'over' });
    expect(result.verdict).toBe('mixed_axes_likely');
  });

  it('calls a list incomplete when one axis is under the band and another is over it', () => {
    const result = checkSegments({
      total: 100,
      segments: [
        { name: 'A', revenue: 60, axis: 'business' },
        { name: 'Cloud', revenue: 120, axis: 'product' },
        { name: 'Devices', revenue: 80, axis: 'product' },
      ],
    });
    expect([result.byAxis.business?.status, result.byAxis.product?.status]).toEqual(['under', 'over']);
    expect(result.verdict).toBe('incomplete');
  });

  it('keeps an axis named __proto__ as an axis of its own', () => {
    const result = checkSegments({ total: 100, segments: [{ name: 'A', revenue: 100, axis: '__proto__' }] });
    expect(Object.keys(result.byAxis)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(result.byAxis)).toBe(Object.prototype);
  });

  it('puts the rows without an axis under unlabelled when other rows carry one', () => {
    const result = checkSegments({
      total: 100,
      segments: [
        { name: 'A', revenue: 100, axis: 'business' },
        { name: 'B', revenue: 50 },
      ],
    });
    expect(Object.keys(result.byAxis).sort()).toEqual(['business', 'unlabelled']);
    expect(result.byAxis.unlabelled).toEqual({ sum: 50, ratio: 0.5, status: 'under' });
    expect(result.verdict).toBe('incomplete');
  });

  it('includes both ends of the band', () => {
    const status = (revenue: number) =>
      checkSegments({ total: 100, segments: [{ name: 'A', revenue }] }).overall.status;
    expect([status(95), status(105), status(94.99), status(105.01)]).toEqual([
      'reconciled',
      'reconciled',
      'under',
      'over',
    ]);
    expect([RECONCILED_MIN, RECONCILED_MAX]).toEqual([0.95, 1.05]);
  });

  it('refuses a total that is not a positive number, and a revenue that is not a finite number', () => {
    for (const total of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => checkSegments({ total, segments: [] })).toThrow(RangeError);
    }
    expect(() => checkSegments({ total: 100, segments: [{ name: 'A', revenue: Number.NaN }] })).toThrow(RangeError);
  });
});
