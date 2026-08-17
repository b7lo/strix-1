import {
  applyRemoteConfig,
  getThresholdConfigVersion,
  LOCAL_THRESHOLD_CONFIG_VERSION,
  resetThresholdConfigForTests,
  rollbackThresholdConfig,
  validateThresholdConfig,
} from "../remoteConfig";
import { THRESHOLDS } from "../thresholds";

const envelope = (configVersion: string, thresholds: Record<string, unknown>) => ({
  schemaVersion: 1,
  configVersion,
  thresholds,
});

afterEach(() => resetThresholdConfigForTests());

describe("atomic threshold configuration", () => {
  it("applies a valid partial envelope and exposes its version", () => {
    expect(applyRemoteConfig(envelope("phase6-valid", {
      G_MODERATE: 2.2,
      G_SEVERE: 3.7,
      G_CRITICAL: 5.2,
    }))).toBe(3);
    expect(THRESHOLDS.G_MODERATE).toBe(2.2);
    expect(getThresholdConfigVersion()).toBe("phase6-valid");
  });

  it("rejects the whole envelope when one supplied field is corrupt", () => {
    const before = THRESHOLDS.G_MODERATE;
    const applied = applyRemoteConfig(envelope("partial-corrupt", {
      G_MODERATE: 2.4,
      G_SEVERE: "bad",
    }));
    expect(applied).toBe(0);
    expect(THRESHOLDS.G_MODERATE).toBe(before);
    expect(getThresholdConfigVersion()).toBe(LOCAL_THRESHOLD_CONFIG_VERSION);
  });

  it("rejects unknown fields instead of partially applying known fields", () => {
    const before = THRESHOLDS.G_MODERATE;
    expect(applyRemoteConfig(envelope("unknown-key", {
      G_MODERATE: 2.3,
      TYPO_G_LIMIT: 9,
    }))).toBe(0);
    expect(THRESHOLDS.G_MODERATE).toBe(before);
  });

  it("rejects reversed threshold relationships atomically", () => {
    const validation = validateThresholdConfig(envelope("bad-relations", {
      G_MODERATE: 4,
      G_SEVERE: 3,
      G_CRITICAL: 2,
    }));
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes("G thresholds"))).toBe(true);
    expect(applyRemoteConfig(envelope("bad-relations", {
      G_MODERATE: 4,
      G_SEVERE: 3,
      G_CRITICAL: 2,
    }))).toBe(0);
    expect(THRESHOLDS.G_MODERATE).toBe(2);
  });

  it("rolls back to the configuration active before the latest valid apply", () => {
    applyRemoteConfig(envelope("first", { G_MODERATE: 2.2 }));
    applyRemoteConfig(envelope("second", { G_MODERATE: 2.4 }));
    expect(THRESHOLDS.G_MODERATE).toBe(2.4);
    expect(rollbackThresholdConfig()).toBe("first");
    expect(THRESHOLDS.G_MODERATE).toBe(2.2);
  });

  it("rejects unsupported schemas and empty threshold sets", () => {
    expect(validateThresholdConfig({ schemaVersion: 2, configVersion: "future", thresholds: { G_MODERATE: 2.2 } }).valid).toBe(false);
    expect(validateThresholdConfig(envelope("empty", {})).valid).toBe(false);
  });
});
