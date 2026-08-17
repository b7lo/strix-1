import type { ReplaySample } from "./replay/types";
import type { ImpactClassifier, ShadowImpactPrediction } from "./ml/impactClassifier";
import { ImpactSignalProcessor, type ImpactSignalProcessorOptions } from "./signal/impactSignal";
import { MotionSignalProcessor, type MotionSignalProcessorOptions } from "./signal/motionSignal";
import type { ImpactSignal, MotionSignal } from "./signal/types";

export interface SensorPipelineHandlers {
  onSample?: (sample: ReplaySample) => void;
  onAccelerometer?: (sample: Extract<ReplaySample, { kind: "accelerometer" }>) => void;
  onImpactSignal?: (signal: ImpactSignal) => void;
  onMotionSignal?: (signal: MotionSignal) => void;
  onSignalPair?: (impact: ImpactSignal, motion: MotionSignal) => void;
  onGyroscope?: (sample: Extract<ReplaySample, { kind: "gyroscope" }>) => void;
  onLocation?: (sample: Extract<ReplaySample, { kind: "location" }>) => void;
  onCalibration?: (sample: Extract<ReplaySample, { kind: "calibration" }>) => void;
  onQuality?: (sample: Extract<ReplaySample, { kind: "quality" }>) => void;
  onDecision?: (sample: Extract<ReplaySample, { kind: "decision" }>) => void;
  onShadowPrediction?: (prediction: ShadowImpactPrediction) => void;
  onReset?: () => void;
}

export interface SensorPipelineOptions {
  impact?: ImpactSignalProcessorOptions;
  motion?: MotionSignalProcessorOptions;
  /** Optional experiment only; its output never changes the rules decision. */
  shadowClassifier?: ImpactClassifier;
}

/**
 * Shared ordered event adapter used by live recording and deterministic replay.
 * Algorithm-specific handlers stay outside this class so replay cannot silently
 * diverge from the live event order.
 */
export class SensorPipeline {
  private readonly impactProcessor: ImpactSignalProcessor;
  private readonly motionProcessor: MotionSignalProcessor;
  private readonly shadowClassifier?: ImpactClassifier;
  private lastAccelerometerTMs: number | null = null;

  constructor(
    private readonly handlers: SensorPipelineHandlers = {},
    options: SensorPipelineOptions = {},
  ) {
    this.impactProcessor = new ImpactSignalProcessor(options.impact);
    this.motionProcessor = new MotionSignalProcessor(options.motion);
    this.shadowClassifier = options.shadowClassifier;
  }

  dispatch(sample: ReplaySample): void {
    this.handlers.onSample?.(sample);
    this.shadowClassifier?.observeSample(sample);
    switch (sample.kind) {
      case "accelerometer": {
        const dtSec = this.lastAccelerometerTMs !== null && sample.tMs > this.lastAccelerometerTMs
          ? (sample.tMs - this.lastAccelerometerTMs) / 1000
          : undefined;
        const impact = this.impactProcessor.process(sample.raw, sample.tMs, dtSec);
        const motion = this.motionProcessor.process(impact);
        this.lastAccelerometerTMs = sample.tMs;
        this.handlers.onImpactSignal?.(impact);
        this.handlers.onMotionSignal?.(motion);
        this.handlers.onSignalPair?.(impact, motion);
        if (this.shadowClassifier) {
          this.handlers.onShadowPrediction?.(this.shadowClassifier.observeSignals(impact, motion));
        }
        this.handlers.onAccelerometer?.(sample);
        break;
      }
      case "gyroscope": this.handlers.onGyroscope?.(sample); break;
      case "location": this.handlers.onLocation?.(sample); break;
      case "calibration": this.handlers.onCalibration?.(sample); break;
      case "quality": this.handlers.onQuality?.(sample); break;
      case "decision": this.handlers.onDecision?.(sample); break;
    }
  }

  reset(): void {
    this.impactProcessor.reset();
    this.motionProcessor.reset();
    this.shadowClassifier?.reset();
    this.lastAccelerometerTMs = null;
    this.handlers.onReset?.();
  }
}
