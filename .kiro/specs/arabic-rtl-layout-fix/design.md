# Arabic RTL Layout Fix — Bugfix Design

## Overview

When the device system language is Arabic, the Strix app renders its UI mirrored/reversed instead of in correct right-to-left (RTL) form. The app deliberately uses a **manual RTL** strategy: it forces React Native's native RTL off (`I18nManager.allowRTL(false)` / `I18nManager.forceRTL(false)`) and applies direction itself through `lib/rtl.ts` helpers (`flexDirection: "row-reverse"`, physical `left/right` spacing, `flipIconName`, and a reversed bottom-tab order). This strategy is correct **only when the native layout base is LTR** (`I18nManager.isRTL === false`).

On an Arabic device the assumption breaks. iOS/Android initialize the native layout direction to RTL at process start (because the app advertises Arabic localizations and the device locale is Arabic), so `I18nManager.isRTL === true` for the entire session. The JS-level `forceRTL(false)` does not take effect until a full relaunch, so during that session React Native auto-flips layout-direction properties (it swaps `row` ⇄ `row-reverse` and resolves logical edges as RTL) **at the same time** as the manual layer applies its own `row-reverse`/reordering. The two flips cancel for horizontal flow, producing the mirrored/scrambled result — a classic double-flip.

The fix keeps the manual RTL strategy (so the working paths stay working) but makes it **native-aware**: the small set of style properties that React Native auto-flips (`flexDirection` and the manual bottom-tab ordering) are computed relative to the current native base direction, so the net visual direction is applied exactly once regardless of whether the native base is LTR or RTL. Physical properties that RN never auto-flips (`textAlign: left/right`, `marginLeft/Right`, `left/right`, icon-name flipping, `writingDirection`) are unchanged. When the native base is LTR (every non-bug scenario, including web and in-app Arabic selection on an English device), the new logic is mathematically identical to today's, preserving existing behavior.

## Glossary

- **Bug_Condition (C)**: The device system language is an RTL locale (Arabic) so the native layout base initializes to RTL — `isRTLLocale(deviceLocale) === true` and `I18nManager.isRTL === true` at launch.
- **Property (P)**: The Arabic UI renders with correct RTL layout applied exactly once (no mirroring / double-flip), matching the layout produced when Arabic is selected in-app on an LTR device.
- **Preservation**: All non-RTL-device behavior — English LTR rendering, in-app Arabic selection on an LTR device, saved-preference honoring, in-app language switching, and web rendering — must remain byte-for-byte identical.
- **desiredRTL**: The logical direction the app wants to present, derived from the active locale (`locale === "ar"`). Exposed today as `useLanguage().isRTL`.
- **nativeIsRTL**: `I18nManager.isRTL` — the native layout base direction, fixed for the session, set from the device locale at process start.
- **effectiveFlip**: `desiredRTL XOR nativeIsRTL` — whether the manual layer must reverse an auto-flipped property so the net rendered direction equals `desiredRTL` exactly once.
- **getRTLStyles / rtlFlex**: Functions in `lib/rtl.ts` that today return `flexDirection` based only on `desiredRTL`; the fix makes them account for `nativeIsRTL`.
- **TabLayout**: `app/(tabs)/_layout.tsx`, which manually reverses tab order for RTL.
- **F** (`renderApp`): The original (unfixed) rendering behavior.
- **F'** (`renderApp'`): The fixed rendering behavior.

## Bug Details

### Bug Condition

The bug manifests when the device system language is an RTL locale (Arabic) at launch, which makes the native layer initialize `I18nManager.isRTL` to `true` while the app also applies its manual RTL styling. React Native then auto-flips `flexDirection` (`row` ⇄ `row-reverse`) and the tab row order, and the manual layer flips them a second time, so horizontal flow, start/end spacing, tab order, and directional icons end up reversed relative to the intended Arabic RTL layout.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AppLaunchContext
         input = {
           deviceLocale : Locale,   // system language from the OS
           savedLocale  : Locale?,  // persisted in-app choice (may be null)
           nativeIsRTL  : boolean   // I18nManager.isRTL at launch
         }
  OUTPUT: boolean

  RETURN isRTLLocale(input.deviceLocale)   // e.g. input.deviceLocale = "ar"
         AND input.nativeIsRTL = true
END FUNCTION
```

### Examples

