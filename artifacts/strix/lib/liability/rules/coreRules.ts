import type { EvidenceItem, ScenarioHypothesis } from "../../scenario/types";

export interface LiabilityRule {
  id: string;
  scenarioPatterns: RegExp[];
  reviewed: boolean;
  conditions: string[];
  supportingEvidence: string[];
  opposingEvidence: string[];
  requiredEvidence: string[];
}

const rule = (
  id: string,
  patterns: RegExp[],
  conditions: string[],
  supportingEvidence: string[],
  opposingEvidence: string[],
  requiredEvidence: string[] = ["impact-zone"],
): LiabilityRule => ({ id, scenarioPatterns: patterns, reviewed: false, conditions, supportingEvidence, opposingEvidence, requiredEvidence });

/**
 * Registry metadata is intentionally marked unreviewed until T123 receives an
 * external traffic/legal sign-off. These are explainable engineering rules,
 * not claims of legal authority.
 */
export const CORE_LIABILITY_RULES: LiabilityRule[] = [
  rule("STRIX-REAR-001", [/^REAR_IMPACT$/, /^CORNER_REAR_/, /^CHAIN_COLLISION$/], ["rear contact"], ["rear impact zone", "stationary state"], ["reverse manoeuvre", "unsafe lane change"]),
  rule("STRIX-FRONT-001", [/^FRONT_IMPACT$/, /^CORNER_FRONT_/], ["front contact"], ["front impact zone", "braking history"], ["right of way", "stationary state"]),
  rule("STRIX-SIDE-001", [/^SIDE_/, /^SCRAPE_/], ["side contact"], ["side impact zone", "yaw evidence"], ["ambiguous direction", "other vehicle intrusion"]),
  rule("STRIX-LANE-001", [/^LANE_MERGE_/], ["side contact", "sustained yaw"], ["yaw manoeuvre", "speed above manoeuvre minimum"], ["weak calibration"]),
  rule("STRIX-INTERSECTION-001", [/^INTERSECTION_ROW_/, /^ROUNDABOUT_PRIORITY_/], ["intersection or roundabout context"], ["road context", "priority indication"], ["unknown priority"], ["impact-zone", "road-context"]),
  rule("STRIX-U-TURN-001", [/^U_TURN$/], ["sustained high yaw"], ["yaw rate", "yaw duration"], ["phone movement"]),
  rule("STRIX-PARKING-001", [/^PARKING_MANEUVER$/, /^DOOR_OPENING_/], ["low-speed contact"], ["low speed", "side contact"], ["unknown vehicle motion"]),
  rule("STRIX-UNKNOWN-001", [/^UNKNOWN$/, /.*/], ["fallback only"], ["available sensor evidence"], ["insufficient scenario evidence"], []),
];

export function evidenceSummary(hypothesis: ScenarioHypothesis): { supporting: EvidenceItem[]; opposing: EvidenceItem[]; limitations: EvidenceItem[] } {
  return {
    supporting: hypothesis.evidence.filter((item) => item.effect === "supports"),
    opposing: hypothesis.evidence.filter((item) => item.effect === "opposes"),
    limitations: hypothesis.evidence.filter((item) => item.effect === "limits"),
  };
}
