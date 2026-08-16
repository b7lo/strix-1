import { signalMagnitude, type ImpactSignal, type MotionSignal, type SignalVector3 } from "./types";

export interface MotionSignalProcessorOptions {
  /** Low-pass time constant. The result is stable across sample rates. */
  timeConstantSec?: number;
}

export class MotionSignalProcessor {
  private smoothed: SignalVector3 = { x: 0, y: 0, z: 0 };
  private initialized = false;
  private readonly timeConstantSec: number;

  constructor(options: MotionSignalProcessorOptions = {}) {
    this.timeConstantSec = Math.max(0.01, options.timeConstantSec ?? 0.15);
  }

  process(impact: ImpactSignal): MotionSignal {
    const dtSec = Math.max(0.001, Math.min(impact.dtSec, 1));
    if (!this.initialized) {
      this.smoothed = { ...impact.linearAcceleration };
      this.initialized = true;
    } else {
      const alpha = 1 - Math.exp(-dtSec / this.timeConstantSec);
      this.smoothed.x += alpha * (impact.linearAcceleration.x - this.smoothed.x);
      this.smoothed.y += alpha * (impact.linearAcceleration.y - this.smoothed.y);
      this.smoothed.z += alpha * (impact.linearAcceleration.z - this.smoothed.z);
    }

    const linearAcceleration = { ...this.smoothed };
    return {
      timestampMs: impact.timestampMs,
      dtSec,
      linearAcceleration,
      magnitudeG: signalMagnitude(linearAcceleration),
    };
  }

  reset(): void {
    this.smoothed = { x: 0, y: 0, z: 0 };
    this.initialized = false;
  }
}
