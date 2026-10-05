# FMP company KPIs

103 catalogue entries: 17 metrics for each of AAPL, NVDA, GOOG, BRK.A, ASML and TSM, plus one six-company breadth series. Symbols are passed exactly as listed; no substitution of BRK.B, GOOGL, Amsterdam ASML or Taiwan ordinary shares. Each has its own company group and tracking checkbox.

Deploy GitHub main in Replit with FMP_API_KEY configured, then select the desired entries in KPI catalogue and Refresh data (current/revised-history mode). The existing connection check still tests AAPL only. No other symbol's entitlement is inferred from that check. Existing watchlists are preserved.

## Validation and coverage

Each request validates symbol, calendar date and numeric fields. Annual statements must identify FY periods. Growth requires adjacent fiscal years (330–400 days) and matching reported currencies. Cross-statement ratios require identical fiscal dates and currencies. Null/string/nonfinite values are not zeros. Missing fields and unusable denominators produce gaps, not fabricated observations. Company detail panels show source dates, calculated dates/counts, rejected/unusable rows and the provider warning. Denied requests retain cached history and display unavailable status.

- Annual revenue growth: 100 × (revenue / prior revenue − 1), positive prior revenue.
- Annual net profit margin: 100 × net income / positive revenue.
- Annual free-cash-flow margin: 100 × freeCashFlow / positive revenue; no guessed FCF fallback.
- Annual net-income growth: 100 × (net income / prior net income − 1), positive prior income, current losses omitted and labelled as unusable rather than a misleading percentage.
- Operating cash flow / net income: operatingCashFlow / positive netIncome.
- Distance from 200-day average: 100 × (price / average of 200 observations − 1).
- Drawdown: 100 × (price / maximum of 252 observations − 1).
- Realized volatility: sample standard deviation of 20 daily log returns × sqrt(252) × 100.
- EPS revisions: percentage change since preceding saved daily snapshot for the same nearest future annual fiscal period. Both estimates must be positive. Store the target period on each observation. First refresh records a baseline with no numeric result; never backfill from future-year forecasts or manufacture a zero. Daily snapshots persist in the existing database. Fiscal-year rollovers compare overlapping targets, not two different fiscal years.

Starter price history requests five years; warm-up reduces calculated coverage. Annual statements request up to five records; actual entitlement controls returned coverage. No 20-year guarantee. Price adjustment status remains unverified: splits or other corporate actions can distort these metrics. These are price metrics, not total returns. Annual fundamentals are revised data, not verified first releases, and are unsuitable for first-release backtests. EPS snapshots are also excluded from the existing first-release backtest until that engine explicitly supports them.

## Refresh cost and constraints

Six shared datasets per company (prices, income, cash flow, estimates, balance sheets, ratios), ordinarily 36 requests for all 103 metrics per running server per 24-hour cache period. Requests within each dataset are coalesced; failures are cached too. Authentication/rate-limit responses pause further KPI provider calls for 24 hours. Cache is process-local: restarts or multiple replicas can use additional calls; the existing six-call access checker is separate. This is not a global quota guarantee. API keys remain in server headers and never enter exported series or browser code.

Only AAPL's earlier access-check results were observed live. This change adds runtime validation for all six symbols; live six-symbol coverage must be checked after Replit deploys this commit. Automated tests use controlled responses, not the user's key.

## Starter expansion: 49 additional entries

Each of the six companies now has eight more annual metrics (17 per company, 102 total), plus one fixed-basket breadth indicator:

- Operating-margin change: change in operatingIncome/revenue × 100, percentage points.
- Gross-margin change: change in grossProfit/revenue × 100, percentage points.
- Interest coverage: ebit / positive interestExpense; missing EBIT is not replaced with another earnings measure.
- Net debt / EBITDA: netDebt / positive ebitda. Net cash remains negative. Requires matching balance-sheet and income-statement dates and currencies.
- Inventory growth less revenue growth: percentage-point difference, matching adjacent fiscal years and currencies; requires positive prior inventory and revenue.
- Receivables growth less revenue growth: same calculation using netReceivables.
- Capital expenditure / operating cash flow: absolute capitalExpenditure / positive operatingCashFlow × 100.
- Annual Price / Free Cash Flow: FMP annual ratios field priceToFreeCashFlowRatio, matched to positive freeCashFlow in the same annual cash-flow period. This is an annual historical valuation, not a current-price/TTM multiple. No guessed share counts, ADR conversion or currency conversion. Missing/nonpositive ratios and nonpositive FCF are omitted.
- Basket breadth: 100 × count above their respective 200-session price means / six. All six need valid values on the same date; no carry-forward or denominator reduction. It measures this fixed basket, not the broad market. Price adjustments remain unverified.

The added balance-sheet and ratios requests share the same five-record annual limit and 24-hour process cache. Six datasets per company mean ordinarily up to 36 requests to load all 103 FMP indicators per cache period, excluding the separate access check. New endpoints/fields are validated at refresh time, not presumed entitled. Existing selections remain unchanged. Replit must deploy the updated main branch before these entries appear.

Tests cover formula values, matched currencies, missing/zero denominators, negative FCF, negative net debt, six-member breadth and a restricted basket member. Live entitlement testing remains necessary after deployment.
