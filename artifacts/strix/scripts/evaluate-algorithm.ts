import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { algorithmBaselineFixtures } from "../lib/__fixtures__/algorithm-baseline";
import { evaluateAlgorithm } from "../lib/evaluation/runner";

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
