import { runAdvancedAnalysis } from "../advancedAnalysis";
import { applyHighPassFilter, resetFilter, setSampleRate } from "../sensorUtils";
import type { RingSample } from "../sensorUtils";

function settlePortraitGravity() {
  for (let i = 0; i < 500; i++) applyHighPassFilter({ x: 0, y: 1, z: 0 });
}

function sample(ts: number): RingSample {
  return {
    gForce: 0.1,
    filtered: { x: 0, y: 0, z: 0 },
    raw: { x: 0, y: 1, z: 0 },
    ts,
    isImpulsive: false,
    highFreqMag: 0,
  };
}

describe("Advanced analysis uses the vehicle frame", () => {
  beforeEach(() => {
    resetFilter();
    setSampleRate(50);
    settlePortraitGravity();
  });

  it("يرصد yaw حول المحور الرأسي الحقيقي حتى عندما يكون الهاتف عمودياً", () => {
    const crashTs = 10_000;
    const gyroHistory = [
      { x: 0, y: 1.2, z: 0, ts: 9_900 },
      { x: 0, y: 1.2, z: 0, ts: 9_920 },
      { x: 0, y: 1.2, z: 0, ts: 9_940 },
    ];
    const pre = Array.from({ length: 20 }, (_, i) => sample(9_000 + i * 20));

    const result = runAdvancedAnalysis({
      peakFiltered: { x: 0, y: 0, z: -2 },
      peakGForce: 2,
      speedKmh: 30,
      direction: "front",
      braking: null,
      gyroscope: null,
      gyroHistory,
      preCrashBuffer: pre,
      postCrashBuffer: [],
      postCrashGyro: [],
      crashTimestamp: crashTs,
    });

    expect(result.angularStability.hadSuddenYaw).toBe(true);
    expect(result.angularStability.maxYawRatePreCrash).toBeGreaterThan(60);
  });
});