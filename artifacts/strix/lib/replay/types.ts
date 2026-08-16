export const SENSOR_REPLAY_SCHEMA_VERSION = 1 as const;
export const SENSOR_REPLAY_ENGINE_VERSION = "strix-sensor-engine-v7.3";
export const SENSOR_REPLAY_THRESHOLD_VERSION = "local-thresholds-v1";

export interface ReplayVector3 {
  x: number;
  y: number;
  z: number;
}

interface ReplaySampleBase {
  /** Monotonic offset from session start, never an absolute timestamp. */
  tMs: number;
}

export interface ReplayAccelerometerSample extends ReplaySampleBase {
  kind: "accelerometer";
  raw: ReplayVector3;
  filtered: ReplayVector3;
  gForce: number;
}

export interface ReplayGyroscopeSample extends ReplaySampleBase {
  kind: "gyroscope";
  value: ReplayVector3;
}

export interface ReplayLocationSample extends ReplaySampleBase {
  kind: "location";
  latitude: number | null;
  longitude: number | null;
  speedKmh: number;
  headingDeg: number | null;
  accuracyM: number | null;
}

export interface ReplayCalibrationSample extends ReplaySampleBase {
  kind: "calibration";
  calibrated: boolean;
  confidence: number;
  yawOffsetRad: number;
}

export interface ReplayQualitySample extends ReplaySampleBase {
  kind: "quality";
  engineReady: boolean;
  sampleRateHz: number;
  roadType: "smooth" | "normal" | "rough";
}

export interface ReplayDecisionSample extends ReplaySampleBase {
  kind: "decision";
  decision: "candidate" | "rejected" | "confirmed";
  reason: string;
  confidence: number | null;
}

export type ReplaySample =
  | ReplayAccelerometerSample
  | ReplayGyroscopeSample
  | ReplayLocationSample
  | ReplayCalibrationSample
  | ReplayQualitySample
  | ReplayDecisionSample;

export interface ReplayMetadata {
  platform: "android" | "ios" | "web" | "unknown";
  deviceModel: string;
  appVersion: string;
  source: "live" | "synthetic" | "test-rig";
  sampleRateHz: number;
}

export interface SensorReplayV1 {
  schemaVersion: typeof SENSOR_REPLAY_SCHEMA_VERSION;
  engineVersion: string;
  thresholdConfigVersion: string;
  sessionId: string;
  /** Used locally for ordering. Safe export removes it by default. */
  startedAtMs: number;
  durationMs: number;
  truncated: boolean;
  metadata: ReplayMetadata;
  samples: ReplaySample[];
}

export interface SensorRecorderOptions {
  maxSamples?: number;
  maxDurationMs?: number;
  now?: () => number;
}

export interface ReplayExportOptions {
  includeLocation?: boolean;
  coordinateDecimals?: number;
  includeAbsoluteStartTime?: boolean;
}
