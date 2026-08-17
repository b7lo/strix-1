/** Remote threshold configuration with atomic validation and rollback. */
import { THRESHOLDS, type ThresholdKey } from "./thresholds";

export const THRESHOLD_CONFIG_SCHEMA_VERSION = 1 as const;
export const LOCAL_THRESHOLD_CONFIG_VERSION = "local-thresholds-v1";

export interface ThresholdConfigEnvelope {
  schemaVersion: typeof THRESHOLD_CONFIG_SCHEMA_VERSION;
  configVersion: string;
  thresholds: Partial<Record<ThresholdKey, number>>;
}

export interface ThresholdConfigValidation {
  valid: boolean;
  errors: string[];
  envelope: ThresholdConfigEnvelope | null;
}

const CACHE_KEY = "@strix_remote_config_v2";
const LEGACY_CACHE_KEY = "@strix_remote_config_v1";
const REMOTE_URL = process.env.EXPO_PUBLIC_REMOTE_CONFIG_URL || "";
const thresholdKeys = Object.keys(THRESHOLDS) as ThresholdKey[];
const knownKeys = new Set<string>(thresholdKeys);
const localDefaults = { ...THRESHOLDS } as Record<ThresholdKey, number>;

let activeVersion = LOCAL_THRESHOLD_CONFIG_VERSION;
let activeThresholds = { ...localDefaults };
let rollbackVersion = LOCAL_THRESHOLD_CONFIG_VERSION;
let rollbackThresholds = { ...localDefaults };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Compatibility helper: returns known finite values, without applying them. */
export function sanitizeRemoteConfig(raw: unknown): Partial<Record<ThresholdKey, number>> {
  const out: Partial<Record<ThresholdKey, number>> = {};
  if (!isRecord(raw)) return out;
  for (const key of thresholdKeys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

function relation(errors: string[], condition: boolean, message: string): void {
  if (!condition) errors.push(message);
}

function validateRelations(values: Record<ThresholdKey, number>, errors: string[]): void {
  relation(errors, values.G_MODERATE < values.G_SEVERE && values.G_SEVERE < values.G_CRITICAL,
    "G thresholds must satisfy G_MODERATE < G_SEVERE < G_CRITICAL");
  relation(errors, values.G_MEDIUM_CONFIDENCE <= values.G_HIGH_CONFIDENCE,
    "G_MEDIUM_CONFIDENCE must not exceed G_HIGH_CONFIDENCE");
  relation(errors, values.SPEED_CONFIDENCE_LOW <= values.SPEED_CONFIDENCE_HIGH,
    "SPEED_CONFIDENCE_LOW must not exceed SPEED_CONFIDENCE_HIGH");
  relation(errors, values.JERK_CONFIDENCE_MEDIUM <= values.JERK_CONFIDENCE_HIGH,
    "JERK_CONFIDENCE_MEDIUM must not exceed JERK_CONFIDENCE_HIGH");
  relation(errors, values.CONFIDENCE_MEDIUM_THRESHOLD < values.CONFIDENCE_HIGH_THRESHOLD,
    "confidence thresholds must be increasing");
  relation(errors, values.DQ_LOW_SAMPLE_RATE_HZ <= values.DQ_GOOD_SAMPLE_RATE_HZ,
    "data-quality sample-rate thresholds must be increasing");
  relation(errors, values.DQ_MEDIUM_THRESHOLD < values.DQ_HIGH_THRESHOLD,
    "data-quality score thresholds must be increasing");
  relation(errors, values.IMPACT_CANDIDATE_MIN_DURATION_MS < values.IMPACT_CANDIDATE_MAX_DURATION_MS,
    "impact candidate duration bounds are reversed");
  relation(errors, values.IMPACT_POST_WINDOW_MS < values.IMPACT_COOLDOWN_MS,
    "impact cooldown must exceed the post-impact window");
  relation(errors, values.VF_MIN_RESULTANT >= 0 && values.VF_MIN_RESULTANT <= 1,
    "VF_MIN_RESULTANT must be in [0, 1]");
  relation(errors, values.VF_ACCEL_EMA_ALPHA > 0 && values.VF_ACCEL_EMA_ALPHA <= 1,
    "VF_ACCEL_EMA_ALPHA must be in (0, 1]");
  relation(errors, values.CROSS_VERIFIED_BLEND_WEIGHT >= 0 && values.CROSS_VERIFIED_BLEND_WEIGHT <= 1,
    "CROSS_VERIFIED_BLEND_WEIGHT must be in [0, 1]");
}

/** Strictly validates every supplied key/value and all relations after merging. */
export function validateThresholdConfig(raw: unknown): ThresholdConfigValidation {
  const errors: string[] = [];
  let schemaVersion: unknown;
  let configVersion: unknown;
  let source: unknown;

  if (isRecord(raw) && "thresholds" in raw) {
    schemaVersion = raw.schemaVersion;
    configVersion = raw.configVersion;
    source = raw.thresholds;
  } else {
    // Read-only compatibility for the v1 cache. Network writes always store v2 envelopes.
    schemaVersion = THRESHOLD_CONFIG_SCHEMA_VERSION;
    configVersion = "legacy-cache-v1";
    source = raw;
  }

  if (schemaVersion !== THRESHOLD_CONFIG_SCHEMA_VERSION) errors.push("unsupported schemaVersion");
  if (typeof configVersion !== "string" || configVersion.trim().length === 0) {
    errors.push("configVersion is required");
  }
  if (!isRecord(source)) {
    errors.push("thresholds must be an object");
    return { valid: false, errors, envelope: null };
  }

  const thresholds: Partial<Record<ThresholdKey, number>> = {};
  const suppliedKeys = Object.keys(source);
  if (suppliedKeys.length === 0) errors.push("at least one threshold is required");
  for (const key of suppliedKeys) {
    if (!knownKeys.has(key)) {
      errors.push(`unknown threshold: ${key}`);
      continue;
    }
    const value = source[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`threshold ${key} must be finite`);
      continue;
    }
    if (value < 0) {
      errors.push(`threshold ${key} must be non-negative`);
      continue;
    }
    thresholds[key as ThresholdKey] = value;
  }

  const merged = { ...activeThresholds, ...thresholds } as Record<ThresholdKey, number>;
  validateRelations(merged, errors);
  const envelope: ThresholdConfigEnvelope = {
    schemaVersion: THRESHOLD_CONFIG_SCHEMA_VERSION,
    configVersion: typeof configVersion === "string" ? configVersion.trim() : "",
    thresholds,
  };
  return { valid: errors.length === 0, errors, envelope: errors.length === 0 ? envelope : null };
}

function replaceThresholds(values: Record<ThresholdKey, number>): void {
  for (const key of thresholdKeys) THRESHOLDS[key] = values[key];
}

/** Applies all values, or none. Returns the number applied; zero means rejection. */
export function applyRemoteConfig(raw: unknown): number {
  const validation = validateThresholdConfig(raw);
  if (!validation.valid || !validation.envelope) return 0;

  const candidate = {
    ...activeThresholds,
    ...validation.envelope.thresholds,
  } as Record<ThresholdKey, number>;
  rollbackThresholds = { ...activeThresholds };
  rollbackVersion = activeVersion;
  replaceThresholds(candidate);
  activeThresholds = candidate;
  activeVersion = validation.envelope.configVersion;
  return Object.keys(validation.envelope.thresholds).length;
}

export function rollbackThresholdConfig(): string {
  replaceThresholds(rollbackThresholds);
  activeThresholds = { ...rollbackThresholds };
  activeVersion = rollbackVersion;
  return activeVersion;
}

export function resetThresholdConfigForTests(): void {
  replaceThresholds(localDefaults);
  activeThresholds = { ...localDefaults };
  rollbackThresholds = { ...localDefaults };
  activeVersion = LOCAL_THRESHOLD_CONFIG_VERSION;
  rollbackVersion = LOCAL_THRESHOLD_CONFIG_VERSION;
}

export function getThresholdConfigVersion(): string {
  return activeVersion;
}

export async function initRemoteConfig(): Promise<void> {
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY) ?? await AsyncStorage.getItem(LEGACY_CACHE_KEY);
    if (cached) applyRemoteConfig(JSON.parse(cached));
  } catch {
    resetThresholdConfigForTests();
  }

  if (!REMOTE_URL) return;
  try {
    const response = await fetch(REMOTE_URL);
    if (!response.ok) return;
    const raw = await response.json() as unknown;
    const validation = validateThresholdConfig(raw);
    if (!validation.valid || !validation.envelope) return;
    const applied = applyRemoteConfig(validation.envelope);
    if (applied > 0) await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(validation.envelope));
  } catch {
    // Keep the last valid cached/local configuration.
  }
}
