# Calculation and validation methodology

## Dates and transformations

Each stored observation has an observation date, numeric value, and optional availability date. The public CSV adapter labels its output `latest-revised`. The initial-release API adapter labels its output `fred-first-release`. Imports are `import-revised` or `user-first-release`; the latter is an assertion by the importer, not independently verified provenance.

Provider-derived growth rates use exact calendar comparisons: 12 months for year-over-year monthly/quarterly series, three months for quarterly annualization, and the change over three months divided by three for average monthly payroll additions. Composite ratios align observation dates and use the latest availability date among their constituents. Initial-release growth rates compare initial-release levels of both periods; they do not reproduce later revisions to earlier levels that a contemporaneous forecaster might have known. Data from different sources with the same month can still have different publication dates.

Charts select the last observed value in each observation month; quarterly observations remain quarterly. They do not forward-fill missing calendar months. Native changes use an exactly adjacent calendar month. Percentage changes are `100 × (current/prior − 1)` and skip a zero denominator. Applying percentage changes to spreads or rates crossing zero may not be economically useful; native-unit changes are the default for correlation analysis.

The default 20-year display window contains the current calendar month and 239 preceding months. Observations dated after today are excluded. The current month may be partial; the chart positions its available observation at month-end. Coverage dates use the actual underlying observation dates. Earlier raw values are retained for calculating growth at the start of the visible range. Display z-scores use the mean and population standard deviation of the displayed observations. They are descriptive and never reused for model training. Overlays with different native units are blocked in native-level and native-change modes. Benchmark correlations use monthly market percentage returns; predictor representation is separately selected.

Pearson correlation requires at least three pairs and nonzero variance. Spearman uses average ranks for ties. Lags match calendar months: a positive lag means A precedes B. The sweep offers −12, −6, −3, −1, 0, 1, 3, 6 and 12 months. Rolling correlations are contemporaneous, over 36 calendar months, with at least 12 matched observations. Correlations do not imply causal or stable predictive relationships; exploring multiple lags increases selection bias.

## Historical outcomes

At a month-end forecast date, the market outcome is whether the price index experiences a specified 10% or 20% drawdown from a running peak during the next 3, 6 or 12 months. The running peak begins at the latest price at or before the forecast date and can rise within the forward window. This is a forward peak-to-trough event, not simply a negative end-to-end return. A peak before the forecast date is not carried into the target window.

The benchmark baseline must be within seven calendar days of the forecast date. The forward window must have complete coverage to within seven days of its end, with no internal gap exceeding seven days. These checks avoid classifying a sparse monthly series as a complete daily drawdown record. They cannot detect every missing trading session. The public S&P 500 index excludes dividends; alternative imports may define a different target.

The alternative recession label asks whether any of the next horizon's monthly `USREC` labels is positive. All expected monthly labels must be present. NBER dates are retrospective outcomes and are not used as predictors. A recession and a market decline are distinct events.

## Predictor availability

Strict mode requires every predictor to carry first-release provenance. Availability enters one day after its reported release date because intraday publication times are not modeled. The latest observation known by the forecast date is selected, subject to the indicator's freshness limit. No later revision is substituted. Unusable archival timing produces an error rather than a silently assumed date.

Exploratory mode permits revised history. Where no availability date is supplied, it uses the per-indicator fixed lag in the catalogue. These lags are rough timing assumptions, not actual release calendars or a correction for revision bias. They are displayed in the indicator details. Some assumptions can admit a revised value earlier than it truly became known; exploratory results are explicitly not point-in-time validation.

Features are either the latest known native KPI value, or its difference from the value known at the prior month-end. Freshness limits are seven days for most daily data, 21 days for weekly data, 100 days for monthly data and 200 days for quarterly data, with explicit catalogue values controlling each series. Rows with any unavailable/stale input are dropped.

## Model and splits

The research model is logistic regression with fixed L2 regularization (`lambda=0.1`), 350 gradient steps and no automatic hyperparameter search. Features are standardized using only each training fold's mean and population standard deviation. Constant training features use a scale of one.

The training window expands. Test models are frozen for up to 12 calendar months, then refitted. Every training outcome must finish strictly before the next test boundary. This purges overlapping labels at the boundary. The last 24 calendar months of usable forecast dates are designated the final holdout; its model is fitted once and never learns from holdout labels. Missing observations can make the holdout shorter in row count. At least 96 complete rows are required overall, with at least 60 training months, five positive and five negative training labels. At least 12 evaluable test predictions are required to show a result.

The model is a reproducible research baseline, not an established forecasting system. The coefficients and fold scalers are retained in the audit export. Repeatedly trying features and inspecting the same holdout compromises its independence; the app cannot prevent researcher selection bias. It does not perform cross-sectional company aggregation, automated feature searches, transaction-cost modeling, trading execution or live model deployment.

## Evaluation

- Brier score is the mean squared probability error; lower is better. The comparison baseline is the smoothed event rate in the matching historical training sample.
- Precision and recall use a 50% probability alert threshold. Calibration uses five probability bins; empty bins show no rate. Average precision is calculated with tied predictions grouped together and retained in the export.
- False alerts per year count consecutive alert groups with no positive outcome in any of their forecast months, divided by evaluated months/12. This is a diagnostic based on evaluated rows, not a full daily alert system. Missing evaluated months can affect grouping.
- Positive forecast-month clusters are not independent crises. The same future decline can create several overlapping positive labels.
- The 90% Brier interval uses 200 deterministic circular block resamples of length 12 from the fixed predictions. It does not include uncertainty from model selection, alternative data definitions or unavailable historical information.
- Lead time in the export averages time from positive alert dates to the first forward threshold breach. Overlapping alerts may refer to the same event.

## Rules, scenarios and events

Watch rules apply a strict `above` or `below` threshold in native units and require the configured number of consecutive observation months. Missing months yield insufficient coverage. Stale data is excluded. Rules within an economic category are averaged first; available category scores then receive equal weight. The resulting 0–100 score is descriptive, not a calibrated probability. Changes to catalogue selections do not delete saved rules.

The bond scenario uses percentage price change ≈ `−modified duration × yield shock in basis points / 100`. It omits convexity, credit-spread changes and carry. The factor scenario estimates a one-variable OLS slope between native monthly KPI changes and monthly market returns, then multiplies that slope by the chosen shock. The displayed result is a change relative to that historical relationship, not the fitted intercept or a causal forecast.

The Fed event study identifies actual changes in the midpoint of the target range. It uses effective dates, not statement timestamps, and excludes unchanged decisions. The pre-event return is from the tenth preceding market observation to the pre-event close. Forward returns use that pre-event close as the baseline and the fifth/twentieth subsequent trading observations as endpoints. Overlapping events, other contemporaneous news and dividend exclusion remain limitations.

## References

- [FRED observations API](https://fred.stlouisfed.org/docs/api/fred/series_observations.html) — availability fields and initial-release output.
- [FRED real-time periods](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html) — real-time/vintage concepts.
- [FRED S&P 500 series](https://fred.stlouisfed.org/series/SP500) — benchmark definition and available history.
- [NBER business cycle dating](https://www.nber.org/research/business-cycle-dating) — retrospective recession chronology.
