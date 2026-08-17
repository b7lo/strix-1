# Phase 6 Performance and Battery Report

**Generated:** 2026-08-17
**Command:** `pnpm --filter @workspace/strix run evaluate:phase6`

## Sample-processing benchmark

The benchmark processed 50,000 synthetic samples at a logical 100 Hz rate through gravity removal, magnitude calculation, timing/rate estimation, baseline/frequency analysis, and the bounded sensor buffer.

- P50: **0.000643 ms**
- P95: **0.001014 ms**
- Maximum observed: **0.309094 ms**
- 100 Hz sample period: **10 ms**
- P95 safety margin: **9.998986 ms**

These numbers are a deterministic Node/Linux engineering benchmark, not an iPhone performance claim. The production profiler records the same path with a bounded 4,096-sample window so physical-device P50/P95 can be collected without unbounded memory growth.

## Memory behavior

- Logical long-session test: 50,000 samples.
- Sensor ring buffer: **1,000 / 1,000** retained samples.
- Profiler ring buffer: **4,096 / 4,096** retained measurements.
- Both buffers overwrite old entries; retained memory does not grow with session duration.
- Jest regression verifies the sensor buffer and a 128-entry profiler remain bounded after 50,000 samples.

## Hot-path changes

- Recent impact-vector weighting now iterates the last eight ring-buffer entries without creating `slice` and `filter` arrays.
- Impact timestamp pruning and counting no longer allocate filtered arrays.
- Advanced analysis replaces temporary `map`/`filter`/`reduce` arrays with single-pass aggregation for yaw, variance, jerk synchronization, and stable-driving calculations.

## UI and battery controls

- Accelerometer processing can run at up to 100 Hz.
- React state updates for live G-force and calibration are limited to **10 Hz** (`100 ms` throttle).
- Magnetometer and DeviceMotion subscriptions run at **5 Hz** (`200 ms` interval).
- Replay recording uses refs and bounded buffers rather than per-sample React state.

Battery drain was **not measured on a physical device** in this run. A controlled iPhone field run is still required for a defensible battery percentage/hour figure; this phase verifies rate limiting and bounded work only.

## Result

The automated performance gate passes: bounded memory is confirmed, and measured P95 processing time is below the 100 Hz sample period with a large engineering margin in the benchmark environment.
