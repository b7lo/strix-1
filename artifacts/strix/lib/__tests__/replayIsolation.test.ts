import { ReplayPlayer } from "../replay/player";
import type { SensorReplayV1 } from "../replay/types";
import { SensorPipeline } from "../sensorPipeline";

const frontImpact = require("../__fixtures__/replay/front-impact.json") as SensorReplayV1;
const pothole = require("../__fixtures__/replay/pothole.json") as SensorReplayV1;

describe("replay isolation", () => {
  it("resets pipeline state before every recording", () => {
    let decisions: string[] = [];
    const results: string[][] = [];
    const pipeline = new SensorPipeline({
      onReset: () => { decisions = []; },
      onDecision: (sample) => decisions.push(sample.decision),
    });
    const player = new ReplayPlayer(pipeline);

    player.play(frontImpact);
    results.push([...decisions]);
    player.play(pothole);
    results.push([...decisions]);

    expect(results).toEqual([["confirmed"], ["rejected"]]);
  });
});
