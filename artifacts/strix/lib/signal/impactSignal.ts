import { detectAccelerometerSaturation } from "./saturationDetector";
import {
  sanitizeSignalVector,
  signalMagnitude,
  type ImpactSignal,
  type SignalVector3,
} from "./types";

export interface ImpactSignalProcessorOptions {
  initialGravity?: SignalVector3;
  gravityTimeConstantSec?: number;
  maxGravityInnovationG?: number;
  saturationThresholdG?: number;
  fallbackRateHz?: number;
}

/**
 * Fast impact path: preserve the raw-minus-gravity peak and update gravity only
 * after emitting it. Gravity innovation is bounded so an impact cannot be
 * absorbed into the gravity estimate.
 */
export class ImpactSignalProcessor {
  private gravity: SignalVector3;
  private readonly initialGravity: SignalVector3;
  private readonly gravityTimeConstantSec: number;
  private readonly maxGravityInnovationG: number;
  private readonly saturationThresholdG: number;
  private readonly fallbackDtSec: number;

  constructor(options: ImpactSignalProcessorOptions = {}) {
    this.initialGravity = sanitizeSignalVector(options.initialGravity ?? { x: 0, y: -1, z: 0 });
    this.gravity = { ...this.initialGravity };
    this.gravityTimeConstantSec = Math.max(0.05, options.gravityTimeConstantSec ?? 0.4);
    this.maxGravityInnovationG = Math.max(0.01, options.maxGravityInnovationG ?? 0.25);
    this.saturationThresholdG = Math.max(0.1, options.saturationThresholdG ?? 15);
    this.fallbackDtSec = 1 / Math.max(1, options.fallbackRateHz ?? 50);
  }

  process(rawInput: SignalVector3, timestampMs: number, dtSec = this.fallbackDtSec): ImpactSignal {
    const safeTimestampMs = Number.isFinite(timestampMs) ? timestampMs : 0;
    const safeDtSec = Number.isFinite(dtSec)
      ? Math.max(0.001, Math.min(dtSec, 1))
      : this.fallbackDtSec;
    const raw = sanitizeSignalVector(rawInput, this.gravity);
    const gravity = { ...this.gravity };
    const linearAcceleration = {
      x: raw.x - gravity.x,
      y: raw.y - gravity.y,
      z: raw.z - gravity.z,
    };
    const magnitudeG = signalMagnitude(linearAcceleration);
    const saturation = detectAccelerometerSaturation(raw, {
      saturationThresholdG: this.saturationThresholdG,
    });

    this.updateGravity(raw, safeDtSec);

    return {
      timestampMs: safeTimestampMs,
      dtSec: safeDtSec,
      raw,
      gravity,
      linearAcceleration,
      magnitudeG,
      accelerometerSaturated: saturation.saturated,
      minimumPeakG: saturation.saturated ? magnitudeG : null,
    };
  }

  getGravity(): SignalVector3 {
    return { ...this.gravity };
  }

  reset(): void {
    this.gravity = { ...this.initialGravity };
  }

  private updateGravity(raw: SignalVector3, dtSec: number): void {
    const innovation = {
      x: raw.x - this.gravity.x,
      y: raw.y - this.gravity.y,
      z: raw.z - this.gravity.z,
    };
    const innovationMagnitude = signalMagnitude(innovation);
    const scale = innovationMagnitude > this.maxGravityInnovationG
      ? this.maxGravityInnovationG / innovationMagnitude
      : 1;
    const alpha = 1 - Math.exp(-dtSec / this.gravityTimeConstantSec);

    this.gravity.x += alpha * innovation.x * scale;
    this.gravity.y += alpha * innovation.y * scale;
    this.gravity.z += alpha * innovation.z * scale;
  }
}
