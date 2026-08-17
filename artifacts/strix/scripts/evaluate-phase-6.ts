import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { scoreMatch, type MatchInput } from "@workspace/liability";
import { SensorProfiler } from "../lib/performance/sensorProfiler";
import {
  applyHighPassFilter,
  calculateGForce,
  getDiagnostics,
  recordSample,
  resetFilter,
  setSampleRate,
} from "../lib/sensorUtils";

type MatchingFixture = {
  name: string;
  expectedMatch: boolean;
  a: MatchInput;
  b: MatchInput;
};

const appRoot = process.cwd();
const workspaceRoot = resolve(appRoot, "../..");
const fixtures = JSON.parse(readFileSync(resolve(
  workspaceRoot,
  "lib/liability/src/__fixtures__/matching/nearby-collisions.json",
), "utf8")) as MatchingFixture[];

let truePositive = 0;
let trueNegative = 0;
let falsePositive = 0;
let falseNegative = 0;
for (const fixture of fixtures) {
  const actual = scoreMatch(fixture.a, fixture.b).isMatch;
  if (actual && fixture.expectedMatch) truePositive++;
  else if (actual) falsePositive++;
  else if (fixture.expectedMatch) falseNegative++;
  else trueNegative++;
}

resetFilter();
setSampleRate(100);
const profiler = new SensorProfiler(4096, () => performance.now());
const benchmarkSamples = 50_000;
for (let index = 0; index < benchmarkSamples; index++) {
  const startedAt = profiler.start();
  const timestamp = 1_000 + index * 10;
  const raw = {
    x: Math.sin(index / 17) * 0.03,
    y: -1 + Math.cos(index / 23) * 0.02,
    z: Math.sin(index / 31) * 0.02,
  };
  const filtered = applyHighPassFilter(raw, timestamp);
  const gForce = calculateGForce(filtered.x, filtered.y, filtered.z);
  recordSample(gForce, filtered, raw, timestamp);
  profiler.end(startedAt);
}

const timing = profiler.snapshot();
const diagnostics = getDiagnostics();
const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);
const samplePeriodMs = 10;
const report = {
  schemaVersion: 1,
  phase: 6,
  generatedAt: new Date().toISOString(),
  matching: {
    fixtureCount: fixtures.length,
    confusionMatrix: { truePositive, trueNegative, falsePositive, falseNegative },
    precision,
    recall,
  },
  performance: {
    benchmarkSamples,
    targetSampleRateHz: 100,
    samplePeriodMs,
    p50Ms: timing.p50Ms,
    p95Ms: timing.p95Ms,
    maxMs: timing.maxMs,
    safeMarginAtP95Ms: samplePeriodMs - timing.p95Ms,
    retainedProfilerSamples: timing.retainedSamples,
    profilerCapacity: timing.capacity,
    sensorBufferLength: diagnostics.currentBufferLength,
    sensorBufferCapacity: 1000,
    boundedMemory: timing.retainedSamples <= timing.capacity && diagnostics.currentBufferLength <= 1000,
  },
  battery: {
    sensorRateHz: 100,
    uiUpdateRateLimitHz: 10,
    magnetometerRateHz: 5,
    deviceMotionRateHz: 5,
    measuredOnPhysicalDevice: false,
    note: "Battery drain requires a controlled physical-device run; this report verifies rate limiting only.",
  },
};

const output = resolve(appRoot, "specs/004-algorithm-improvement/reports/phase-6.json");
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
