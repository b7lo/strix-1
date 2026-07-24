import i18n from "./i18n";

/**
 * اختيار عبارة بشكل حتمي (deterministic) من قائمة العبارات بناءً على `seed`.
 *
 * يستبدل هذا `Math.random()` السابق كي يبقى المحرك دالة نقية حتمية
 * (Req 14.1, 14.2). لنفس `(phrases, seed)` تُعاد دائماً نفس العبارة، مع الحفاظ
 * على التنوّع اللغوي بين الحالات المختلفة (اختلاف `seed`).
 */
export function pickPhrase(phrases: string[], seed: number): string {
  if (!Array.isArray(phrases) || phrases.length === 0) return "";
  const safeSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  return phrases[safeSeed % phrases.length];
}

export const DynamicText = {
  // ─── Shared & Confidence Factors ───
  directionKnown: (seed: number) => pickPhrase(i18n.t("dynamic.directionKnown", { returnObjects: true }) as string[], seed),
  directionUnknown: (seed: number) => pickPhrase(i18n.t("dynamic.directionUnknown", { returnObjects: true }) as string[], seed),
  highGForce: (seed: number, g: number) => pickPhrase(i18n.t("dynamic.highGForce", { g: g.toFixed(1), returnObjects: true }) as string[], seed),
  mediumGForce: (seed: number, g: number) => pickPhrase(i18n.t("dynamic.mediumGForce", { g: g.toFixed(1), returnObjects: true }) as string[], seed),
  lowGForce: (seed: number, g: number) => pickPhrase(i18n.t("dynamic.lowGForce", { g: g.toFixed(1), returnObjects: true }) as string[], seed),
  speedHigh: (seed: number, speed: number) => pickPhrase(i18n.t("dynamic.speedHigh", { speed: speed.toFixed(0), returnObjects: true }) as string[], seed),
  speedLow: (seed: number, speed: number) => pickPhrase(i18n.t("dynamic.speedLow", { speed: speed.toFixed(0), returnObjects: true }) as string[], seed),
  jerkHigh: (seed: number, jerk: number) => pickPhrase(i18n.t("dynamic.jerkHigh", { jerk: jerk.toFixed(1), returnObjects: true }) as string[], seed),
  spinDetected: (seed: number) => pickPhrase(i18n.t("dynamic.spinDetected", { returnObjects: true }) as string[], seed),
  shakeDetected: (seed: number) => pickPhrase(i18n.t("dynamic.shakeDetected", { returnObjects: true }) as string[], seed),
  brakingDetected: (seed: number) => pickPhrase(i18n.t("dynamic.brakingDetected", { returnObjects: true }) as string[], seed),

  // ─── Rear Impacts ───
  rearBase: (seed: number) => pickPhrase(i18n.t("dynamic.rearBase", { returnObjects: true }) as string[], seed),
  rearBraking: (seed: number) => pickPhrase(i18n.t("dynamic.rearBraking", { returnObjects: true }) as string[], seed),
  rearSpeedLow: (seed: number) => pickPhrase(i18n.t("dynamic.rearSpeedLow", { returnObjects: true }) as string[], seed),
  rearSpeedHigh: (seed: number, speed: number) => pickPhrase(i18n.t("dynamic.rearSpeedHigh", { speed: speed.toFixed(0), returnObjects: true }) as string[], seed),
  rearGForceHigh: (seed: number) => pickPhrase(i18n.t("dynamic.rearGForceHigh", { returnObjects: true }) as string[], seed),

  // ─── Front Impacts ───
  frontBase: (seed: number) => pickPhrase(i18n.t("dynamic.frontBase", { returnObjects: true }) as string[], seed),
  frontNote: (seed: number) => pickPhrase(i18n.t("dynamic.frontNote", { returnObjects: true }) as string[], seed),
  frontBraking: (seed: number) => pickPhrase(i18n.t("dynamic.frontBraking", { returnObjects: true }) as string[], seed),
  frontSpeedLow: (seed: number) => pickPhrase(i18n.t("dynamic.frontSpeedLow", { returnObjects: true }) as string[], seed),
  frontSpeedHigh: (seed: number, speed: number) => pickPhrase(i18n.t("dynamic.frontSpeedHigh", { speed: speed.toFixed(0), returnObjects: true }) as string[], seed),
  frontGForceHigh: (seed: number) => pickPhrase(i18n.t("dynamic.frontGForceHigh", { returnObjects: true }) as string[], seed),

  // ─── Corner Impacts ───
  cornerBase: (seed: number, sideAr: string) => pickPhrase(i18n.t("dynamic.cornerBase", { side: sideAr, returnObjects: true }) as string[], seed),
  cornerYawHigh: (seed: number, yawRate: number) => pickPhrase(i18n.t("dynamic.cornerYawHigh", { yawRate: yawRate.toFixed(0), returnObjects: true }) as string[], seed),
  cornerYawLow: (seed: number) => pickPhrase(i18n.t("dynamic.cornerYawLow", { returnObjects: true }) as string[], seed),
  cornerJerkHigh: (seed: number) => pickPhrase(i18n.t("dynamic.cornerJerkHigh", { returnObjects: true }) as string[], seed),
  cornerSpeedLow: (seed: number) => pickPhrase(i18n.t("dynamic.cornerSpeedLow", { returnObjects: true }) as string[], seed),

  // ─── Side Impacts ───
  sideRoll: (seed: number) => pickPhrase(i18n.t("dynamic.sideRoll", { returnObjects: true }) as string[], seed),
  sideLaneChangeConfirmed: (seed: number, yawRate: number) => pickPhrase(i18n.t("dynamic.sideLaneChangeConfirmed", { yawRate: yawRate.toFixed(0), returnObjects: true }) as string[], seed),
  sideLaneChangeFault: (seed: number) => pickPhrase(i18n.t("dynamic.sideLaneChangeFault", { returnObjects: true }) as string[], seed),
  sideLowSpeed: (seed: number, sideAr: string) => pickPhrase(i18n.t("dynamic.sideLowSpeed", { side: sideAr, returnObjects: true }) as string[], seed),
  sideLowSpeedNote: (seed: number) => pickPhrase(i18n.t("dynamic.sideLowSpeedNote", { returnObjects: true }) as string[], seed),
  sideJerkHigh: (seed: number) => pickPhrase(i18n.t("dynamic.sideJerkHigh", { returnObjects: true }) as string[], seed),
  sideSuddenIntrusion: (seed: number, sideAr: string) => pickPhrase(
    i18n.t("dynamic.sideSuddenIntrusion", { side: sideAr, returnObjects: true }) as string[], seed
  ),
  sideSuddenIntrusionFault: (seed: number, lane: string) => pickPhrase(
    i18n.t("dynamic.sideSuddenIntrusionFault", { lane, returnObjects: true }) as string[], seed
  ),
  sideLaneChangeSelf1: (seed: number) => pickPhrase(
    i18n.t("dynamic.sideLaneChangeSelf1", { returnObjects: true }) as string[], seed
  ),
  sideLaneChangeSelf2: (seed: number) => pickPhrase(
    i18n.t("dynamic.sideLaneChangeSelf2", { returnObjects: true }) as string[], seed
  ),
  sideAmbiguous: (seed: number, sideAr: string) => pickPhrase(
    i18n.t("dynamic.sideAmbiguous", { side: sideAr, returnObjects: true }) as string[], seed
  ),
  sideAmbiguousNote: (seed: number) => pickPhrase(
    i18n.t("dynamic.sideAmbiguousNote", { returnObjects: true }) as string[], seed
  ),
  sideAmbiguousGHigh: (seed: number) => pickPhrase(
    i18n.t("dynamic.sideAmbiguousGHigh", { returnObjects: true }) as string[], seed
  ),

  // ─── Corner Rear ───
  cornerRearBase: (seed: number, sideAr: string) => pickPhrase(
    i18n.t("dynamic.cornerRearBase", { side: sideAr, returnObjects: true }) as string[], seed
  ),
  cornerRearStationary: (seed: number) => pickPhrase(
    i18n.t("dynamic.cornerRearStationary", { returnObjects: true }) as string[], seed
  ),
  cornerRearLaneChange: (seed: number) => pickPhrase(
    i18n.t("dynamic.cornerRearLaneChange", { returnObjects: true }) as string[], seed
  ),
  cornerRearBraking: (seed: number) => pickPhrase(
    i18n.t("dynamic.cornerRearBraking", { returnObjects: true }) as string[], seed
  ),

  // ─── New Scenarios (Axis 3) ───
  intersectionPriority: (seed: number) => pickPhrase(
    i18n.t("dynamic.intersectionPriorityFactor", { returnObjects: true }) as string[], seed
  ),
  intersectionNoPriority: (seed: number) => pickPhrase(
    i18n.t("dynamic.intersectionNoPriorityFactor", { returnObjects: true }) as string[], seed
  ),
  laneMergeSelf: (seed: number) => pickPhrase(
    i18n.t("dynamic.laneMergeSelfFactor", { returnObjects: true }) as string[], seed
  ),
  laneMergeOther: (seed: number) => pickPhrase(
    i18n.t("dynamic.laneMergeOtherFactor", { returnObjects: true }) as string[], seed
  ),
  uTurnSelf: (seed: number) => pickPhrase(
    i18n.t("dynamic.uTurnSelfFactor", { returnObjects: true }) as string[], seed
  ),
  parkingManeuver: (seed: number) => pickPhrase(
    i18n.t("dynamic.parkingManeuverFactor", { returnObjects: true }) as string[], seed
  ),
  chainRearStationary: (seed: number) => pickPhrase(
    i18n.t("dynamic.chainRearStationaryFactor", { returnObjects: true }) as string[], seed
  ),
  doorOpening: (seed: number) => pickPhrase(
    i18n.t("dynamic.doorOpeningFactor", { returnObjects: true }) as string[], seed
  ),
  otherPartyAccelerating: (seed: number) => pickPhrase(
    i18n.t("dynamic.otherPartyAcceleratingFactor", { returnObjects: true }) as string[], seed
  ),
};
