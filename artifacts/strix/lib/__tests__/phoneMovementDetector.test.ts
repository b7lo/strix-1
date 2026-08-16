import { eulerToQuaternion } from "../orientation/orientationAdapter";
import { PhoneMovementDetector } from "../orientation/phoneMovementDetector";
import { VehicleFrameEstimator } from "../vehicleFrameEstimator";

function calibrate(estimator: VehicleFrameEstimator): void {
  let speed = 20;
  for (let index = 0; index < 12; index++) {
    const timestampMs = 1_000 + index * 500;
    estimator.addAccelSample(0, 0.2, timestampMs, 0);
    estimator.addSpeedSample(speed, timestampMs);
    speed += 3;
  }
}

describe("PhoneMovementDetector", () => {
  it("detects abrupt phone movement and invalidates calibration", () => {
    const detector = new PhoneMovementDetector();
    const estimator = new VehicleFrameEstimator();
    calibrate(estimator);
    expect(estimator.getEstimate().calibrated).toBe(true);

    detector.addSample(eulerToQuaternion(0, 0, 0), 10_000, 0);
    const movement = detector.addSample(eulerToQuaternion(Math.PI / 2, 0, 0), 10_200, 0);
    expect(movement.moved).toBe(true);

    estimator.invalidateCalibration(10_200);
    const estimate = estimator.getEstimate(10_200);
    expect(estimate.calibrated).toBe(false);
    expect(estimate.eventCount).toBe(0);
    expect(estimate.invalidatedReason).toBe("phone-moved");
  });

  it("does not label a matching vehicle turn as phone movement", () => {
    const detector = new PhoneMovementDetector();
    detector.addSample(eulerToQuaternion(0, 0, 0), 1_000, 0);
    const result = detector.addSample(eulerToQuaternion(0.2, 0, 0), 1_200, 60);
    expect(result.moved).toBe(false);
  });

  it("detects a mount tilt change even without yaw", () => {
    const detector = new PhoneMovementDetector();
    detector.addSample(eulerToQuaternion(0, 0, 0), 1_000, 0);
    const result = detector.addSample(eulerToQuaternion(0, Math.PI / 4, 0), 1_500, 0);
    expect(result.reason).toBe("mount-tilt-change");
  });
});
