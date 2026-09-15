# KPI catalogue

52 research candidates. Priority order is a starting hypothesis, not a proven ranking. Automatic series use FRED; imports must already match the displayed definition and units. Two additional series are used exclusively as the market benchmark and retrospective recession outcome.

## Rates & monetary policy

The yield curve, real yields and the Federal Reserve's policy stance.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 1 | 10Y–3M Treasury yield spread | daily | percentage points | T10Y3M / level | Free connection |
| 6 | 10Y–2Y Treasury yield spread | daily | percentage points | T10Y2Y / level | Free connection |
| 10 | 10-year TIPS real yield | daily | percent | DFII10 / level | Free connection |
| 11 | 10-year Treasury yield | daily | percent | DGS10 / level | Free connection |
| 12 | 2-year Treasury yield | daily | percent | DGS2 / level | Free connection |
| 13 | Fed policy rate and FOMC decisions | daily | percent | DFEDTARU + DFEDTARL / midpoint | Free connection |
| 14 | 12-month implied policy-rate change | daily | basis points | Imported values | CSV import |

## Credit & banking

Borrowing conditions, credit risk, lending standards and loan performance.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 2 | US high-yield credit spread | daily | percentage points | BAMLH0A0HYM2 / level | Free connection |
| 4 | Bank lending standards: C&I loans | quarterly | net percent | DRTSCILM / level | Free connection |
| 7 | Chicago Fed financial conditions index | weekly | index | NFCI / level | Free connection |
| 20 | US investment-grade credit spread | daily | percentage points | BAMLC0A0CM / level | Free connection |
| 21 | Excess bond premium | monthly | percentage points | Imported values | CSV import |
| 22 | Commercial and industrial loan growth | monthly | percent YoY | BUSLOANS / yoy | Free connection |
| 23 | Consumer-loan delinquency rate | quarterly | percent | DRCLACBS / level | Free connection |

## Money & liquidity

Central-bank assets, bank reserves, Treasury cash and money supply.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 15 | Federal Reserve balance-sheet assets | weekly | USD millions | WALCL / level | Free connection |
| 16 | Bank reserve balances | weekly | USD millions | WRESBAL / level | Free connection |
| 17 | Overnight reverse-repo usage | daily | USD billions | RRPONTSYD / level | Free connection |
| 18 | Treasury General Account balance | weekly | USD millions | WTREGEN / level | Free connection |
| 19 | M2 money-supply growth | monthly | percent YoY | M2SL / yoy | Free connection |

## Employment & labour market

Claims, hiring, hours worked and the balance between jobs and jobseekers.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 3 | Initial jobless claims, 4-week average | weekly | claims | IC4WSA / level | Free connection |
| 9 | Sahm rule unemployment change | monthly | percentage points | SAHMREALTIME / level | Free connection |
| 24 | Continuing unemployment claims | weekly | claims | CCSA / level | Free connection |
| 25 | Nonfarm payroll growth, 3-month average | monthly | thousand jobs / month | PAYEMS / payroll3 | Free connection |
| 26 | Temporary-help employment growth | monthly | percent YoY | TEMPHELPS / yoy | Free connection |
| 27 | Average weekly hours worked | monthly | hours | AWHAETP / level | Free connection |
| 28 | Job openings per unemployed person | monthly | openings / unemployed | JTSJOL + UNEMPLOY / ratio | Free connection |

## Inflation & expectations

Consumer inflation and the market's longer-term inflation expectations.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 29 | Core PCE inflation | monthly | percent YoY | PCEPILFE / yoy | Free connection |
| 30 | Headline CPI inflation | monthly | percent YoY | CPIAUCSL / yoy | Free connection |
| 31 | 5Y5Y forward inflation compensation | daily | percent | T5YIFR / level | Free connection |

## Growth & consumer demand

Business activity, production, spending, income and consumer expectations.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 5 | ISM manufacturing new orders | monthly | index | Imported values | CSV import |
| 32 | ISM services activity index | monthly | index | Imported values | CSV import |
| 33 | Industrial production growth | monthly | percent YoY | INDPRO / yoy | Free connection |
| 34 | Real retail-sales growth | monthly | percent YoY | RRSFS / yoy | Free connection |
| 35 | Real personal income excluding transfers | monthly | percent YoY | W875RX1 / yoy | Free connection |
| 36 | Real GDP growth | quarterly | percent annualized | GDPC1 / qoqAnnualized | Free connection |
| 39 | Consumer sentiment expectations | monthly | index | Imported values | CSV import |

