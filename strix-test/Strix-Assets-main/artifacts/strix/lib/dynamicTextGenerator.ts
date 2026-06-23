import i18n from "./i18n";

export function getRandomPhrase(phrases: string[]): string {
  if (!Array.isArray(phrases) || phrases.length === 0) return "";
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export const DynamicText = {
  // ─── Shared & Confidence Factors ───
  directionKnown: () => getRandomPhrase(i18n.t("dynamic.directionKnown", { returnObjects: true }) as string[]),
  directionUnknown: () => getRandomPhrase(i18n.t("dynamic.directionUnknown", { returnObjects: true }) as string[]),
  highGForce: (g: number) => getRandomPhrase(i18n.t("dynamic.highGForce", { g: g.toFixed(1), returnObjects: true }) as string[]),
  mediumGForce: (g: number) => getRandomPhrase(i18n.t("dynamic.mediumGForce", { g: g.toFixed(1), returnObjects: true }) as string[]),
  lowGForce: (g: number) => getRandomPhrase(i18n.t("dynamic.lowGForce", { g: g.toFixed(1), returnObjects: true }) as string[]),
  speedHigh: (speed: number) => getRandomPhrase(i18n.t("dynamic.speedHigh", { speed: speed.toFixed(0), returnObjects: true }) as string[]),
  speedLow: (speed: number) => getRandomPhrase(i18n.t("dynamic.speedLow", { speed: speed.toFixed(0), returnObjects: true }) as string[]),
  jerkHigh: (jerk: number) => getRandomPhrase(i18n.t("dynamic.jerkHigh", { jerk: jerk.toFixed(1), returnObjects: true }) as string[]),
  spinDetected: () => getRandomPhrase(i18n.t("dynamic.spinDetected", { returnObjects: true }) as string[]),
  shakeDetected: () => getRandomPhrase(i18n.t("dynamic.shakeDetected", { returnObjects: true }) as string[]),
  brakingDetected: () => getRandomPhrase(i18n.t("dynamic.brakingDetected", { returnObjects: true }) as string[]),

  // ─── Rear Impacts ───
  rearBase: () => getRandomPhrase(i18n.t("dynamic.rearBase", { returnObjects: true }) as string[]),
  rearBraking: () => getRandomPhrase(i18n.t("dynamic.rearBraking", { returnObjects: true }) as string[]),
  rearSpeedLow: () => getRandomPhrase(i18n.t("dynamic.rearSpeedLow", { returnObjects: true }) as string[]),
  rearSpeedHigh: (speed: number) => getRandomPhrase(i18n.t("dynamic.rearSpeedHigh", { speed: speed.toFixed(0), returnObjects: true }) as string[]),
  rearGForceHigh: () => getRandomPhrase(i18n.t("dynamic.rearGForceHigh", { returnObjects: true }) as string[]),

  // ─── Front Impacts ───
  frontBase: () => getRandomPhrase(i18n.t("dynamic.frontBase", { returnObjects: true }) as string[]),
  frontNote: () => getRandomPhrase(i18n.t("dynamic.frontNote", { returnObjects: true }) as string[]),
  frontBraking: () => getRandomPhrase(i18n.t("dynamic.frontBraking", { returnObjects: true }) as string[]),
  frontSpeedLow: () => getRandomPhrase(i18n.t("dynamic.frontSpeedLow", { returnObjects: true }) as string[]),
  frontSpeedHigh: (speed: number) => getRandomPhrase(i18n.t("dynamic.frontSpeedHigh", { speed: speed.toFixed(0), returnObjects: true }) as string[]),
  frontGForceHigh: () => getRandomPhrase(i18n.t("dynamic.frontGForceHigh", { returnObjects: true }) as string[]),

  // ─── Corner Impacts ───
  cornerBase: (sideAr: string) => getRandomPhrase(i18n.t("dynamic.cornerBase", { side: sideAr, returnObjects: true }) as string[]),
  cornerYawHigh: (yawRate: number) => getRandomPhrase(i18n.t("dynamic.cornerYawHigh", { yawRate: yawRate.toFixed(0), returnObjects: true }) as string[]),
  cornerYawLow: () => getRandomPhrase(i18n.t("dynamic.cornerYawLow", { returnObjects: true }) as string[]),
  cornerJerkHigh: () => getRandomPhrase(i18n.t("dynamic.cornerJerkHigh", { returnObjects: true }) as string[]),
  cornerSpeedLow: () => getRandomPhrase(i18n.t("dynamic.cornerSpeedLow", { returnObjects: true }) as string[]),

  // ─── Side Impacts ───
  sideRoll: () => getRandomPhrase(i18n.t("dynamic.sideRoll", { returnObjects: true }) as string[]),
  sideLaneChangeConfirmed: (yawRate: number) => getRandomPhrase(i18n.t("dynamic.sideLaneChangeConfirmed", { yawRate: yawRate.toFixed(0), returnObjects: true }) as string[]),
  sideLaneChangeFault: () => getRandomPhrase(i18n.t("dynamic.sideLaneChangeFault", { returnObjects: true }) as string[]),
  sideLowSpeed: (sideAr: string) => getRandomPhrase(i18n.t("dynamic.sideLowSpeed", { side: sideAr, returnObjects: true }) as string[]),
  sideLowSpeedNote: () => getRandomPhrase(i18n.t("dynamic.sideLowSpeedNote", { returnObjects: true }) as string[]),
  sideJerkHigh: () => getRandomPhrase(i18n.t("dynamic.sideJerkHigh", { returnObjects: true }) as string[]),
  sideSuddenIntrusion: (sideAr: string) => getRandomPhrase(
    i18n.t("dynamic.sideSuddenIntrusion", { side: sideAr, returnObjects: true }) as string[]
  ),
  sideSuddenIntrusionFault: (lane: string) => getRandomPhrase(
    i18n.t("dynamic.sideSuddenIntrusionFault", { lane, returnObjects: true }) as string[]
  ),
  sideLaneChangeSelf1: () => getRandomPhrase(
    i18n.t("dynamic.sideLaneChangeSelf1", { returnObjects: true }) as string[]
  ),
  sideLaneChangeSelf2: () => getRandomPhrase(
    i18n.t("dynamic.sideLaneChangeSelf2", { returnObjects: true }) as string[]
  ),
  sideAmbiguous: (sideAr: string) => getRandomPhrase(
    i18n.t("dynamic.sideAmbiguous", { side: sideAr, returnObjects: true }) as string[]
  ),
  sideAmbiguousNote: () => getRandomPhrase(
    i18n.t("dynamic.sideAmbiguousNote", { returnObjects: true }) as string[]
  ),
  sideAmbiguousGHigh: () => getRandomPhrase(
    i18n.t("dynamic.sideAmbiguousGHigh", { returnObjects: true }) as string[]
  ),

  // ─── Corner Rear ───
  cornerRearBase: (sideAr: string) => getRandomPhrase(
    i18n.t("dynamic.cornerRearBase", { side: sideAr, returnObjects: true }) as string[]
  ),
  cornerRearStationary: () => getRandomPhrase(
    i18n.t("dynamic.cornerRearStationary", { returnObjects: true }) as string[]
  ),
  cornerRearLaneChange: () => getRandomPhrase(
    i18n.t("dynamic.cornerRearLaneChange", { returnObjects: true }) as string[]
  ),
  cornerRearBraking: () => getRandomPhrase(
    i18n.t("dynamic.cornerRearBraking", { returnObjects: true }) as string[]
  ),
};
