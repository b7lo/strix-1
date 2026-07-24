/**
 * A-3 — Vehicle Frame Estimator (sensor fusion) tests.
 * Verifies phone→vehicle yaw calibration from GPS long-accel + accel direction,
 * the straight-driving gate, and tilt-compensated heading.
 */
import { VehicleFrameEstimator, tiltCompensatedHeadingRad } from "../vehicleFrameEstimator";

/** Feed N accelerating events with the given horizontal accel direction (phone frame). */
function feedForwardEvents(
  est: VehicleFrameEstimator,
  ax: number,
  ay: number,
  yawRateDegS = 0,
  count = 12
) {
  let speed = 20; // km/h, above VF_MIN_SPEED_KMH
  let ts = 1000;
  for (let i = 0; i < count; i++) {
    est.addAccelSample(ax, ay, ts, yawRateDegS);
    est.addSpeedSample(speed, ts); // accelerating (+3 km/h / 0.5s ≈ 1.67 m/s²)
    speed += 3;
    ts += 500;
  }
}

describe("A-3 VehicleFrameEstimator", () => {
  it("calibrates to ~0 offset when phone is aligned (forward accel along +Y)", () => {
    const est = new VehicleFrameEstimator();
    feedForwardEvents(est, 0, 0.2);
    const e = est.getEstimate();
    expect(e.eventCount).toBeGreaterThanOrEqual(8);
    expect(e.calibrated).toBe(true);
    expect(Math.abs(e.yawOffsetRad)).toBeLessThan(0.1);
    expect(e.resultant).toBeGreaterThanOrEqual(0.6);
  });

  it("recovers a ~90° offset when phone forward reads along +X", () => {
    const est = new VehicleFrameEstimator();
    feedForwardEvents(est, 0.2, 0);
    const e = est.getEstimate();
    expect(e.calibrated).toBe(true);
    expect(e.yawOffsetRad).toBeCloseTo(Math.PI / 2, 1);
  });

  it("does NOT calibrate while turning (yaw-rate gate rejects events)", () => {
    const est = new VehicleFrameEstimator();
    feedForwardEvents(est, 0, 0.2, /* yawRateDegS */ 30); // > VF_MAX_YAW_RATE_DEG_S
    const e = est.getEstimate();
    expect(e.eventCount).toBe(0);
    expect(e.calibrated).toBe(false);
  });

  it("reset() clears accumulated calibration state", () => {
    const est = new VehicleFrameEstimator();
    feedForwardEvents(est, 0, 0.2);
    est.reset();
    const e = est.getEstimate();
    expect(e.eventCount).toBe(0);
    expect(e.calibrated).toBe(false);
  });

  it("tiltCompensatedHeadingRad returns a finite horizontal heading", () => {
    const h = tiltCompensatedHeadingRad({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: -1 });
    expect(Number.isFinite(h)).toBe(true);
    expect(h).toBeCloseTo(Math.PI / 2, 1);
  });
});
