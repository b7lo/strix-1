import { calculateLiability } from "../liabilityEngine";
import type { GyroscopeSnapshot, ImpactDirection } from "../types";

const quietGyro: GyroscopeSnapshot = {
  peakRotationRate: 0,
  spinDetected: false,
  dominantAxis: "none",
  yawRate: 0,
  pitchRate: 0,
  rollRate: 0,
  rolloverDetected: false,
};

describe("A-6: ربط المسؤولية بالثقة", () => {
  it("اصطدام أمامي واضح + اتجاه معاير ← نتيجة قاطعة بنطاق ضيّق", () => {
    const r = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", null, true);
    expect(r.confidence).toBe("high");
    expect(r.isConclusive).toBe(true);
    expect(r.faultRange).toEqual([100, 100]);
    expect(r.rawFaultPercent).toBeGreaterThanOrEqual(0);
  });

  it("اتجاه غير معاير ← تُخفَّض الثقة عن high وتُصبح غير قاطعة بنطاق", () => {
    const r = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", null, false);
    expect(r.confidence).not.toBe("high");
    expect(r.isConclusive).toBe(false);
    expect(r.faultRange[0]).toBeLessThan(r.faultRange[1]);
  });

  it("اتجاه مجهول ← غير قاطع مهما كانت القوة", () => {
    const r = calculateLiability("unknown", 5.0, 90, 30, null, quietGyro, 1, 0, "unknown", null, true);
    expect(r.isConclusive).toBe(false);
  });

  // اختبار خصائص (Property-style) بحلقات بدل fast-check لتفادي تبعية جديدة
  it("ثابت: المسؤولية ضمن السلّم القانوني ومجموع الطرفين = 100 لأي مدخلات", () => {
    const dirs: ImpactDirection[] = ["front", "rear", "side-left", "side-right", "unknown"];
    for (const dir of dirs) {
      for (let g = 0; g <= 12; g += 1.5) {
        for (let speed = 0; speed <= 200; speed += 25) {
          const r = calculateLiability(dir, g, speed, 10, null, quietGyro, 1, 0, "unknown", null, true);
          expect([0, 25, 50, 75, 100]).toContain(r.userFaultPercent);
          expect(r.userFaultPercent + r.otherFaultPercent).toBe(100);
          expect(r.rawFaultPercent).toBeGreaterThanOrEqual(0);
          expect(r.rawFaultPercent).toBeLessThanOrEqual(100);
          expect(r.faultRange[0]).toBeLessThanOrEqual(r.faultRange[1]);
        }
      }
    }
  });
});
