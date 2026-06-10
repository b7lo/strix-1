# Quality Checklist: 001-production-hardening

**Generated**: 2026-05-19  
**Feature**: Production Hardening & App Store Readiness

## Pre-Implementation Verification

- [ ] Confirm `filterSample()` has zero call sites (VERIFIED: confirmed no callers)
- [ ] Confirm `analyzeBraking()` uses `filtered.y` in device-frame (VERIFIED: line 499, uses `-samples[i].filtered.y`)
- [ ] Confirm `toVehicleFrame()` exists and is used in `findPeakZone()` but NOT in `analyzeBraking()` (VERIFIED)
- [ ] Confirm `testing/` directory contains `simulator.tsx` and `sensor-debug.tsx` (VERIFIED)
- [ ] Confirm `app.json` lacks `NSLocationAlwaysUsageDescription` (VERIFIED)
- [ ] Confirm `expo-task-manager` is in `package.json` (VERIFIED: `~14.0.9`)
- [ ] Confirm Supabase `accidents` table has RLS enabled with 10 existing rows (VERIFIED)

## Implementation Checklist

### Engine Fixes (P1)

- [ ] Fix `analyzeBraking()` to use `toVehicleFrame()` for orientation-independent braking detection
- [ ] Validate front-impact liability + advancedAnalysis interaction (85% base → quantized correctly)
- [ ] Remove deprecated `filterSample()` function from `sensorUtils.ts`
- [ ] Remove `filterSample` from the `export` list

### Backend Sync Fixes (P1)

- [ ] Audit RLS policies on `accidents` table — ensure anon-key INSERT works, SELECT is filtered by device_id
- [ ] Add user-visible error feedback when `uploadAccident()` fails (replace silent `null`)
- [ ] Fix `initDeviceId()` race condition — ensure it completes before any crash processing
- [ ] Add offline retry queue for failed accident uploads

### App Store Compliance (P1)

- [ ] Add `NSLocationAlwaysUsageDescription` to `app.json` → `ios.infoPlist`
- [ ] Add `UIBackgroundModes: ["location", "fetch"]` to `app.json` → `ios.infoPlist`
- [ ] Verify `PrivacyInfo.xcprivacy` is handled by Expo SDK 54 or add manually
- [ ] Exclude `testing/` routes from production builds (verify Expo file-based routing exclusion)
- [ ] Confirm no analytics SDKs require ATT compliance

### Deprecated Code Cleanup (P2)

- [ ] Remove `filterSample()` function body and export
- [ ] Decide on `testing/simulator.tsx` — remove entirely or gate behind `__DEV__`
- [ ] Decide on `testing/sensor-debug.tsx` — remove entirely or gate behind `__DEV__`

## Post-Implementation Verification

- [ ] Run `npx expo export` and verify no build errors
- [ ] Run `grep -r "filterSample" --include="*.ts" --include="*.tsx"` — expect 0 results
- [ ] Verify `accidents` table INSERT succeeds with anon key
- [ ] Verify `analyzeBraking()` works with phone in landscape orientation
- [ ] Verify all 8 impact zones produce sane liability percentages
- [ ] Verify `testing/` routes are not accessible in production
