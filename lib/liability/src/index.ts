/**
 * @workspace/liability — المصدر الموحّد لمنطق مطابقة الحوادث وحساب المسؤولية.
 */
export { MATCH, CROSS } from "./thresholds";
export { haversineDistance } from "./geo";
export { scoreMatch } from "./matching";
export { generateCrossVerifiedAnalysis } from "./crossVerification";
export type {
  ImpactZone,
  CrossReport,
  CrossVerifiedAnalysis,
  MatchInput,
  MatchScore,
} from "./types";
