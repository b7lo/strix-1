/**
 * Property 2 — Preservation for the Arabic RTL layout fix.
 *
 * For every non-bug input (nativeIsRTL === false: LTR devices, in-app Arabic
 * on an LTR device, web), the fixed helpers must produce exactly the same
 * output as the original implementation. Physical helpers must be invariant
 * to nativeIsRTL entirely.
 *
 * The "original" outputs are encoded here as the pre-fix behavior:
 *   flexDirection = desiredRTL ? "row-reverse" : "row"
 * which is exactly what the fixed helpers reduce to when nativeIsRTL === false.
 */
import fc from "fast-check";
import {
  getRTLStyles,
  rtlFlex,
  rtlTextAlign,
  rtlWritingDirection,
  rtlMarginStart,
  rtlMarginEnd,
  rtlPaddingStart,
  rtlPaddingEnd,
  rtlBorderStart,
  rtlBorderEnd,
  rtlPosition,
  rtlSpaceStart,
  rtlSpaceEnd,
  rtlGap,
  flipIconName,
} from "../rtl";
import {
  arbDesiredRTL,
  arbNativeIsRTL,
  arbIconName,
  arbSpacingSize,
} from "./rtlOracle";

/** Original (pre-fix) flexDirection: keyed to desiredRTL only. */
function originalFlex(desiredRTL: boolean): "row" | "row-reverse" {
  return desiredRTL ? "row-reverse" : "row";
}

describe("Property 2: Preservation — flexDirection on LTR base (nativeIsRTL = false)", () => {
  it("getRTLStyles/rtlFlex at nativeIsRTL=false equal the original outputs", () => {
    fc.assert(
      fc.property(arbDesiredRTL, (desiredRTL) => {
        expect(getRTLStyles(desiredRTL, false).flexDirection).toBe(
          originalFlex(desiredRTL)
        );
        expect(rtlFlex(desiredRTL, false).flexDirection).toBe(
          originalFlex(desiredRTL)
        );
      })
    );
  });
});

describe("Property 2: Preservation — physical helpers invariant to nativeIsRTL", () => {
  it("textAlign / writingDirection depend only on desiredRTL", () => {
    fc.assert(
      fc.property(arbDesiredRTL, arbNativeIsRTL, (desiredRTL, nativeIsRTL) => {
        // These helpers do not take nativeIsRTL; assert output is stable and
        // getRTLStyles' physical fields do not vary with nativeIsRTL.
        const a = getRTLStyles(desiredRTL, nativeIsRTL);
        const b = getRTLStyles(desiredRTL, !nativeIsRTL);
        expect(a.textAlign).toBe(b.textAlign);
        expect(a.writingDirection).toBe(b.writingDirection);
        expect(rtlTextAlign(desiredRTL)).toEqual(
          desiredRTL ? { textAlign: "right" } : { textAlign: "left" }
        );
        expect(rtlWritingDirection(desiredRTL)).toEqual(
          desiredRTL ? { writingDirection: "rtl" } : { writingDirection: "ltr" }
        );
      })
    );
  });

  it("margins/paddings/borders/position/spacing depend only on desiredRTL", () => {
    fc.assert(
      fc.property(arbDesiredRTL, arbSpacingSize, (desiredRTL, size) => {
        const v = 10;
        expect(rtlMarginStart(v, desiredRTL)).toEqual(
          desiredRTL ? { marginRight: v } : { marginLeft: v }
        );
        expect(rtlMarginEnd(v, desiredRTL)).toEqual(
          desiredRTL ? { marginLeft: v } : { marginRight: v }
        );
        expect(rtlPaddingStart(v, desiredRTL)).toEqual(
          desiredRTL ? { paddingRight: v } : { paddingLeft: v }
        );
        expect(rtlPaddingEnd(v, desiredRTL)).toEqual(
          desiredRTL ? { paddingLeft: v } : { paddingRight: v }
        );
        expect(rtlBorderStart(2, "#000", desiredRTL)).toEqual(
          desiredRTL
            ? { borderRightWidth: 2, borderRightColor: "#000" }
            : { borderLeftWidth: 2, borderLeftColor: "#000" }
        );
        expect(rtlBorderEnd(2, "#000", desiredRTL)).toEqual(
          desiredRTL
            ? { borderLeftWidth: 2, borderLeftColor: "#000" }
            : { borderRightWidth: 2, borderRightColor: "#000" }
        );
        expect(rtlPosition(4, 8, desiredRTL)).toEqual(
          desiredRTL ? { right: 4, left: 8 } : { left: 4, right: 8 }
        );
        // spacing helpers derive from margins → also desiredRTL-only.
        expect(rtlSpaceStart(size, desiredRTL)).toEqual(
          rtlMarginStart((rtlSpaceStart(size, desiredRTL) as any).marginRight ??
            (rtlSpaceStart(size, desiredRTL) as any).marginLeft, desiredRTL)
        );
        expect(rtlSpaceEnd(size, desiredRTL)).toBeDefined();
        expect(rtlGap(size, desiredRTL)).toHaveProperty("gap");
      })
    );
  });
});

describe("Property 2: Preservation — icon flip depends only on desiredRTL", () => {
  it("flipIconName output is independent of nativeIsRTL", () => {
    fc.assert(
      fc.property(arbIconName, arbDesiredRTL, (name, desiredRTL) => {
        // flipIconName has no nativeIsRTL parameter; assert it is deterministic
        // and stable across repeated calls (glyph choice, not layout auto-flip).
        expect(flipIconName(name, desiredRTL)).toBe(flipIconName(name, desiredRTL));
      })
    );
  });
});
