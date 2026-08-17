# Strix Sensor Dataset Policy

## Purpose

The dataset is used only to evaluate impact-event classification. It must not train or infer legal liability, identity, location, insurance status, or driver behavior unrelated to crash detection.

## Consent and retention

- Collection is disabled by default and requires explicit opt-in using consent version `sensor-research-v1`.
- Revoking consent stops future recording. A user may delete their own pending submissions.
- Raw uploads are private and must have a documented retention period before production rollout.
- Exact coordinates, absolute session start time, account identifiers, email, phone, and report text are excluded from model features.

## Labels

Allowed user labels are:

- `crash`
- `pothole`
- `hard_braking`
- `phone_drop`
- `door_slam`
- `rough_road`
- `normal_driving`
- `other`

User labels enter the review queue as `pending`. Only reviewer-verified labels may enter the final test set. `crash` requires corroboration appropriate to the study protocol; a user tap alone is not a verified crash.

## Grouped split policy

Split complete groups, never individual samples. A group key is derived from user, vehicle, device, and trip/session identifiers. No group may appear in more than one partition.

Recommended initial allocation:

- training: 70%
- validation: 15%
- test: 15%

The test partition is frozen before model selection. Repeated windows from one physical event stay in one group. Synthetic and test-rig recordings are reported separately and never replace a real-world test partition.

## Quality gates

A model experiment is blocked when:

- verified positive events are absent or too sparse for stable per-class metrics;
- only one device or vehicle dominates a class;
- raw replay samples are unavailable;
- labels are unreviewed;
- a split leaks users, vehicles, devices, trips, or physical events;
- required privacy fields cannot be removed.

## Current readiness (2026-08-17)

The production metadata inventory contains 150 accident reports, 46 false-alarm rows, and four distinct devices. Existing accident rows contain report summaries but not raw `SensorReplayV1` windows, and no reviewed ground-truth labels are available. This is insufficient for ML training. The opt-in replay collection pipeline must accumulate and review data first.

## Evaluation

Report at minimum:

- confusion matrix per class;
- precision, recall, and Macro F1;
- false alarms per driving hour;
- Brier score and expected calibration error;
- results by device model, phone placement, vehicle class, and data-quality band;
- comparison against the unchanged rules baseline.

The model starts in shadow mode. A model failure or missing feature always falls back to the rules engine, and model output never directly assigns liability.
