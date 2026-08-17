import {
  SENSOR_REPLAY_ENGINE_VERSION,
  SENSOR_REPLAY_SCHEMA_VERSION,
  SENSOR_REPLAY_THRESHOLD_VERSION,
  type ReplayMetadata,
  type ReplaySample,
  type SensorRecorderOptions,
  type SensorReplayV1,
} from "./types";
import { getThresholdConfigVersion } from "../remoteConfig";

const DEFAULT_MAX_SAMPLES = 60_000;
const DEFAULT_MAX_DURATION_MS = 10 * 60 * 1000;
let sessionSequence = 0;

class CircularSampleBuffer {
  private readonly values: Array<ReplaySample | undefined>;
  private start = 0;
  private count = 0;

  constructor(private readonly capacity: number) {
    this.values = new Array(capacity);
  }

  push(sample: ReplaySample): boolean {
    let overwritten = false;
    if (this.count < this.capacity) {
      this.values[(this.start + this.count) % this.capacity] = sample;
      this.count++;
    } else {
      this.values[this.start] = sample;
      this.start = (this.start + 1) % this.capacity;
      overwritten = true;
    }
    return overwritten;
  }

  shift(): ReplaySample | undefined {
    if (this.count === 0) return undefined;
    const value = this.values[this.start];
    this.values[this.start] = undefined;
    this.start = (this.start + 1) % this.capacity;
    this.count--;
    return value;
  }

  first(): ReplaySample | undefined {
    return this.count > 0 ? this.values[this.start] : undefined;
  }

  toArray(): ReplaySample[] {
    const result: ReplaySample[] = [];
    for (let index = 0; index < this.count; index++) {
      const value = this.values[(this.start + index) % this.capacity];
      if (value) result.push(value);
    }
    return result;
  }

  get length(): number {
    return this.count;
  }
}

export class SensorRecorder {
  private readonly now: () => number;
  private readonly maxDurationMs: number;
  private readonly startedAtMs: number;
  private readonly sessionId: string;
  private readonly buffer: CircularSampleBuffer;
  private lastTMs = 0;
  private truncated = false;
  private stopped = false;

  constructor(
    private readonly metadata: ReplayMetadata,
    options: SensorRecorderOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.maxDurationMs = Math.max(1000, options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS);
    const maxSamples = Math.max(10, Math.trunc(options.maxSamples ?? DEFAULT_MAX_SAMPLES));
    this.buffer = new CircularSampleBuffer(maxSamples);
    this.startedAtMs = this.now();
    this.sessionId = `${this.startedAtMs.toString(36)}-${(++sessionSequence).toString(36)}`;
  }

  elapsedMs(timestampMs = this.now()): number {
    return Math.max(0, timestampMs - this.startedAtMs);
  }

  record(sample: ReplaySample): void {
    if (this.stopped) return;

    const normalized = {
      ...sample,
      tMs: Math.max(this.lastTMs, sample.tMs),
    } as ReplaySample;
    this.lastTMs = normalized.tMs;

    if (this.buffer.push(normalized)) this.truncated = true;

    while (
      this.buffer.length > 1 &&
      this.buffer.first() &&
      normalized.tMs - this.buffer.first()!.tMs > this.maxDurationMs
    ) {
      this.buffer.shift();
      this.truncated = true;
    }
  }

  recordAt(sample: Omit<ReplaySample, "tMs">, timestampMs = this.now()): void {
    this.record({ ...sample, tMs: this.elapsedMs(timestampMs) } as ReplaySample);
  }

  snapshot(): SensorReplayV1 {
    return {
      schemaVersion: SENSOR_REPLAY_SCHEMA_VERSION,
      engineVersion: SENSOR_REPLAY_ENGINE_VERSION,
      thresholdConfigVersion: getThresholdConfigVersion() || SENSOR_REPLAY_THRESHOLD_VERSION,
      sessionId: this.sessionId,
      startedAtMs: this.startedAtMs,
      durationMs: this.lastTMs,
      truncated: this.truncated,
      metadata: { ...this.metadata },
      samples: this.buffer.toArray(),
    };
  }

  stop(): SensorReplayV1 {
    this.stopped = true;
    return this.snapshot();
  }

  get sampleCount(): number {
    return this.buffer.length;
  }
}
