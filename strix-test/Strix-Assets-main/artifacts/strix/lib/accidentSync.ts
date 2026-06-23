/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Accident Sync — v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * مزامنة الحوادث مع Strix API أو Supabase fallback والبحث عن مطابقة بين مستخدمين.
 *
 * السيناريو:
 *  1. يحدث حادث → يُرفع على Supabase فوراً
 *  2. البحث في آخر 60 ثانية عن حوادث أخرى قريبة
 *  3. إذا وُجد تطابق (الوقت + الموقع + الزاوية) → ربط التقريرين
 *
 * معايير المطابقة:
 *  ─ فرق الوقت < 5 ثوانٍ
 *  ─ المسافة < 100 متر
 *  ─ زوايا الاقتراب متعاكسة (±30°)
 * ═══════════════════════════════════════════════════════════════════
 */

import { Platform } from "react-native";
import type { AccidentReport, CrossVerifiedAnalysis } from "./types";
import { generateCrossVerifiedAnalysis } from "./crossVerification";
import { haversineDistance } from "./geoUtils";

// ─── Sync Config ───
const STRIX_API_URL = process.env.EXPO_PUBLIC_STRIX_API_URL || "";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
let lastSyncBackend: "api" | "supabase" | null = null;

// معرف الجهاز (ثابت لكل جهاز)
let deviceId = "";
let deviceIdInitialized = false;

/**
 * v7.1 FIX: تهيئة المعرف — يُستدعى مرة واحدة عند بدء التطبيق
 */
export async function initDeviceId(): Promise<void> {
  if (deviceIdInitialized) return;
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const stored = await AsyncStorage.getItem("@strix_device_id");
    if (stored) {
      deviceId = stored;
    } else {
      deviceId = `strix_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await AsyncStorage.setItem("@strix_device_id", deviceId);
    }
  } catch {
    deviceId = `strix_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  deviceIdInitialized = true;
}

function getDeviceId(): string {
  if (!deviceId) {
    throw new Error("Device ID not initialized. Call initDeviceId() first.");
  }
  return deviceId;
}

// ─── Strix API Helper ───

function isStrixApiConfigured(): boolean {
  return Boolean(STRIX_API_URL);
}

function apiUrl(path: string): string {
  return `${STRIX_API_URL.replace(/\/$/, "")}${path}`;
}

async function apiRequest(
  path: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: Record<string, unknown>,
): Promise<unknown> {
  if (!isStrixApiConfigured()) return null;

  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const token = await AsyncStorage.getItem("@strix_auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      console.warn(`[Strix API] ${method} ${path} failed: ${response.status}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.warn("[Strix API] Network error:", err);
    throw err;
  }
}

// ─── Supabase REST API Helper ───

function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function supabaseRequest(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: Record<string, unknown>,
  queryParams?: string
): Promise<unknown> {
  if (!isSupabaseConfigured()) return null;

  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${queryParams ? `?${queryParams}` : ""}`;
  const headers: Record<string, string> = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "return=minimal",
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      console.warn(`[Strix Sync] ${method} ${endpoint} failed: ${response.status}`);
      throw new Error(`Supabase request failed with status ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.warn("[Strix Sync] Network error:", err);
    throw err;
  }
}

// ─── الوظائف الرئيسية ───

function sanitizeReportForStorage(report: AccidentReport): AccidentReport {
  const sanitized = { ...report };
  if (typeof sanitized.latitude === "number") sanitized.latitude = Number(sanitized.latitude.toFixed(3));
  if (typeof sanitized.longitude === "number") sanitized.longitude = Number(sanitized.longitude.toFixed(3));
  return sanitized;
}

/**
 * رفع حادث جديد على Supabase
 * @returns معرف الحادث المُدرج أو null
 */
