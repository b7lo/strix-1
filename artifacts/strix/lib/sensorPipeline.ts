import type { ReplaySample } from "./replay/types";

export interface SensorPipelineHandlers {
  onSample?: (sample: ReplaySample) => void;
  onAccelerometer?: (sample: Extract<ReplaySample, { kind: "accelerometer" }>) => void;
  onGyroscope?: (sample: Extract<ReplaySample, { kind: "gyroscope" }>) => void;
  onLocation?: (sample: Extract<ReplaySample, { kind: "location" }>) => void;
  onCalibration?: (sample: Extract<ReplaySample, { kind: "calibration" }>) => void;
  onQuality?: (sample: Extract<ReplaySample, { kind: "quality" }>) => void;
  onDecision?: (sample: Extract<ReplaySample, { kind: "decision" }>) => void;
  onReset?: () => void;
}

/**
 * Shared ordered event adapter used by live recording and deterministic replay.
 * Algorithm-specific handlers stay outside this class so replay cannot silently
 * diverge from the live event order.
 */
export class SensorPipeline {
  constructor(private readonly handlers: SensorPipelineHandlers = {}) {}

  dispatch(sample: ReplaySample): void {
    this.handlers.onSample?.(sample);
    switch (sample.kind) {
      case "accelerometer": this.handlers.onAccelerometer?.(sample); break;
      case "gyroscope": this.handlers.onGyroscope?.(sample); break;
      case "location": this.handlers.onLocation?.(sample); break;
      case "calibration": this.handlers.onCalibration?.(sample); break;
      case "quality": this.handlers.onQuality?.(sample); break;
      case "decision": this.handlers.onDecision?.(sample); break;
    }
  }

  reset(): void {
    this.handlers.onReset?.();
  }
}
