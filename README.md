# Loan Ledger

Interactive, aggregate-only dashboard for historical LendingClub loan outcomes.

**Live dashboard:** https://bank-loan-dashboard-site.vercel.app/
**Analysis and reproducible SQL:** https://github.com/vj0246/CreditSight

## What this dashboard shows

The fixed historical extract contains 39,786 resolved loans issued between June 2007 and December 2011. The dashboard has four views: portfolio overview with an analyst brief and benchmarked grade chart, borrower-risk segments with DTI and purpose analysis, origination-cohort funding and outcome trends with a reconciliation table, and a method page documenting source, definitions, and limitations. The issue-year selector filters each view.

The overall observed charge-off share is 5,670 / 39,786 = 14.25%. Grade A is 602 / 10,085 = 5.97%; Grade G is 101 / 318 = 31.76%. These are descriptive outcomes, not default predictions or evidence that grade alone caused the difference. Original funded principal is not outstanding balance or realized loss.

## Data flow

The companion dashboard reads `app/loan-aggregates.json`, generated from the prepared historical CSV by [`tools/export_companion_data.py`](https://github.com/vj0246/CreditSight/blob/main/tools/export_companion_data.py). It contains grouped counts and sums, not loan-level rows. MySQL CTE and window-function scripts in the analysis repository provide independent checks. This Vercel site is a fixed snapshot; it does not automatically refresh from MySQL or OneDrive.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npx next dev
npx next build
npm run lint
npm test
```

For Vercel, use the Next.js preset and override Build Command with `npx next build`. Leave Output Directory at its default. The existing `npm run build` script targets the project's Vinext build and is not the Vercel command.
