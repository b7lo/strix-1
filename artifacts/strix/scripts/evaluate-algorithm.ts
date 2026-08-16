import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { algorithmBaselineFixtures } from "../lib/__fixtures__/algorithm-baseline";
import { evaluateAlgorithm } from "../lib/evaluation/runner";
import { importReplayJson, ReplayPlayer } from "../lib/replay";
import { SensorPipeline } from "../lib/sensorPipeline";

const replayIndex = process.argv.indexOf("--replay");

if (replayIndex >= 0) {
  const requestedPath = process.argv[replayIndex + 1];
  if (!requestedPath) throw new Error("--replay requires a JSON file path");

  const replayPath = resolve(process.cwd(), requestedPath);
  const replay = importReplayJson(readFileSync(replayPath, "utf8"));
  const counts: Record<string, number> = {};
  const decisions: string[] = [];
  const pipeline = new SensorPipeline({
    onSample: (sample) => { counts[sample.kind] = (counts[sample.kind] ?? 0) + 1; },
    onDecision: (sample) => decisions.push(sample.decision),
  });
  const playback = new ReplayPlayer(pipeline).play(replay);
  console.log(JSON.stringify({
    schemaVersion: replay.schemaVersion,
    engineVersion: replay.engineVersion,
    playback,
    counts,
    decisions,
  }, null, 2));
  process.exit(0);
}

const result = evaluateAlgorithm(algorithmBaselineFixtures);
const serialized = `${JSON.stringify(result, null, 2)}\n`;
const writeIndex = process.argv.indexOf("--write");

if (writeIndex >= 0) {
  const requestedPath = process.argv[writeIndex + 1];
  const outputPath = resolve(
    process.cwd(),
    requestedPath ?? "specs/004-algorithm-improvement/baselines/current.json",
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized, "utf8");
  console.log(`Algorithm baseline written to ${outputPath}`);
}

console.log(serialized.trimEnd());
