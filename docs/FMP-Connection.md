# Financial Modeling Prep: connect and check Free-plan access

The web app reads `FMP_API_KEY` only on the server. Keep it in Replit's published deployment Secrets. Pull this update from GitHub and republish; saving a key by itself does not update a running deployment.

Open **Data sources → Financial Modeling Prep → Check FMP connection & access**. The check requests up to six AAPL datasets: profile, daily historical prices, annual income statements, annual cash-flow statements, annual ratios and analyst estimates. Each row reports available, restricted, empty, invalid key, rate limited, unavailable, or unexpected response. Invalid credentials and rate-limit responses stop the remaining probes. Successful rows include actual observation counts and date ranges where supplied.

“Connected” means at least one dataset returned usable data, not that every FMP endpoint is enabled. Access to AAPL does not establish access to every other symbol. The check does not add indicators, change cached KPI histories, or schedule automatic downloads. No API key is sent to the browser, placed in URLs, or included in the report. Authentication and same-origin protection apply to the check endpoint.

A full check uses at most six API calls; simultaneous checks are coalesced and results reused for one hour per server process. A server restart or another instance can trigger a new check. This is not a global account-wide quota counter. Your Free-plan budget must also cover other uses of the key.

## Proposed indicators, in priority order

| Indicator | Data required | Interpretation and scope |
| --- | --- | --- |
| Drawdown from the previous 252 trading observations' high | Daily prices, adequate history | Measures stress in each tracked stock; not automatically a market index signal. |
| Distance from the 200-day moving average | Daily prices | Shows trend deterioration; flag missing observations and confirm split adjustments. |
| 20-day realized volatility | Daily returns | Measures how rapidly market uncertainty is increasing. |
| Tracked-basket breadth above the 200-day average | Prices for an explicitly defined, accessible basket | Detects narrowing participation. Label the sample; do not call it S&P 500 breadth without constituent coverage. |
| Earnings/revenue growth and operating-margin change | Comparable annual financial statements | Measures demand and profitability; annual frequency is slow-moving. Confirm dates, currencies and reporting consistency. |
| Free-cash-flow margin and cash conversion | Income and cash-flow statements | FCF / revenue and operating cash flow / net income; report undefined ratios rather than misleading values near zero. |
| Analyst earnings-estimate revisions | Accessible estimates saved repeatedly for the same forecast period | Detects declining expectations. A forecast period date is not the date an estimate was observed; no historical revisions backfill is assumed. |

Prices are the first candidates if accessible. Statements and estimates remain conditional until the check returns valid data. Twenty-year charts continue using existing longer-history providers; the check cannot create unavailable history. Original-release financial histories and survivorship-safe basket backtests require separate verification.

## Official documentation

- [Authentication and endpoint catalogue](https://site.financialmodelingprep.com/developer/docs)
- [Daily stock prices](https://site.financialmodelingprep.com/developer/docs/stable/historical-price-eod-light)
- [Income statements](https://site.financialmodelingprep.com/developer/docs/stable/income-statement)
- [Analyst estimates](https://site.financialmodelingprep.com/developer/docs/stable/financial-estimates)
- [Plan limits](https://site.financialmodelingprep.com/developer/docs/pricing)

## Validation

Connection tests use simulated provider responses for successful, restricted, invalid-key, empty, malformed, network-error and rate-limit cases. They verify request authentication, secret redaction, response summaries and one-hour request reuse. Real account entitlements have not been tested from the development environment; the Sources-page check performs that test in your deployment.

## Company KPI integration update

The catalogue now contains 54 FMP company metrics. See [FMP-KPIs.md](FMP-KPIs.md) for calculations, actual-coverage labels, deployment and limitations. Earlier descriptions above of connection-only functionality describe the initial release and are superseded by this integration.
