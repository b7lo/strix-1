import { calculateLiability } from "../liabilityEngine";
import type { GyroscopeSnapshot } from "../types";

const quietGyro: GyroscopeSnapshot = {
  peakRotationRate: 0,
  spinDetected: false,
  dominantAxis: "none",
  yawRate: 0,
  pitchRate: 0,
  rollRate: 0,
  rolloverDetected: false,
};

describe("سقوف الأمان للمركبة الواقفة (Req 10.3 / 15.1)", () => {
  it("واقف + اصطدام أمامي ← خطأ المستخدم ≤ 50٪", () => {
    const r = calculateLiability("front", 3.0, 0, 5, null, quietGyro, 1, 0, "front", null, true);
    expect(r.userFaultPercent).toBeLessThanOrEqual(50);
  });

  it("واقف + صُدم من الخلف ← خطأ المستخدم ≤ 25٪", () => {
    const r = calculateLiability("rear", 3.0, 0, 5, null, quietGyro, 1, 0, "rear", null, true);
    expect(r.userFaultPercent).toBeLessThanOrEqual(25);
  });

  it("متحرّك (سرعة 40) + أمامي ← لا يُطبَّق السقف (قد يصل 100٪)", () => {
    const moving = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", null, true);
    const stationary = calculateLiability("front", 3.0, 0, 20, null, quietGyro, 1, 0, "front", null, true);
    // المتحرّك أعلى من الواقف (لأن الواقف مقصوص عند 50)
    expect(moving.userFaultPercent).toBeGreaterThan(stationary.userFaultPercent);
  });
});
