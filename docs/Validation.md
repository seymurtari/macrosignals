# Validation record — 12 September 2026

This is a first working personal release, with explicitly bounded verification. It is not a validation of investment performance.

## Automated checks

The TypeScript check and production interface build passed. The 22 automated checks passed, covering:

1. CSV zero/missing-value handling, quoted CRLF input and release-date round trips.
2. Invalid/duplicate dates, malformed values and first-release import requirements.
3. Calendar-correct growth rates, quarterly annualization, payroll changes and composite availability.
4. Missing-month changes and calendar lag alignment.
5. Pearson/Spearman behavior, tied ranks, constant inputs and rolling-sample minimums.
6. Release-day exclusion, assumed lags and stale-input rejection.
7. Forward running-peak drawdowns, an exact 10% breach, and incomplete target coverage.
8. Rejection of revised predictors in strict mode and outcome series as predictors.
9. Purged training labels, fold-only scaling, and an unchanged holdout model after future feature values are altered.
10. Consecutive-month rules, stale data, and equal weighting of economic categories.
11. Tied-score average precision and unchanged-rate exclusion from the event study.
12. Public FRED CSV normalization.
13. Initial-release API request parameters and retained availability timestamps using fixtures.
14. Rate limits, malformed provider responses and error messages that exclude API keys.
15. Shared component fetches and use of actual outcome history.
16. Concurrent persistent writes and restart recovery.
17. Malformed and structurally invalid storage retained in recovery copies.
18. Settings validation and rejection of invalid rules/outcome selections.
19. Four-page UI navigation, catalogue count, persisted selection, chart generation from injected cached observations, modal keyboard flow and preserved cache after a refresh error.

20. A 240-month display limit with pre-window inputs retained for growth calculations and z-scores fitted only over visible history.
21. Short histories stay short, while future observations are excluded from visible coverage.
22. Upgrade migration preserves existing selections, watchlists and preferences, applies the 20-year range once, and retains later user choices.

The UI check also exercises the 20-year selector, persistence across range changes, the full selected-KPI coverage list, individual history charts, all nine catalogue group headers, collapsing/reopening a group and filtering the housing group. These checks cover the 0.1.1 update. The live-source record below is retained from the initial release; the provider retrieval implementation did not change for this update.

The UI check executes the actual production React bundle in jsdom. Its observations and API boundary are test fixtures; it is not a screenshot, a native Electron-window test, or verification of Windows layout and operating-system dialogs.

## Live source check

The real no-key provider adapter successfully retrieved all **15 default KPIs and both benchmark/outcome series**. Their returned series counts, coverage dates and provenance are recorded in [Live-Source-Check.json](Live-Source-Check.json). The initial connection review also confirmed public CSV responses for the catalogue's raw FRED source series; the focused final check exercises the actual application adapter for the default watchlist.

Two consequential findings:

- The returned high-yield spread history began on 12 September 2023. Including it in the six-feature exploratory test left only 30 complete rows, and the app correctly refused to run below its 96-row minimum. It remains in the monitoring watchlist but is excluded from the default test.
- The S&P 500 series returned history from 12 September 2016 through 11 September 2026. The five default historical features produced **47 evaluated months**, with **24 final-holdout months** beginning 31 March 2024 and three fitted folds. These results are exploratory revised-history calculations, not a point-in-time or forward performance claim. More historical cycles require a longer entitled daily benchmark.

No first-release API call was made using a real key: no user key was available. The API path is fixture-tested and uses the documented initial-release format, but real archival entitlements and usability must be checked when the user supplies a free key. No paid provider login, subscription entitlement or export permission was verified.

## Packaging and remaining platform checks

The delivered target is a portable Windows x64 executable containing the app and its Electron runtime. The build is unsigned. The ordinary NSIS installer target is also in the source project, but generating its uninstaller on this Linux host required unavailable Wine tooling; the portable target completed without that dependency.

Release verification checks the Windows executable header, packed app files against the working source, and execution of the unpacked analysis worker on the build host. The worker's ESM files are shipped outside the ASAR archive so they do not depend on worker-thread archive resolution.

**Actual Windows startup and visual rendering, native CSV/backup dialogs, external-browser opening, OS key encryption, operating-system permissions, SmartScreen behavior and sleep/resume refresh behavior remain untested.** Linux desktop launch was unavailable under this environment's runtime constraints. No runtime sandbox was disabled to obtain a launch result.

The interface starts empty and retrieves observations only when requested or after the user enables daily refresh. Test fixtures and live-check caches are not included as application data. Provider metadata and the deliberately labeled catalogue are bundled; displayed market observations are retrieved or imported by the user.

## Reproduce

From the source project, run `npm ci`, `npm run check`, `npm run build`, and `npm test`. The included `scripts/verify-release.mjs` checks a built Windows release. See the main README for launch/build commands and the methodology document for assumptions and limitations.
