# Phase 7 ML Go/No-Go Decision

**Date:** 2026-08-17
**Decision:** `NO_GO_INSUFFICIENT_REVIEWED_DATA`

## Decision

Do not train, merge, or activate an impact model in production. Keep the rules engine as the sole decision source. The optional runtime adapter may be exercised only with an explicitly supplied research model in shadow mode; it cannot change the event decision.

## Evidence

- Training/evaluation scripts and a versioned feature schema are implemented.
- Grouped splitting rejects unreviewed labels and prevents a group from crossing partitions.
- The production inventory has 150 report rows and 46 false-alarm rows across four devices, but no raw replay windows and no reviewed labels.
- No frozen independent test set exists, so model-vs-rules superiority cannot be measured.
- A synthetic end-to-end smoke test validates tooling only and is not an accuracy claim.

## Safety controls accepted

- Collection is opt-in and strips exact location and absolute time.
- The model output is shadow-only.
- Invalid, missing, or failing models return to rules-only mode.
- Model output never assigns liability.
- Phase 7 is not merged by default and has no release tag.

## Conditions to reconsider

1. Approve retention, review, and deletion procedures.
2. Collect sufficient reviewed events across classes, devices, placements, vehicles, and trips.
3. Freeze a grouped independent test set before model selection.
4. Report per-class metrics, Macro F1, false alarms/hour, Brier, ECE, and slice performance.
5. Demonstrate value over the unchanged rules baseline without reducing safety recall.
6. Complete a separate activation review with rollback and drift monitoring.
