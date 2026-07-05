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
  detectImpactZone,
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
  isEngineReady,
  isDirectionCalibrated,
  registerThresholdCrossing,
  isInstantStrongCrash,
  resetCrashStreak,
  getLeveledFrame,
  getLatestGyroYawRateDegS,
  setPhoneYawOffset,
  getGravityVector,
  getRoadType,
  getSampleRate,
} from "@/lib/sensorUtils";
import { VehicleFrameEstimator, tiltCompensatedHeadingRad } from "@/lib/vehicleFrameEstimator";
import { assessDataQuality } from "@/lib/dataQuality";
import { THRESHOLDS } from "@/lib/thresholds";
import { analyzeOtherParty } from "@/lib/otherPartyAnalysis";
import { runAdvancedAnalysis } from "@/lib/advancedAnalysis";
import { generateCroquis } from "@/lib/croquisGenerator";
import { uploadAccident, findMatchingAccident, initDeviceId } from "@/lib/accidentSync";
import { getSettings } from "@/lib/storage";
import { BACKGROUND_LOCATION_TASK } from "@/lib/backgroundTasks";
import i18n from "@/lib/i18n";

let Accelerometer: any = null;
let Gyroscope: any = null;
let Magnetometer: any = null;

if (Platform.OS !== "web") {
  try {
    const sensors = require("expo-sensors");
    Accelerometer = sensors.Accelerometer;
    Gyroscope = sensors.Gyroscope;
    Magnetometer = sensors.Magnetometer;
  } catch {}
}

export interface SessionContextValue {
  isActive: boolean;
  currentGForce: number;
  peakGForce: number;
  currentSpeedKmh: number;
  sessionDurationSec: number;
  crashDetected: boolean;
  /** أثناء الجلسة قبل جاهزية المحرك (تقارب الجاذبية + استقرار الـ baseline) */
  isCalibrating: boolean;
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
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [latestReport, setLatestReport] = useState<AccidentReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const accelSub = useRef<{ remove: () => void } | null>(null);
  const gyroSub = useRef<{ remove: () => void } | null>(null);
  const magSub = useRef<{ remove: () => void } | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  // A-3 (دمج الحساسات): مُقدِّر اتجاه السيارة + آخر قراءة مغناطيسية
  const vehicleEstimator = useRef(new VehicleFrameEstimator());
  const magRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peakRef = useRef(0);
  const peakFilteredRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  // قمة خاصة بالصدمة (impact-scoped): تُحدَّث فقط أثناء تجاوز العتبة، وتُستخدم
  // في التقرير بدل نافذة findPeakZone التي قد تنزاح عن لحظة الصدمة فتقرأ قوة منخفضة.
  const impactPeakRef = useRef(0);
  const impactPeakFilteredRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
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
    magSub.current?.remove();
    magSub.current = null;
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
    setIsCalibrating(false);
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
    resetCrashStreak(); // A-2: ابدأ عدّ التأكيد من جديد لكل حادث

    const crashTimestamp = Date.now();