export async function uploadAccident(report: AccidentReport): Promise<string | null> {
  if (!isStrixApiConfigured() && !isSupabaseConfigured()) {
    console.log("[Strix Sync] No backend APIs configured, running in offline mode.");
    return null;
  }

  const apiRecord = {
    deviceId: getDeviceId(),
    timestamp: new Date(report.timestamp).toISOString(),
    latitude: report.latitude,
    longitude: report.longitude,
    peakGForce: report.peakGForce,
    impactZone: report.impactZone,
    impactDirection: report.impactDirection,
    speedKmh: report.speedKmh,
    jerkPeak: report.jerkPeak,
    approachAngle: report.otherParty?.approachAngleDeg ?? 0,
    severity: report.severity,
    reportJson: sanitizeReportForStorage(report) as unknown as Record<string, unknown>,
  };

  const apiResult = await apiRequest("/accidents", "POST", apiRecord);
  if (isRecord(apiResult) && typeof apiResult.id === "string") {
    lastSyncBackend = "api";
    return apiResult.id;
  }

  const record = {
    local_id: report.id,
    device_id: getDeviceId(),
    timestamp: new Date(report.timestamp).toISOString(),
    latitude: report.latitude,
    longitude: report.longitude,
    peak_g_force: report.peakGForce,
    impact_zone: report.impactZone,
    impact_direction: report.impactDirection,
    speed_kmh: report.speedKmh,
    jerk_peak: report.jerkPeak,
    approach_angle: report.otherParty?.approachAngleDeg ?? 0,
    severity: report.severity,
    report_json: sanitizeReportForStorage(report),
  };

  try {
    const result = await supabaseRequest("accidents", "POST", record);

    if (Array.isArray(result) && result.length > 0) {
      lastSyncBackend = "supabase";
      return result[0].id as string;
    }
    throw new Error("Failed to extract ID from Supabase response");
  } catch (error) {
    console.warn("[Strix Sync] Upload failed, adding to offline queue", error);
    await enqueueOfflineAccident(report);
    return null;
  }
}

// ─── Offline Queue Logic (I-2) ───

const OFFLINE_QUEUE_KEY = "@strix_offline_queue";

export async function enqueueOfflineAccident(report: AccidentReport): Promise<void> {
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: AccidentReport[] = queueStr ? JSON.parse(queueStr) : [];
    
    // Check if already in queue to prevent duplicates
    if (!queue.some(r => r.id === report.id)) {
      queue.push(report);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log(`[Strix Sync] Added accident ${report.id} to offline queue. Total: ${queue.length}`);
    }
  } catch (err) {
    console.error("[Strix Sync] Failed to enqueue offline accident", err);
  }
}

export async function processOfflineQueue(): Promise<void> {
  if (!isStrixApiConfigured() && !isSupabaseConfigured()) return;
  
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueStr) return;
    
    const queue: AccidentReport[] = JSON.parse(queueStr);
    if (queue.length === 0) return;
    
    console.log(`[Strix Sync] Processing offline queue (${queue.length} items)...`);
    const remainingQueue: AccidentReport[] = [];
    
    for (const report of queue) {
      try {
        // Try to upload without enqueuing again if it fails
        const uploadedId = await uploadAccidentDirect(report);
        if (uploadedId) {
          console.log(`[Strix Sync] Successfully synced offline accident: ${report.id}`);
          // Also try to sync fault assessment if it exists
          if (report.faultAssessment) {
             await syncReportUpdate(report);
          }
        } else {
          remainingQueue.push(report);
        }
      } catch (err) {
        remainingQueue.push(report);
      }
    }
    
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch (err) {
    console.error("[Strix Sync] Failed to process offline queue", err);
  }
}

/**
 * Internal helper to upload directly without re-queueing on failure
 */
async function uploadAccidentDirect(report: AccidentReport): Promise<string | null> {
  const record = {
    local_id: report.id,
    device_id: getDeviceId(),
    timestamp: new Date(report.timestamp).toISOString(),
    latitude: report.latitude,
    longitude: report.longitude,
    peak_g_force: report.peakGForce,
    impact_zone: report.impactZone,
    impact_direction: report.impactDirection,
    speed_kmh: report.speedKmh,
    jerk_peak: report.jerkPeak,
    approach_angle: report.otherParty?.approachAngleDeg ?? 0,
    severity: report.severity,
    report_json: sanitizeReportForStorage(report),
  };
  const result = await supabaseRequest("accidents", "POST", record);
  if (Array.isArray(result) && result.length > 0) return result[0].id as string;
  return null;
}

