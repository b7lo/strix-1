import { SensorRecorder } from "../replay/recorder";
import type { ReplayMetadata } from "../replay/types";

const metadata: ReplayMetadata = {
  platform: "android",
  deviceModel: "test-device",
  appVersion: "test",
  source: "synthetic",
  sampleRateHz: 50,
};

function accel(tMs: number, gForce = 0) {
  return {
    kind: "accelerometer" as const,
    tMs,
    raw: { x: 0, y: -1, z: 0 },
    filtered: { x: 0, y: 0, z: 0 },
    gForce,
  };
}

describe("SensorRecorder", () => {
  it("uses a fixed-capacity circular buffer", () => {
    const recorder = new SensorRecorder(metadata, { maxSamples: 10, now: () => 1000 });
    for (let index = 0; index < 25; index++) recorder.record(accel(index * 20));

    const replay = recorder.snapshot();
    expect(recorder.sampleCount).toBe(10);
    expect(replay.samples[0].tMs).toBe(300);
    expect(replay.samples.at(-1)?.tMs).toBe(480);
    expect(replay.truncated).toBe(true);
  });

  it("stays bounded during a long high-frequency session", () => {
    const recorder = new SensorRecorder(metadata, {
      maxSamples: 500,
      maxDurationMs: 10 * 60 * 1000,
      now: () => 1000,
    });

    for (let index = 0; index < 100_000; index++) recorder.record(accel(index * 10));

    expect(recorder.sampleCount).toBe(500);
    expect(recorder.snapshot().samples).toHaveLength(500);
    expect(recorder.snapshot().truncated).toBe(true);
  });

  it("drops samples outside the configured time window", () => {
    const recorder = new SensorRecorder(metadata, {
      maxSamples: 100,
      maxDurationMs: 1000,
      now: () => 1000,
    });
    recorder.record(accel(0));
    recorder.record(accel(500));
    recorder.record(accel(1501));

    expect(recorder.snapshot().samples.map((sample) => sample.tMs)).toEqual([1501]);
  });

  it("normalizes out-of-order arrival and ignores writes after stop", () => {
    const recorder = new SensorRecorder(metadata, { now: () => 1000 });
    recorder.record(accel(100));
    recorder.record(accel(50));
    const stopped = recorder.stop();
    recorder.record(accel(200));

    expect(stopped.samples.map((sample) => sample.tMs)).toEqual([100, 100]);
    expect(recorder.snapshot().samples).toHaveLength(2);
  });
});
