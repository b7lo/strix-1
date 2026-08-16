import { ReplayPlayer } from "../replay/player";
import type { ReplaySample, SensorReplayV1 } from "../replay/types";
import { SensorPipeline } from "../sensorPipeline";

const frontImpact = require("../__fixtures__/replay/front-impact.json") as SensorReplayV1;

function collect(run: (pipeline: SensorPipeline) => void): ReplaySample[] {
  const observed: ReplaySample[] = [];
  const pipeline = new SensorPipeline({ onSample: (sample) => observed.push(structuredClone(sample)) });
  run(pipeline);
  return observed;
}

describe("live/replay SensorPipeline parity", () => {
  it("dispatches the same ordered payloads through both paths", () => {
    const live = collect((pipeline) => {
      for (const sample of frontImpact.samples) pipeline.dispatch(sample);
    });
    const replay = collect((pipeline) => {
      new ReplayPlayer(pipeline).play(frontImpact);
    });

    expect(replay).toEqual(live);
  });
});
