# Algorithm Improvement Final Report

**Validation date:** 2026-08-17
**Scope:** Phases 0–6 completed; Phase 7 closed as an optional `NO-GO` experiment pending reviewed data.

## Executive result

The sensor engine now has deterministic replay, elapsed-time normalization, separate impact/motion paths, an impact state machine, probabilistic zones, separated confidence dimensions, explainable conservative liability rules, stronger two-party matching, atomic threshold configuration, and bounded hot-path performance. The optional ML infrastructure cannot change decisions and has no production artifact.

All reported algorithm accuracy below comes from synthetic/regression fixtures and must not be interpreted as street performance.

## Before and after

| Measure | Initial baseline | Final regression result | Interpretation |
|---|---:|---:|---|
| Fixture count | 7 | 8 | Added door-slam negative coverage |
| Precision | 1.0 | 1.0 | Synthetic fixtures only |
| Recall | 1.0 | 1.0 | Synthetic fixtures only |
| False alarms/hour | 0 | 0 | Synthetic fixture durations only |
| Zone accuracy | 1.0 | 1.0 | Synthetic fixtures only |
| Sample-rate decision | not normalized across all paths | invariant at 25/50/100 Hz | Regression gate passed |
| Matching precision/recall | not measured in baseline | 1.0 / 1.0 on 8 fixtures | Includes hard contradictions |
| Confidence calibration | unavailable | Brier 0.058333, ECE 0.216667 on 6 synthetic points | Not field-calibrated |
| Processing P95 at 100 Hz | not measured | about 0.0017 ms in latest run | Far below 10 ms sample period |
| Retained profiler/sensor samples | not formally bounded | 4096 / 1000 caps | Logical bounded-memory gate passed |

## Completed capabilities

- One versioned replay format and deterministic live/replay adapter.
- Privacy-safe export, opt-in research collection, and pending-label review workflow.
- Protected timing, gap/jitter quality, time windows, and bounded interpolation.
- Fast raw-minus-gravity impact path plus smooth time-normalized motion path.
- Single-confirmation impact state machine with post-impact/cooldown handling.
- Pothole, phone movement/drop, and stationary door-slam rejection evidence.
- Vehicle-frame calibration, movement invalidation, and probabilistic impact zones.
- Separate data, event, direction, scenario, and liability confidence.
- Scenario inference separated from identified, explainable liability rules.
- Conservative non-conclusive liability when evidence conflicts or rules are unreviewed.
- Peak timing, reciprocal contact, heading, and GPS-quality matching checks.
- Atomic remote threshold validation, fallback, and rollback.
- Bounded profiler/hot-path structures and UI rate limiting.
- Interpretable ML training/evaluation tooling and a shadow-only runtime adapter with rules fallback.

## Final verification

- TypeScript passed for the Strix app, API server, and liability package.
- Strix Jest: 47 suites, 253 tests passed.
- Liability package: 7 tests passed.
- API server: 3 files, 17 tests passed.
- Algorithm evaluation: 3/3 positives and 5/5 negatives classified as expected.
- Sample-rate evaluation: invariant at 25, 50, and 100 Hz.
- Phase 6 matching/performance evaluation passed with bounded retained memory.
- End-to-end synthetic ML smoke test passed; it is tooling validation only.
- `git diff --check` passed.
- Changed-file scan found no private key, service-role value, or generic secret value.

## Open limitations and blocked work

- No reviewed raw field replay dataset or independent test set exists.
- T153, T154, and T159 remain blocked as real-data execution tasks; scripts and report structures exist but no model-quality claim is permitted.
- Physical-device battery drain remains unmeasured; only rate limiting is verified.
- Liability rules have no external traffic/legal reviewer and remain engineering hypotheses.
- Phase 4 has no independent repository tag from its original closure.
- A final release tag requires explicit reviewer approval.

## Release recommendation

The rules-based Phases 0–6 are ready for review as the stable algorithm line. Keep Phase 7 on the experiment branch and do not activate or merge a model until the documented data, independent-test, safety-recall, calibration, rollback, and monitoring gates pass.
