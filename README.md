# @numi-sh/reconcile

Checks whether a company's segment revenue adds up to the revenue that it reports, axis by axis, and flags lists that mix axes. No dependencies.

## The mixed-axis problem

In a 10-K, a company can break the same revenue down more than once: by operating segment, by product line and by region. In XBRL each breakdown is an axis, and each axis adds up to total revenue on its own. Microsoft's 10-K for the year to June 30, 2026 reports revenue of $331,839 million in three breakdowns: three business segments, ten product lines and two regions.

A data source that reads segment facts without their axis puts the rows of every breakdown in one list, and the same revenue is in that list more than once. All three of Microsoft's axes together come to 300% of revenue, and one flattened list of Microsoft's segments, from a store that drops the axis, sums to about 143%. Every share of revenue in such a list is wrong, and nothing in the list says so. This checker flags it: rows that add up to more than 105% of revenue most likely come from more than one breakdown.

## Install

```sh
npm install @numi-sh/reconcile
```

## Usage

From the command line:

```sh
npx @numi-sh/reconcile segments.json
```

```text
MSFT: reconciled, business 100.0%, product 100.0%, geography 100.0%
#2: mixed_axes_likely, 143.0% of total
```

The command prints one line per input. It exits 0 when every input reconciles, 1 when an input does not reconcile or is not valid, and 2 when the file cannot be read, is not JSON or has no input.

From code:

```ts
import { checkSegments } from '@numi-sh/reconcile';

const result = checkSegments({
  total: 331_839,
  segments: [
    { name: 'Productivity and Business Processes', revenue: 139_996, axis: 'business' },
    { name: 'Intelligent Cloud', revenue: 137_791, axis: 'business' },
    { name: 'More Personal Computing', revenue: 54_052, axis: 'business' },
  ],
});
console.log(result.verdict, result.byAxis.business?.ratio);
```

## Input

A JSON object, or an array of them:

```json
{
  "name": "MSFT",
  "total": 331839,
  "segments": [
    { "name": "Intelligent Cloud", "revenue": 137791, "axis": "business" },
    { "name": "Eliminations", "revenue": -2400, "axis": "business", "kind": "reconciling" }
  ]
}
```

- `total`: the revenue that the filing reports for the whole company. It must be a positive number.
- `segments`: one row per segment, with its `name` and its `revenue` in the unit of `total`.
- `axis`, optional: the breakdown that the row belongs to, such as `business`, `product` or `geography`. When any row has an axis, each axis is checked on its own, and rows without one go under `unlabelled`.
- `kind`, optional: `segment`, or `reconciling` for an elimination or a corporate item. Both count toward the sum, and an elimination is negative.
- `name` of the input, optional: shown at the start of its line instead of its position.

## Verdicts

Each sum is compared with `total`. From 95 to 105 percent, both ends included, the sum is `reconciled`.

| Verdict | When |
|---|---|
| `reconciled` | Every axis, or the whole list when no row names an axis, is from 95 to 105 percent of `total`. |
| `incomplete` | An axis, or the whole list, is under 95 percent: part of revenue is not in the rows. |
| `mixed_axes_likely` | An axis, or the whole list, is over 105 percent: the rows most likely come from more than one breakdown. |

When one axis is under and another is over, the verdict is `incomplete`.

## The numi API

With the [numi API](https://docs.numi.sh/segments), you get segments from SEC filings with their axis kept, and each axis checked against reported revenue.

## Example data

`data/sample-100.csv` has the segments of up to 100 large SEC filers that report in US dollars. See [data/README.md](data/README.md).

## Licence

The code is MIT licensed. The data in `data/` comes under the numi data licence.
