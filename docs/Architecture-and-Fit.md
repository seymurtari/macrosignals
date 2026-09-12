# Architecture and starting-point review

The approved plan called for a focused, local-first desktop application, initially comparing reuse of Fincept with a custom implementation. The source review favored the custom path for this scope. This was a source-level fit review; Fincept was not installed or run on Windows in this session.

| Existing project | Useful starting point | Fit for this app |
|---|---|---|
| [Fincept Terminal](https://github.com/Fincept-Corporation/FinceptTerminal) | Broad desktop finance terminal; Qt/C++ application with Python data/analytics scripts; AGPL-3.0 | Closest complete desktop product. Its broader architecture and Qt build requirements add integration work for a focused four-page personal tool. The reviewed FRED adapter returned date/value records without retaining release-vintage information in that path, so copying it would not supply the required timing safeguards. |
| [OpenBB](https://github.com/OpenBB-finance/OpenBB) | Broad financial-data platform and provider ecosystem; AGPL-3.0 | Valuable later for a wider provider backend. It is not a drop-in local desktop version of this interface and does not remove provider entitlements. |
| [FinanceToolkit](https://github.com/JerBouma/FinanceToolkit) | Fundamentals and finance calculations; MIT | Useful if adding reproducible company aggregation and financial-ratio tools. The initial release uses narrowly scoped macro calculations instead. |
| [Riskfolio-Lib](https://github.com/dcajasn/Riskfolio-Lib) | Portfolio optimization and risk analysis; BSD-3-Clause | Relevant to a future portfolio page; it does not provide the proposed four-page macro desktop product. |
| [Qlib](https://github.com/microsoft/qlib) | Quantitative research pipeline; MIT | Relevant to a larger research platform with model/data pipelines; considerably more infrastructure than the initial app needs. |

Reference source reviewed: [Fincept FRED adapter](https://github.com/Fincept-Corporation/FinceptTerminal/blob/main/fincept-qt/scripts/fred_economic_data.py), alongside its getting-started/build documentation. Repository structure, licenses and functionality may change after the review date, 12 September 2026. No source code from these projects was incorporated into MacroSignals.

## Delivered structure

| Component | Responsibility |
|---|---|
| `src/` | React interface, D3 SVG charts and styles. No direct filesystem, arbitrary navigation or network access. |
| `desktop/main.cjs` | Electron window, official-provider fetches, allowed native dialogs, encrypted FRED key storage, IPC validation, refresh scheduling and research snapshots. |
| `desktop/preload.cjs` | Explicit narrow API exposed through the context bridge. |
| `core/providers.mjs` | Public FRED CSV, FRED initial-release API, source normalization and provider-derived units. |
| `core/series.mjs` | CSV parsing, date/calendar alignment, display transformations and correlation calculations. |
| `core/analysis.mjs` | Availability-aware historical tests, logistic regression, rules, event study and scenarios. |
| `core/worker.mjs` | Backtest worker, keeping calculation work away from the desktop event loop. |
| `core/storage.cjs` | Serialized atomic JSON writes, cache/settings loading and recovery copies. |
| `core/settings.cjs` | Settings validation for UI saves, startup state and imports. |
| `data/` | The 50-indicator catalogue, two benchmarks and source/cost comparisons. |
| `tests/` | Numerical, leakage, import, persistence, provider-error and four-page UI checks. |

An Electron `app://` protocol serves the bundled interface directly; no local HTTP server is needed. The window has a sandboxed renderer, context isolation and no Node integration. New windows, webviews, arbitrary external navigation, browser permissions and renderer network requests are blocked. Official source URLs are allowlisted. A single-instance lock avoids concurrent writers to the workspace. The application does not collect Chrome credentials or cookies.

The proposed Python/DuckDB service was simplified to a JavaScript core and atomic JSON snapshots to ship one runtime without native data-engine setup. The workload is bounded to 50 indicators and a small predictor set. The first-release and forecast-timing requirements remain explicit. Larger histories or company-level panels would justify adding a local database and a separate analysis service later.

## Boundaries of this release

- Provider cards do not masquerade as connected paid APIs. Twelve metrics require a user-supplied entitled export; reported-company aggregates and analyst consensus are distinct inputs.
- No existing subscriptions are charged, renewed or changed. Browser source links use the user's default browser.
- The output is a Windows x64 portable build and editable source project. Windows signing and actual Windows UI verification require a suitable Windows release environment.
- No background service, cloud deployment, GitHub publication, automatic updater, brokerage connection or order execution is included.
- Research model outputs remain historical evaluations. Turning them into a live probability service would require additional prospective validation and a clearly defined update policy.
