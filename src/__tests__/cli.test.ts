import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../cli.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'numi-reconcile-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function file(content: unknown): string {
  const path = join(dir, 'input.json');
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  return path;
}

function cli(args: string[]): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = run(args, { out: (line) => out.push(line), err: (line) => err.push(line) });
  return { code, out, err };
}

const FLAT_143 = {
  total: 100,
  segments: [
    { name: 'Cloud', revenue: 60 },
    { name: 'Devices', revenue: 40 },
    { name: 'Search', revenue: 43 },
  ],
};

describe('numi-reconcile', () => {
  it('prints the verdict of one input and exits 0 when it reconciles', () => {
    const { code, out, err } = cli([
      file({
        total: 100,
        segments: [
          { name: 'A', revenue: 60 },
          { name: 'B', revenue: 40 },
        ],
      }),
    ]);
    expect([code, out, err]).toEqual([0, ['#1: reconciled, 100.0% of total'], []]);
  });

  it('prints one line per input of an array, with each axis, and exits 1 when one does not reconcile', () => {
    const labelled = {
      name: 'MSFT',
      total: 100,
      segments: [
        { name: 'A', revenue: 100, axis: 'business' },
        { name: 'United States', revenue: 100, axis: 'geography' },
      ],
    };
    const { code, out } = cli([file([labelled, FLAT_143])]);
    expect(code).toBe(1);
    expect(out).toEqual([
      'MSFT: reconciled, business 100.0%, geography 100.0%',
      '#2: mixed_axes_likely, 143.0% of total',
    ]);
  });

  it('reports an input that it cannot check, and exits 1', () => {
    const { code, out, err } = cli([
      file([
        { total: 0, segments: [] },
        { total: 100 },
        { total: 100, segments: [{ name: 'A', revenue: 1, kind: 'other' }] },
      ]),
    ]);
    expect(code).toBe(1);
    expect(out).toEqual([]);
    expect(err).toEqual([
      '#1: error: total must be a positive number',
      '#2: error: segments must be an array of { name, revenue, axis?, kind? }',
      '#3: error: segments must be an array of { name, revenue, axis?, kind? }',
    ]);
  });

  it('exits 2 with the usage when no file is given, and when the file does not hold JSON', () => {
    const none = cli([]);
    expect(none.code).toBe(2);
    expect(none.err[0]).toMatch(/^usage: numi-reconcile <file\.json>/);
    const broken = cli([file('{ not json')]);
    expect(broken.code).toBe(2);
    expect(broken.err[0]).toMatch(/is not JSON/);
    const empty = cli([file([])]);
    expect(empty.code).toBe(2);
    expect(empty.err[0]).toMatch(/is an empty array\. Give at least one input\./);
    const missing = cli([join(dir, 'nothing.json')]);
    expect(missing.code).toBe(2);
    expect(missing.err[0]).toMatch(/cannot be read/);
  });

  it('runs as a command', () => {
    const result = spawnSync('npx', ['tsx', join(import.meta.dirname, '../cli.ts'), file(FLAT_143)], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe('#1: mixed_axes_likely, 143.0% of total');
  });
});
