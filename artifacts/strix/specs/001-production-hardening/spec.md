# Feature Specification: Production Hardening & App Store Readiness

**Feature Branch**: `001-production-hardening`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "تحسين الكود والمنطق — فقط الأشياء التي تحتاج تصحيح فعلي — مراجعة محرك الحوادث والباك إند وتجهيز التطبيق لقبوله في متجر أبل"

## Clarifications

### Session 2026-05-19
- Q: استراتيجية المصادقة مع Supabase؟ → A: الخيار A (السماح بالوصول عبر anon_key مع تهيئة سياسات RLS لتمكين الإدخال والاستعلام للمطابقة دون فرض تسجيل دخول حالياً).
- Q: التعامل مع الحوادث عند انقطاع الاتصال؟ → A: الخيار B (حفظ التقرير محلياً وإشعار المستخدم بالفشل مع إتاحة زر "إعادة الرفع" يدوياً في واجهة المستخدم).
- Q: كيفية إشعار المستخدم بفشل مزامنة الحوادث؟ → A: الخيار A (إظهار Alert Dialog تفاعلي عند فشل الرفع يتيح للمستخدم إعادة المحاولة الفورية أو الحفظ محلياً والمتابعة).
- Q: أذونات الموقع بالخلفية للحد من رفض أبل؟ → A: الخيار A (إظهار شاشة إرشادية تشرح الحاجة للصلاحية مع تراجع مرن للعمل بالواجهة فقط في حال الرفض).
- Q: التعامل مع مجلد الاختبارات والـ Simulator في نسخة الإنتاج؟ → A: الخيار B (حذف مجلد `testing/` بالكامل من المشروع والاعتماد على أدوات اختبار خارجية لمنع شحن أي أدوات تطوير للمتجر).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accident Engine Produces Accurate & Defensible Reports (Priority: P1)

When a real collision occurs, Strix must deliver a report whose G-force readings, impact zone, liability percentages, and forensic factors are physically correct and legally defensible. Today, several logic issues identified in the codebase could produce misleading data:

1. **`accidentSync.ts` uses raw `fetch()` with the `anon_key` but no RLS user context.** The Supabase `accidents` table has RLS enabled, yet `accidentSync.ts` sends `Authorization: Bearer ${SUPABASE_ANON_KEY}` (line 117). Without passing an authenticated JWT, any `SELECT` with `device_id=neq.${getDeviceId()}` may return zero rows or unintended rows depending on RLS policy. This means **accident matching between two users may silently fail** in production.

2. **`liabilityEngine.ts` front-impact fault starts at 85% (line 143) but is never reduced by `advancedAnalysis`.** The comment says "التحليل المتقدم ممكن يخفضها" but the `advancedAdjustment` is only applied in `calculateLiability()` after the scenario function returns. For front-impact + steady driving + braking, the final `rawFault` could still quantize to 75% or 100% instead of a more appropriate 50%. The interaction between the base scenario and the advanced adjustment needs validation.

3. **`sensorUtils.ts` `filterSample()` is marked `@deprecated` (line 226) but may still be called somewhere.** If it is called alongside `applyHighPassFilter()`, the Kalman filter would be applied twice to the same data, corrupting readings.

4. **`analyzeBraking()` uses `filtered.y` (line 499) which is in device-frame, not vehicle-frame.** The `toVehicleFrame()` transform exists but is not applied here, so braking detection accuracy depends entirely on phone orientation.

**Why this priority**: Incorrect accident data is the single most damaging defect — it undermines user trust, legal credibility, and App Store review integrity.

**Independent Test**: Trigger a controlled crash event in the Expo simulator or on a real device and verify the report's G-force, zone, braking, and liability outputs match expected physics. Cross-check that the `advancedAnalysis` adjustment is correctly reflected in the final quantized fault percentage.

**Acceptance Scenarios**:

