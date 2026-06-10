import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AccidentReport, Severity, AppSettings, ImpactZone } from "./types";
export type { AppSettings } from "./types";

const REPORTS_KEY = "@strix_reports_v3";
const OLD_REPORTS_KEY = "@strix_reports_v2";
const CONTACTS_KEY = "@strix_contacts_v1";
const SETTINGS_KEY = "@strix_settings_v2";
const OLD_SETTINGS_KEY = "@strix_settings_v1";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  crashThresholdG: 2.0,
  autoAlertEnabled: true,
  sampleRateHz: 50,
  gyroscopeEnabled: true,
  gyroscopeThreshold: 80,
};

/** تحويل الاتجاه القديم (5 اتجاهات) إلى منطقة (8 مناطق) */
function migrateDirectionToZone(dir: string | undefined): ImpactZone {
  switch (dir) {
    case "front": return "front";
    case "rear": return "rear";
    case "side-left": return "side-left";
    case "side-right": return "side-right";
    default: return "unknown";
  }
}

function migrateReport(raw: Record<string, unknown>): AccidentReport {
  const g = typeof raw.peakGForce === "number" ? raw.peakGForce : 0;
  const speed = typeof raw.speedKmh === "number" ? raw.speedKmh : 0;
  let severity: Severity = "moderate";
  if (g >= 5 || (g >= 3.5 && speed >= 80)) severity = "critical";
  else if (g >= 3.5 || (g >= 2.5 && speed >= 60)) severity = "severe";
  else if (g >= 2.0 || speed >= 30) severity = "moderate";
  else severity = "minor";

  return {
    id: String(raw.id ?? Date.now()),
    timestamp: typeof raw.timestamp === "number" ? raw.timestamp : Date.now(),
    syncStatus: (raw.syncStatus as AccidentReport["syncStatus"]) ?? "synced",
    peakGForce: g,
    jerkPeak: typeof raw.jerkPeak === "number" ? raw.jerkPeak : 0,
    impactDirection:
      (raw.impactDirection as AccidentReport["impactDirection"]) ?? "unknown",
    impactZone: (raw.impactZone as ImpactZone) ?? migrateDirectionToZone(raw.impactDirection as string),
    speedKmh: speed,
    preCrashSpeedKmh:
      typeof raw.preCrashSpeedKmh === "number" ? raw.preCrashSpeedKmh : speed,
    speedHistory: Array.isArray(raw.speedHistory)
      ? (raw.speedHistory as number[])
      : undefined,
    latitude:
      typeof raw.latitude === "number" ? raw.latitude : null,
    longitude:
      typeof raw.longitude === "number" ? raw.longitude : null,
    severity,
    liabilityScore:
      typeof raw.liabilityScore === "number" ? raw.liabilityScore : 50,
    confidence:
      (raw.confidence as AccidentReport["confidence"]) ?? "low",
    scenarioCode: String(raw.scenarioCode ?? "LEGACY"),
    scenarioAr: String(raw.scenarioAr ?? "بيانات من نسخة سابقة"),
    descriptionAr: String(raw.descriptionAr ?? "تقرير مُستورد من نسخة سابقة من التطبيق."),
    factorsAr: Array.isArray(raw.factorsAr)
      ? (raw.factorsAr as string[])
      : ["تقرير من نسخة سابقة — البيانات التفصيلية غير متاحة"],
    feedback: (raw.feedback as AccidentReport["feedback"]) ?? null,
    // v3 fields — defaults for migrated reports
    gyroscope: (raw.gyroscope as AccidentReport["gyroscope"]) ?? null,
    braking: (raw.braking as AccidentReport["braking"]) ?? null,
    confidenceDetails: (raw.confidenceDetails as AccidentReport["confidenceDetails"]) ?? null,
    impactCount: typeof raw.impactCount === "number" ? raw.impactCount : 1,
    baselineG: typeof raw.baselineG === "number" ? raw.baselineG : 0,
    sessionDurationAtCrash: typeof raw.sessionDurationAtCrash === "number" ? raw.sessionDurationAtCrash : 0,
    // v6 fields — defaults for migrated reports
    otherParty: (raw.otherParty as AccidentReport["otherParty"]) ?? null,
    croquis: (raw.croquis as AccidentReport["croquis"]) ?? null,
    matchedAccidentId: (raw.matchedAccidentId as AccidentReport["matchedAccidentId"]) ?? null,
    matchConfidence: (raw.matchConfidence as AccidentReport["matchConfidence"]) ?? null,
    advancedAnalysis: (raw.advancedAnalysis as AccidentReport["advancedAnalysis"]) ?? null,
    // v8 fields — keep cross-verified two-party analysis across app restarts
    crossVerifiedId: typeof raw.crossVerifiedId === "string" ? raw.crossVerifiedId : undefined,
    crossVerifiedAnalysis:
      (raw.crossVerifiedAnalysis as AccidentReport["crossVerifiedAnalysis"]) ?? null,
    // v9 fields
    faultAssessment: (raw.faultAssessment as AccidentReport["faultAssessment"]) ?? null,
  };
}

