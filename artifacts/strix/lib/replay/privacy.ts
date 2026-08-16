import type { ReplayExportOptions, ReplayLocationSample, SensorReplayV1 } from "./types";

const DEFAULT_COORDINATE_DECIMALS = 3;

function roundCoordinate(value: number | null, decimals: number): number | null {
  if (value === null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function sanitizeReplayForExport(
  replay: SensorReplayV1,
  options: ReplayExportOptions = {},
): SensorReplayV1 {
  const includeLocation = options.includeLocation ?? false;
  const decimals = Math.max(0, Math.min(5, Math.trunc(options.coordinateDecimals ?? DEFAULT_COORDINATE_DECIMALS)));

  return {
    ...replay,
    sessionId: `anonymous-${replay.sessionId.slice(-8)}`,
    startedAtMs: options.includeAbsoluteStartTime ? replay.startedAtMs : 0,
    metadata: {
      ...replay.metadata,
      deviceModel: replay.metadata.deviceModel || "unknown",
    },
    samples: replay.samples.map((sample) => {
      if (sample.kind !== "location") return { ...sample };

      const location: ReplayLocationSample = {
        ...sample,
        latitude: includeLocation ? roundCoordinate(sample.latitude, decimals) : null,
        longitude: includeLocation ? roundCoordinate(sample.longitude, decimals) : null,
      };
      return location;
    }),
  };
}