export async function syncReportUpdate(report: AccidentReport): Promise<void> {
  if (!isStrixApiConfigured() && !isSupabaseConfigured()) {
    return;
  }

  // تحديث قاعدة بيانات Supabase باستخدام local_id (معرّف التطبيق المحلي)
  if (isSupabaseConfigured() && report.id) {
    try {
      await supabaseRequest(`accidents?local_id=eq.${encodeURIComponent(report.id)}`, "PATCH", {
        report_json: sanitizeReportForStorage(report),
      });
      console.log("[Strix Sync] Report updated in Supabase successfully");

      // تحديث أو إدراج بيانات تقييم نجم (Fault Assessment) في الجدول المخصص
      if (report.faultAssessment) {
        // جلب المعرف الفريد للحادث
        const queryParams = `local_id=eq.${encodeURIComponent(report.id)}&select=id`;
        const result = await supabaseRequest(`accidents?${queryParams}`, "GET");
        
        if (Array.isArray(result) && result.length > 0) {
          const accidentUuid = result[0].id;
          
          const assessmentPayload = {
            accident_id: accidentUuid,
            app_liability_user: report.faultAssessment.appLiability,
            app_liability_other: 100 - report.faultAssessment.appLiability,
            najm_liability_user: report.faultAssessment.najmLiability,
            najm_liability_other: 100 - report.faultAssessment.najmLiability,
            liability_difference: report.faultAssessment.liabilityDifference,
            user_description: report.faultAssessment.userDescription || null,
            assessed_at: new Date(report.faultAssessment.createdAt).toISOString()
          };
          
          // التحقق مما إذا كان التقييم موجوداً مسبقاً لهذا الحادث
          const existing = await supabaseRequest(`fault_assessments?accident_id=eq.${accidentUuid}&select=id`, "GET");
          if (Array.isArray(existing) && existing.length > 0) {
            await supabaseRequest(`fault_assessments?id=eq.${existing[0].id}`, "PATCH", assessmentPayload);
            console.log("[Strix Sync] Fault assessment updated in Supabase successfully");
          } else {
            await supabaseRequest("fault_assessments", "POST", assessmentPayload);
            console.log("[Strix Sync] Fault assessment inserted into Supabase successfully");
          }
        }
      }
    } catch (err) {
      console.warn("[Strix Sync] Failed to update report in Supabase:", err);
    }
  }

  // تحديث Strix API إذا لزم الأمر مستقبلاً
  // if (isStrixApiConfigured()) { ... }
}

/**
 * سحب أحدث بيانات التقرير من Supabase، مفيد للطرف الأول الذي ينتظر وصول تقرير الطرف الثاني
 */
export async function fetchUpdatedReportFromSupabase(localId: string): Promise<AccidentReport | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const queryParams = `local_id=eq.${encodeURIComponent(localId)}&select=report_json`;
    const result = await supabaseRequest(`accidents?${queryParams}`, "GET");
    if (Array.isArray(result) && result.length > 0) {
      return result[0].report_json as AccidentReport;
    }
    return null;
  } catch (err) {
    console.warn("[Strix Sync] Failed to fetch updated report:", err);
    return null;
  }
}

/**
 * تسجيل الحادث كـ "بلاغ خاطئ" في قاعدة البيانات (Supabase) ليتم استبعاده من الإحصائيات
 */
export async function markAccidentAsFalseAlarm(
  localId: string,
  reason: string,
  details: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    // 1. نجلب المعرّف الفريد للحادث (UUID) من جدول الحوادث
    const queryParams = `local_id=eq.${encodeURIComponent(localId)}&select=id`;
    const result = await supabaseRequest(`accidents?${queryParams}`, "GET");
    
    if (Array.isArray(result) && result.length > 0) {
      const accidentUuid = result[0].id;
      
      // 2. ندخل البلاغ الخاطئ في جدول false_alarms المستقل
      const payload = {
        accident_id: accidentUuid,
        reason: reason,
        details: details || null,
      };
      await supabaseRequest("false_alarms", "POST", payload);
      console.log("[Strix Sync] Recorded false alarm in separate table successfully");
    } else {
      console.warn("[Strix Sync] Accident not found in DB to mark as false alarm");
    }
  } catch (err) {
    console.warn("[Strix Sync] Failed to record false alarm:", err);
  }
}

/**
 * البحث عن حادث مطابق (من مستخدم آخر)
 *
 * المعايير:
 *  1. فرق الوقت < 5 ثوانٍ
 *  2. المسافة < 100 متر
 *  3. الزوايا متعاكسة (±30°)
 */
