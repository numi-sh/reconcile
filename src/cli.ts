#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type CheckResult, checkSegments, type SegmentRow, type SegmentsInput } from './reconcile.js';

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

const USAGE = [
  'usage: numi-reconcile <file.json>',
  'The file is { "total": <revenue>, "segments": [{ "name", "revenue", "axis"?, "kind"? }] }, or an array of them.',
  'Exits 0 when every input reconciles, 1 when an input does not reconcile or is not valid, and 2 when the file cannot be read, is not JSON or has no input.',
].join('\n');

const SEGMENTS_SHAPE = 'segments must be an array of { name, revenue, axis?, kind? }';

const percent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

function isRow(value: unknown): value is SegmentRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.name === 'string' &&
    typeof row.revenue === 'number' &&
    (row.axis === undefined || typeof row.axis === 'string') &&
    (row.kind === undefined || row.kind === 'segment' || row.kind === 'reconciling')
  );
}

/** One input of the file, checked for its shape. */
function inputOf(value: unknown): SegmentsInput {
  const input = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  if (typeof input.total !== 'number') throw new RangeError('total must be a positive number');
  if (!Array.isArray(input.segments) || !input.segments.every(isRow)) throw new TypeError(SEGMENTS_SHAPE);
  return { total: input.total, segments: input.segments };
}

function describe(result: CheckResult): string {
  const axes = Object.entries(result.byAxis);
  const detail =
    axes.length === 0
      ? `${percent(result.overall.ratio)} of total`
      : axes.map(([axis, sum]) => `${axis} ${percent(sum.ratio)}`).join(', ');
  return `${result.verdict}, ${detail}`;
}

/** Checks each input of one JSON file and prints a line for each. Returns the exit code. */
export function run(args: string[], io: Io): number {
  const [path] = args;
  if (path === undefined || args.length !== 1 || path === '-h' || path === '--help') {
    io.err(USAGE);
    return 2;
  }
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    io.err(`numi-reconcile: ${path} cannot be read`);
    return 2;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    io.err(`numi-reconcile: ${path} is not JSON`);
    return 2;
  }
  const inputs: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  if (inputs.length === 0) {
    io.err(`numi-reconcile: ${path} is an empty array. Give at least one input.`);
    return 2;
  }

  let failed = false;
  inputs.forEach((value, index) => {
    const name = (value as { name?: unknown } | null)?.name;
    const label = typeof name === 'string' ? name : `#${index + 1}`;
    try {
      const result = checkSegments(inputOf(value));
      io.out(`${label}: ${describe(result)}`);
      if (result.verdict !== 'reconciled') failed = true;
    } catch (error) {
      io.err(`${label}: error: ${error instanceof Error ? error.message : String(error)}`);
      failed = true;
    }
  });
  return failed ? 1 : 0;
}

/** Whether this file is the program that node runs, through the bin link of an install too. */
function isEntry(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntry()) {
  process.exitCode = run(process.argv.slice(2), {
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  });
}
