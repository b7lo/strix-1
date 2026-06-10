import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Platform, Alert, Linking } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Haptics from "expo-haptics";
import { useReports } from "@/context/ReportsContext";
import type { AccidentReport, ImpactZone } from "@/lib/types";
import { zoneToDirection } from "@/lib/types";
import { calculateLiability } from "@/lib/liabilityEngine";
import {
  applyHighPassFilter,
  resetFilter,
  calculateGForce,
  findPeakZone,
  resetGyroPeaks,
  recordSample,
  getJerkPeak,
  getBaselineG,
  setSampleRate,
  recordGyroscopeSample,
  getGyroscopeSnapshot,
  validateCrashWithGyro,
  analyzeBraking,
  recordImpact,
  updateCurrentSpeed,
  getImpulseDurationMs,
  getAdjustedThreshold,
  getRingBuffer,
  getGyroHistory,
  getPreCrashBuffer,
  getPostCrashBuffer,
  getPostCrashGyro,
} from "@/lib/sensorUtils";
import { analyzeOtherParty } from "@/lib/otherPartyAnalysis";
import { runAdvancedAnalysis } from "@/lib/advancedAnalysis";
import { generateCroquis } from "@/lib/croquisGenerator";
import { uploadAccident, findMatchingAccident, initDeviceId } from "@/lib/accidentSync";
import { getSettings } from "@/lib/storage";
import { BACKGROUND_LOCATION_TASK } from "@/lib/backgroundTasks";

let Accelerometer: any = null;
let Gyroscope: any = null;

if (Platform.OS !== "web") {
  try {
    const sensors = require("expo-sensors");
    Accelerometer = sensors.Accelerometer;
    Gyroscope = sensors.Gyroscope;
  } catch {}
}

export interface SessionContextValue {
  isActive: boolean;
  currentGForce: number;
  peakGForce: number;
  currentSpeedKmh: number;
  sessionDurationSec: number;
  crashDetected: boolean;
  latestReport: AccidentReport | null;
  isAnalyzing: boolean;
  startSession: () => Promise<void>;
  stopSession: () => void;
  resetCrash: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { updateReport } = useReports();
  const [isActive, setIsActive] = useState(false);
  const [currentGForce, setCurrentGForce] = useState(0);
  const [peakGForce, setPeakGForce] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [sessionDurationSec, setSessionDurationSec] = useState(0);
  const [crashDetected, setCrashDetected] = useState(false);
  const [latestReport, setLatestReport] = useState<AccidentReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const accelSub = useRef<{ remove: () => void } | null>(null);
  const gyroSub = useRef<{ remove: () => void } | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peakRef = useRef(0);
  const peakFilteredRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const locationRef = useRef<{ lat: number; lon: number; speed: number } | null>(null);
  const speedHistoryRef = useRef<number[]>([]);
  const cooldown = useRef(false);
  const thresholdRef = useRef(2.0);
  const durationRef = useRef(0);

  const lastUIUpdateRef = useRef(0);
  const UI_THROTTLE_MS = 100;

  const gyroEnabledRef = useRef(true);
  const gyroThresholdRef = useRef(80);