- **Fresh launch on an Arabic device (no saved locale)** — Expected: Settings screen laid out RTL (labels start on the right, back arrow points right, tab order الرئيسية→السجل→الإعدادات right-to-left). Actual: everything mirrored (labels on the left, tab order reversed, spacing on the wrong side).
- **Row with leading icon + text on Arabic device** — Expected: icon on the right, text to its left (RTL flow). Actual: icon on the left because `row-reverse` was auto-flipped back to `row`.
- **Bottom tab bar on Arabic device** — Expected: `[settings, log, home]` rendered so home is on the right. Actual: order reversed to home on the left because native auto-flips the tab row that the manual array already reversed.
- **Edge case — English device, Arabic selected in-app** (`deviceLocale = "en"`, `savedLocale = "ar"`, `nativeIsRTL = false`) — Expected and actual both correct today; this is the reference "intended Arabic RTL layout" and must be matched by the Arabic-device render after the fix.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- English (or any non-RTL locale) with no saved preference SHALL continue to render correct LTR layout (bugfix.md 3.1).
- In-app Arabic selection on a non-Arabic (LTR) device SHALL continue to render correct RTL layout — the currently working path (bugfix.md 3.2).
- A saved in-app locale preference SHALL continue to take precedence over the device locale (bugfix.md 3.3).
- Changing the in-app language SHALL continue to apply the new language's layout and direction correctly (bugfix.md 3.4).
- Web rendering SHALL continue exactly as today, with no crash from RTL/native calls (bugfix.md 3.5).

**Scope:**
All inputs where `nativeIsRTL === false` (every non-bug scenario) MUST be completely unaffected. This includes:
- English LTR sessions.
- In-app Arabic selection on an LTR device.
- Saved-preference resolution and in-app language switching on LTR devices.
- Web (where `I18nManager.isRTL` is `false` and `forceRTL` is a no-op).

The actual expected correct behavior for the buggy inputs is defined in the Correctness Properties section (Property 1).

## Hypothesized Root Cause

Based on the bug analysis and source inspection, the double-flip is caused by the manual RTL layer assuming a fixed LTR native base:

1. **Auto-flipped `flexDirection` in `lib/rtl.ts`**: `getRTLStyles`/`rtlFlex` return `"row-reverse"` for RTL. When `I18nManager.isRTL === true`, React Native swaps `row` ⇄ `row-reverse`, so `"row-reverse"` renders as visual LTR flow — the primary source of mirrored rows and mis-sided spacing.

2. **Manually reversed tab order in `app/(tabs)/_layout.tsx`**: `order = isRTL ? [settings, log, home] : [home, log, settings]` reverses the array, but the tab bar's row is also auto-flipped natively, double-reversing the visible tab order.

3. **Ineffective `forceRTL(false)` on Arabic devices**: `app/_layout.tsx` and `LanguageContext.applyRTL` call `I18nManager.allowRTL(false)/forceRTL(false)`, but on an Arabic device these do not change `isRTL` for the current session (they require a relaunch), so the app runs an entire session with `isRTL === true` while assuming `false`.

4. **Native RTL advertised via `app.json`**: iOS `CFBundleLocalizations: ["ar","en"]` / `CFBundleDevelopmentRegion: "ar"` (and Android locale resources) cause the OS to select an RTL base when the device is Arabic, which is what sets `isRTL === true`. This is desirable for Arabic support and should not be removed; the manual layer must instead cooperate with it.

The chosen fix targets causes (1) and (2) directly by making the auto-flipped properties native-aware, which neutralizes cause (3)'s ineffectiveness without needing a relaunch and leaves cause (4) intact.

## Correctness Properties

Property 1: Bug Condition - Arabic Device Renders RTL Exactly Once

_For any_ launch context where the bug condition holds (`isBugCondition` returns true: an RTL device locale with `nativeIsRTL === true`), the fixed layout resolution SHALL produce a rendered direction equal to the intended Arabic RTL layout — horizontal flow, tab order, and start/end spacing applied exactly once (no double-flip) — and SHALL be identical to the render produced for `deviceLocale = "en", savedLocale = "ar"` (native base LTR). Concretely, the resolved `flexDirection` and manual tab ordering account for `nativeIsRTL` such that `renderedDirection(resolve(desiredRTL, nativeIsRTL)) === desiredRTL` and the result is not mirrored.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-RTL-Device Layout Unchanged

_For any_ launch context where the bug condition does NOT hold (`isBugCondition` returns false — i.e. `nativeIsRTL === false`, covering English LTR, in-app Arabic on an LTR device, saved-preference resolution, in-app switching, and web), the fixed resolution SHALL produce exactly the same style and ordering output as the original resolution: `resolve'(desiredRTL, false) === resolveOriginal(desiredRTL)` for both values of `desiredRTL`, preserving all current layout, text direction, icon, and tab-order behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct, the fix centralizes native-awareness in the manual RTL layer. The core rule: properties that React Native auto-flips under a native RTL base must be reversed by the manual layer only when `effectiveFlip = desiredRTL XOR nativeIsRTL` is true; physical properties stay keyed to `desiredRTL`.