1. **Given** a rear-end collision at 50 km/h with braking detected, **When** the report is generated, **Then** user fault is 0%, other fault is 100%, and braking is correctly flagged as pre-crash event.
2. **Given** a front-impact with steady driving and no yaw, **When** advanced analysis runs, **Then** the `totalAdjustment` reduces the raw 85% to produce a final quantized fault of 75% or lower (not 100%).
3. **Given** the `filterSample()` function, **When** it is called, **Then** it must not double-apply the Kalman filter (verify no remaining call sites, or fix internal logic).
4. **Given** the phone is in portrait mode (gravity on Y), **When** braking occurs, **Then** `analyzeBraking()` correctly detects deceleration using vehicle-frame coordinates, not raw device Y-axis.

---

### User Story 2 - Backend Sync Reliably Persists & Matches Accidents (Priority: P1)

When a crash occurs, the accident report must be reliably saved to Supabase and correctly matched with other Strix users involved in the same incident.

**Issues identified**:

1. **Missing `accidents` table in Supabase.** The Supabase database currently has `profiles`, `resumes`, and `resume_data` tables from another project. The `accidents` table exists (10 rows, RLS enabled) but its RLS policies need verification — the current `accidentSync.ts` uses `anon_key` without user authentication, which may cause silent RLS failures.

2. **`accidentSync.ts` error handling swallows failures.** Both `uploadAccident()` and `findMatchingAccident()` return `null` on any error (network, RLS, parsing). The user is never informed that their report failed to sync. A crash report lost to a silent `null` is a critical data loss scenario.

3. **Duplicate `device_id` generation.** If `initDeviceId()` hasn't been called before the first crash (race condition at app startup), `getDeviceId()` generates a random fallback (line 56) and then `initDeviceId()` may generate a different one later, causing duplicate device identities.

**Why this priority**: Data persistence is foundational — if reports don't save, the entire forensic and matching system is worthless.

**Independent Test**: Trigger a crash, inspect Supabase logs and `accidents` table to verify the record was inserted with correct fields. Attempt matching by creating two accidents with close timestamps and coordinates.

**Acceptance Scenarios**:

1. **Given** a crash is detected with a valid location, **When** `uploadAccident()` is called, **Then** the accident is persisted in Supabase `accidents` table with all fields populated, or the user sees a clear error notification.
2. **Given** two devices experience a collision within 5 seconds and 100 meters, **When** `findMatchingAccident()` runs, **Then** both reports are linked via `matched_accident_id` with a confidence ≥ 60%.
3. **Given** `initDeviceId()` has not been called, **When** a crash occurs, **Then** the device ID used for upload is the same one that will be used for all subsequent operations (no duplicate generation).

---

### User Story 3 - App Passes Apple App Store Review (Priority: P1)

Strix must meet all Apple App Store requirements for submission. The current codebase has several gaps:

1. **`app.json` missing `NSLocationAlwaysUsageDescription`.** If Strix monitors for accidents while the app is in the background (via `expo-task-manager`), Apple requires the "Always" location permission string. Currently only `NSLocationWhenInUseUsageDescription` is present.

2. **`app.json` missing `NSUserTrackingUsageDescription` or `SKAdNetworkItems`.** If the app uses any analytics or advertising SDK (even indirectly), Apple requires ATT compliance. This needs verification.

3. **Background sensor monitoring compliance.** Apple requires apps using background location + motion to declare `UIBackgroundModes` (`location`, `fetch`) in `Info.plist`. The `expo-task-manager` dependency is present but background modes are not declared.

4. **Privacy Manifest (PrivacyInfo.xcprivacy).** Since 2024, Apple requires a Privacy Manifest. Expo SDK 54 may handle this, but the configuration should be verified.

5. **No crash simulator or test artifacts in production builds.** The `testing/` directory under `app/` must be excluded from production bundles.

**Why this priority**: Without App Store approval, the app cannot reach users — this is a hard blocker.

**Independent Test**: Run `eas build --profile production --platform ios` and verify no build errors. Submit to TestFlight and check for any App Store Connect compliance warnings.

**Acceptance Scenarios**:

1. **Given** the app uses background motion monitoring, **When** submitted to App Store Connect, **Then** no rejection occurs due to missing permission strings or background mode declarations.
2. **Given** a production build, **When** analyzed, **Then** no test/debug screens or crash simulator routes are accessible.
3. **Given** the app's Privacy Manifest, **When** Apple scans it, **Then** no missing API declarations are flagged.

