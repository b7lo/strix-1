import type { SignalVector3 } from "./types";

export interface SaturationDetectorOptions {
  /** Smallest absolute axis reading that indicates clipping, in g. */
  saturationThresholdG?: number;
}

export interface SaturationResult {
  saturated: boolean;
  saturatedAxes: Array<keyof SignalVector3>;
}

/**
 * Detects accelerometer clipping from raw per-axis readings. Detection is kept
 * separate from impact magnitude because a clipped peak is a lower bound, not
 * a trustworthy measurement of the true force.
 */
export function detectAccelerometerSaturation(
  raw: SignalVector3,
  options: SaturationDetectorOptions = {},
): SaturationResult {
  const threshold = Number.isFinite(options.saturationThresholdG)
    ? Math.max(0.1, options.saturationThresholdG!)
    : 15;
  const saturatedAxes = (Object.keys(raw) as Array<keyof SignalVector3>)
    .filter((axis) => Number.isFinite(raw[axis]) && Math.abs(raw[axis]) >= threshold);

  return {
    saturated: saturatedAxes.length > 0,
    saturatedAxes,
  };
}
