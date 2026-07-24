/**
 * Shared test helper for the Arabic RTL layout fix spec.
 *
 * This file is NOT a test suite. It is a pure helper imported by
 * rtlBugCondition.test.ts and rtlPreservation.test.ts. It is excluded from
 * Jest's test discovery via `testPathIgnorePatterns` in jest.config.js so it
 * does not fail with "Your test suite must contain at least one test".
 *
 * It implements the native auto-flip oracle from the design (design.md ->
 * "Oracle (native auto-flip model)") plus the small input-space generators
 * used by the property-based tests.
 */
import fc from "fast-check";
import { RTL_SPACING } from "../rtl";

/** The visual horizontal flow direction a row style resolves to on screen. */
export type FlowDirection = "RTL-flow" | "LTR-flow";

/** The `flexDirection` values relevant to horizontal layout. */
export type StyleFlexDirection = "row" | "row-reverse";

/**
 * Native auto-flip oracle.
 *
 * React Native swaps `row` <-> `row-reverse` when the native layout base is
 * RTL (`I18nManager.isRTL === true`). This models that behavior so pure
 * direction helpers can be tested without a real native RTL base.
 *
 *   isReversed := (styleFlexDirection = "row-reverse")
 *   IF nativeIsRTL THEN isReversed := NOT isReversed
 *   RETURN isReversed ? "RTL-flow" : "LTR-flow"
 */
export function renderedDirection(
  styleFlexDirection: StyleFlexDirection,
  nativeIsRTL: boolean
): FlowDirection {
  let isReversed = styleFlexDirection === "row-reverse";
  if (nativeIsRTL) {
    isReversed = !isReversed;
  }
  return isReversed ? "RTL-flow" : "LTR-flow";
}

/**
 * The intended visual flow for a given desired logical direction. When the app
 * wants RTL (`desiredRTL === true`) the correct rendered flow is "RTL-flow".
 */
export function intendedFlow(desiredRTL: boolean): FlowDirection {
  return desiredRTL ? "RTL-flow" : "LTR-flow";
}

// ---------------------------------------------------------------------------
// Input-space constants
// ---------------------------------------------------------------------------

/** Icon names present in `flipIconName`'s flip map (directional glyphs). */
export const FLIPPABLE_ICON_NAMES = [
  "arrow-left",
  "arrow-right",
  "chevron-left",
  "chevron-right",
  "chevrons-left",
  "chevrons-right",
  "corner-up-left",
  "corner-up-right",
  "corner-down-left",
  "corner-down-right",
  "corner-left-up",
  "corner-right-up",
  "corner-left-down",
  "corner-right-down",
] as const;

/** Icon names deliberately ABSENT from the flip map (must never be flipped). */
export const NON_FLIPPABLE_ICON_NAMES = [
  "home",
  "settings",
  "user",
  "bell",
  "camera",
  "map-pin",
  "menu",
  "x",
  "check",
  "",
] as const;

/** Combined sample of icon names covering both flippable and non-flippable. */
export const SAMPLE_ICON_NAMES: readonly string[] = [
  ...FLIPPABLE_ICON_NAMES,
  ...NON_FLIPPABLE_ICON_NAMES,
];

/** Spacing size keys from `RTL_SPACING` in lib/rtl.ts. */
export const SPACING_SIZES = Object.keys(
  RTL_SPACING
) as (keyof typeof RTL_SPACING)[];

// ---------------------------------------------------------------------------
// fast-check generators for the small combinatorial input space
// ---------------------------------------------------------------------------

/** The logical direction the app wants to present (locale === "ar"). */
export const arbDesiredRTL: fc.Arbitrary<boolean> = fc.boolean();

/** The native layout base direction (I18nManager.isRTL at launch). */
export const arbNativeIsRTL: fc.Arbitrary<boolean> = fc.boolean();

/** An icon name sampled from both flippable and non-flippable sets. */
export const arbIconName: fc.Arbitrary<string> = fc.constantFrom(
  ...SAMPLE_ICON_NAMES
);

/** A spacing size key sampled from RTL_SPACING. */
export const arbSpacingSize: fc.Arbitrary<keyof typeof RTL_SPACING> =
  fc.constantFrom(...SPACING_SIZES);
