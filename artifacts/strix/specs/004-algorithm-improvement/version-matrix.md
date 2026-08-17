# Algorithm Version Matrix

| Stage | Stable tag/status | Engine / schema | Thresholds | Model | Notes |
|---|---|---|---|---|---|
| Phase 0 baseline | `algorithm-p0-baseline` | baseline report schema 1 | local v1 | none | Synthetic deterministic baseline |
| Phase 1 replay | `algorithm-p1-replay` | `SensorReplayV1`, engine v7.3 | recorded in replay | none | Privacy-safe deterministic recorder/player |
| Phase 2 timing | `algorithm-p2-time` | engine v7.3 | time-normalized | none | 25/50/100 Hz invariance gate |
| Phase 3 detection | `algorithm-p3-detection` | impact state machine | calibrated rule set | none | Dual signal paths and non-crash rejection |
| Phase 4 direction | completed; no repository tag | vehicle frame + zone distribution | unchanged structure | none | User-approved; Git isolation unavailable at closure |
| Phase 5 confidence/liability | `algorithm-p5-liability` | engine v7.3 phase 5 | legal snap + raw score | none | Rules unreviewed; conservative ranges |
| Phase 6 operations | `algorithm-p6-operations` | report/replay version fields | atomic remote config with rollback | none | Matching, physical checks, bounded performance |
| Phase 7 experiment | `NO_GO_INSUFFICIENT_REVIEWED_DATA` | feature schema 1 | rules unchanged | no trained artifact | Tooling and shadow fallback implemented only |
| Final release | pending review | preserve recorded versions | preserve rollback version | none | Final tag requires reviewer approval |

## Compatibility rules

- Reject unknown replay or feature schema versions rather than guessing.
- Preserve engine and threshold versions in every replay/report used for comparison.
- Never compare two reports without recording changed engine, threshold, fixture, and model versions.
- A future model artifact must match feature schema 1, pass structural validation, and remain shadow-only until a separate activation decision.