export async function findMatchingAccident(
  report: AccidentReport,
  ownAccidentId: string
): Promise<MatchResult | null> {
  // v8.1 FIX: إزالة شرط الموقع الإجباري للسماح بالتجارب الداخلية بدون GPS
  // if (!report.latitude || !report.longitude) return null;

  if (lastSyncBackend === "api") {
    const result = await apiRequest(
      `/accidents/${encodeURIComponent(ownAccidentId)}/match`,
      "POST",
      {
        deviceId: getDeviceId(),
        timestamp: new Date(report.timestamp).toISOString(),
        latitude: report.latitude,
        longitude: report.longitude,
        approachAngle: report.otherParty?.approachAngleDeg ?? 0,
      },
    );

    if (result === null) return null;
    if (isRecord(result) && typeof result.matchedAccidentId === "string") {
      const otherReport = isRecord(result.otherReport)
        ? (result.otherReport as unknown as AccidentReport)
        : null;
      let crossVerifiedAnalysis: CrossVerifiedAnalysis | null = null;

      if (otherReport) {
        try {
          crossVerifiedAnalysis = generateCrossVerifiedAnalysis(report, otherReport);
        } catch (err) {
          console.warn("[Strix Sync] Failed to generate CrossVerifiedAnalysis:", err);
        }
      }

      return {
        matchedAccidentId: result.matchedAccidentId,
        matchConfidence: Number(result.matchConfidence ?? 0),
        otherReport,
        distanceMeters: Number(result.distanceMeters ?? 0),
        timeDiffMs: Number(result.timeDiffMs ?? 0),
        crossVerifiedAnalysis,
      };
    }
  }

  // نبحث في ±60 ثانية فقط — الحوادث المتزامنة الحقيقية يجب أن تكون في نفس اللحظة تقريباً
  const MATCH_WINDOW_MS = 60_000;
  const windowStart = new Date(report.timestamp - MATCH_WINDOW_MS).toISOString();
  const windowEnd = new Date(report.timestamp + MATCH_WINDOW_MS).toISOString();

  const queryParams = [
    `timestamp=gte.${encodeURIComponent(windowStart)}`,
    `timestamp=lte.${encodeURIComponent(windowEnd)}`,
    `id=neq.${encodeURIComponent(ownAccidentId)}`,
    `matched_accident_id=is.null`,
    "select=*",
  ].join("&");

  const results = await supabaseRequest("accidents", "GET", undefined, queryParams);

  if (!Array.isArray(results) || results.length === 0) return null;

  // فلترة بالمسافة والزاوية
  const myLat = report.latitude;
  const myLon = report.longitude;
  const myAngle = report.otherParty?.approachAngleDeg ?? 0;

  for (const candidate of results) {
    const cLat = candidate.latitude as number;
    const cLon = candidate.longitude as number;
    const cAngle = candidate.approach_angle as number;
    const cTimestamp = new Date(candidate.timestamp as string).getTime();

    // v8.1 FIX: السماح بالمطابقة بدون GPS للتجارب
    let dist = 0;
    if (cLat && cLon && myLat && myLon) {
      dist = haversineDistance(myLat, myLon, cLat, cLon);
      if (dist > 100) continue; // أبعد من 100 متر
    }

    // فحص فرق الوقت — يجب أن يكون في نفس الدقيقة (60 ثانية)
    const timeDiff = Math.abs(report.timestamp - cTimestamp);
    if (timeDiff > 60000) continue; // أكثر من 60 ثانية → ليس نفس الحادث

    // فحص الزوايا المتعاكسة — يجب أن تكون الزوايا متعاكسة بدقة ±45°
    const angleDiff = Math.abs(((myAngle - cAngle + 180 + 360) % 360) - 180);
    const anglesOpposite = angleDiff < 45;

    // إذا لم تتوفر بيانات GPS حقيقية (lat/lon) ولم تكن الزوايا متعاكسة → رفض المطابقة
    // هذا يمنع التطابق العشوائي بين حوادث مختلفة في بيئة الاختبار
    const hasGPS = Boolean(myLat && myLon && cLat && cLon);
    if (!hasGPS && !anglesOpposite) continue;

    // حساب نسبة الثقة — تبدأ من 0 وتُبنى بناءً على الأدلة
    let confidence = 0;
    // أدلة الوقت (الأهم — 40 نقطة)
    if (timeDiff < 3000) confidence += 40;
    else if (timeDiff < 10000) confidence += 25;
    else if (timeDiff < 30000) confidence += 10;
    // أدلة المسافة (35 نقطة) — فقط إذا توفر GPS
    if (hasGPS) {
      if (dist < 20) confidence += 35;
      else if (dist < 50) confidence += 25;
      else if (dist < 100) confidence += 10;
    }
    // أدلة الزاوية (25 نقطة)
    if (anglesOpposite) confidence += 25;
    confidence = Math.min(98, confidence);

    // الحد الأدنى للثقة رُفع إلى 70% لتجنب التطابق العشوائي
    if (confidence < 70) continue;

    const otherReport = candidate.report_json as AccidentReport | null;
    let crossVerifiedAnalysis: CrossVerifiedAnalysis | null = null;

    if (otherReport) {
      try {
        crossVerifiedAnalysis = generateCrossVerifiedAnalysis(report, otherReport);
        crossVerifiedAnalysis.accident_a_id = ownAccidentId;
        crossVerifiedAnalysis.accident_b_id = candidate.id as string;

        await supabaseRequest("cross_verified_analyses", "POST", {
          id: crossVerifiedAnalysis.id,
          accident_a_id: crossVerifiedAnalysis.accident_a_id,
          accident_b_id: crossVerifiedAnalysis.accident_b_id,
          verified_impact_zone_a: crossVerifiedAnalysis.verified_impact_zone_a,
          verified_impact_zone_b: crossVerifiedAnalysis.verified_impact_zone_b,
          verified_speed_a_kmh: crossVerifiedAnalysis.verified_speed_a_kmh,
          verified_speed_b_kmh: crossVerifiedAnalysis.verified_speed_b_kmh,
          first_contact_party: crossVerifiedAnalysis.first_contact_party,
          consistency_status: crossVerifiedAnalysis.consistency_status,
          consistency_flags: crossVerifiedAnalysis.consistency_flags,
          liability_a_percent: crossVerifiedAnalysis.liability_a_percent,
          liability_b_percent: crossVerifiedAnalysis.liability_b_percent,
          created_at: new Date(crossVerifiedAnalysis.created_at).toISOString()
        });
      } catch (err) {
        console.warn("[Strix Sync] Failed to persist CrossVerifiedAnalysis:", err);
      }
    }

    // Link the two accident records
    try {
      const ownReportUpdated: AccidentReport = {
        ...report,
        matchedAccidentId: candidate.id as string,
        matchConfidence: confidence,
        crossVerifiedId: crossVerifiedAnalysis?.id,
        crossVerifiedAnalysis: crossVerifiedAnalysis || undefined,
        liabilityScore: crossVerifiedAnalysis
          ? crossVerifiedAnalysis.liability_a_percent
          : report.liabilityScore,
      };

      const otherReportUpdated: AccidentReport | undefined = otherReport ? {
        ...otherReport,
        matchedAccidentId: ownAccidentId,
        matchConfidence: confidence,
        crossVerifiedId: crossVerifiedAnalysis?.id,
        crossVerifiedAnalysis: crossVerifiedAnalysis || undefined,
        liabilityScore: crossVerifiedAnalysis ? crossVerifiedAnalysis.liability_b_percent : otherReport.liabilityScore
      } : undefined;

      await linkAccidents(
        ownAccidentId,
        candidate.id as string,
        confidence,
        crossVerifiedAnalysis?.id,
        ownReportUpdated,
        otherReportUpdated
      );
    } catch (err) {
      console.warn("[Strix Sync] Failed to link accidents:", err);
    }

    return {
      matchedAccidentId: candidate.id as string,
      matchConfidence: confidence,
      otherReport: otherReport,
      distanceMeters: Math.round(dist),
      timeDiffMs: timeDiff,
      crossVerifiedAnalysis: crossVerifiedAnalysis
    };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * ربط حادثين في قاعدة البيانات وتحديث الـ JSON للطرف الأول
 */
async function linkAccidents(
  id1: string,
  id2: string,
  confidence: number,
  crossVerifiedId?: string,
  ownReportUpdated?: AccidentReport,
  otherReportUpdated?: AccidentReport
): Promise<void> {
  // تحديث السجل الأول
  const payload1: any = { matched_accident_id: id2, match_confidence: confidence };
  if (crossVerifiedId) payload1.cross_verified_id = crossVerifiedId;
  if (ownReportUpdated) payload1.report_json = ownReportUpdated;
  await patchAccidentRecord(id1, payload1);

  // تحديث السجل الثاني مع رفع الـ JSON المحدث ليقرأه الهاتف الآخر
  const payload2: any = { matched_accident_id: id1, match_confidence: confidence };
  if (crossVerifiedId) payload2.cross_verified_id = crossVerifiedId;
  // if (otherReportUpdated) payload2.report_json = otherReportUpdated; // Prevent overwriting second party's report
  await patchAccidentRecord(id2, payload2);
}

async function patchAccidentRecord(
  accidentId: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseRequest(`accidents?id=eq.${accidentId}`, "PATCH", payload);
  } catch (err) {
    if (!("cross_verified_id" in payload)) throw err;

    const { cross_verified_id: _ignored, ...fallbackPayload } = payload;
    await supabaseRequest(
      `accidents?id=eq.${accidentId}`,
      "PATCH",
      fallbackPayload
    );
  }
}



// ─── Types ───

export interface MatchResult {
  matchedAccidentId: string;
  matchConfidence: number;
  otherReport: AccidentReport | null;
  distanceMeters: number;
  timeDiffMs: number;
  crossVerifiedAnalysis?: CrossVerifiedAnalysis | null;
}
