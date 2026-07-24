# Tasks: Production Hardening & App Store Readiness

**Feature**: Production Hardening & App Store Readiness
**Branch**: `001-production-hardening`
**Status**: Draft

## Dependencies
- Phase 1 & 2 must be completed before User Story phases.
- User Story 1, 3, and 4 are completely independent and can be executed in parallel.
- User Story 2 depends on Phase 1 & 2.

## Parallel Execution Examples
- Developer A works on Engine Fixes (US1) and Dead Code Removal (US4) in `sensorUtils.ts`
- Developer B works on Backend Sync (US2) in `accidentSync.ts` and `SessionContext.tsx`
- Developer C works on App Store Compliance (US3) in `app.json` and deletes `app/testing/`

## Phase 1: Setup
*Project initialization and entity updates.*
- [x] T001 Update `AccidentReport` interface with `syncStatus` in `artifacts/strix/lib/types.ts`
- [x] T002 Handle `syncStatus` migration for existing reports in `artifacts/strix/lib/storage.ts`

## Phase 2: Foundational
*Blocking prerequisites for core stories.*
- [x] T003 Fix device ID race condition to ensure initialization is awaited in `artifacts/strix/lib/accidentSync.ts`

## Phase 3: User Story 1 - Accident Engine Produces Accurate & Defensible Reports
**Goal**: Ensure braking detection accuracy regardless of phone orientation and validate liability.
**Independent Test**: Trigger a controlled crash in simulator or real device and verify the report's G-force and braking outputs. Check that front-impact advanced adjustment correctly affects the final quantized fault percentage.
- [x] T004 [P] [US1] Apply `toVehicleFrame()` transform inside `analyzeBraking()` to extract longitudinal deceleration in `artifacts/strix/lib/sensorUtils.ts`

## Phase 4: User Story 2 - Backend Sync Reliably Persists & Matches Accidents
**Goal**: Persist reports securely to Supabase and handle network/RLS failures gracefully.
**Independent Test**: Trigger a crash with and without internet. Verify that an interactive Alert Dialog appears on failure, allowing manual retry.
- [x] T005 [P] [US2] Replace silent `null` returns with error propagation in `uploadAccident()` and `supabaseRequest()` within `artifacts/strix/lib/accidentSync.ts`
- [x] T006 [US2] Wrap sync call in try/catch and show `Alert.alert` with Retry/Save options in `artifacts/strix/context/SessionContext.tsx`

## Phase 5: User Story 3 - App Passes Apple App Store Review
**Goal**: Meet all Apple App Store requirements regarding background modes, permissions, and test artifacts.
**Independent Test**: Build for production iOS without errors and verify no test/debug screens are accessible.
- [x] T007 [P] [US3] Add `NSLocationAlwaysUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, and `UIBackgroundModes` to `artifacts/strix/app.json`
- [x] T008 [P] [US3] Delete the test directory `artifacts/strix/app/testing/` entirely

## Phase 6: User Story 4 - Deprecated & Dead Code Removal
**Goal**: Remove dead code to improve maintenance.
**Independent Test**: Verify zero call sites remain for `filterSample` across the codebase.
- [x] T009 [P] [US4] Delete the deprecated `filterSample()` function and its comments from `artifacts/strix/lib/sensorUtils.ts`

## Final Phase: Polish & Cross-Cutting Concerns
- [x] T010 Run automated tests via `grep` to verify deprecated functions and testing directories are removed.
- [x] T011 Verify iOS build compiles successfully via `npx expo export --platform ios`.
