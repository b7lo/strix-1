import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scoreMatch } from "../matching";
import type { MatchInput } from "../types";

type Fixture = {
  name: string;
  expectedMatch: boolean;
  a: MatchInput;
  b: MatchInput;
};

const fixturePath = fileURLToPath(
  new URL("../__fixtures__/matching/nearby-collisions.json", import.meta.url),
);
const fixtures = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture[];

test("matching fixture precision and recall are 1.0", () => {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const fixture of fixtures) {
    const actual = scoreMatch(fixture.a, fixture.b).isMatch;
    if (actual && fixture.expectedMatch) truePositive += 1;
    if (actual && !fixture.expectedMatch) falsePositive += 1;
    if (!actual && fixture.expectedMatch) falseNegative += 1;
  }

  const precision = truePositive / (truePositive + falsePositive);
  const recall = truePositive / (truePositive + falseNegative);
  assert.equal(precision, 1);
  assert.equal(recall, 1);
});

test("GPS absence cannot be replaced by one aligned angle", () => {
  const fixture = fixtures.find((item) => item.name === "missing GPS with angle only");
  assert.ok(fixture);
  const score = scoreMatch(fixture.a, fixture.b);
  assert.equal(score.isMatch, false);
  assert.ok(score.contradictions.includes("INSUFFICIENT_EVIDENCE_WITHOUT_GPS"));
});

test("poor GPS accuracy does not count as usable location evidence", () => {
  const score = scoreMatch(
    { timestamp: 1_000, latitude: 24.7, longitude: 46.6, gpsAccuracyMeters: 200, approachAngle: 0 },
    { timestamp: 1_050, latitude: 24.7, longitude: 46.6, gpsAccuracyMeters: 200, approachAngle: 1 },
  );
  assert.equal(score.hasUsableGps, false);
  assert.equal(score.isMatch, false);
});
