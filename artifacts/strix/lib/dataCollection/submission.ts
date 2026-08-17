import { exportReplayJson } from "../replay/exporter";
import type { SensorReplayV1 } from "../replay/types";
import { RESEARCH_CONSENT_VERSION } from "./constants";

export const REPLAY_STORAGE_BUCKET = "sensor-replays";

export const REPLAY_EVENT_LABELS = [
  "crash",
  "pothole",
  "hard_braking",
  "phone_drop",
  "door_slam",
  "rough_road",
  "normal_driving",
  "other",
] as const;

export const PHONE_PLACEMENTS = ["mount", "pocket", "seat", "cup_holder", "unknown"] as const;
export const VEHICLE_CLASSES = ["sedan", "suv", "pickup", "van", "truck", "other", "unknown"] as const;

export type ReplayEventLabel = (typeof REPLAY_EVENT_LABELS)[number];
export type PhonePlacement = (typeof PHONE_PLACEMENTS)[number];
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export interface ReplaySubmissionInput {
  label: ReplayEventLabel;
  phonePlacement: PhonePlacement;
  vehicleClass: VehicleClass;
  labelConfidence?: number;
}

export interface PreparedReplayUpload {
  json: string;
  metadata: {
    replay_id: string;
    schema_version: number;
    engine_version: string;
    threshold_config_version: string;
    event_label: ReplayEventLabel;
    label_source: "user";
    label_confidence: number;
    review_status: "pending";
    phone_placement: PhonePlacement;
    vehicle_class: VehicleClass;
    device_model: string;
    sample_rate_hz: number;
    duration_ms: number;
    sample_count: number;
    consent_version: typeof RESEARCH_CONSENT_VERSION;
    contains_exact_location: false;
    metadata: {
      truncated: boolean;
      source: SensorReplayV1["metadata"]["source"];
      sampleKinds: Record<string, number>;
      decisionCounts: Record<string, number>;
    };
  };
}

function clampConfidence(value: number | undefined): number {
  if (!Number.isFinite(value)) return 60;
  return Math.max(0, Math.min(100, Math.round(value as number)));
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

/** Builds a privacy-safe payload without network access. */
export function prepareReplayUpload(
  replay: SensorReplayV1,
  input: ReplaySubmissionInput,
): PreparedReplayUpload {
  const json = exportReplayJson(replay, {
    includeLocation: false,
    includeAbsoluteStartTime: false,
  });
  const decisions = replay.samples
    .filter((sample) => sample.kind === "decision")
    .map((sample) => sample.decision);

  return {
    json,
    metadata: {
      replay_id: `anonymous-${replay.sessionId.slice(-8)}`,
      schema_version: replay.schemaVersion,
      engine_version: replay.engineVersion,
      threshold_config_version: replay.thresholdConfigVersion,
      event_label: input.label,
      label_source: "user",
      label_confidence: clampConfidence(input.labelConfidence),
      review_status: "pending",
      phone_placement: input.phonePlacement,
      vehicle_class: input.vehicleClass,
      device_model: replay.metadata.deviceModel || "unknown",
      sample_rate_hz: replay.metadata.sampleRateHz,
      duration_ms: Math.max(0, Math.round(replay.durationMs)),
      sample_count: replay.samples.length,
      consent_version: RESEARCH_CONSENT_VERSION,
      contains_exact_location: false,
      metadata: {
        truncated: replay.truncated,
        source: replay.metadata.source,
        sampleKinds: countBy(replay.samples.map((sample) => sample.kind)),
        decisionCounts: countBy(decisions),
      },
    },
  };
}

export async function submitReplayForResearch(
  replay: SensorReplayV1,
  input: ReplaySubmissionInput,
): Promise<{ id: string; storagePath: string }> {
  // Keep the privacy-safe payload builder usable in tests and offline tooling
  // without constructing a Supabase client at module import time.
  const { supabase } = await import("../supabaseClient");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("AUTH_REQUIRED");

  const prepared = prepareReplayUpload(replay, input);
  if (prepared.metadata.sample_count === 0) throw new Error("EMPTY_REPLAY");

  const anonymousSession = JSON.parse(prepared.json) as SensorReplayV1;
  const safeSessionId = anonymousSession.sessionId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const storagePath = `${authData.user.id}/${Date.now()}-${safeSessionId}.json`;
  const bytes = new TextEncoder().encode(prepared.json);

  const { error: uploadError } = await supabase.storage
    .from(REPLAY_STORAGE_BUCKET)
    .upload(storagePath, bytes, {
      contentType: "application/json",
      upsert: false,
    });
  if (uploadError) throw new Error(`REPLAY_UPLOAD_FAILED:${uploadError.message}`);

  const { data, error: insertError } = await supabase
    .from("sensor_replay_submissions")
    .insert({
      user_id: authData.user.id,
      storage_path: storagePath,
      ...prepared.metadata,
    })
    .select("id")
    .single();

  if (insertError || !data?.id) {
    await supabase.storage.from(REPLAY_STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`REPLAY_METADATA_FAILED:${insertError?.message ?? "missing id"}`);
  }

  return { id: String(data.id), storagePath };
}
