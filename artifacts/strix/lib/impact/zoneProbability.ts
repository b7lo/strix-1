import type { ImpactZone, ImpactZoneDistribution } from "../types";

const DIRECTIONAL_ZONES: readonly ImpactZone[] = [
  "front",
  "front-right",
  "side-right",
  "rear-right",
  "rear",
  "rear-left",
  "side-left",
  "front-left",
];

const CENTER_BY_ZONE: Record<Exclude<ImpactZone, "unknown">, number> = {
  front: 0,
  "front-right": Math.PI / 4,
  "side-right": Math.PI / 2,
  "rear-right": 3 * Math.PI / 4,
  rear: Math.PI,
  "rear-left": -3 * Math.PI / 4,
  "side-left": -Math.PI / 2,
  "front-left": -Math.PI / 4,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function roundProbability(value: number): number {
  return Math.round(value * 1e12) / 1e12;
}

/**
 * Produces a continuous probability distribution over impact zones.
 * `sourceX/sourceY` point toward the source of impact in vehicle coordinates.
 */
export function calculateImpactZoneDistribution(
  sourceX: number,
  sourceY: number,
  calibrationConfidence = 100,
): ImpactZoneDistribution {
  const magnitude = Math.hypot(sourceX, sourceY);
  const confidence = clamp01(calibrationConfidence / 100);
  const probabilities = Object.fromEntries(
    [...DIRECTIONAL_ZONES, "unknown"].map((zone) => [zone, 0]),
  ) as Record<ImpactZone, number>;

  if (!Number.isFinite(magnitude) || magnitude < 0.03) {
    probabilities.unknown = 1;
    return {
      probabilities,
      primaryZone: "unknown",
      alternativeZone: null,
      ambiguity: 0,
    };
  }

  const angle = Math.atan2(sourceX, sourceY);
  // High confidence yields a sharper posterior; weak calibration stays deliberately broad.
  const concentration = 2 + 6 * confidence;
  const unknownWeight = 0.02 + (1 - confidence) * 0.18;
  const weights = DIRECTIONAL_ZONES.map((zone) =>
    Math.exp(concentration * Math.cos(angle - CENTER_BY_ZONE[zone as Exclude<ImpactZone, "unknown">])),
  );
  const directionalTotal = weights.reduce((sum, value) => sum + value, 0);
  const normalizer = directionalTotal + directionalTotal * unknownWeight;

  DIRECTIONAL_ZONES.forEach((zone, index) => {
    probabilities[zone] = roundProbability(weights[index] / normalizer);
  });
  probabilities.unknown = roundProbability(directionalTotal * unknownWeight / normalizer);

  // Absorb floating-point residue into the largest bucket so the total is exactly one in practice.
  const initialOrder = [...DIRECTIONAL_ZONES, "unknown" as const]
    .sort((a, b) => probabilities[b] - probabilities[a]);
  const residue = 1 - Object.values(probabilities).reduce((sum, value) => sum + value, 0);
  probabilities[initialOrder[0]] += residue;

  const ordered = [...DIRECTIONAL_ZONES, "unknown" as const]
    .sort((a, b) => probabilities[b] - probabilities[a]);
  const primaryZone = ordered[0];
  const alternativeZone = ordered[1] === "unknown" ? null : ordered[1];
  const ambiguity = alternativeZone
    ? clamp01(1 - (probabilities[primaryZone] - probabilities[alternativeZone]))
    : 0;

  return { probabilities, primaryZone, alternativeZone, ambiguity };
}