---

### User Story 4 - Deprecated & Dead Code Removal (Priority: P2)

The codebase contains deprecated functions and potential dead code that increases maintenance burden and risk of accidental misuse:

1. **`filterSample()` in `sensorUtils.ts`** is marked `@deprecated` — all call sites must be migrated to `applyHighPassFilter()` + `recordSample()`, then the function removed.
2. **`testing/` directory** under `app/` — verify if it's still needed. If it contains a crash simulator, it must not ship in production.

**Why this priority**: Dead code creates confusion and potential runtime bugs, but is less urgent than data integrity.

**Independent Test**: Search the codebase for all references to `filterSample`. Verify the `testing/` directory contents and decide on exclusion strategy.

**Acceptance Scenarios**:

1. **Given** `filterSample()` is deprecated, **When** the codebase is searched, **Then** zero call sites remain, and the function is either removed or clearly isolated.
2. **Given** the `testing/` directory, **When** a production build runs, **Then** test routes are not included in the app bundle.

---

### Edge Cases

- What happens when a crash occurs with no internet connection? (`accidentSync.ts` returns `null` silently — should queue for retry)
- What happens when the Kalman filter hasn't settled (first 5 seconds of session) and a crash occurs? (baseline is inaccurate — report should flag low confidence)
- What happens when two crashes occur within 3 seconds (multi-impact)? (tested — `recordImpact()` handles this)
- What happens when the phone orientation changes mid-session? (gravity estimate updates slowly via alpha=0.05 — verify adequate response time)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST apply vehicle-frame transform to braking analysis (fix `analyzeBraking()` to use `toVehicleFrame()`)
- **FR-002**: System MUST configure RLS on the accidents table to allow anonymous INSERT and SELECT (for matching) via the anon_key based on device_id, without requiring full user registration.
- **FR-003**: System MUST surface sync failures to the user using an interactive Alert Dialog (providing immediate retry or local save options), save the accident report locally, and provide a manual 'Retry Sync' (إعادة الرفع) option in the UI.
- **FR-004**: System MUST guarantee a single, persistent device ID is generated before any crash can be processed
- **FR-005**: System MUST remove or isolate all deprecated functions (`filterSample()`) to prevent double-filtering
- **FR-006**: System MUST declare all required iOS background modes and permission strings in `app.json` for App Store compliance, implement an educational prompt explaining background location usage, and gracefully handle permission denial by falling back to foreground-only monitoring.
- **FR-007**: System MUST completely remove the `app/testing/` directory (Simulator and debug screens) from the codebase to ensure zero development artifacts ship in the production build.
- **FR-008**: System MUST validate that the front-impact liability + advanced adjustment interaction produces correct quantized results across all combinations

### Key Entities

- **AccidentReport**: The core data object persisted locally and synced to Supabase. Contains sensor data, liability output, croquis, and match info.
- **Device Identity**: A persistent UUID stored in AsyncStorage, used for accident matching deduplication.
- **Supabase `accidents` Table**: Cloud persistence layer with RLS — the critical sync target.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 8 impact zones produce correct liability percentages (verified against a test matrix of expected outcomes)
- **SC-002**: Braking detection accuracy is consistent regardless of phone orientation (flat, portrait, landscape)
- **SC-003**: Backend sync succeeds on first attempt for 95%+ of crash events when internet is available
- **SC-004**: Zero App Store Connect rejection warnings related to permissions, background modes, or privacy manifest
- **SC-005**: No deprecated function is called at runtime (verified via codebase search showing zero call sites)
- **SC-006**: Users are informed within 5 seconds if their accident report failed to sync to the cloud

## Assumptions

- The Supabase project is the same one used for the CV Builder app (confirmed — `profiles`, `resumes`, `resume_data` tables coexist with `accidents`)
- The app will use background location monitoring via `expo-task-manager` for passive crash detection (based on the dependency's presence in `package.json`)
- Apple Developer Account is already configured and accessible for TestFlight/App Store submissions
- The `testing/` directory contains development-only crash simulation tools that should not ship in production
- No third-party analytics or ad SDKs are used (so `NSUserTrackingUsageDescription` is likely not required)