    // ─── 1. التقاط بيانات لحظة الصدمة (الـ Peak والمنطقة) ───
    // نستخدم القمة المُلتقطة لحظيًا أثناء تجاوز العتبة (impact-scoped) إن كانت أعلى
    // من قمة نافذة findPeakZone. هذا يمنع قراءة قوة منخفضة (مثل 0.1g) واتجاه
    // "غير محدد" عندما تنزاح النافذة الزمنية القصيرة عن لحظة الصدمة الحقيقية.
    const windowPeak = findPeakZone();
    const useImpactPeak = impactPeakRef.current > windowPeak.peakG;
    const gForce = useImpactPeak ? impactPeakRef.current : windowPeak.peakG;
    const peakFiltered = useImpactPeak ? impactPeakFilteredRef.current : windowPeak.peakFiltered;
    const zone = (useImpactPeak ? detectImpactZone(peakFiltered) : windowPeak.zone) as ImpactZone;
    // أفرغ القمة الخاصة بالصدمة بعد التقاطها (الصدمة التالية تبدأ من جديد)
    impactPeakRef.current = 0;
    impactPeakFilteredRef.current = { x: 0, y: 0, z: 0 };

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
      peakFiltered: peakFiltered,
      gyroscope: gyro,
      braking,
      ringBuffer: getRingBuffer(),
    });

    // ═══════════════════════════════════════
    // v7: التحليل المتقدم (المبادئ الخمسة)
    // ═══════════════════════════════════════
    const advancedAnalysis = runAdvancedAnalysis({
      peakFiltered: peakFiltered,
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
      advancedAnalysis, isDirectionCalibrated()
    );

    // ═══════════════════════════════════════
    // طبقة جودة البيانات (مستقلة عن المسؤولية) + ثقة معايرة الاتجاه (A-3)
    // ═══════════════════════════════════════
    const vfEstimate = vehicleEstimator.current.getEstimate();
    const dataQuality = assessDataQuality({
      engineReady: isEngineReady(),
      sampleRateHz: getSampleRate(),
      gyroscopeEnabled: gyroEnabledRef.current,
      hasGps: locationRef.current !== null,
      directionCalibrated: isDirectionCalibrated(),
      directionConfidence: vfEstimate.confidence,
      roadType: getRoadType(),
      peakGForce: gForce,
    });

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
      // A-6: شفافية المسؤولية
      liabilityRaw: liability.rawFaultPercent,
      liabilityConclusive: liability.isConclusive,
      liabilityRange: liability.faultRange,
      directionCalibrated: isDirectionCalibrated(),
      // طبقة جودة البيانات + ثقة دمج الحساسات (A-3)
      dataQualityScore: dataQuality.score,
      dataQualityLevel: dataQuality.level,
      dataQualityLimitations: dataQuality.limitations,
      directionCalibrationConfidence: vfEstimate.confidence,
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
              updatedDesc += i18n.t("sysNotes.crossAdjusted");
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

        // ─── A-3 (دمج الحساسات): تغذية مُقدِّر اتجاه السيارة ───
        // GPS (التسارع الطولي) + المسرّع (اتجاه أفقي) + الجيروسكوب (بوّابة الانعطاف)
        const ts = Date.now();
        vehicleEstimator.current.addSpeedSample(safeSpeed, ts);
        // تأكيد ثانوي اختياري من المغناطيسية: heading من GPS + heading الجوال (tilt-compensated)
        const heading = loc.coords.heading;
        const mag = magRef.current;
        if (mag && typeof heading === "number" && heading >= 0 && safeSpeed >= THRESHOLDS.VF_MIN_SPEED_KMH) {
          const phoneHeading = tiltCompensatedHeadingRad(mag, getGravityVector());
          vehicleEstimator.current.addMagneticObservation(phoneHeading, (heading * Math.PI) / 180);
        }
        // عند بلوغ ثقة كافية، عاير اتجاه الجوال نسبةً للسيارة (يرفع مصداقية الاتجاه)
        const est = vehicleEstimator.current.getEstimate();
        if (est.calibrated) setPhoneYawOffset(est.yawOffsetRad);
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
              notificationTitle: i18n.t("notifications.monitoringTitle"),
              notificationBody: i18n.t("notifications.monitoringBody"),
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
    vehicleEstimator.current.reset();
    magRef.current = null;
    peakRef.current = 0;
    peakFilteredRef.current = { x: 0, y: 0, z: 0 };
    impactPeakRef.current = 0;
    impactPeakFilteredRef.current = { x: 0, y: 0, z: 0 };
    speedHistoryRef.current = [];
    durationRef.current = 0;
    lastUIUpdateRef.current = 0;
    setPeakGForce(0);
    setCurrentGForce(0);
    setCurrentSpeedKmh(0);
    setSessionDurationSec(0);
    setCrashDetected(false);
    setLatestReport(null);
    setIsCalibrating(true); // يبدأ في وضع المعايرة حتى يجهز المحرك
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
      // A-3 (دمج الحساسات): غذِّ مُقدِّر إطار السيارة بالتسارع الأفقي المُسوّى
      // (قبل تدوير الـ yaw) + معدل الدوران اللحظي لبوّابة رفض الانعطاف.
      const leveled = getLeveledFrame(filtered);
      vehicleEstimator.current.addAccelSample(leveled.vX, leveled.vY, now, getLatestGyroYawRateDegS());
      if (now - lastUIUpdateRef.current >= UI_THROTTLE_MS) {
        lastUIUpdateRef.current = now;
        setCurrentGForce(gForce);
        // مؤشّر المعايرة: نشط طالما المحرك لم يجهز بعد (أول ~5 ثوانٍ)
        setIsCalibrating(!isEngineReady());
      }
      if (gForce > peakRef.current) {
        peakRef.current = gForce;
        peakFilteredRef.current = filtered;
        setPeakGForce(gForce);
      }
      const adaptiveThreshold = getAdjustedThreshold(thresholdRef.current);
      const aboveThreshold = gForce >= adaptiveThreshold;
      // تتبّع القمة الخاصة بالصدمة أثناء تجاوز العتبة (تُصفَّر عند الهبوط دونها)
      if (aboveThreshold) {
        if (gForce > impactPeakRef.current) {
          impactPeakRef.current = gForce;
          impactPeakFilteredRef.current = filtered;
        }
      } else {
        impactPeakRef.current = 0;
        impactPeakFilteredRef.current = { x: 0, y: 0, z: 0 };
      }
      // A-1: لا تبدأ الكشف قبل جاهزية المحرك (تقارب الجاذبية + استقرار الـ baseline).
      // A-2: اشترط عيّنتين متتاليتين فوق العتبة (debounce) لرفض السبايك المفرد الكاذب
      //      دون تشويه قيمة القمة الحقيقية.
      // عيّنتان متتاليتان فوق العتبة (debounce) أو ضربة قوية جدًا من عيّنة واحدة
      const confirmed =
        registerThresholdCrossing(aboveThreshold) ||
        isInstantStrongCrash(gForce, adaptiveThreshold);
      if (confirmed && !cooldown.current && isEngineReady()) {
        analyzeImpact();
      }
    });

    if (settings.gyroscopeEnabled && Gyroscope) {
      Gyroscope.setUpdateInterval(intervalMs);
      gyroSub.current = Gyroscope.addListener((data: { x: number; y: number; z: number }) => {
        recordGyroscopeSample(data);
      });
    }

    // A-3 (دمج الحساسات): اشتراك المغناطيسية (اختياري) كتأكيد ثانوي للاتجاه.
    // داخل المركبة المغناطيسية عرضة للتشويه الحديدي، لذا تُستخدم لرفع الثقة عند
    // الاتفاق مع تقدير (GPS+المسرّع) فقط — لا تقود المعايرة منفردة. معدل منخفض (5Hz)
    // يكفي للاتجاه ويوفّر البطارية.
    if (Magnetometer) {
      try {
        Magnetometer.setUpdateInterval(200);
        magSub.current = Magnetometer.addListener((data: { x: number; y: number; z: number }) => {
          magRef.current = data;
        });
      } catch (err) {
        console.warn("[Strix] Magnetometer unavailable:", err);
      }
    }

    setIsActive(true);
  }, [analyzeImpact, startLocationTracking]);

  const resetCrash = useCallback(() => {
    setCrashDetected(false);
    setLatestReport(null);
    peakRef.current = 0;
    impactPeakRef.current = 0;
    impactPeakFilteredRef.current = { x: 0, y: 0, z: 0 };
    setPeakGForce(0);
  }, []);

  return (
    <SessionContext.Provider value={{ isActive, currentGForce, peakGForce, currentSpeedKmh, sessionDurationSec, crashDetected, isCalibrating, latestReport, isAnalyzing, startSession, stopSession, resetCrash }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
