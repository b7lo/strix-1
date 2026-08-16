import type { TimedVectorSample } from "./types";

export interface ResampleOptions {
  targetRateHz: number;
  maxInterpolationGapMs?: number;
}

function interpolate(a: TimedVectorSample, b: TimedVectorSample, tMs: number): TimedVectorSample {
  const ratio = (tMs - a.tMs) / (b.tMs - a.tMs);
  return {
    tMs,
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio,
  };
}

export function resampleVectorSeries(
  samples: readonly TimedVectorSample[],
  options: ResampleOptions,
): TimedVectorSample[] {
  if (samples.length < 2) return samples.map((sample) => ({ ...sample }));
  const targetRateHz = Math.max(1, options.targetRateHz);
  const stepMs = 1000 / targetRateHz;
  const maxGapMs = options.maxInterpolationGapMs ?? Math.max(200, stepMs * 3);
  const ordered = [...samples].sort((a, b) => a.tMs - b.tMs);
  const result: TimedVectorSample[] = [];
  let rightIndex = 1;

  for (let tMs = ordered[0].tMs; tMs <= ordered.at(-1)!.tMs + 1e-6; tMs += stepMs) {
    while (rightIndex < ordered.length && ordered[rightIndex].tMs < tMs) rightIndex++;
    if (rightIndex >= ordered.length) break;
    const left = ordered[rightIndex - 1];
    const right = ordered[rightIndex];
    if (right.tMs === left.tMs || right.tMs - left.tMs > maxGapMs) continue;
    result.push(Math.abs(tMs - left.tMs) < 1e-6 ? { ...left, tMs } : interpolate(left, right, tMs));
  }

  const last = ordered.at(-1)!;
  if (result.length === 0 || Math.abs(result.at(-1)!.tMs - last.tMs) > 1e-6) {
    result.push({ ...last });
  }
  return result;
}
