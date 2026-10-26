# Example data

`sample-100.csv` holds the segments of the companies in the numi bulk sample: up to 100 companies whose newest annual filing that is not an amendment has a reconciled business axis in US dollars, the largest by the revenue of that axis. It has one row for each segment of that filing, on every axis that the filing has.

| Column | Holds |
|---|---|
| `cik` | The company's CIK, zero-padded to ten digits |
| `ticker`, `name` | The company's primary ticker and its name |
| `filing_date`, `period_end` | The date of the filing and the end of the fiscal year that it covers |
| `axis` | `business`, `product` or `geography` |
| `member`, `label` | The XBRL member of the row as filed, and a name made from it |
| `kind` | `segment`, or `reconciling` for an elimination or a corporate item |
| `revenue` | The revenue of the row, in the filing's currency |
| `revenue_total` | The revenue that the filing reports for the whole company |
| `reconciliation` | `reconciled`, `over`, `under` or `unknown` for the axis |

The file is CSV by RFC 4180: the first line names the columns, lines end with CRLF, and an empty field is null.

To check one company, group its rows by `axis` and pass `{ total: revenue_total, segments }` to `checkSegments`, with each row as `{ name: label, revenue, axis, kind }`.

`numi data:sample --out oss/reconcile/data/sample-100.csv` writes the file from a numi database.

## Licence

This data comes under the [numi data licence](https://docs.numi.sh/licensing), not under the MIT licence of the code. Every plan, the free one included, grants you a non-exclusive commercial licence to use, display and redistribute numi data inside your own products and analyses, with no attribution required. Reselling the bulk file, or a substantial part of it, as a dataset is not permitted.
