# Strix Impact Classifier — Candidate Model Card

## Status

**NO-GO / no production model artifact.** The training and evaluation pipelines are implemented, but the available inventory has no reviewed raw replay dataset. Synthetic smoke-test results are not model-quality evidence.

## Intended use

- Experimental classification of short sensor windows into crash and non-crash event classes.
- Shadow-mode comparison with the unchanged rules engine.
- Offline research only until the Phase 7 gate passes.

## Prohibited use

- Changing or suppressing the rules-engine safety decision.
- Assigning liability, legal fault, identity, insurance status, or exact speed of another vehicle.
- Presenting synthetic metrics as field accuracy.

## Candidate architecture

- Type: multinomial linear softmax classifier.
- Feature schema: `impact-features-v1`, schema version 1.
- Portable artifact: JSON coefficients, intercepts, normalization means/scales, dataset digest, and top coefficients per class.
- Runtime: optional TypeScript adapter in shadow mode with rules-only fallback.

The linear form is intentionally interpretable. Each class score is:

$$
z_c = b_c + \sum_j w_{c,j}\frac{x_j-\mu_j}{s_j}
$$

and class probabilities are computed with softmax.

## Data requirements

Training remains blocked until all of the following are available:

- reviewed labels and raw privacy-safe `SensorReplayV1` windows;
- at least two supported classes with sufficient events;
- diversity across users, trips, vehicles, devices, placements, and quality bands;
- grouped train/validation/test split with a frozen independent test partition;
- documented retention, reviewer protocol, and deletion process.

## Features and privacy

The model uses aggregate motion, timing, GPS-speed, and data-quality features. Exact coordinates, absolute time, account identifiers, email, phone number, and report text are excluded. User labels remain pending until human review.

## Evaluation requirements

A release candidate must report confusion matrix, per-class precision/recall/F1, Macro F1, false alarms per driving hour, Brier score, ECE, and slices by device, placement, vehicle class, and quality. It must outperform or add demonstrable value over the frozen rules baseline on the independent test set.

## Known limitations

- No reviewed field dataset or independent holdout currently exists.
- Rare crash classes can be highly imbalanced.
- Sensor range, mounting, road, and device shifts can invalidate calibration.
- A linear model may underfit complex temporal patterns.
- A probability is not a legal or causal conclusion.

## Safety and fallback

The runtime adapter emits observational shadow predictions only. Missing, invalid, or failing models return `rules-only`; the rules decision remains unchanged. Any future activation requires a separate reviewed change, rollback plan, and model-version monitoring.
