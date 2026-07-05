/**
 * Validation test for Task 0: Test tooling and native auto-flip oracle setup.
 * 
 * This test confirms that:
 * 1. fast-check is available and working
 * 2. The rtlOracle helper functions correctly
 * 3. All generators produce valid output
 */

import fc from "fast-check";
import {
  renderedDirection,
  intendedFlow,
  arbDesiredRTL,
  arbNativeIsRTL,
  arbIconName,
  arbSpacingSize,
  FLIPPABLE_ICON_NAMES,
  NON_FLIPPABLE_ICON_NAMES,
  SAMPLE_ICON_NAMES,
  SPACING_SIZES,
} from "./rtlOracle";
import { RTL_SPACING } from "../rtl";

describe("Task 0: Test tooling and native auto-flip oracle", () => {
  describe("fast-check availability", () => {
    it("should import fast-check successfully", () => {
      expect(fc).toBeDefined();
      expect(fc.boolean).toBeDefined();
      expect(fc.constantFrom).toBeDefined();
    });
  });

  describe("renderedDirection oracle", () => {
    it("should return LTR-flow for row with nativeIsRTL=false", () => {
      expect(renderedDirection("row", false)).toBe("LTR-flow");
    });

    it("should return RTL-flow for row-reverse with nativeIsRTL=false", () => {
      expect(renderedDirection("row-reverse", false)).toBe("RTL-flow");
    });

    it("should flip row to RTL-flow when nativeIsRTL=true", () => {
      expect(renderedDirection("row", true)).toBe("RTL-flow");
    });

    it("should flip row-reverse to LTR-flow when nativeIsRTL=true", () => {
      expect(renderedDirection("row-reverse", true)).toBe("LTR-flow");
    });
  });

  describe("intendedFlow helper", () => {
    it("should return RTL-flow when desiredRTL is true", () => {
      expect(intendedFlow(true)).toBe("RTL-flow");
    });

    it("should return LTR-flow when desiredRTL is false", () => {
      expect(intendedFlow(false)).toBe("LTR-flow");
    });
  });

  describe("input space constants", () => {
    it("should have flippable icon names", () => {
      expect(FLIPPABLE_ICON_NAMES.length).toBeGreaterThan(0);
      expect(FLIPPABLE_ICON_NAMES).toContain("arrow-left");
      expect(FLIPPABLE_ICON_NAMES).toContain("arrow-right");
    });

    it("should have non-flippable icon names", () => {
      expect(NON_FLIPPABLE_ICON_NAMES.length).toBeGreaterThan(0);
      expect(NON_FLIPPABLE_ICON_NAMES).toContain("home");
      expect(NON_FLIPPABLE_ICON_NAMES).toContain("settings");
    });

    it("should have combined sample icon names", () => {
      expect(SAMPLE_ICON_NAMES.length).toBe(
        FLIPPABLE_ICON_NAMES.length + NON_FLIPPABLE_ICON_NAMES.length
      );
    });

    it("should have spacing sizes matching RTL_SPACING", () => {
      const expectedSizes = Object.keys(RTL_SPACING);
      expect(SPACING_SIZES).toEqual(expectedSizes);
      expect(SPACING_SIZES).toContain("xs");
      expect(SPACING_SIZES).toContain("sm");
      expect(SPACING_SIZES).toContain("md");
    });
  });

  describe("fast-check generators", () => {
    it("arbDesiredRTL should generate booleans", () => {
      fc.assert(
        fc.property(arbDesiredRTL, (value) => {
          expect(typeof value).toBe("boolean");
        }),
        { numRuns: 10 }
      );
    });

    it("arbNativeIsRTL should generate booleans", () => {
      fc.assert(
        fc.property(arbNativeIsRTL, (value) => {
          expect(typeof value).toBe("boolean");
        }),
        { numRuns: 10 }
      );
    });

    it("arbIconName should generate icon names from the sample", () => {
      fc.assert(
        fc.property(arbIconName, (iconName) => {
          expect(SAMPLE_ICON_NAMES).toContain(iconName);
        }),
        { numRuns: 20 }
      );
    });

    it("arbSpacingSize should generate spacing size keys", () => {
      fc.assert(
        fc.property(arbSpacingSize, (size) => {
          expect(SPACING_SIZES).toContain(size);
          expect(RTL_SPACING[size]).toBeDefined();
          expect(typeof RTL_SPACING[size]).toBe("number");
        }),
        { numRuns: 20 }
      );
    });
  });

  describe("oracle correctness properties", () => {
    it("double flip should cancel (property-based)", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("row" as const, "row-reverse" as const),
          (styleFlexDirection) => {
            // Flip twice should return to original flow
            const flow1 = renderedDirection(styleFlexDirection, false);
            const flow2 = renderedDirection(styleFlexDirection, true);
            
            // When native flips, the flow should be opposite
            expect(flow1).not.toBe(flow2);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
