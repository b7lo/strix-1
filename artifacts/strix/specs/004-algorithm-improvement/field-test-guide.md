# Field Test Guide

## Safety and authorization

Use controlled, authorized environments and trained personnel. Do not stage road crashes in public traffic. Prefer instrumented test rigs for positive impacts. Stop a run for unsafe weather, unsecured devices, sensor overheating, or unexpected vehicle behavior.

Obtain explicit research consent before replay collection. Do not place precise location, account identifiers, report text, or unreviewed personal information in fixtures or Git.

## Test matrix

Cover at minimum:

- iOS and Android devices across sensor ranges and low/high performance tiers;
- 20/25/50/100 Hz and naturally variable sample rates;
- mount, pocket, seat, cup holder, and four phone orientations;
- sedan, SUV, pickup, van/truck where authorized;
- smooth, rough, pothole, braking, acceleration, turning, lane change, door slam, phone drop, and long idle sessions;
- GPS unavailable/degraded, network offline, background/foreground transitions, and phone movement during a session;
- controlled front, rear, side, and corner impacts on test rigs.

## Per-run procedure

1. Record app, engine, replay schema, threshold, OS, device, placement, vehicle, and test protocol versions.
2. Verify sensor permission, storage budget, time monotonicity, expected rate, and calibration state.
3. Start the session before the maneuver and avoid moving the phone unless movement is the test variable.
4. Record an operator log using relative times only.
5. End the session, assign a user label, and send it to review; user labels are not ground truth.
6. Export with exact location and absolute start time disabled.
7. Replay the file at least twice and confirm deterministic JSON output.
8. Attach a regression fixture only after privacy review and de-identification.

## Required measurements

- Detection confusion matrix, recall, precision, false alarms per driving hour, and confirmation delay.
- Zone confusion matrix and top-2 zone accuracy.
- Timing rate, jitter, gaps, saturation, calibration age, and confidence dimensions.
- P50/P95 sample-processing time, retained buffer sizes, UI update rate, and physical-device battery drain.
- Matching precision/recall and contradiction rejection for paired-party tests.
- For ML research only: grouped split integrity, per-class metrics, Brier, ECE, and slices by device/placement/vehicle/quality.

## Acceptance rules

- Do not accept a change that lowers safety recall or raises false alarms without a documented review.
- Repeated sessions and resampled versions must preserve the expected decision within documented boundaries.
- A moved phone must reduce direction confidence and trigger recalibration.
- A saturated sensor must not report the clipped peak as exact.
- Missing GPS or one weak angle cannot produce a high-confidence party match.
- Liability remains non-conclusive when required evidence is weak or rules are unreviewed.
- ML results remain observational until a reviewed independent test set passes the Phase 7 gate.

## Incident handling

For every new field failure, preserve a privacy-safe replay, add a failing regression test first, document the device/test conditions, and only then implement the smallest isolated correction. Never tune thresholds and restructure logic in the same review.
