# Example data

`sample-100.csv` has the segments of up to 100 companies, the largest by the revenue of their business axis. A company is in the file only when its newest annual filing that is not an amendment has a reconciled business axis in US dollars. The file has one row for each segment of that filing, on every axis that the filing has.

| Column | Contents |
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

The file is CSV by RFC 4180: the first line has the column names, lines end with CRLF, and an empty field is null.

To check one company, group its rows by `axis` and pass `{ total: revenue_total, segments }` to `checkSegments`, with each row as `{ name: label, revenue, axis, kind }`.

## Licence

This data comes under the [numi data licence](https://docs.numi.sh/licensing), not under the MIT licence of the code. On every plan, the free one included, Nui Systems L.L.C. grants you a non-exclusive commercial licence to use, display and redistribute numi data inside your own products and analyses, with no attribution required. You may not resell the bulk file, or a substantial part of it, as a dataset.
