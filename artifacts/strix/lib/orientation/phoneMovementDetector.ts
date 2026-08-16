import { adaptOrientation, quaternionAngularDistance, type Quaternion } from "./orientationAdapter";

export interface PhoneMovementResult {
  moved: boolean;
  angularDeltaRad: number;
  angularSpeedDegS: number;
  tiltDeltaRad: number;
  reason: "none" | "abrupt-rotation" | "mount-tilt-change";
}

export interface PhoneMovementDetectorOptions {
  abruptAngularSpeedDegS?: number;
  tiltChangeRad?: number;
  maxVehicleYawRateDegS?: number;
  maxSampleGapMs?: number;
}

/** Detects a phone being repositioned without confusing normal vehicle turns with mount movement. */
export class PhoneMovementDetector {
  private previous: { quaternion: Quaternion; timestampMs: number; pitchRad: number; rollRad: number } | null = null;
  private readonly abruptAngularSpeedDegS: number;
  private readonly tiltChangeRad: number;
  private readonly maxVehicleYawRateDegS: number;
  private readonly maxSampleGapMs: number;

  constructor(options: PhoneMovementDetectorOptions = {}) {
    this.abruptAngularSpeedDegS = options.abruptAngularSpeedDegS ?? 45;
    this.tiltChangeRad = options.tiltChangeRad ?? Math.PI / 9;
    this.maxVehicleYawRateDegS = options.maxVehicleYawRateDegS ?? 15;
    this.maxSampleGapMs = options.maxSampleGapMs ?? 1500;
  }

  addSample(quaternion: Quaternion, timestampMs: number, vehicleYawRateDegS = 0): PhoneMovementResult {
    const orientation = adaptOrientation(quaternion);
    const current = {
      quaternion: orientation.quaternion,
      timestampMs,
      pitchRad: orientation.pitchRad,
      rollRad: orientation.rollRad,
    };
    const previous = this.previous;
    this.previous = current;

    if (!previous) return this.emptyResult();
    const dtMs = timestampMs - previous.timestampMs;
    if (dtMs <= 0 || dtMs > this.maxSampleGapMs) return this.emptyResult();

    const angularDeltaRad = quaternionAngularDistance(previous.quaternion, current.quaternion);
    const angularSpeedDegS = angularDeltaRad * (180 / Math.PI) / (dtMs / 1000);
    const tiltDeltaRad = Math.hypot(
      current.pitchRad - previous.pitchRad,
      current.rollRad - previous.rollRad,
    );

    if (tiltDeltaRad >= this.tiltChangeRad) {
      return { moved: true, angularDeltaRad, angularSpeedDegS, tiltDeltaRad, reason: "mount-tilt-change" };
    }
    if (
      angularSpeedDegS >= this.abruptAngularSpeedDegS
      && Math.abs(vehicleYawRateDegS) <= this.maxVehicleYawRateDegS
    ) {
      return { moved: true, angularDeltaRad, angularSpeedDegS, tiltDeltaRad, reason: "abrupt-rotation" };
    }
    return { moved: false, angularDeltaRad, angularSpeedDegS, tiltDeltaRad, reason: "none" };
  }

  reset(): void {
    this.previous = null;
  }

  private emptyResult(): PhoneMovementResult {
    return { moved: false, angularDeltaRad: 0, angularSpeedDegS: 0, tiltDeltaRad: 0, reason: "none" };
  }
}
