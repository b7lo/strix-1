import { ReplayPlayer } from "../replay/player";
import type { SensorReplayV1 } from "../replay/types";
import { SensorPipeline } from "../sensorPipeline";

const frontImpact = require("../__fixtures__/replay/front-impact.json") as SensorReplayV1;

function executeReplay() {
  const events: string[] = [];
  const pipeline = new SensorPipeline({
    onSample: (sample) => events.push(`${sample.tMs}:${sample.kind}`),
    onAccelerometer: (sample) => events.push(`g:${sample.gForce}`),
    onDecision: (sample) => events.push(`decision:${sample.decision}`),
  });
  const result = new ReplayPlayer(pipeline).play(frontImpact);
  return { events, result };
}

describe("ReplayPlayer determinism", () => {
  it("produces identical ordered events for repeated playback", () => {
    expect(executeReplay()).toEqual(executeReplay());
  });

  it("reports virtual duration without waiting in real time", () => {
    const started = performance.now();
    const playback = executeReplay();
    const elapsed = performance.now() - started;

    expect(playback.result).toEqual({ processedSamples: 4, durationMs: 120 });
    expect(elapsed).toBeLessThan(100);
  });
});
