# MacroSignals — desktop and mobile web

A personal workspace for macroeconomic indicators and market-downturn research. The four pages cover data sources, 50 selectable KPIs, trends and correlations, and an analysis lab.

## Host on Replit

The new web edition includes a mobile browser interface, password login, server-side FRED retrieval, shared PostgreSQL storage, browser CSV import/export and historical analysis. Follow **[the complete GitHub and Replit hosting instructions](docs/Replit-Hosting.md)**. Run `npm run build:web` to build and `npm run start:web` to serve production; required secrets and database setup are explained in the guide. No website has been deployed yet.

The sections below describe the existing Windows release; web-specific storage and security differences are covered in the hosting guide.

## Open the Windows app

1. Save **MacroSignals-0.1.1-Windows.exe** somewhere convenient and open it. This is a portable launcher: no Python, Node.js, browser server, administrator installation, or paid account is required. Initial startup extracts its bundled runtime and may take a moment.
2. On **Trends & links**, click **Load free data**. The initial watchlist contains 15 indicators. The app also loads the S&P 500 price index and retrospective recession labels.
3. Visit **KPI catalogue** to change your selections, inspect source details, or save named watchlists.
4. Visit **Analysis lab** to inspect correlations, define watch conditions, test historical hypotheses, or explore scenarios.

This personal build is unsigned; Windows may display an unknown-publisher warning. Its packaging and automated tests were checked on Linux. Installation/launch, native dialogs, key encryption, and rendering on an actual Windows computer have **not** been tested in this environment. Do not change organization-managed security settings to run it.

## Update: 20-year historical views

Version 0.1.1 makes **20 years** the default view for selected KPIs and correlations. The chart range can be shortened to 1, 3, 5 or 10 years. Existing workspaces switch to the new default once on upgrade; subsequent chart choices remain saved. Selections, watchlists, rules, cached data and FRED credentials stay in the same local workspace.

The chart lists the actual available observation dates for each plotted KPI. **Selected KPI history** lists every selected indicator; click a row to open its individual 20-year chart. Shorter source histories remain shorter, and missing periods are not filled with invented values. The existing provider adapter requests history back to 1990, subject to each source's actual coverage. For example, a source supplying only 3 or 10 years cannot produce a full 20-year chart without a longer permitted import.

To update, close the old app, extract the new download, and run **MacroSignals-0.1.1-Windows.exe**. The old process must be closed for the new version to start. No repository has been published to GitHub as part of this delivery.

The KPI catalogue now uses nine collapsible sections: rates and policy; credit and banking; money and liquidity; employment; inflation; growth and consumer demand; housing; global economy and commodities; and company earnings and equity markets. Research-priority numbers remain unchanged within each section. Group filtering, search and saved selections continue to work. The interface also includes a small-screen layout in preparation for a mobile web edition.

**Mobile publication:** the browser/server replacement is now implemented in this source. See [docs/Replit-Hosting.md](docs/Replit-Hosting.md) to publish it on Replit. The packaged Windows executable remains version 0.1.1.

## What is included

| Page | Working features |
|---|---|
| Data sources | Ten free/paid source groups, annual costs or quote requirement, billing qualifications, official links, saved membership notes, and Chrome/API access distinctions. |
| KPI catalogue | All 50 research candidates, nine logical groups, priority order within groups, category/search filters, persistent selections, named watchlists, native units, last observation, source provenance, CSV import/export. |
| Trends & links | Cached-data cards, up to five overlaid series, 1/3/5/10/20-year windows, standardization or explicit changes, correlation heatmap, source coverage, offline access and a dark theme. |
| Analysis lab | Pearson/Spearman correlations, selected calendar leads/lags, 36-month rolling relationships, expanding-window logistic-regression backtests, a frozen 24-month holdout, calibration and baseline comparisons, persistent threshold rules, bond-duration scenarios, historical factor sensitivity, and Fed rate-change event studies. |

There are **38 automatic KPI connections** through FRED and **12 CSV import slots**, plus the two outcome/benchmark series. Availability varies by series; a working connection does not imply unrestricted or sufficiently long history. Prices reflect the research checked on 12 September 2026; the UI labels annualized monthly rates and observed regional offers separately from annual billing. No paid account is connected or purchased.

The 12 import slots cover manufacturing new orders, forward EPS revisions, implied policy-rate changes, the excess bond premium, services activity, consumer expectations, the OECD leading indicator, supply-chain pressure, aggregate EPS growth, operating margins, earnings beat rates and market breadth. Definitions and units are in [docs/KPI-Catalogue.md](docs/KPI-Catalogue.md). These are deliberately named inputs; the app does not substitute easier-to-obtain but different metrics.

## Research setup

**Current revised history** works without an API key. Use it for charts and current conditions. To run a historical test using this history, explicitly select **Use revised history with assumed release delays (exploratory)**. Such a simulation is not evidence of what could actually have been predicted at the time.

For dated original releases, obtain a free [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html). In **Settings & backup**, save it, select **First-release history**, and refresh. The adapter requests FRED's `output_type=4` initial-release observations and retains their availability dates. It rejects missing/invalid dates. A date-only release is used no earlier than the following day. Some series lack usable archival history; the app reports the failure and preserves the previous cache. The authenticated adapter is covered by response-fixture tests; it was not exercised with a real user key.