/** Migrate old v2 reports to v3 key if needed */
async function migrateFromV2(): Promise<void> {
  try {
    const v3 = await AsyncStorage.getItem(REPORTS_KEY);
    if (v3) return; // already migrated
    const v2 = await AsyncStorage.getItem(OLD_REPORTS_KEY);
    if (v2) {
      await AsyncStorage.setItem(REPORTS_KEY, v2);
      await AsyncStorage.removeItem(OLD_REPORTS_KEY);
    }
  } catch {
    // silently fail
  }
}

export async function saveReport(report: AccidentReport): Promise<void> {
  const existing = await getReports();
  if (existing.some((r) => r.id === report.id)) return;
  const updated = [report, ...existing].slice(0, 100); // increased from 50 to 100
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export async function updateReport(report: AccidentReport): Promise<void> {
  const existing = await getReports();
  let found = false;
  const updated = existing.map((r) => {
    if (r.id !== report.id) return r;
    found = true;
    return report;
  });

  if (!found) {
    updated.unshift(report);
  }

  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export async function getReports(): Promise<AccidentReport[]> {
  try {
    await migrateFromV2();
    const data = await AsyncStorage.getItem(REPORTS_KEY);
    if (!data) return [];
    const raw = JSON.parse(data) as unknown[];
    const migrated = raw.map((r) => migrateReport(r as Record<string, unknown>));
    const seen = new Set<string>();
    const unique = migrated.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    if (unique.length < migrated.length) {
      await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(unique));
    }
    return unique;
  } catch {
    return [];
  }
}

export async function updateReportFeedback(
  id: string,
  feedback: "correct" | "incorrect"
): Promise<void> {
  const reports = await getReports();
  const updated = reports.map((r) => (r.id === id ? { ...r, feedback } : r));
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export async function deleteReport(id: string): Promise<void> {
  const reports = await getReports();
  const updated = reports.filter((r) => r.id !== id);
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export async function clearAllReports(): Promise<void> {
  await AsyncStorage.removeItem(REPORTS_KEY);
}

export async function getContacts(): Promise<EmergencyContact[]> {
  try {
    const data = await AsyncStorage.getItem(CONTACTS_KEY);
    if (!data) return [];
    return JSON.parse(data) as EmergencyContact[];
  } catch {
    return [];
  }
}

export async function saveContacts(
  contacts: EmergencyContact[]
): Promise<void> {
  await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export async function getSettings(): Promise<AppSettings> {
  try {
    // Try v2 first
    let data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!data) {
      // Migrate from v1
      const old = await AsyncStorage.getItem(OLD_SETTINGS_KEY);
      if (old) {
        data = old;
        await AsyncStorage.setItem(SETTINGS_KEY, old);
        await AsyncStorage.removeItem(OLD_SETTINGS_KEY);
      }
    }
    if (!data) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(data) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
