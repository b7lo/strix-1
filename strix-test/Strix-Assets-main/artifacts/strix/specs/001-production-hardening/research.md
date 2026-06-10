# Research: Production Hardening & App Store Readiness

**Date**: 2026-05-19  
**Branch**: `001-production-hardening`

## R-001: Vehicle Frame Transform for Braking Analysis

**Decision**: Apply `toVehicleFrame()` inside `analyzeBraking()` to extract the longitudinal deceleration axis regardless of phone orientation.

**Rationale**: Currently `analyzeBraking()` uses `filtered.y` (line 499) which is in device-frame coordinates. This only works when the phone is flat (gravity on Z). When the phone is portrait (gravity on Y), `filtered.y` captures gravity-related noise, not braking deceleration. The `toVehicleFrame()` function at line 107 already handles all 3 orientations (flat, portrait, landscape) and returns `vY` as the longitudinal (forward/backward) axis.

**Alternatives considered**:
- Remove `toVehicleFrame` and hard-code Y-axis: Rejected — breaks portrait/landscape.
- Apply transform at the ring-buffer level: Rejected — unnecessary overhead; only braking needs it.

**Implementation approach**:
- In `analyzeBraking()`, replace `const yDecel = -samples[i].filtered.y;` with `const vehicle = toVehicleFrame(samples[i].filtered); const yDecel = -vehicle.vY;`
- This ensures braking detection measures deceleration along the vehicle's forward axis.

---

## R-002: Supabase RLS Policy Compatibility

**Decision**: The existing RLS policies are **already correct** for the anon-key approach. No policy changes needed.

**Rationale**: Live audit of `pg_policies` confirms:
- INSERT: `true` (public role — anyone can insert) ✅
- SELECT: `true` (public role — needed for matching) ✅
- UPDATE: `true` (public role — needed for linking matched accidents) ✅

The `accidentSync.ts` code uses `Bearer ${SUPABASE_ANON_KEY}` which satisfies the `public` role. The policies are PERMISSIVE, so all operations will succeed. **No code changes needed for RLS.**

**Risk noted**: The SELECT policy returns ALL rows (no device_id filter at the policy level). This is acceptable because:
1. Matching requires reading other devices' accidents.
2. Only metadata is exposed (no PII).
3. Future auth can add stricter policies.

---

## R-003: Accident Sync Error Handling & Retry

**Decision**: Replace silent `null` returns with structured error propagation using `Alert.alert()` for user feedback and `AsyncStorage` for local persistence.

**Rationale**: Both `uploadAccident()` and `findMatchingAccident()` swallow all errors (`return null`). In `SessionContext.tsx` (lines 249-268), the async IIFE catches errors but only logs `console.warn`. The user never knows if their report failed to sync.

**Implementation approach**:
1. `accidentSync.ts`: Change `uploadAccident()` to throw typed errors instead of returning `null`.
2. `SessionContext.tsx`: Wrap the sync call in try/catch, show `Alert.alert` with "Retry" / "Save Locally" buttons.
3. Reports are already persisted locally via `storage.ts:saveReport()` — this is the fallback.
4. Add a `syncStatus` field to the report: `"synced" | "pending" | "failed"`.
5. Add a "Retry Sync" button in the report view for failed uploads.

**Alternatives considered**:
- Background auto-retry queue: Rejected by user (too complex for now).
- Toast notification: Rejected — not prominent enough for a critical failure.

---

## R-004: Device ID Race Condition

**Decision**: Make `initDeviceId()` awaitable and block crash processing until it completes.

**Rationale**: In `SessionContext.tsx` (line 320), `initDeviceId()` is correctly awaited before session start. However, `getDeviceId()` (line 53-61) generates a random fallback if called before `initDeviceId` finishes. If `initDeviceId()` later generates a different ID, the device will have two identities. The fix is to make `getDeviceId()` wait for initialization.

**Implementation approach**:
1. Use a `Promise` that resolves when initialization completes.
2. `getDeviceId()` should either return the initialized ID or throw if not initialized.
3. Since `startSession()` already awaits `initDeviceId()`, and crash analysis only runs during an active session, the race condition is mitigated — but the fallback code should be removed as a safety measure.

---

## R-005: iOS App Store Compliance — Background Modes & Permissions

**Decision**: Add missing iOS configurations to `app.json`.

**Rationale**: Audit of `app.json` confirmed missing:
- `NSLocationAlwaysUsageDescription` — required for `expo-task-manager` background monitoring
- `UIBackgroundModes: ["location", "fetch"]` — required for background execution
- `expo-location` plugin needs `locationAlwaysAndWhenInUsePermission` added

**Implementation approach**:
```json
"ios": {
  "infoPlist": {
    "NSLocationAlwaysUsageDescription": "Bilingual description...",
    "NSLocationAlwaysAndWhenInUseUsageDescription": "Bilingual description...",
    "UIBackgroundModes": ["location", "fetch"]
  }
}
```
Also update the `expo-location` plugin config to include `locationAlwaysAndWhenInUsePermission`.

**Privacy Manifest**: Expo SDK 54 auto-generates `PrivacyInfo.xcprivacy` for common APIs. No manual file needed, but verify at build time.

**ATT**: No analytics/ad SDKs detected — `NSUserTrackingUsageDescription` is NOT needed.

---

## R-006: Testing Directory Removal

**Decision**: Delete `app/testing/` directory entirely.

**Rationale**: User confirmed: remove entirely, don't gate behind `__DEV__`. The directory contains:
- `simulator.tsx` (7.7KB) — crash simulator
- `sensor-debug.tsx` (13.9KB) — sensor debug screen

Both are Expo Router file-based routes that would be accessible in production.

**Implementation approach**: Delete `app/testing/` and remove any navigation links to it.

---

## R-007: Deprecated `filterSample()` Removal

**Decision**: Remove the function entirely.

**Rationale**: Grep confirmed zero call sites across `context/` and `app/`. The function exists only as dead code in `sensorUtils.ts` (lines 228-242). It internally calls `applyHighPassFilter()` making it a pass-through wrapper that adds no value.

**Implementation approach**: Delete lines 220-242 (comment + function body + export).

---

## R-008: Front-Impact Liability + Advanced Adjustment Interaction

**Decision**: The interaction is actually correct — validate with trace analysis and add a test.

**Rationale**: In `calculateLiability()` (line 408):
```typescript
const rawFault = clamp(Math.round(analyzed.fault + advancedAdjustment), 0, 100);
```
For front-impact: `analyzed.fault = 85`, `advancedAdjustment` can be negative (e.g., -15 for steady driving).
- 85 + (-15) = 70 → quantizes to 75 ✅
- 85 + (-30) = 55 → quantizes to 50 ✅
- 85 + (0) = 85 → quantizes to 75 ✅
- 85 + (+15) = 100 → quantizes to 100 ✅

The quantization step `[0, 25, 50, 75, 100]` works correctly. The concern about "85 → 100" only happens if `advancedAdjustment >= 8` (85+8=93, rounds to 100). This is correct behavior for front-impact with no mitigating factors.

**Action**: No code change needed — add validation test case in plan.