**File**: `lib/rtl.ts`

**Functions**: `getRTLStyles`, `rtlFlex` (and a new internal helper)

**Specific Changes**:
1. **Read the native base direction**: Introduce a helper `getNativeIsRTL()` returning `I18nManager.isRTL` (guarded so it is safe on web). Prefer passing `nativeIsRTL` as a parameter into pure helpers to keep them testable, defaulting to `I18nManager.isRTL` when omitted.

2. **Native-aware `flexDirection`**: Compute the auto-flipped axis using `effectiveFlip = desiredRTL !== nativeIsRTL`:
   ```
   flexDirection = effectiveFlip ? "row-reverse" : "row"
   ```
   When `nativeIsRTL === false` this reduces to `desiredRTL ? "row-reverse" : "row"` — identical to today. When `nativeIsRTL === true` and `desiredRTL === true`, it yields `"row"`, which RN renders as visual RTL flow (applied once).

3. **Leave physical properties keyed to `desiredRTL`**: `textAlign` (`right`/`left`), `writingDirection` (`rtl`/`ltr`), `marginLeft/Right`, `paddingLeft/Right`, `left/right`, and border-side helpers stay exactly as today. React Native does not auto-flip these physical values, so no XOR is needed and preservation is exact.

4. **Keep `flipIconName` keyed to `desiredRTL`**: Directional icon selection is glyph choice, not layout auto-flip, so it remains a function of `desiredRTL` only.

**File**: `app/(tabs)/_layout.tsx`

**Function**: `TabLayout`

5. **Native-aware tab ordering**: The manual array reversal is an auto-flipped concern (the tab bar renders as a row). Reverse the order only on `effectiveFlip`, not on `desiredRTL` alone:
   ```
   const effectiveFlip = isRTL !== I18nManager.isRTL;
   const order = effectiveFlip ? [settingsTab, logTab, homeTab] : [homeTab, logTab, settingsTab];
   ```
   When `nativeIsRTL === false` this equals the current `isRTL ? [...] : [...]` behavior.

**File**: `context/LanguageContext.tsx` and `app/_layout.tsx` (documentation-only, no behavior change)

6. **Clarify the `forceRTL(false)` calls**: Keep `allowRTL(false)/forceRTL(false)` (they still enforce LTR base on LTR devices and are harmless where ineffective), but update the comments to state that they cannot flip `isRTL` mid-session on an RTL device and that correctness now comes from the native-aware helpers. No functional change, so preservation is unaffected. Optionally expose `nativeIsRTL` through `useLanguage()` for components that need it.

**File**: `app.json` (no change required)

7. Retain the Arabic localizations and `supportsRTL` declaration — Arabic support is intended. The native-aware layer cooperates with the RTL base rather than fighting it, so no manifest change is needed. (The non-standard `extra.supportsRTL` key may optionally be cleaned up separately; it is out of scope for the fix.)

## Testing Strategy

### Validation Approach

Two phases: first surface counterexamples that demonstrate the double-flip on the unfixed code by modeling the native auto-flip, then verify the fix renders Arabic RTL exactly once and leaves every non-RTL-device path unchanged. Because rendering a real native RTL base in a unit environment is impractical, the strategy refactors the direction decision into **pure, `nativeIsRTL`-parameterized functions** and tests them against an oracle that models React Native's auto-flip.

### Oracle (native auto-flip model)

```
FUNCTION renderedDirection(styleFlexDirection, nativeIsRTL)
  // RN swaps row <-> row-reverse when the native base is RTL
  isReversed := (styleFlexDirection = "row-reverse")
  IF nativeIsRTL THEN isReversed := NOT isReversed
  RETURN isReversed ? "RTL-flow" : "LTR-flow"
END FUNCTION
```

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the double-flip BEFORE implementing the fix, confirming the root cause. If refuted, re-hypothesize.

**Test Plan**: Call the current `getRTLStyles(true)` / `rtlFlex(true)` and the current tab-order logic, then pass the result through `renderedDirection(..., nativeIsRTL = true)`. Observe that the rendered flow is LTR even though `desiredRTL` is true.