Begin a test with the default five inputs: 10Y–3M spread, jobless claims, bank lending standards, Chicago Fed financial conditions, and the Sahm unemployment change. Default settings use a six-month horizon and a 10% forward peak-to-trough market drawdown. The actual market target is separate from the NBER recession outcome. Neither outcome is allowed as a predictor.

Backtests require at least 96 complete monthly rows and both outcomes in the training sample. Late releases, gaps, insufficient history, or too many predictors can reduce usable observations. In the live source check, the high-yield spread history began in September 2023, so it is selected for monitoring but excluded from the default historical model. The S&P 500 source has a rolling history limit; for multi-cycle work, import entitled longer daily price history.

The app reports historical out-of-sample estimates and descriptive watch conditions. It does not claim a validated live probability of a downturn or issue trading instructions. The catalogue order is an informed research starting point, not an empirically established ranking of predictive power.

## Import your existing data

Use **Import CSV**, choose the destination, and select a CSV file with:

```csv
date,value,available_date
2024-01-01,2.4,2024-02-15
2024-02-01,2.6,2024-03-15
```

- `date` is the observation period/date in `YYYY-MM-DD` format. Use one numeric value per date, decimal points, and no thousands separators. Blank values or a dot remain missing; they are never replaced with zero.
- Values must **already be in the destination indicator's displayed units**. For a year-over-year KPI, import year-over-year percentages, not the raw index. Imported values are not transformed again by the provider adapter.
- `available_date` is optional for ordinary imports and mandatory for a first-release assertion. Assert first-release provenance only when the values really were those originally available. The importer cannot verify the truth of your assertion.
- Importing replaces that indicator's cache. Routine watchlist and daily refreshes retain imported data. An individual indicator's **Refresh** button, or the event study's explicit refresh, replaces its data with FRED observations.
- Use daily trading observations for the market benchmark; label generation rejects internal or end-of-window gaps longer than seven calendar days. A monthly price file cannot capture daily drawdowns.

Membership links open the default browser. If Chrome is your default, that is where you can use your existing signed-in account. The app does not access Chrome cookies or automate membership websites. A research membership does not automatically include API access or permitted exports. Paid providers currently have comparison cards and import support; direct paid API adapters are not included in 0.1.

## Privacy, persistence and backups

Settings and observations are saved under Electron's per-user application-data directory, typically `%APPDATA%\MacroSignals\research` on Windows. The launcher location can change without moving this data. Cached observations remain available offline. Failed refreshes preserve them, malformed storage is retained in a recovery copy, and only one instance owns the workspace.

FRED requests send the requested series IDs and date range to St. Louis Fed services. First-release API requests also send your FRED key to the official API over HTTPS. The app has no analytics, LLM integration, advertising, cloud sync or background service. It opens external source links only after a click. Its renderer cannot directly access the filesystem or the network.

Keys use operating-system encryption where secure storage is available. If it is not, keys remain in memory for the current session. Keys are excluded from settings and research exports. Local observation files themselves are ordinary JSON; disk encryption is handled by your operating system.

**Export settings** saves watchlists, source membership notes, chart preferences and rules. **Export research** saves the completed analysis and a frozen copy of its inputs, even if a later refresh changes the dashboard. **Export CSV** saves an individual cached series. Research bundles are JSON for audit/reproduction; importing an entire research bundle is not a UI feature in 0.1.

Daily refresh is off by default. When enabled, it checks once per minute and refreshes after 23 hours while the app is open. Closed or sleeping computers do not update. Imported series are preserved.

Ordinary app use makes no ChatGPT or OpenAI API calls and consumes **no ChatGPT quota**. Development-chat usage is separate; the app cannot read your subscription usage meter or calculate its percentage.

## Build from source

Use Node.js 24 LTS or a compatible version supported by the pinned Electron package, plus npm. Internet access is needed to install dependencies and fetch the platform runtime. Dependency versions are locked in `package-lock.json`.

```sh
npm ci
npm run check
npm run build
npm test
npm start
```

Create the Windows portable distribution with:

```sh
npm run package:win
```

`npm run package:installer` is also provided for an NSIS installer when run on Windows, or on a suitably configured cross-build host with Wine. The present delivery uses the portable target because this build host lacks that installer-generation dependency. `npm run package:linux` produces an unpacked Linux directory; a Linux end-user release is not validated here. macOS signing/notarization and installers are not included.

The source uses Electron, React, D3 and a JavaScript statistical core. The initial proposal's Python/DuckDB components were removed after the fit review: this version uses one bundled runtime and atomic JSON snapshots, which suit 50 time series and simplify local deployment. A database or Python service can be added if the workload grows. See [docs/Architecture-and-Fit.md](docs/Architecture-and-Fit.md).

See [docs/Methodology.md](docs/Methodology.md) for calculation definitions and [docs/Validation.md](docs/Validation.md) for tested behavior and remaining limits. Third-party packages retain their own licenses; source data retains provider rights. This custom project does not copy Fincept or OpenBB source.