  const stopSession = useCallback(async () => {
    accelSub.current?.remove();
    accelSub.current = null;
    gyroSub.current?.remove();
    gyroSub.current = null;
    locationSub.current?.remove?.();
    locationSub.current = null;

    // Stop background location task to save battery
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (err) {
      console.warn("[Strix] Failed to stop background location:", err);
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsActive(false);
    setCurrentGForce(0);
    setCurrentSpeedKmh(0);
    setSessionDurationSec(0);
    durationRef.current = 0;
  }, []);

  const analyzeImpact = useCallback(async () => {
    if (cooldown.current) return;

    const speed = locationRef.current?.speed ?? 0;

    // v6: استخدام الحد المُعدّل حسب نوع الطريق
    const adjustedThreshold = getAdjustedThreshold(thresholdRef.current);

    cooldown.current = true;
    setIsAnalyzing(true);

    const crashTimestamp = Date.now();

    // ─── 1. التقاط بيانات لحظة الصدمة (الـ Peak والمنطقة) ───
    const peak = findPeakZone();
    const zone = peak.zone as ImpactZone;
    const gForce = peak.peakG;

    if (gyroEnabledRef.current) {
      const validation = validateCrashWithGyro(
        gForce, 
        speed, 
        gyroThresholdRef.current, 
        thresholdRef.current
      );
      if (!validation.isValid) {
        cooldown.current = false;
        setIsAnalyzing(false);
        return;
      }
    }

    setCrashDetected(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // ─── 2. تجميد بيانات ما قبل وأثناء الصدمة ───
    const history = speedHistoryRef.current;
    const preCrashSpeed = history.length >= 2 ? history[Math.max(0, history.length - 2)] : speed;
    const jerk = getJerkPeak();
    const gyro = getGyroscopeSnapshot();
    const braking = analyzeBraking(speed);
    const impactCount = recordImpact();
    const baselineG = getBaselineG();
    const direction = zoneToDirection(zone);
    const preCrashBufferCaptured = getPreCrashBuffer(5);

    // ─── 3. نافذة تحليل ما بعد الصدمة (2500ms) ───
    // ننتظر الآن لجمع بيانات الانحراف والاستقرار والصدمات الثانوية
    await new Promise(resolve => setTimeout(resolve, 2500));

    // ═══════════════════════════════════════
    // v6: تحليل الطرف الآخر
    // ═══════════════════════════════════════
    const otherParty = analyzeOtherParty({
      peakGForce: gForce,
      jerkPeak: jerk,
      impactZone: zone,
      speedKmh: speed,
      impulseDurationMs: getImpulseDurationMs(),
      peakFiltered: peak.peakFiltered,
      gyroscope: gyro,
      braking,
      ringBuffer: getRingBuffer(),
    });

    // ═══════════════════════════════════════
    // v7: التحليل المتقدم (المبادئ الخمسة)
    // ═══════════════════════════════════════
    const advancedAnalysis = runAdvancedAnalysis({
      peakFiltered: peak.peakFiltered,
      peakGForce: gForce,
      speedKmh: speed,
      direction,
      braking,
      gyroscope: gyro,
      gyroHistory: getGyroHistory(),
      preCrashBuffer: preCrashBufferCaptured,
      postCrashBuffer: getPostCrashBuffer(crashTimestamp, 2500),
      postCrashGyro: getPostCrashGyro(crashTimestamp, 2500),
      crashTimestamp, // v7.1 FIX: تمرير اللحظة الفعلية لتجنب إزاحة 250ms
    });

    const liability = calculateLiability(
      direction, gForce, speed, jerk, braking, gyro, impactCount, baselineG, zone,
      advancedAnalysis
    );

    // ═══════════════════════════════════════
    // v6: بناء التقرير مع بيانات الطرف الآخر
    // ═══════════════════════════════════════
    const report: AccidentReport = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      peakGForce: Math.round(gForce * 100) / 100,
      jerkPeak: Math.round(jerk * 10) / 10,
      impactZone: zone,
      impactDirection: direction,
      speedKmh: Math.round(speed),
      preCrashSpeedKmh: Math.round(preCrashSpeed),
      speedHistory: [...history],
      latitude: locationRef.current?.lat ?? null,
      longitude: locationRef.current?.lon ?? null,
      severity: liability.severity,
      liabilityScore: liability.userFaultPercent,
      confidence: liability.confidence,
      scenarioCode: liability.scenarioCode,
      scenarioAr: liability.scenarioAr,
      descriptionAr: liability.descriptionAr,
      factorsAr: liability.factorsAr,
      feedback: null,
      gyroscope: gyro,
      braking,
      confidenceDetails: liability.confidenceDetails,
      impactCount,
      baselineG: Math.round(baselineG * 1000) / 1000,
      sessionDurationAtCrash: durationRef.current,
      // v6: بيانات جديدة
      otherParty,
      croquis: null, // سيُولّد بعد تعيين التقرير
      matchedAccidentId: null,
      matchConfidence: null,
      // v7: التحليل المتقدم
      advancedAnalysis,
    };

    // ═══════════════════════════════════════
    // v6: توليد الكروكي
    // ═══════════════════════════════════════
    const croquis = generateCroquis(report, otherParty);
    report.croquis = croquis;

    setLatestReport(report);
    setIsAnalyzing(false);
    resetGyroPeaks();

    // ═══════════════════════════════════════
    // v6: رفع على Supabase + بحث عن مطابقة (في الخلفية)
    // ═══════════════════════════════════════
    const syncAccident = async () => {
      try {
        const accidentId = await uploadAccident(report);
        if (accidentId) {
          const match = await findMatchingAccident(report, accidentId);
          if (match) {
            // تحديث التقرير ببيانات المطابقة وتقاطع البيانات
            let updatedLiability = report.liabilityScore;
            let updatedDesc = report.descriptionAr;

            if (match.crossVerifiedAnalysis) {
              updatedLiability = match.crossVerifiedAnalysis.liability_a_percent;
              updatedDesc += "\n(تم تعديل النسبة بعد مقاطعة البيانات مع هاتف الطرف الآخر وتطبيق قواعد المرور)";
            }

            const updatedReport = {
              ...report,
              liabilityScore: updatedLiability,
              descriptionAr: updatedDesc,
              matchedAccidentId: match.matchedAccidentId,
              matchConfidence: match.matchConfidence,
              crossVerifiedId: match.crossVerifiedAnalysis?.id,
              crossVerifiedAnalysis: match.crossVerifiedAnalysis ?? null,
            };
            setLatestReport(updatedReport);
            await updateReport(updatedReport);
          }
        }
      } catch (err) {
        console.warn("[Strix] Sync error (Ignored for demo/offline):", err);
        // Alert.alert(
        //   "خطأ في المزامنة",
        //   "تعذر رفع تقرير الحادث للخادم. هل ترغب في إعادة المحاولة؟",
        //   [
        //     { text: "حفظ محلياً", style: "cancel" },
        //     { text: "إعادة المحاولة", onPress: () => syncAccident() }
        //   ]
        // );
      }
    };
    syncAccident();

    const cooldownMs = impactCount > 1 ? 3000 : 8000;
    setTimeout(() => { cooldown.current = false; }, cooldownMs);

    return report;
  }, [updateReport]);

  const startLocationTracking = useCallback(async () => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) return;

    // ─── 1. صلاحية الموقع أثناء الاستخدام ───
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") return;

    // ─── 2. صلاحية الموقع في الخلفية (غير مدعومة في Expo Go) ───
    let bgStatus = "denied";
    try {
      const bgResult = await Location.requestBackgroundPermissionsAsync();
      bgStatus = bgResult.status;
    } catch (err) {
      console.warn("[Strix] Background location not available (Expo Go?) – foreground only mode");
    }
    if (bgStatus !== "granted") {
      console.warn("[Strix] Background location permission not granted – foreground only mode");
    }

    // ─── 3. تتبع الموقع في المقدمة (لتحديث الـ UI) ───
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 2 },
      (loc) => {
        const safeSpeed = Math.max(0, loc.coords.speed ?? 0) * 3.6;
        locationRef.current = { lat: loc.coords.latitude, lon: loc.coords.longitude, speed: safeSpeed };
        setCurrentSpeedKmh(Math.round(safeSpeed));
        speedHistoryRef.current.push(safeSpeed);
        if (speedHistoryRef.current.length > 12) speedHistoryRef.current.shift();
        updateCurrentSpeed(safeSpeed);
      }
    );

    // ─── 4. تتبع الموقع في الخلفية (يبقي التطبيق حياً) ───
    if (bgStatus === "granted") {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (!isRegistered) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 5,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "ستركس يراقب القيادة",
              notificationBody: "مراقبة الحوادث نشطة في الخلفية",
              notificationColor: "#3FB950",
            },
          });
        }
      } catch (err) {
        console.warn("[Strix] Failed to start background location:", err);
      }
    }
  }, []);

  const startSession = useCallback(async () => {
    if (!Accelerometer) return;
    try {
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("غير متوفر", "مستشعر الحركة (التسارع) غير مدعوم في هذا الجهاز.");
        return;
      }
    } catch (err) {
      console.warn("Failed to check accelerometer availability:", err);
    }

    const settings = await getSettings();
    thresholdRef.current = settings.crashThresholdG;
    gyroEnabledRef.current = settings.gyroscopeEnabled;
    gyroThresholdRef.current = settings.gyroscopeThreshold;
    
    const intervalMs = Math.round(1000 / settings.sampleRateHz);
    setSampleRate(settings.sampleRateHz);

    // بدء تتبع الموقع والسرعة
    await startLocationTracking();
    await initDeviceId();
    resetFilter();
    peakRef.current = 0;
    peakFilteredRef.current = { x: 0, y: 0, z: 0 };
    speedHistoryRef.current = [];
    durationRef.current = 0;
    lastUIUpdateRef.current = 0;
    setPeakGForce(0);
    setCurrentGForce(0);
    setCurrentSpeedKmh(0);
    setSessionDurationSec(0);
    setCrashDetected(false);
    setLatestReport(null);
    cooldown.current = false;

    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setSessionDurationSec(durationRef.current);
    }, 1000);

    Accelerometer.setUpdateInterval(intervalMs);
    accelSub.current = Accelerometer.addListener((raw: { x: number; y: number; z: number }) => {
      const filtered = applyHighPassFilter(raw);
      const gForce = calculateGForce(filtered.x, filtered.y, filtered.z);
      recordSample(gForce, filtered, raw);
      const now = Date.now();
      if (now - lastUIUpdateRef.current >= UI_THROTTLE_MS) {
        lastUIUpdateRef.current = now;
        setCurrentGForce(gForce);
      }
      if (gForce > peakRef.current) {
        peakRef.current = gForce;
        peakFilteredRef.current = filtered;
        setPeakGForce(gForce);
      }
      const adaptiveThreshold = getAdjustedThreshold(thresholdRef.current);
      if (gForce >= adaptiveThreshold && !cooldown.current) {
        analyzeImpact();
      }
    });

    if (settings.gyroscopeEnabled && Gyroscope) {
      Gyroscope.setUpdateInterval(intervalMs);
      gyroSub.current = Gyroscope.addListener((data: { x: number; y: number; z: number }) => {
        recordGyroscopeSample(data);
      });
    }

    setIsActive(true);
  }, [analyzeImpact, startLocationTracking]);

  const resetCrash = useCallback(() => {
    setCrashDetected(false);
    setLatestReport(null);
    peakRef.current = 0;
    setPeakGForce(0);
  }, []);

  return (
    <SessionContext.Provider value={{ isActive, currentGForce, peakGForce, currentSpeedKmh, sessionDurationSec, crashDetected, latestReport, isAnalyzing, startSession, stopSession, resetCrash }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
