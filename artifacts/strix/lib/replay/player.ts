import { sensorReplayV1Schema } from "./schema";
import { VirtualReplayClock, type ReplayClock } from "./replayClock";
import type { SensorReplayV1 } from "./types";
import { SensorPipeline } from "../sensorPipeline";

export interface ReplayPlayerOptions {
  clock?: ReplayClock;
}

export interface ReplayPlaybackResult {
  processedSamples: number;
  durationMs: number;
}

export class ReplayPlayer {
  private readonly clock: ReplayClock;

  constructor(
    private readonly pipeline: SensorPipeline,
    options: ReplayPlayerOptions = {},
  ) {
    this.clock = options.clock ?? new VirtualReplayClock();
  }

  play(input: SensorReplayV1): ReplayPlaybackResult {
    const replay = sensorReplayV1Schema.parse(input) as SensorReplayV1;
    this.clock.reset();
    this.pipeline.reset();

    for (const sample of replay.samples) {
      this.clock.advanceTo(sample.tMs);
      this.pipeline.dispatch(sample);
    }

    return {
      processedSamples: replay.samples.length,
      durationMs: this.clock.now(),
    };
  }
}
