# Implementation Plan: Production Hardening & App Store Readiness

**Branch**: `001-production-hardening` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-production-hardening/spec.md`

## Summary

Fix critical algorithmic, data-synchronization, and iOS compliance issues in Strix to achieve production-grade stability and App Store acceptance. Research confirmed that 2 of 8 functional requirements need zero code changes (RLS policies already correct; liability quantization logic is sound), reducing the actual implementation scope to 6 targeted modifications across 7 files.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native 0.81.5 / Expo SDK 54)  
**Primary Dependencies**: expo-sensors, expo-location, expo-task-manager, @react-native-async-storage/async-storage  
**Storage**: AsyncStorage (local) + Supabase PostgreSQL (cloud)  
**Testing**: Manual verification via Expo Go + codebase grep + Supabase SQL audit  
**Target Platform**: iOS 15+ (App Store submission)  
**Project Type**: Mobile app (React Native / Expo Router)  
**Performance Goals**: Sensor processing at 50Hz; crash detection < 250ms latency  
**Constraints**: Offline-capable (local storage fallback); no user authentication required  
**Scale/Scope**: Single-user device; ~10 files modified

## Constitution Check

*Constitution file is unpopulated (template only) — no gates to evaluate.*

## Project Structure

### Documentation (this feature)

```text
specs/001-production-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 — all unknowns resolved
├── data-model.md        # Phase 1 — entity changes documented
├── quickstart.md        # Phase 1 — developer guide
└── checklists/
    └── quality.md       # Pre-flight verification checklist
