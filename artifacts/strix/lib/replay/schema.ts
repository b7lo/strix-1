import { z } from "zod";

const finiteNumber = z.number().finite();
const nonNegativeFinite = finiteNumber.nonnegative();
const vector3Schema = z.object({ x: finiteNumber, y: finiteNumber, z: finiteNumber });
const sampleBase = { tMs: nonNegativeFinite };

export const replaySampleSchema = z.discriminatedUnion("kind", [
  z.object({
    ...sampleBase,
    kind: z.literal("accelerometer"),
    raw: vector3Schema,
    filtered: vector3Schema,
    gForce: nonNegativeFinite,
  }),
  z.object({ ...sampleBase, kind: z.literal("gyroscope"), value: vector3Schema }),
  z.object({
    ...sampleBase,
    kind: z.literal("location"),
    latitude: finiteNumber.min(-90).max(90).nullable(),
    longitude: finiteNumber.min(-180).max(180).nullable(),
    speedKmh: nonNegativeFinite,
    headingDeg: finiteNumber.min(0).max(360).nullable(),
    accuracyM: nonNegativeFinite.nullable(),
  }),
  z.object({
    ...sampleBase,
    kind: z.literal("calibration"),
    calibrated: z.boolean(),
    confidence: finiteNumber.min(0).max(100),
    yawOffsetRad: finiteNumber,
  }),
  z.object({
    ...sampleBase,
    kind: z.literal("quality"),
    engineReady: z.boolean(),
    sampleRateHz: finiteNumber.positive(),
    measuredSampleRateHz: finiteNumber.positive().optional(),
    jitterMs: nonNegativeFinite.optional(),
    gapCount: z.number().int().nonnegative().optional(),
    roadType: z.enum(["smooth", "normal", "rough"]),
  }),
  z.object({
    ...sampleBase,
    kind: z.literal("decision"),
    decision: z.enum(["candidate", "rejected", "confirmed"]),
    reason: z.string().min(1).max(200),
    confidence: finiteNumber.min(0).max(100).nullable(),
  }),
]);

export const sensorReplayV1Schema = z.object({
  schemaVersion: z.literal(1),
  engineVersion: z.string().min(1),
  thresholdConfigVersion: z.string().min(1),
  sessionId: z.string().min(1).max(128),
  startedAtMs: nonNegativeFinite,
  durationMs: nonNegativeFinite,
  truncated: z.boolean(),
  metadata: z.object({
    platform: z.enum(["android", "ios", "web", "unknown"]),
    deviceModel: z.string().min(1).max(200),
    appVersion: z.string().min(1).max(100),
    source: z.enum(["live", "synthetic", "test-rig"]),
    sampleRateHz: finiteNumber.positive().max(1000),
  }),
  samples: z.array(replaySampleSchema),
}).superRefine((replay, context) => {
  let previous = -1;
  replay.samples.forEach((sample, index) => {
    if (sample.tMs < previous) {
      context.addIssue({
        code: "custom",
        path: ["samples", index, "tMs"],
        message: "Replay samples must be ordered by monotonic tMs",
      });
    }
    previous = sample.tMs;
  });
});

export type SensorReplayV1Input = z.input<typeof sensorReplayV1Schema>;
