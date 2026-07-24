# Implementation Plan

## Overview

This plan fixes the Arabic-device double-flip bug using the bug condition methodology. When the device system language is Arabic, native `I18nManager.isRTL === true` for the session, so React Native auto-flips `flexDirection` and the bottom-tab row while the manual RTL layer (`lib/rtl.ts`, `app/(tabs)/_layout.tsx`) flips them again → double-flip → mirrored UI. The fix makes the manual layer native-aware: only auto-flipped properties are reversed based on `effectiveFlip = desiredRTL XOR nativeIsRTL`, while physical properties stay keyed to `desiredRTL`.

Exploration (bug condition) and preservation tests are written and run BEFORE the fix. The bug condition test MUST FAIL on unfixed code (proving the bug); preservation tests MUST PASS on unfixed code (baseline to preserve). The fix then makes the bug condition test pass while keeping preservation tests green.

Source project root: `Strix-Assets-main/artifacts/strix/`. All file paths in tasks are relative to that root. Tests use Jest (`npm test`) and property-based testing via `fast-check`. Tests live under `lib/__tests__/`.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 0,
      "description": "Test tooling + native auto-flip oracle",
      "tasks": ["0"]
    },
    {
      "wave": 1,
      "description": "Exploration and preservation tests before the fix (independent of each other)",
      "tasks": ["1", "2"],
      "dependsOn": ["0"]
    },
    {
      "wave": 2,
      "description": "Native-aware fix implementation and re-run of Property 1 / Property 2 tests",
      "tasks": ["3"],
      "dependsOn": ["1", "2"]
    },
    {
      "wave": 3,
      "description": "Integration and regression tests",
      "tasks": ["4"],
      "dependsOn": ["3"]
    },
    {
      "wave": 4,
      "description": "Checkpoint - full suite + typecheck green",
      "tasks": ["5"],
      "dependsOn": ["4"]
    }
  ]
}
```

Ordering rules:
- Task 1 (Bug Condition) and Task 2 (Preservation) MUST be written and run BEFORE any fix code (tasks 3+).
- Task 1 tests MUST FAIL on unfixed code (proves the bug). Task 2 tests MUST PASS on unfixed code (baseline to preserve).
- The fix (task 3) depends on both. Tasks 3.4/3.5 re-run the SAME tests from tasks 1 and 2.

## Tasks

- [ ] 0. Set up test tooling and the native auto-flip oracle
  - Ensure `fast-check` is available as a devDependency for property-based tests (`npm install --save-dev fast-check` if missing); confirm `jest` / `jest-expo` runs the `lib/__tests__/` suite via `npm test`.
  - Create a shared test helper `lib/__tests__/rtlOracle.ts` implementing the native auto-flip oracle from the design: `renderedDirection(styleFlexDirection, nativeIsRTL)` returns `"RTL-flow"` / `"LTR-flow"`, flipping `row` ⇄ `row-reverse` when `nativeIsRTL` is true.
  - Add generators/constants for the small input space: booleans for `desiredRTL` and `nativeIsRTL`, sampled icon names (including names absent from the flip map), and spacing sizes from `RTL_SPACING`.
  - _Requirements: 1.1, 2.1, 3.5_

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Arabic Device Double-Flips Layout
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists.
  - **DO NOT attempt to fix the test or the code when it fails.**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation.
  - **GOAL**: Surface counterexamples that demonstrate the double-flip on unfixed `lib/rtl.ts` and `app/(tabs)/_layout.tsx` by modeling React Native's native auto-flip via the oracle from task 0.
  - **Scoped PBT Approach**: The bug condition is `isBugCondition(input) === true`, i.e. `isRTLLocale(deviceLocale) && nativeIsRTL === true`. Scope the property to the concrete failing base case `desiredRTL = true, nativeIsRTL = true` (Arabic device), asserting the intended once-applied RTL behavior for reproducibility.
  - Create `lib/__tests__/rtlBugCondition.test.ts`.
  - Test cases (from design "Exploratory Bug Condition Checking"):
    1. Row flow: assert `renderedDirection(getRTLStyles(true).flexDirection, true) === "RTL-flow"` — on unfixed code this yields `"LTR-flow"` (mirrored) → FAILS.
    2. Tab order: apply the current `isRTL ? [settings, log, home] : [home, log, settings]` ordering, model native row reversal via the oracle, and assert the visible order matches the intended Arabic RTL order — FAILS on unfixed code (double-reversed).
    3. Start/end spacing side: assert that with flow correct, start-aligned content lands on the right for `desiredRTL = true, nativeIsRTL = true` — FAILS on unfixed code.
    4. Edge (isolation): assert the English-device / Arabic-in-app path (`desiredRTL = true, nativeIsRTL = false`) already renders correct RTL — PASSES, isolating the bug to `nativeIsRTL = true`.
  - Run on UNFIXED code.
  - **EXPECTED OUTCOME**: Cases 1–3 FAIL (proves the double-flip bug); case 4 passes.
  - Document counterexamples found, e.g. `renderedDirection(getRTLStyles(true).flexDirection, true) === "LTR-flow"` instead of `"RTL-flow"`, and the double-reversed tab order.
  - Mark task complete when the test is written, run, and the failures are documented.
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [~] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-RTL-Device Layout Unchanged
  - **IMPORTANT**: Follow the observation-first methodology — capture the UNFIXED helper outputs first, then assert the fixed versions match them.
  - Preservation holds for all inputs where `isBugCondition` is false, i.e. `nativeIsRTL === false` (English LTR, in-app Arabic on an LTR device, saved-preference resolution, in-app switching, and web).
  - Create `lib/__tests__/rtlPreservation.test.ts` using `fast-check`.
  - Observe on UNFIXED code and record outputs for both `desiredRTL ∈ {true, false}`:
    - `getRTLStyles(desiredRTL)` and `rtlFlex(desiredRTL)` (e.g. `getRTLStyles(true).flexDirection === "row-reverse"`, `getRTLStyles(false).flexDirection === "row"`).
    - Physical helpers: `rtlTextAlign`, `rtlWritingDirection`, `rtlMarginStart/End`, `rtlPaddingStart/End`, `rtlBorderStart/End`, `rtlPosition`, `rtlSpaceStart/End`, `rtlGap`, and `flipIconName` across sampled icon names and spacing sizes.
    - Current tab order: `isRTL ? [settings, log, home] : [home, log, settings]`.
  - Write property-based tests (from design "Preservation Checking"):
    1. `flexDirection` preservation (LTR base): for all `desiredRTL`, the fixed `getRTLStyles`/`rtlFlex` at `nativeIsRTL = false` equal the original outputs.
    2. Physical helpers invariant: for all inputs, margins/paddings/borders/position/textAlign/writingDirection are identical regardless of `nativeIsRTL`.
    3. Icon flip unchanged: `flipIconName` output depends only on `desiredRTL` for all sampled names.
    4. Tab order preservation (LTR base): fixed tab order at `nativeIsRTL = false` equals the original order for both `desiredRTL` values.
  - Run on UNFIXED code (against current implementation as the baseline).
  - **EXPECTED OUTCOME**: All preservation tests PASS on unfixed code (confirms the baseline behavior to preserve).
  - Mark task complete when tests are written, run, and passing on unfixed code.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for Arabic-device double-flip (native-aware manual RTL layer)

  - [ ] 3.1 Make `lib/rtl.ts` native-aware and refactor direction decisions into pure functions
    - Add `getNativeIsRTL(): boolean` returning `I18nManager.isRTL`, guarded so it is safe on web (no throw).
    - Refactor `getRTLStyles` and `rtlFlex` to accept an optional `nativeIsRTL` parameter (defaulting to `getNativeIsRTL()`), keeping them pure and testable.
    - Compute the auto-flipped axis via `effectiveFlip = desiredRTL !== nativeIsRTL`, so `flexDirection = effectiveFlip ? "row-reverse" : "row"`. When `nativeIsRTL === false` this reduces to today's `desiredRTL ? "row-reverse" : "row"`.
    - Leave physical properties keyed to `desiredRTL` only (no XOR): `textAlign`, `writingDirection`, `rtlMarginStart/End`, `rtlPaddingStart/End`, `rtlBorderStart/End`, `rtlPosition`, `rtlSpace*`, `rtlGap`.
    - Keep `flipIconName` keyed to `desiredRTL` only (glyph choice, not layout auto-flip).
    - _Bug_Condition: isBugCondition(input) where isRTLLocale(input.deviceLocale) AND input.nativeIsRTL === true_
    - _Expected_Behavior: renderedDirection(resolve(desiredRTL, nativeIsRTL).flexDirection, nativeIsRTL) === desiredRTL applied exactly once (Property 1 from design)_
    - _Preservation: resolve'(desiredRTL, false) === resolveOriginal(desiredRTL); physical helpers invariant to nativeIsRTL (Property 2 from design)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Make bottom-tab ordering native-aware in `app/(tabs)/_layout.tsx`
    - Replace `const order = isRTL ? [settingsTab, logTab, homeTab] : [homeTab, logTab, settingsTab]` with an `effectiveFlip`-based decision: `const effectiveFlip = isRTL !== I18nManager.isRTL;` then `const order = effectiveFlip ? [settingsTab, logTab, homeTab] : [homeTab, logTab, settingsTab];`.
    - Keep `initialRouteName="index"` and all other tab options unchanged.
    - When `nativeIsRTL === false` this equals the current `isRTL ? [...] : [...]` behavior.
    - _Bug_Condition: isBugCondition(input) — Arabic device, nativeIsRTL === true, tab row auto-flipped_
    - _Expected_Behavior: tabOrder(desiredRTL = true, nativeIsRTL = true) renders as the intended Arabic RTL order (home on the right)_
    - _Preservation: tabOrder(desiredRTL, false) === original tab order for both desiredRTL values_
    - _Requirements: 2.3, 3.2, 3.4_

  - [ ] 3.3 Clarify `forceRTL(false)` comments (documentation only, no behavior change)
    - In `context/LanguageContext.tsx` (`applyRTL`) and `app/_layout.tsx`, keep the `I18nManager.allowRTL(false)` / `forceRTL(false)` calls but update comments to state they cannot flip `isRTL` mid-session on an RTL device and that correctness now comes from the native-aware helpers. Optionally expose `nativeIsRTL` via `useLanguage()`.
    - No functional change.
    - _Bug_Condition: N/A (documentation of why forceRTL is insufficient alone)_
    - _Expected_Behavior: unchanged runtime behavior; clarified intent_
    - _Preservation: no behavior change — all preservation properties remain satisfied_
    - _Requirements: 3.3, 3.5_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Arabic Device Renders RTL Exactly Once
    - **IMPORTANT**: Re-run the SAME test from task 1 (`lib/__tests__/rtlBugCondition.test.ts`) — do NOT write a new test.
    - The test from task 1 encodes the expected behavior; when it passes it confirms the double-flip is gone.
    - **EXPECTED OUTCOME**: Test PASSES — `renderedDirection(getRTLStyles(true, true).flexDirection, true) === "RTL-flow"`, tab order renders as intended Arabic RTL, and `getRTLStyles(true, true) === getRTLStyles(true, false)` (matches en-device / ar-in-app).
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-RTL-Device Layout Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 (`lib/__tests__/rtlPreservation.test.ts`) — do NOT write new tests.
    - **EXPECTED OUTCOME**: Tests PASS — fixed helpers at `nativeIsRTL = false` are identical to the original outputs, and physical helpers are invariant to `nativeIsRTL` (no regressions).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Integration and regression tests

  - [ ] 4.1 Fix-checking property test across the full input space
    - **Property 1: Bug Condition** - Fix Checking
    - In `lib/__tests__/rtlBugCondition.test.ts` (or a dedicated file), add `fast-check` properties: for all `desiredRTL`, `renderedDirection(getRTLStyles(desiredRTL, nativeIsRTL).flexDirection, nativeIsRTL) === (desiredRTL ? "RTL-flow" : "LTR-flow")` for both `nativeIsRTL` values; and the rendered direction on an Arabic device (`nativeIsRTL = true`) equals the LTR-device render for the same `desiredRTL` (consistency).
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 4.2 Settings screen + tab bar integration under mocked Arabic device
    - Render the Settings screen and bottom tab bar with `I18nManager.isRTL` mocked to `true`; assert correct RTL flow, start/end spacing side, back-arrow direction, and tab order (home on the right).
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 4.3 Working-path and web regression guards
    - In-app language switch on an LTR device (`nativeIsRTL = false`) still flips layout correctly.
    - Web render smoke test: `getNativeIsRTL()` and `forceRTL` calls do not throw and layout matches current web behavior.
    - _Requirements: 3.2, 3.4, 3.5_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Run the full suite (`npm test`) and `npm run typecheck`; confirm Property 1 (Bug Condition / Fix Checking) and Property 2 (Preservation) tests, unit tests, and integration tests all pass with no regressions.
  - Clean up any temporary files created during exploration.
  - Ensure all tests pass; ask the user if questions arise.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

## Notes

- Bug condition C(X): `isRTLLocale(deviceLocale) === true` AND `I18nManager.isRTL === true` at launch (Arabic device). Non-bug inputs ¬C(X): `nativeIsRTL === false` (English LTR, in-app Arabic on an LTR device, saved-preference resolution, in-app switching, web).
- Property P(result): the Arabic UI renders with correct RTL layout applied exactly once (no double-flip), matching the Arabic-in-app-on-LTR-device render.
- Core rule: `effectiveFlip = desiredRTL XOR nativeIsRTL` governs only auto-flipped properties (`flexDirection`, tab order). Physical props (`textAlign`, margins/paddings, `left/right`, borders, `writingDirection`) and `flipIconName` stay keyed to `desiredRTL`.
- Oracle: `renderedDirection(styleFlexDirection, nativeIsRTL)` models RN's native auto-flip (swaps `row` ⇄ `row-reverse` when `nativeIsRTL` is true) so pure helpers can be tested without a real native RTL base.
- `app.json` requires no change; Arabic localizations and `supportsRTL` are intentional and the native-aware layer cooperates with the RTL base.
