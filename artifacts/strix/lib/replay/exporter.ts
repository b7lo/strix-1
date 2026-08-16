import { sensorReplayV1Schema } from "./schema";
import { sanitizeReplayForExport } from "./privacy";
import type { ReplayExportOptions, SensorReplayV1 } from "./types";

export function exportReplayJson(
  replay: SensorReplayV1,
  options: ReplayExportOptions = {},
): string {
  const sanitized = sanitizeReplayForExport(replay, options);
  const validated = sensorReplayV1Schema.parse(sanitized);
  return `${JSON.stringify(validated, null, 2)}\n`;
}

export function importReplayJson(json: string): SensorReplayV1 {
  return sensorReplayV1Schema.parse(JSON.parse(json)) as SensorReplayV1;
}
