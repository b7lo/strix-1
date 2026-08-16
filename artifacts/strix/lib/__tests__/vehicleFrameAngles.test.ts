import { VehicleFrameEstimator } from "../vehicleFrameEstimator";

function feed(estimator: VehicleFrameEstimator, angleRad: number): void {
  let speed = 20;
  let timestampMs = 1_000;
  for (let index = 0; index < 12; index++) {
    estimator.addAccelSample(0.2 * Math.sin(angleRad), 0.2 * Math.cos(angleRad), timestampMs, 0);
    estimator.addGpsSample({
      speedKmh: speed,
      timestampMs,
      courseRad: Math.PI - 0.01,
      courseAccuracyDeg: 10,
      speedAccuracyKmh: 1,
    });
    speed += 3;
    timestampMs += 500;
  }
}

function angularError(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

describe("VehicleFrameEstimator angle wrapping and provenance", () => {
  it.each([
    Math.PI - 0.01,
    -Math.PI + 0.01,
    Math.PI / 2,
    -Math.PI / 2,
  ])("recovers a wrapped phone orientation at %p rad", (angle) => {
    const estimator = new VehicleFrameEstimator();
    feed(estimator, angle);
    const estimate = estimator.getEstimate(8_000);
    expect(estimate.calibrated).toBe(true);
    expect(angularError(estimate.yawOffsetRad, angle)).toBeLessThan(0.08);
    expect(estimate.calibrationAgeMs).toBeGreaterThanOrEqual(0);
    expect(estimate.sources.map((source) => source.source)).toEqual(
      expect.arrayContaining(["accelerometer", "gps-speed", "gps-course", "gyroscope"]),
    );
  });

  it("rejects inaccurate GPS course as an orientation source", () => {
    const estimator = new VehicleFrameEstimator();
    estimator.addGpsSample({ speedKmh: 40, timestampMs: 1_000, courseRad: 1, courseAccuracyDeg: 80 });
    expect(estimator.getEstimate().sources.some((source) => source.source === "gps-course")).toBe(false);
  });
});