```

### Source Code (repository root)

```text
artifacts/strix/
├── app/
│   ├── (tabs)/          # Main tab navigation
│   ├── report/          # Report detail screens
│   ├── session.tsx      # Crash session UI
│   ├── settings.tsx     # Settings screen
│   ├── _layout.tsx      # Root layout
│   └── testing/         # ← TO BE DELETED (FR-007)
├── context/
│   ├── SessionContext.tsx  # ← MODIFY (FR-003: Alert Dialog)
│   └── ReportsContext.tsx
├── lib/
│   ├── sensorUtils.ts     # ← MODIFY (FR-001: vehicle frame, FR-005: remove filterSample)
│   ├── accidentSync.ts    # ← MODIFY (FR-003: error propagation, FR-004: device ID)
│   ├── liabilityEngine.ts # No changes needed (R-008 confirmed correct)
│   ├── types.ts           # ← MODIFY (add syncStatus)
│   ├── storage.ts         # ← MODIFY (handle syncStatus migration)
│   └── ...                # Other libs unchanged
└── app.json               # ← MODIFY (FR-006: iOS permissions)
```

**Structure Decision**: Existing structure is correct. No new directories or files are created — only modifications and one deletion.

## Implementation Phases

### Phase A: Engine Fixes (FR-001, FR-005, FR-008)

#### A1. Fix `analyzeBraking()` vehicle-frame transform (FR-001)

**File**: `lib/sensorUtils.ts` (lines 487-521)  
**Change**: Replace `const yDecel = -samples[i].filtered.y;` (line 499) with:
```typescript
const vehicle = toVehicleFrame(samples[i].filtered);
const yDecel = -vehicle.vY;
```

**Why**: `filtered.y` is in device-frame. In portrait mode, Y contains gravity, not braking. `toVehicleFrame()` (line 107) already maps to vehicle longitudinal axis correctly for all 3 orientations.

**Verification**: Braking detection should fire identically regardless of phone orientation (flat vs portrait vs landscape).

#### A2. Remove deprecated `filterSample()` (FR-005)

**File**: `lib/sensorUtils.ts` (lines 220-242)  
**Change**: Delete the comment block (lines 220-226) and function body (lines 228-242).  
**Pre-condition**: Confirmed zero call sites via `grep -r "filterSample" context/ app/` → 0 results.

#### A3. Validate liability quantization (FR-008)

**File**: `lib/liabilityEngine.ts`  
**Change**: NO CODE CHANGES. Research R-008 confirmed the quantization is correct.  
**Verification**: Trace through `calculateLiability()` for front-impact scenarios:
- 85 + (-15) = 70 → quantizes to 75 ✅
- 85 + (-30) = 55 → quantizes to 50 ✅
- 85 + 0 = 85 → quantizes to 75 ✅

---

### Phase B: Backend Sync Hardening (FR-002, FR-003, FR-004)

#### B1. Confirm RLS policies (FR-002)

**Change**: NO CODE CHANGES. Live SQL audit confirmed policies are already correct:
- INSERT: `true` (public role)
- SELECT: `true` (public role — needed for matching)
- UPDATE: `true` (public role — needed for linking)

#### B2. Add `syncStatus` to AccidentReport (FR-003, data model)

**File**: `lib/types.ts`  
**Change**: Add `syncStatus?: "synced" | "pending" | "failed";` to `AccidentReport` interface.

**File**: `lib/storage.ts`  
**Change**: Add `syncStatus: (raw.syncStatus as AccidentReport["syncStatus"]) ?? "synced"` to `migrateReport()` function (existing reports assumed synced).

#### B3. Replace silent `null` returns with error propagation (FR-003)

**File**: `lib/accidentSync.ts`  
**Changes**:
1. `uploadAccident()`: Instead of returning `null` on failure, throw a descriptive error with the HTTP status code.
2. `supabaseRequest()`: Capture the HTTP status and error message before returning `null`.

#### B4. Add Alert Dialog on sync failure (FR-003)

**File**: `context/SessionContext.tsx` (lines 249-268)  
**Change**: Replace the fire-and-forget async IIFE with proper error handling:
```typescript
try {
  const accidentId = await uploadAccident(report);
  // Update report with syncStatus: "synced"
  // ...matching logic...
} catch (err) {
  // Update report with syncStatus: "failed"  
  Alert.alert(
    "فشل رفع التقرير",
    "لم نتمكن من رفع التقرير. هل تريد المحاولة مرة أخرى؟",
    [
      { text: "إعادة المحاولة", onPress: () => retrySyncAccident(report) },
      { text: "حفظ محلياً فقط", style: "cancel" }
    ]
  );
}
```

#### B5. Fix device ID race condition (FR-004)

**File**: `lib/accidentSync.ts` (lines 53-61)  
**Change**: Remove the random fallback in `getDeviceId()`. If `deviceId` is empty and `initDeviceId()` hasn't been called, throw an error instead of generating a random ID.

**Safety**: `startSession()` in `SessionContext.tsx` (line 320) already awaits `initDeviceId()` before starting sensors. Since crashes can only be detected during an active session, the device ID is guaranteed to be initialized before any crash processing.

---

### Phase C: iOS App Store Compliance (FR-006, FR-007)

#### C1. Add background permissions to `app.json` (FR-006)

**File**: `app.json`  
**Changes** in `expo.ios.infoPlist`:
```json
{
  "NSLocationAlwaysUsageDescription": "يراقب ستركس موقعك أثناء القيادة للتعرف الفوري على الحوادث وإرسال إحداثياتها للجهات المختصة. / Strix monitors your location while driving to detect accidents and send coordinates to emergency services.",
  "NSLocationAlwaysAndWhenInUseUsageDescription": "يراقب ستركس موقعك أثناء القيادة للتعرف الفوري على الحوادث وإرسال إحداثياتها للجهات المختصة. / Strix monitors your location while driving to detect accidents and send coordinates to emergency services.",
  "UIBackgroundModes": ["location", "fetch"]
}
```

**Changes** in `expo.plugins` for `expo-location`:
```json
["expo-location", {
  "locationWhenInUsePermission": "...",
  "locationAlwaysAndWhenInUsePermission": "..."
}]
```

#### C2. Delete `app/testing/` directory (FR-007)

**Action**: `rm -rf app/testing/`  
**Files removed**:
- `app/testing/simulator.tsx` (7.7KB)
- `app/testing/sensor-debug.tsx` (13.9KB)

**Verification**: `ls app/testing/` → "No such file or directory"

---

## Verification Plan

### Automated Tests

```bash
# 1. Verify deprecated function removed
grep -r "filterSample" --include="*.ts" --include="*.tsx" lib/ context/ app/
# Expected: 0 results

# 2. Verify testing directory removed  
ls app/testing/
# Expected: "No such file or directory"

# 3. Verify iOS build compiles
npx expo export --platform ios
# Expected: No errors

# 4. Verify Supabase connectivity
# Run SQL: SELECT count(*) FROM accidents;
# Expected: Returns count (10+)
```

### Manual Verification

1. **Braking detection**: Hold phone in portrait mode during a test drive, brake hard → verify `brakingDetected: true` in report.
2. **Sync failure**: Disconnect internet, trigger crash → verify Alert Dialog appears with retry option.
3. **Liability trace**: Front-impact crash → verify `advancedAdjustment` is reflected in final `userFaultPercent`.
4. **TestFlight**: Build production IPA → submit to TestFlight → verify no compliance warnings.

## Complexity Tracking

> No constitution violations — no complexity justifications needed.