## Housing & construction

Building permits and housing starts as indicators of construction demand.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 37 | Building permits | monthly | thousand units annual rate | PERMIT / level | Free connection |
| 38 | Housing starts | monthly | thousand units annual rate | HOUST / level | Free connection |

## Global economy & commodities

Global leading indicators, oil, copper, the dollar and supply-chain pressure.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 40 | OECD composite leading indicator | monthly | index | Imported values | CSV import |
| 41 | WTI crude oil price | daily | USD / barrel | DCOILWTICO / level | Free connection |
| 42 | Brent crude oil price | daily | USD / barrel | DCOILBRENTEU / level | Free connection |
| 43 | Copper price | monthly | USD / metric ton | PCOPPUSDM / level | Free connection |
| 44 | Broad trade-weighted US dollar | daily | index | DTWEXBGS / level | Free connection |
| 45 | Global supply-chain pressure index | monthly | standard deviations | Imported values | CSV import |

## Company earnings & equity markets

Earnings expectations and results, margins, equity breadth and volatility.

| # | Indicator | Frequency | Displayed units | Input / calculation | Route |
|---|---|---|---|---|---|
| 8 | Forward EPS revision breadth | weekly derived | percent net upgrades | Imported values | CSV import |
| 46 | Aggregate public-company EPS growth | quarterly derived | percent YoY | Imported values | CSV import |
| 47 | Aggregate operating profit margin | quarterly derived | percent | Imported values | CSV import |
| 48 | Earnings surprise / beat rate | quarterly derived | percent | Imported values | CSV import |
| 49 | VIX equity volatility index | daily | index | VIXCLS / level | Free connection |
| 50 | Equity breadth: share above 200-day average | daily derived | percent | Imported values | CSV import |

## Definitions and timing

### 1 — 10Y–3M Treasury yield spread

