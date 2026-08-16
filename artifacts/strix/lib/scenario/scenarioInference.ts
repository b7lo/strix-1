import { THRESHOLDS } from "../thresholds";
import type { EvidenceItem, ScenarioHypothesis, ScenarioInferenceInput, ScenarioInferenceResult } from "./types";

const evidence = (
  id: string,
  source: EvidenceItem["source"],
  strength: number,
  required = false,
  effect: EvidenceItem["effect"] = "supports",
): EvidenceItem => ({ id, source, strength, required, effect });

function hypothesis(
  id: string,
  scenarioCode: string,
  family: ScenarioHypothesis["family"],
  confidence: number,
  items: EvidenceItem[],
): ScenarioHypothesis {
  return { id, scenarioCode, family, confidence, evidence: items, conflictsWith: [] };
}

/**
 * Infers physical scenarios without assigning liability. The liability engine
 * consumes the selected hypothesis through an independently registered rule.
 */
export function inferScenario(input: ScenarioInferenceInput): ScenarioInferenceResult {
  const { direction, zone, peakG, speedKmh: speed, jerkPeak: jerk, gyroscope: gyro, advancedAnalysis } = input;
  const road = advancedAnalysis?.roadContext ?? null;
  const isSide = direction === "side-left" || direction === "side-right" || zone === "side-left" || zone === "side-right";
  const isRear = direction === "rear" || zone.startsWith("rear");
  const isFront = direction === "front" || zone.startsWith("front");
  const sideKey = direction === "side-right" || zone === "side-right" ? "R" : "L";
  const laneChange = speed >= THRESHOLDS.MIN_SPEED_LANE_CHANGE && !!gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE;
  const candidates: ScenarioHypothesis[] = [];

  if (isSide && peakG <= THRESHOLDS.DOOR_OPENING_MAX_G && speed <= THRESHOLDS.STATIONARY_SPEED && !laneChange) {
    candidates.push(hypothesis("door-opening", `DOOR_OPENING_${sideKey}`, "door", 88, [
      evidence("impact-zone", "vehicle-frame", 85, true),
      evidence("low-speed", "gps", 80, true),
      evidence("light-impact", "accelerometer", 75),
    ]));
  }

  if (isSide && road?.roadType === "intersection") {
    candidates.push(hypothesis(
      "intersection-right-of-way",
      road.hasPriority ? "INTERSECTION_ROW_PRIORITY" : "INTERSECTION_ROW_NO_PRIORITY",
      "intersection",
      road.confirmedByGyro ? 90 : 78,
      [
        evidence("impact-zone", "vehicle-frame", 85, true),
        evidence("road-context", "road-context", road.confirmedByGyro ? 90 : 70, true),
        evidence("priority", "road-context", road.hasPriority ? 80 : 65),
      ],
    ));
  }

  if (!!gyro && gyro.dominantAxis === "yaw" && gyro.yawRate >= THRESHOLDS.U_TURN_YAW_RATE &&
      (gyro.yawSustainedDurationMs ?? 0) >= THRESHOLDS.U_TURN_MIN_DURATION_MS && speed >= THRESHOLDS.MIN_SPEED_LANE_CHANGE) {
    candidates.push(hypothesis("u-turn", "U_TURN", "u-turn", 92, [
      evidence("yaw-rate", "gyroscope", 95, true),
      evidence("yaw-duration", "gyroscope", 95, true),
      evidence("moving-vehicle", "gps", 75),
    ]));
  }

  if (isSide && laneChange) {
    candidates.push(hypothesis("lane-merge", `LANE_MERGE_${sideKey}`, "lane-merge", 82, [
      evidence("impact-zone", "vehicle-frame", 80, true),
      evidence("yaw-manoeuvre", "gyroscope", 90, true),
      evidence("moving-vehicle", "gps", 70),
    ]));
  }

  if (!isRear && !isFront && speed >= THRESHOLDS.STATIONARY_SPEED && speed < THRESHOLDS.SPEED_MANEUVER) {
    candidates.push(hypothesis("parking-manoeuvre", "PARKING_MANEUVER", "parking", 70, [
      evidence("low-speed", "gps", 75, true),
      evidence("non-longitudinal-contact", "vehicle-frame", 60),
    ]));
  }

  if (zone === "front-left" || zone === "front-right") {
    candidates.push(hypothesis("corner-front", `CORNER_FRONT_${zone === "front-right" ? "R" : "L"}`, "corner-front", laneChange ? 78 : 68, [
      evidence("impact-zone", "vehicle-frame", 75, true),
      evidence("jerk-shape", "accelerometer", Math.min(90, 45 + jerk)),
    ]));
  } else if (zone === "rear-left" || zone === "rear-right") {
    candidates.push(hypothesis("corner-rear", `CORNER_REAR_${zone === "rear-right" ? "R" : "L"}`, "corner-rear", 72, [
      evidence("impact-zone", "vehicle-frame", 75, true),
    ]));
  } else if (isRear) {
    candidates.push(hypothesis("rear-impact", "REAR_IMPACT", "rear", 80, [evidence("impact-zone", "vehicle-frame", 80, true)]));
  } else if (isFront) {
    candidates.push(hypothesis("front-impact", "FRONT_IMPACT", "front", 80, [evidence("impact-zone", "vehicle-frame", 80, true)]));
  } else if (isSide) {
    candidates.push(hypothesis("side-impact", `SIDE_${sideKey}`, "side", 62, [evidence("impact-zone", "vehicle-frame", 65, true)]));
  }

  if (candidates.length === 0) {
    candidates.push(hypothesis("unknown", "UNKNOWN", "unknown", 20, [
      evidence("insufficient-direction", "vehicle-frame", 20, true, "limits"),
    ]));
  }

  candidates.sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));
  const primary = candidates[0];
  const alternatives = candidates.slice(1);
  const conflicting = alternatives.length > 0 && primary.confidence - alternatives[0].confidence <= 10;
  if (conflicting) {
    primary.conflictsWith.push(alternatives[0].id);
    alternatives[0].conflictsWith.push(primary.id);
  }
  return { primary, alternatives, conflicting };
}
