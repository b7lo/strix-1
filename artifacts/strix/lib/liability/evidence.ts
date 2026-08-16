import type { EvidenceItem } from "../scenario/types";

export interface SpeedEvidenceInput {
  speedKmh: number;
  speedLimitKmh: number | null;
  gpsAccuracyMeters?: number | null;
}

/** Speed is an independent violation signal only when a road limit is known. */
export function buildSpeedEvidence(input: SpeedEvidenceInput): EvidenceItem | null {
  if (!Number.isFinite(input.speedKmh) || input.speedLimitKmh == null || !Number.isFinite(input.speedLimitKmh)) {
    return null;
  }
  if (input.speedKmh <= input.speedLimitKmh) return null;
  const excess = input.speedKmh - input.speedLimitKmh;
  const accuracyFactor = input.gpsAccuracyMeters == null ? 0.6 : input.gpsAccuracyMeters <= 20 ? 1 : 0.5;
  return {
    id: "evidence.speeding",
    source: "gps",
    effect: "supports",
    strength: Math.min(100, Math.round((40 + excess * 2) * accuracyFactor)),
    detail: `${Math.round(excess)}km/h over known limit`,
  };
}
