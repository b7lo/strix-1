export interface SignalVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ImpactSignal {
  /** Monotonic timestamp supplied by the live/replay source. */
  timestampMs: number;
  /** Protected elapsed time used by the signal processors. */
  dtSec: number;
  /** Sanitized accelerometer reading including gravity, in g. */
  raw: SignalVector3;
  /** Gravity estimate used for this sample, in g. */
  gravity: SignalVector3;
  /** Fast raw-minus-gravity path. It is intentionally not smoothed. */
  linearAcceleration: SignalVector3;
  magnitudeG: number;
  /** True when at least one raw axis is at the configured sensor range. */
  accelerometerSaturated: boolean;
  /** A clipped magnitude is only a lower bound, never an exact peak. */
  minimumPeakG: number | null;
}

export interface MotionSignal {
  timestampMs: number;
  dtSec: number;
  /** Time-normalized low-pass motion estimate, in g. */
  linearAcceleration: SignalVector3;
  magnitudeG: number;
}

export function sanitizeSignalVector(
  value: SignalVector3,
  fallback: SignalVector3 = { x: 0, y: 0, z: 0 },
): SignalVector3 {
  return {
    x: Number.isFinite(value.x) ? value.x : fallback.x,
    y: Number.isFinite(value.y) ? value.y : fallback.y,
    z: Number.isFinite(value.z) ? value.z : fallback.z,
  };
}

export function signalMagnitude(value: SignalVector3): number {
  const magnitude = Math.hypot(value.x, value.y, value.z);
  return Number.isFinite(magnitude) ? magnitude : 0;
}
