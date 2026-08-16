import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { evaluateSampleRates } from "../lib/evaluation/rateInvariance";

const report = evaluateSampleRates([25, 50, 100]);
const output = `${JSON.stringify(report, null, 2)}\n`;
const writeIndex = process.argv.indexOf("--write");
if (writeIndex >= 0) {
  const outputPath = resolve(
    process.cwd(),
    process.argv[writeIndex + 1] ?? "specs/004-algorithm-improvement/reports/phase-2.json",
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, "utf8");
  console.log(`Sample-rate report written to ${outputPath}`);
}
console.log(output.trimEnd());
