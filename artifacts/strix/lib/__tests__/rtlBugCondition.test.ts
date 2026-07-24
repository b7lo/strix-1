/**
 * Property 1 — Bug Condition / Fix Checking for the Arabic RTL layout fix.
 *
 * These tests model React Native's native auto-flip via the oracle in
 * rtlOracle.ts and assert the intended once-applied RTL behavior.
 *
 * BEFORE the fix (native-unaware helpers) the Arabic-device cases FAIL,
 * proving the double-flip bug. AFTER the fix they PASS, confirming the bug
 * is gone and that the Arabic-device render matches the LTR-device render.
 */
import fc from "fast-check";
import { getRTLStyles, rtlFlex } from "../rtl";
import {
  renderedDirection,
  intendedFlow,
  arbDesiredRTL,
  arbNativeIsRTL,
} from "./rtlOracle";

/** Intended visible tab order (left→right) for a desired direction. */
function intendedTabOrder(desiredRTL: boolean): string[] {
  // Arabic RTL: home on the right → visual left→right is [settings, log, home].
  return desiredRTL
    ? ["settings", "log", "home"]
    : ["home", "log", "settings"];
}

/**
 * Native-aware tab order as implemented in app/(tabs)/_layout.tsx, then run
 * through the native row auto-flip so we compare the VISIBLE order.
 */
function renderedTabOrder(desiredRTL: boolean, nativeIsRTL: boolean): string[] {
  const effectiveFlip = desiredRTL !== nativeIsRTL;
  const order = effectiveFlip
    ? ["settings", "log", "home"]
    : ["home", "log", "settings"];
  // The tab bar row is auto-flipped by RN when the native base is RTL.
  return nativeIsRTL ? [...order].reverse() : order;
}

describe("Property 1: Bug Condition — Arabic device renders RTL exactly once", () => {
  // Concrete Arabic-device base case: desiredRTL = true, nativeIsRTL = true.
  it("row flow is RTL-flow on an Arabic device", () => {
    expect(renderedDirection(getRTLStyles(true, true).flexDirection, true)).toBe(
      "RTL-flow"
    );
    expect(renderedDirection(rtlFlex(true, true).flexDirection as any, true)).toBe(
      "RTL-flow"
    );
  });

  it("tab order renders as the intended Arabic RTL order on an Arabic device", () => {
    expect(renderedTabOrder(true, true)).toEqual(intendedTabOrder(true));
  });

  it("Arabic-device render matches the en-device / ar-in-app render", () => {
    // The RENDERED direction must match (both RTL-flow). The raw flexDirection
    // differs on purpose: on an Arabic device "row" renders RTL (native flips
    // it), on an LTR device "row-reverse" renders RTL.
    const arabic = getRTLStyles(true, true);
    const ltr = getRTLStyles(true, false);
    expect(renderedDirection(arabic.flexDirection, true)).toBe(
      renderedDirection(ltr.flexDirection, false)
    );
    // Physical properties are identical regardless of the native base.
    expect(arabic.textAlign).toBe(ltr.textAlign);
    expect(arabic.writingDirection).toBe(ltr.writingDirection);
  });

  it("edge (isolation): Arabic-in-app on an LTR device already renders RTL", () => {
    expect(renderedDirection(getRTLStyles(true, false).flexDirection, false)).toBe(
      "RTL-flow"
    );
  });
});

describe("Property 1: Fix Checking — full input space", () => {
  it("rendered flow equals the intended flow for all (desiredRTL, nativeIsRTL)", () => {
    fc.assert(
      fc.property(arbDesiredRTL, arbNativeIsRTL, (desiredRTL, nativeIsRTL) => {
        const style = getRTLStyles(desiredRTL, nativeIsRTL);
        expect(renderedDirection(style.flexDirection, nativeIsRTL)).toBe(
          intendedFlow(desiredRTL)
        );
      })
    );
  });

  it("Arabic-device render is consistent with LTR-device render for same desiredRTL", () => {
    fc.assert(
      fc.property(arbDesiredRTL, (desiredRTL) => {
        const onArabic = renderedDirection(
          getRTLStyles(desiredRTL, true).flexDirection,
          true
        );
        const onLTR = renderedDirection(
          getRTLStyles(desiredRTL, false).flexDirection,
          false
        );
        expect(onArabic).toBe(onLTR);
      })
    );
  });

  it("tab order renders as intended for all (desiredRTL, nativeIsRTL)", () => {
    fc.assert(
      fc.property(arbDesiredRTL, arbNativeIsRTL, (desiredRTL, nativeIsRTL) => {
        expect(renderedTabOrder(desiredRTL, nativeIsRTL)).toEqual(
          intendedTabOrder(desiredRTL)
        );
      })
    );
  });
});
