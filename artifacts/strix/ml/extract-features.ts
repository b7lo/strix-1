import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SensorReplayV1 } from "../lib/replay/types";
import type {
  PhonePlacement,
  ReplayEventLabel,
  VehicleClass,
} from "../lib/dataCollection/submission";

export interface DatasetReplayRecord {
  replayId: string;
  groupId: string;
  label: ReplayEventLabel;
  labelVerified: boolean;
  phonePlacement: PhonePlacement;
  vehicleClass: VehicleClass;
  replay: SensorReplayV1;
}

export interface ImpactFeatureRow {
  schemaVersion: 1;
  replayId: string;
  groupId: string;
  label: ReplayEventLabel;
  labelVerified: boolean;
  source: SensorReplayV1["metadata"]["source"];
  sampleRateHz: number;
  durationMs: number;
  peakG: number;
  peakJerk: number;
  impulseMs: number;
  horizontalEnergy: number;
  verticalEnergy: number;
  rotationPeakDegS: number;
  speedBeforeKmh: number | null;
  speedDeltaKmh: number | null;
  dataQualityScore: number;
  gapCount: number;
  phonePlacement: PhonePlacement;
  vehicleClass: VehicleClass;
}

const finite = (value: number | null | undefined, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Uses only samples available at the first terminal engine decision. Samples
 * after confirmation/rejection are excluded so offline extraction cannot leak
 * post-decision information into an online classifier.
 */
export function extractImpactFeatures(record: DatasetReplayRecord): ImpactFeatureRow {
  const terminal = record.replay.samples.find(
    (sample) => sample.kind === "decision" && (sample.decision === "confirmed" || sample.decision === "rejected"),
  );
  const cutoffMs = terminal?.tMs ?? record.replay.durationMs;
  const available = record.replay.samples.filter((sample) => sample.tMs <= cutoffMs);
  const accel = available.filter((sample) => sample.kind === "accelerometer");
  const gyro = available.filter((sample) => sample.kind === "gyroscope");
  const locations = available.filter((sample) => sample.kind === "location");
  const quality = available.filter((sample) => sample.kind === "quality");

  let peakG = 0;
  let peakJerk = 0;
  let horizontalEnergySum = 0;
  let verticalEnergySum = 0;
  let impulseStart: number | null = null;
  let impulseEnd: number | null = null;
  let previousG: number | null = null;
  let previousT: number | null = null;

  for (const sample of accel) {
    const g = Math.max(0, finite(sample.gForce));
    peakG = Math.max(peakG, g);
    horizontalEnergySum += finite(sample.filtered.x) ** 2 + finite(sample.filtered.y) ** 2;
    verticalEnergySum += finite(sample.filtered.z) ** 2;
    if (previousG !== null && previousT !== null) {
      const dtSeconds = (sample.tMs - previousT) / 1000;
      if (dtSeconds > 0) peakJerk = Math.max(peakJerk, Math.abs(g - previousG) / dtSeconds);
    }
    previousG = g;
    previousT = sample.tMs;
  }

  const impulseThreshold = Math.max(0.5, peakG * 0.5);
  for (const sample of accel) {
    if (finite(sample.gForce) < impulseThreshold) continue;
    if (impulseStart === null) impulseStart = sample.tMs;
    impulseEnd = sample.tMs;
  }

  let rotationPeakDegS = 0;
  for (const sample of gyro) {
    const magnitudeRadS = Math.hypot(finite(sample.value.x), finite(sample.value.y), finite(sample.value.z));
    rotationPeakDegS = Math.max(rotationPeakDegS, magnitudeRadS * (180 / Math.PI));
  }

  const firstSpeed = locations.length > 0 ? Math.max(0, finite(locations[0].speedKmh)) : null;
  const lastSpeed = locations.length > 0 ? Math.max(0, finite(locations.at(-1)?.speedKmh)) : null;
  const measuredRate = quality.length > 0
    ? finite(quality.at(-1)?.measuredSampleRateHz ?? quality.at(-1)?.sampleRateHz, record.replay.metadata.sampleRateHz)
    : record.replay.metadata.sampleRateHz;
  const expectedRate = Math.max(1, record.replay.metadata.sampleRateHz);
  const jitterMs = quality.reduce((max, sample) => Math.max(max, finite(sample.jitterMs)), 0);
  const gapCount = quality.reduce((max, sample) => Math.max(max, Math.max(0, Math.round(finite(sample.gapCount)))), 0);
  const rateScore = Math.min(1, measuredRate / expectedRate) * 70;
  const jitterPenalty = Math.min(20, jitterMs * 2);
  const gapPenalty = Math.min(30, gapCount * 3);
  const dataQualityScore = Math.max(0, Math.min(100, rateScore + 30 - jitterPenalty - gapPenalty));

  return {
    schemaVersion: 1,
    replayId: record.replayId,
    groupId: record.groupId,
    label: record.label,
    labelVerified: record.labelVerified,
    source: record.replay.metadata.source,
    sampleRateHz: record.replay.metadata.sampleRateHz,
    durationMs: Math.max(0, cutoffMs),
    peakG,
    peakJerk,
    impulseMs: impulseStart === null || impulseEnd === null ? 0 : Math.max(0, impulseEnd - impulseStart),
    horizontalEnergy: accel.length === 0 ? 0 : horizontalEnergySum / accel.length,
    verticalEnergy: accel.length === 0 ? 0 : verticalEnergySum / accel.length,
    rotationPeakDegS,
    speedBeforeKmh: lastSpeed,
    speedDeltaKmh: firstSpeed === null || lastSpeed === null ? null : lastSpeed - firstSpeed,
    dataQualityScore,
    gapCount,
    phonePlacement: record.phonePlacement,
    vehicleClass: record.vehicleClass,
  };
}

function runCli(): void {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg || !outputArg) {
    throw new Error("Usage: tsx ml/extract-features.ts <input.jsonl> <output.jsonl>");
  }
  const input = readFileSync(resolve(inputArg), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DatasetReplayRecord);
  const rows = input.map(extractImpactFeatures);
  const output = resolve(outputArg);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ inputRows: input.length, outputRows: rows.length, output }, null, 2));
}

if (require.main === module) runCli();
