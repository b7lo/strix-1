import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ImpactFeatureRow } from "./extract-features";

export type DatasetPartition = "train" | "validation" | "test";
export interface DatasetSplit {
  train: ImpactFeatureRow[];
  validation: ImpactFeatureRow[];
  test: ImpactFeatureRow[];
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function partitionForGroup(groupId: string, seed = "strix-impact-v1"): DatasetPartition {
  const ratio = fnv1a(`${seed}:${groupId}`) / 0x1_0000_0000;
  if (ratio < 0.70) return "train";
  if (ratio < 0.85) return "validation";
  return "test";
}

/** Keeps every user/vehicle/device/trip group in exactly one partition. */
export function splitDataset(rows: ImpactFeatureRow[], seed?: string): DatasetSplit {
  const split: DatasetSplit = { train: [], validation: [], test: [] };
  const assignments = new Map<string, DatasetPartition>();
  for (const row of rows) {
    const existing = assignments.get(row.groupId);
    const partition = existing ?? partitionForGroup(row.groupId, seed);
    assignments.set(row.groupId, partition);
    split[partition].push(row);
  }
  return split;
}

export function assertNoGroupLeakage(split: DatasetSplit): void {
  const owner = new Map<string, DatasetPartition>();
  for (const partition of ["train", "validation", "test"] as const) {
    for (const row of split[partition]) {
      const existing = owner.get(row.groupId);
      if (existing && existing !== partition) {
        throw new Error(`DATA_LEAKAGE:${row.groupId}:${existing}:${partition}`);
      }
      owner.set(row.groupId, partition);
    }
  }
}

function writeJsonl(path: string, rows: ImpactFeatureRow[]): void {
  writeFileSync(path, rows.length === 0 ? "" : `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function runCli(): void {
  const [inputArg, outputDirArg, seed = "strix-impact-v1"] = process.argv.slice(2);
  if (!inputArg || !outputDirArg) {
    throw new Error("Usage: tsx ml/split-dataset.ts <features.jsonl> <output-dir> [seed]");
  }
  const rows = readFileSync(resolve(inputArg), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ImpactFeatureRow)
    .filter((row) => row.labelVerified);
  const split = splitDataset(rows, seed);
  assertNoGroupLeakage(split);
  const outputDir = resolve(outputDirArg);
  mkdirSync(outputDir, { recursive: true });
  writeJsonl(resolve(outputDir, "train.jsonl"), split.train);
  writeJsonl(resolve(outputDir, "validation.jsonl"), split.validation);
  writeJsonl(resolve(outputDir, "test.jsonl"), split.test);
  console.log(JSON.stringify({
    verifiedRows: rows.length,
    train: split.train.length,
    validation: split.validation.length,
    test: split.test.length,
    outputDir,
  }, null, 2));
}

if (require.main === module) runCli();