- Source: FRED / Treasury — [official source](https://fred.stlouisfed.org/series/T10Y3M)
- Display definition: level; percentage points.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 2 — US high-yield credit spread

- Source: FRED / ICE BofA — [official source](https://fred.stlouisfed.org/series/BAMLH0A0HYM2)
- Display definition: level; percentage points.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Third-party data; review source terms

### 3 — Initial jobless claims, 4-week average

- Source: DOL / FRED — [official source](https://fred.stlouisfed.org/series/IC4WSA)
- Display definition: level; claims.
- Freshness limit: 21 calendar days from the observation date.
- Exploratory lag assumption: 6 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 4 — Bank lending standards: C&I loans

- Source: Fed SLOOS / FRED — [official source](https://fred.stlouisfed.org/series/DRTSCILM)
- Display definition: level; net percent.
- Freshness limit: 200 calendar days from the observation date.
- Exploratory lag assumption: 50 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 5 — ISM manufacturing new orders

- Source: ISM / licensed vendor
- Display definition: level; index.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 6 — 10Y–2Y Treasury yield spread

- Source: FRED / Treasury — [official source](https://fred.stlouisfed.org/series/T10Y2Y)
- Display definition: level; percentage points.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 7 — Chicago Fed financial conditions index

- Source: Chicago Fed / FRED — [official source](https://fred.stlouisfed.org/series/NFCI)
- Display definition: level; index.
- Freshness limit: 21 calendar days from the observation date.
- Exploratory lag assumption: 7 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 8 — Forward EPS revision breadth

- Source: Licensed analyst estimates
- Display definition: level; percent net upgrades.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 9 — Sahm rule unemployment change

- Source: BLS / FRED — [official source](https://fred.stlouisfed.org/series/SAHMREALTIME)
- Display definition: level; percentage points.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 38 calendar days from the observation date. This is not a verified release schedule.
- Rights: Third-party data; review source terms

### 10 — 10-year TIPS real yield

- Source: Treasury / FRED — [official source](https://fred.stlouisfed.org/series/DFII10)
- Display definition: level; percent.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 11 — 10-year Treasury yield

- Source: Treasury / FRED — [official source](https://fred.stlouisfed.org/series/DGS10)
- Display definition: level; percent.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 12 — 2-year Treasury yield

- Source: Treasury / FRED — [official source](https://fred.stlouisfed.org/series/DGS2)
- Display definition: level; percent.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 13 — Fed policy rate and FOMC decisions

- Source: Federal Reserve — [official source](https://fred.stlouisfed.org/series/DFEDTARU)
- Display definition: midpoint; percent.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 14 — 12-month implied policy-rate change

- Source: Licensed Fed funds / SOFR futures
- Display definition: level; basis points.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 15 — Federal Reserve balance-sheet assets

- Source: Federal Reserve / FRED — [official source](https://fred.stlouisfed.org/series/WALCL)
- Display definition: level; USD millions.
- Freshness limit: 21 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 16 — Bank reserve balances

- Source: Federal Reserve / FRED — [official source](https://fred.stlouisfed.org/series/WRESBAL)
- Display definition: level; USD millions.
- Freshness limit: 21 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 17 — Overnight reverse-repo usage

- Source: New York Fed / FRED — [official source](https://fred.stlouisfed.org/series/RRPONTSYD)
- Display definition: level; USD billions.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 18 — Treasury General Account balance

- Source: Federal Reserve / FRED (weekly TGA average) — [official source](https://fred.stlouisfed.org/series/WTREGEN)
- Display definition: level; USD millions.
- Freshness limit: 21 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 19 — M2 money-supply growth

- Source: Federal Reserve / FRED — [official source](https://fred.stlouisfed.org/series/M2SL)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 20 — US investment-grade credit spread

- Source: FRED / ICE BofA — [official source](https://fred.stlouisfed.org/series/BAMLC0A0CM)
- Display definition: level; percentage points.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Third-party data; review source terms

### 21 — Excess bond premium

- Source: Federal Reserve research
- Display definition: level; percentage points.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 22 — Commercial and industrial loan growth

- Source: Federal Reserve H.8 / FRED — [official source](https://fred.stlouisfed.org/series/BUSLOANS)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 23 — Consumer-loan delinquency rate

- Source: Federal Reserve / FRED — [official source](https://fred.stlouisfed.org/series/DRCLACBS)
- Display definition: level; percent.
- Freshness limit: 200 calendar days from the observation date.
- Exploratory lag assumption: 100 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 24 — Continuing unemployment claims

- Source: DOL / FRED — [official source](https://fred.stlouisfed.org/series/CCSA)
- Display definition: level; claims.
- Freshness limit: 21 calendar days from the observation date.
- Exploratory lag assumption: 13 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 25 — Nonfarm payroll growth, 3-month average

- Source: BLS / FRED — [official source](https://fred.stlouisfed.org/series/PAYEMS)
- Display definition: payroll3; thousand jobs / month.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 38 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 26 — Temporary-help employment growth

- Source: BLS / FRED — [official source](https://fred.stlouisfed.org/series/TEMPHELPS)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 38 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 27 — Average weekly hours worked

- Source: BLS / FRED — [official source](https://fred.stlouisfed.org/series/AWHAETP)
- Display definition: level; hours.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 38 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 28 — Job openings per unemployed person

- Source: BLS JOLTS + CPS — [official source](https://fred.stlouisfed.org/series/JTSJOL)
- Display definition: ratio; openings / unemployed.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 65 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 29 — Core PCE inflation

- Source: BEA / FRED — [official source](https://fred.stlouisfed.org/series/PCEPILFE)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 30 — Headline CPI inflation

- Source: BLS / FRED — [official source](https://fred.stlouisfed.org/series/CPIAUCSL)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 45 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 31 — 5Y5Y forward inflation compensation

- Source: FRED — [official source](https://fred.stlouisfed.org/series/T5YIFR)
- Display definition: level; percent.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 32 — ISM services activity index

- Source: ISM / licensed vendor
- Display definition: level; index.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 33 — Industrial production growth

- Source: Federal Reserve / FRED — [official source](https://fred.stlouisfed.org/series/INDPRO)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 50 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 34 — Real retail-sales growth

- Source: Census + BLS / FRED — [official source](https://fred.stlouisfed.org/series/RRSFS)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 50 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 35 — Real personal income excluding transfers

- Source: BEA / FRED — [official source](https://fred.stlouisfed.org/series/W875RX1)
- Display definition: yoy; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 36 — Real GDP growth

- Source: BEA / FRED — [official source](https://fred.stlouisfed.org/series/GDPC1)
- Display definition: qoqAnnualized; percent annualized.
- Freshness limit: 200 calendar days from the observation date.
- Exploratory lag assumption: 120 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 37 — Building permits

- Source: Census / FRED — [official source](https://fred.stlouisfed.org/series/PERMIT)
- Display definition: level; thousand units annual rate.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 50 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 38 — Housing starts

- Source: Census / FRED — [official source](https://fred.stlouisfed.org/series/HOUST)
- Display definition: level; thousand units annual rate.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 50 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 39 — Consumer sentiment expectations

- Source: University of Michigan / FRED
- Display definition: level; index.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 40 — OECD composite leading indicator

- Source: OECD
- Display definition: level; index.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 41 — WTI crude oil price

- Source: EIA / FRED — [official source](https://fred.stlouisfed.org/series/DCOILWTICO)
- Display definition: level; USD / barrel.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 2 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 42 — Brent crude oil price

- Source: EIA / FRED — [official source](https://fred.stlouisfed.org/series/DCOILBRENTEU)
- Display definition: level; USD / barrel.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 2 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 43 — Copper price

- Source: IMF via FRED (monthly copper price) — [official source](https://fred.stlouisfed.org/series/PCOPPUSDM)
- Display definition: level; USD / metric ton.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 45 calendar days from the observation date. This is not a verified release schedule.
- Rights: Third-party data; review source terms

### 44 — Broad trade-weighted US dollar

- Source: Federal Reserve / FRED — [official source](https://fred.stlouisfed.org/series/DTWEXBGS)
- Display definition: level; index.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 7 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 45 — Global supply-chain pressure index

- Source: New York Fed
- Display definition: level; standard deviations.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 46 — Aggregate public-company EPS growth

- Source: SEC / licensed fundamentals
- Display definition: level; percent YoY.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 47 — Aggregate operating profit margin

- Source: SEC / licensed fundamentals
- Display definition: level; percent.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 48 — Earnings surprise / beat rate

- Source: Licensed consensus + reported EPS
- Display definition: level; percent.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### 49 — VIX equity volatility index

- Source: Cboe / FRED — [official source](https://fred.stlouisfed.org/series/VIXCLS)
- Display definition: level; index.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Third-party data; review source terms

### 50 — Equity breadth: share above 200-day average

- Source: Licensed prices + historical constituents
- Display definition: level; percent.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 60 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review provider terms

### Benchmark — S&P 500 price index

- Source: S&P Dow Jones Indices via FRED — [official source](https://fred.stlouisfed.org/series/SP500)
- Display definition: level; index.
- Freshness limit: 7 calendar days from the observation date.
- Exploratory lag assumption: 1 calendar days from the observation date. This is not a verified release schedule.
- Rights: Copyrighted index data; personal research only subject to source terms

### Benchmark — NBER recession indicator

- Source: NBER via FRED — [official source](https://fred.stlouisfed.org/series/USREC)
- Display definition: level; 0 / 1.
- Freshness limit: 100 calendar days from the observation date.
- Exploratory lag assumption: 0 calendar days from the observation date. This is not a verified release schedule.
- Rights: Review source terms


## S&P 500 valuation additions

| ID | KPI | Automatic source | History |
|---|---|---|---|
| 51 | S&P 500 trailing P/E ratio | [Multpl monthly table](https://www.multpl.com/s-p-500-pe-ratio/table/by-month), including latest estimate | Up to 20 years of revised monthly history |
| 52 | S&P 500 price-to-cash-flow ratio | [State Street Index Characteristics](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy) | Dated snapshots accumulate from the first refresh; no historical backfill |

Select both under Company earnings & equity markets. Use Refresh in the indicator details or Load free data. Enable **Refresh daily while MacroSignals is open** in Settings for daily updates. No API key is required. The web app must remain open and visible; this is not a server-side schedule.

The adapters read public HTML pages, validate the ratio and source observation date, and retain cached data on blocked requests, missing values, stale responses or format changes. Imported histories are preserved. Cash-flow observations with the same source date are updated, not duplicated. Missing historical periods are not fabricated.

Keep the same provider and methodology across a series. Trailing P/E differs from forward P/E and CAPE. Cash flow differs from free cash flow; the cash-flow series uses the provider's index aggregation. Valuation series remain labeled revised even when FRED retrieval is set to first-release mode. They cannot qualify as first-release predictors. High valuations alone do not establish when a downturn will occur.
