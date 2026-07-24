# Bugfix Requirements Document

## Introduction

When the **device system language is set to Arabic**, the Strix app renders the entire UI mirrored/reversed. The Arabic layout that is supposed to be right-to-left (RTL) instead appears scrambled: horizontal rows, start/end spacing, icon direction, and the bottom tab order end up on the wrong side. The user reported: "لما يكون لغة الجهاز عربي يطلع كل شي معكوس" (when the device language is Arabic, everything appears reversed), with a screenshot of the Settings screen (الإعدادات).

The app uses a **manual RTL** strategy: it forces React Native's native RTL off (`I18nManager.allowRTL(false)` / `I18nManager.forceRTL(false)`) and applies direction manually through `lib/rtl.ts` helpers (`flexDirection: "row-reverse"`, `textAlign: "right"`, start/end margin/padding swaps, `flipIconName`, reversed tab order). This manual approach assumes the native layer never auto-flips (`I18nManager.isRTL === false`).

The defect occurs because that assumption breaks when the **device locale is Arabic (an RTL locale)**. In that case the native layer initializes its layout direction to RTL at app launch (`I18nManager.isRTL === true`), and the JS-level `forceRTL(false)` call does not take effect until an app relaunch. Native auto-flipping is therefore active while the app also applies its own manual `row-reverse`/start-end overrides — the layout is flipped twice (double-flip), producing the mirrored result. The app also declares `supportsRTL: true` and Arabic localizations in `app.json`, reinforcing native RTL when the device is Arabic.

The bug does **not** appear when the device locale is non-Arabic (e.g., English) and the user selects Arabic *inside* the app, because in that scenario native `isRTL` stays `false` and the manual RTL overrides apply exactly once.

## Bug Analysis

### Current Behavior (Defect)

What currently happens when the device system language is Arabic (an RTL locale) at app launch.

1.1 WHEN the device system language is Arabic and the app launches THEN the system renders the UI mirrored/reversed, with layout applied in the opposite direction of the intended Arabic RTL design.

1.2 WHEN the device system language is Arabic THEN the system renders horizontal rows (`flexDirection`) and start/end spacing (margins, paddings, borders) double-flipped, so elements that should be aligned to the right (start, in Arabic) appear on the left and vice versa.

1.3 WHEN the device system language is Arabic THEN the system renders the bottom navigation tab order and directional icons (e.g., the back arrow) in the wrong direction, inconsistent with the intended Arabic RTL layout.

1.4 WHEN the device system language is Arabic THEN the rendered layout differs from the layout produced when Arabic is selected from inside the app on a non-Arabic (LTR) device, even though both represent the same Arabic language.

### Expected Behavior (Correct)

What should happen instead for the same conditions.

2.1 WHEN the device system language is Arabic and the app launches THEN the system SHALL render the Arabic UI with correct right-to-left layout, not mirrored or reversed.

2.2 WHEN the device system language is Arabic THEN the system SHALL apply horizontal direction and start/end spacing exactly once (no double-flip), so start-aligned elements appear on the right and end-aligned elements appear on the left as intended for Arabic.

2.3 WHEN the device system language is Arabic THEN the system SHALL render the bottom navigation tab order and directional icons in the correct Arabic RTL direction.

2.4 WHEN the device system language is Arabic THEN the system SHALL produce a layout identical to the layout produced when Arabic is selected from inside the app on a non-Arabic (LTR) device.

### Unchanged Behavior (Regression Prevention)

Existing behavior that must be preserved for inputs that do not trigger the bug.

3.1 WHEN the device system language is English (or any non-RTL locale) and no in-app language is saved THEN the system SHALL CONTINUE TO render the English UI with correct left-to-right layout.

3.2 WHEN the device system language is non-Arabic and the user selects Arabic from inside the app THEN the system SHALL CONTINUE TO render the Arabic UI with correct RTL layout (the currently working path).

3.3 WHEN the user has a saved in-app locale preference THEN the system SHALL CONTINUE TO honor that saved preference over the device locale.

3.4 WHEN the user changes the in-app language THEN the system SHALL CONTINUE TO apply the newly selected language's layout and text direction correctly.

3.5 WHEN the app renders on web THEN the system SHALL CONTINUE TO render layout and direction as it currently does (no crash from RTL/native calls).

## Deriving the Bug Condition

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AppLaunchContext
         X = {
           deviceLocale : Locale,      // system language reported by the OS
           savedLocale  : Locale?,     // user's persisted in-app choice (may be null)
           nativeIsRTL  : boolean      // I18nManager.isRTL at launch, set natively from device locale
         }
  OUTPUT: boolean

  // The bug is triggered when the device system language is an RTL locale
  // (Arabic), which causes the native layer to initialize layout direction
  // to RTL (nativeIsRTL = true) while the app also applies manual RTL styling.
  RETURN isRTLLocale(X.deviceLocale)      // e.g. X.deviceLocale = "ar"
         AND X.nativeIsRTL = true
END FUNCTION
```

### Property Specification (Fix Checking)

```pascal
// Property: Fix Checking - Arabic device locale must not double-flip layout
FOR ALL X WHERE isBugCondition(X) DO
  renderedLayout ← renderApp'(X)
  ASSERT renderedLayout = intendedArabicRTLLayout
     AND renderedLayout = renderApp'( X with deviceLocale = "en", savedLocale = "ar" )
     AND NOT isMirrored(renderedLayout)
END FOR
```

Where `intendedArabicRTLLayout` is the correct RTL presentation (start-aligned content on the right, correct tab order, correct directional icons), and the equality with the English-device / Arabic-in-app render captures that the same language must produce the same layout regardless of how Arabic was chosen.

### Preservation Goal (Preservation Checking)

```pascal
// Property: Preservation Checking - non-RTL-device inputs must be unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT renderApp(X) = renderApp'(X)
END FOR
```

**Key Definitions:**
- **F** (`renderApp`): The original (unfixed) app rendering behavior — before the fix.
- **F'** (`renderApp'`): The fixed app rendering behavior — after the fix.
- **C(X)** (`isBugCondition`): Device system language is an RTL locale (Arabic), so native `I18nManager.isRTL` is `true` at launch.
- **P(result)**: The Arabic UI renders with correct RTL layout, applied exactly once (no mirroring / double-flip), matching the Arabic-in-app-on-LTR-device layout.
- **¬C(X)**: Device language is non-Arabic (LTR); native `isRTL` is `false`. These paths — including in-app Arabic selection and saved preferences — must remain identical to today.

### Counterexample (Reproduction)

1. Set the device system language to Arabic (العربية).
2. Launch the Strix app fresh (no saved in-app locale, so it uses the device locale = Arabic).
3. Open the Settings screen (الإعدادات).
4. Observe: rows, section icons, start/end spacing, the back arrow, and the bottom tab order are mirrored/reversed relative to the intended Arabic RTL layout.

Expected: the Arabic UI is laid out correctly RTL, matching what appears when Arabic is selected from inside the app on an English-language device.
