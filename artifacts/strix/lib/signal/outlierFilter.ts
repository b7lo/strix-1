import type { SignalVector3 } from "./types";

export interface HampelFilterOptions {
  /** Odd centered window size. Three is the minimum. */
  windowSize?: number;
  /** Robust standard-deviation multiplier. */
  sigma?: number;
  /** Avoid treating tiny sensor noise as an outlier when MAD is zero. */
  minimumDeviationG?: number;
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function filterAxis(
  samples: readonly SignalVector3[],
  axis: keyof SignalVector3,
  windowSize: number,
  sigma: number,
  minimumDeviationG: number,
): number[] {
  const radius = Math.floor(windowSize / 2);
  return samples.map((sample, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(samples.length, index + radius + 1);
    const window = samples.slice(start, end).map((item) => item[axis]);
    const center = median(window);
    const mad = median(window.map((value) => Math.abs(value - center)));
    const limit = Math.max(minimumDeviationG, sigma * 1.4826 * mad);
    return Math.abs(sample[axis] - center) > limit ? center : sample[axis];
  });
}

/**
 * Optional centered Hampel filter for imported/offline signal windows. It
 * removes isolated spikes while preserving a multi-sample pulse that forms the
 * local majority. The live fast-impact path intentionally does not enable it.
 */
export function hampelFilterVectors(
  samples: readonly SignalVector3[],
  options: HampelFilterOptions = {},
): SignalVector3[] {
  if (samples.length < 3) return samples.map((sample) => ({ ...sample }));
  const requestedWindow = Math.max(3, Math.floor(options.windowSize ?? 5));
  const windowSize = requestedWindow % 2 === 0 ? requestedWindow + 1 : requestedWindow;
  const sigma = Math.max(0.1, options.sigma ?? 3);
  const minimumDeviationG = Math.max(0, options.minimumDeviationG ?? 0.5);
  const x = filterAxis(samples, "x", windowSize, sigma, minimumDeviationG);
  const y = filterAxis(samples, "y", windowSize, sigma, minimumDeviationG);
  const z = filterAxis(samples, "z", windowSize, sigma, minimumDeviationG);

  return samples.map((_, index) => ({ x: x[index], y: y[index], z: z[index] }));
}
