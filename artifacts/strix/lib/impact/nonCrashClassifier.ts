import { signalMagnitude, type ImpactSignal, type MotionSignal } from "../signal/types";

export type NonCrashKind = "pothole" | "phone-drop" | "door-slam" | "none";

export interface NonCrashAssessment {
  kind: NonCrashKind;
  rejected: boolean;
  confidence: number;
  reasons: string[];
}

export interface NonCrashClassifierInput {
  impact: ImpactSignal;
  motion: MotionSignal;
  speedKmh: number;
  gyroPeakDegS: number;
  pulseDurationMs: number;
  thresholdG: number;
}

function verticalRatio(signal: ImpactSignal): number {
  const gravityMagnitude = signalMagnitude(signal.gravity);
  if (gravityMagnitude < 0.1 || signal.magnitudeG < 0.1) return 0;
  const dot = signal.linearAcceleration.x * signal.gravity.x
    + signal.linearAcceleration.y * signal.gravity.y
    + signal.linearAcceleration.z * signal.gravity.z;
  return Math.min(1, Math.abs(dot) / (gravityMagnitude * signal.magnitudeG));
}

/**
 * Conservative rule-based rejection of common non-crash events. Strong impacts
 * are never rejected here; they continue through the normal evidence gates.
 */
export function classifyNonCrash(input: NonCrashClassifierInput): NonCrashAssessment {
  const { impact, motion, speedKmh, gyroPeakDegS, pulseDurationMs, thresholdG } = input;
  const strongImpact = impact.magnitudeG >= thresholdG * 2;
  if (strongImpact || impact.accelerometerSaturated) {
    return { kind: "none", rejected: false, confidence: 0, reasons: [] };
  }

  const vertical = verticalRatio(impact);
  const motionRatio = impact.magnitudeG > 0 ? motion.magnitudeG / impact.magnitudeG : 0;

  if (
    speedKmh >= 5
    && vertical >= 0.72
    && gyroPeakDegS < 45
    && pulseDurationMs <= 160
  ) {
    return {
      kind: "pothole",
      rejected: true,
      confidence: Math.round(Math.min(95, 65 + vertical * 25)),
      reasons: ["nonCrash.verticalDominance", "nonCrash.shortPulse"],
    };
  }

  if (speedKmh < 5 && gyroPeakDegS >= 100 && motionRatio < 0.75) {
    return {
      kind: "phone-drop",
      rejected: true,
      confidence: 90,
      reasons: ["nonCrash.stationary", "nonCrash.phoneRotation"],
    };
  }

  if (
    speedKmh < 2
    && gyroPeakDegS < 35
    && pulseDurationMs <= 80
    && impact.magnitudeG < Math.max(3, thresholdG * 1.4)
  ) {
    return {
      kind: "door-slam",
      rejected: true,
      confidence: 82,
      reasons: ["nonCrash.stationary", "nonCrash.shortPulse", "nonCrash.lowForce"],
    };
  }

  return { kind: "none", rejected: false, confidence: 0, reasons: [] };
}