**Test Cases**:
1. **Row flow on Arabic device**: `renderedDirection(getRTLStyles(true).flexDirection, true)` — expect it to (wrongly) equal `"LTR-flow"` on unfixed code (will fail the intended assertion).
2. **Tab order on Arabic device**: apply current `isRTL ? [settings,log,home] : [...]` then model native reversal — expect visible order reversed from intended (will fail on unfixed code).
3. **Start/end spacing on Arabic device**: confirm content lands on the wrong side once flow is reversed (will fail on unfixed code).
4. **Edge — English device Arabic in-app** (`nativeIsRTL = false`): confirm this path already renders correct RTL (should pass, isolating the bug to `nativeIsRTL = true`).

**Expected Counterexamples**:
- `renderedDirection(getRTLStyles(true).flexDirection, true) === "LTR-flow"` (mirrored) instead of `"RTL-flow"`.
- Possible causes confirmed: auto-flipped `flexDirection`, double-reversed tab order, ineffective session-level `forceRTL(false)`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected (once-applied) RTL direction.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  resolved := getRTLStyles_fixed(desiredRTL = true, nativeIsRTL = true)
  ASSERT renderedDirection(resolved.flexDirection, true) = "RTL-flow"
  ASSERT resolved = getRTLStyles_fixed(desiredRTL = true, nativeIsRTL = false)  // matches en-device / ar-in-app
  ASSERT tabOrder_fixed(desiredRTL = true, nativeIsRTL = true) renders as intended RTL order
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (`nativeIsRTL = false`), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL desiredRTL IN {true, false} DO
  ASSERT getRTLStyles_fixed(desiredRTL, nativeIsRTL = false) = getRTLStyles_original(desiredRTL)
  ASSERT rtlFlex_fixed(desiredRTL, false)                   = rtlFlex_original(desiredRTL)
  ASSERT tabOrder_fixed(desiredRTL, false)                  = tabOrder_original(desiredRTL)
  ASSERT flipIconName_fixed(name, desiredRTL)               = flipIconName_original(name, desiredRTL)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because:
- It exhaustively/densely covers the small combinatorial input space (`desiredRTL` × `nativeIsRTL` × icon names × spacing sizes).
- It catches edge cases manual tests miss.
- It gives a strong guarantee that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Capture current outputs of the physical helpers (`rtlTextAlign`, `rtlMarginStart/End`, `rtlPaddingStart/End`, `rtlBorderStart/End`, `rtlPosition`, `flipIconName`) and assert the fixed versions are identical for `nativeIsRTL = false`, and that physical helpers are unaffected by `nativeIsRTL` entirely.

**Test Cases**:
1. **flexDirection preservation (LTR base)**: `getRTLStyles_fixed(d, false) === getRTLStyles_original(d)` for `d ∈ {true, false}`.
2. **Physical helpers unchanged**: margins/paddings/borders/position/textAlign identical regardless of `nativeIsRTL`.
3. **Icon flip unchanged**: `flipIconName` output depends only on `desiredRTL`.
4. **Tab order preservation (LTR base)**: `tabOrder_fixed(d, false) === tabOrder_original(d)`.

### Unit Tests

- `getRTLStyles`/`rtlFlex` for the four `(desiredRTL, nativeIsRTL)` combinations, asserting rendered direction via the oracle.
- Tab-order resolution for the four combinations.
- Physical helpers unaffected by `nativeIsRTL`.
- Web guard: `getNativeIsRTL()` and `forceRTL` calls do not throw when `I18nManager` behaves as on web.

### Property-Based Tests

- **Fix property**: for all `desiredRTL`, `renderedDirection(getRTLStyles_fixed(desiredRTL, nativeIsRTL).flexDirection, nativeIsRTL) === (desiredRTL ? "RTL-flow" : "LTR-flow")` for both values of `nativeIsRTL`.
- **Consistency property**: for all `desiredRTL`, the rendered direction on an Arabic device (`nativeIsRTL = true`) equals the rendered direction on an LTR device with the same `desiredRTL`.
- **Preservation property**: for all `desiredRTL`, all helper outputs at `nativeIsRTL = false` equal the original implementation's outputs; physical-helper outputs are invariant to `nativeIsRTL`.
- Generators: booleans for `desiredRTL`/`nativeIsRTL`, sampled icon names (including names absent from the flip map), and spacing sizes from `RTL_SPACING`.

### Integration Tests

- Full render of the Settings screen and bottom tab bar under a mocked `I18nManager.isRTL = true` (Arabic device) asserting correct RTL flow, spacing side, back-arrow direction, and tab order.
- Switching in-app language on an LTR device (`nativeIsRTL = false`) still flips layout correctly (regression guard for the working path).
- Web render smoke test: no throw from RTL/native calls and layout matches current web behavior.
