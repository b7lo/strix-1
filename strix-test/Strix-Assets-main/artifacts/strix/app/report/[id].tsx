import React, { useMemo, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { AccidentDiagram } from "@/components/AccidentDiagram";
import { LiabilityMeter } from "@/components/LiabilityMeter";
import { SpeedGraph } from "@/components/SpeedGraph";
import { exportReportToPDF } from "@/lib/pdfExport";
import { fetchUpdatedReportFromSupabase, markAccidentAsFalseAlarm } from "@/lib/accidentSync";
import type { AccidentReport, Severity, ImpactZone, ImpactDirection } from "@/lib/types";
import { ZONE_LABELS_AR } from "@/lib/types";

const DIRECTION_AR: Record<ImpactDirection, string> = {
  front: "اصطدام أمامي",
  rear: "اصطدام خلفي",
  "side-left": "اصطدام جانبي أيسر",
  "side-right": "اصطدام جانبي أيمن",
  unknown: "اتجاه غير محدد",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#FF4444",
  severe: "#FF6B35",
  moderate: "#D29922",
  minor: "#3FB950",
};

const SEVERITY_AR: Record<Severity, string> = {
  critical: "حرج",
  severe: "شديد",
  moderate: "متوسط",
  minor: "خفيف",
};

function formatDateTimeAr(ts: number): string {
  return new Date(ts).toLocaleString("ar-SA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FALSE_ALARM_REASONS = [
  { key: "phone_drop", label: "سقط الهاتف" },
  { key: "speed_bump", label: "مطب أو حفرة قوية" },
  { key: "hard_brake", label: "فرملة قوية مفاجئة" },
  { key: "other", label: "أخرى" },
];

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { reports, submitFeedback, removeReport, updateReport } = useReports();

  // ─── v10: حالة نافذة البلاغ عن حادث غير صحيح ───
  const [falseAlarmModalVisible, setFalseAlarmModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [falseAlarmDetails, setFalseAlarmDetails] = useState("");
  const [isSendingFalseAlarm, setIsSendingFalseAlarm] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const report = useMemo<AccidentReport | null>(() => {
    if (params.data) {
      try {
        return JSON.parse(params.data as string) as AccidentReport;
      } catch {
        return null;
      }
    }
    return reports.find((r) => r.id === params.id) ?? null;
  }, [params.id, params.data, reports]);

  const liveReport = reports.find((r) => r.id === report?.id) ?? report;

  // v8.1 FIX: Polling لمراقبة حالة المطابقة وتحديث نسبة الخطأ تلقائياً عند الطرف الأول
  useEffect(() => {
    if (!liveReport || liveReport.crossVerifiedAnalysis || !liveReport.id) return;
    let interval: ReturnType<typeof setInterval>;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        return;
      }
      const updated = await fetchUpdatedReportFromSupabase(liveReport.id);
      if (updated && updated.crossVerifiedAnalysis) {
        // تحديث التقرير في السياق المحلي بناءً على السحابة
        const r = { ...liveReport, ...updated };
        updateReport(r);
        clearInterval(interval);
      }
    };
    interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [liveReport, updateReport]);

  const handleFeedback = useCallback(
    async (feedback: "correct" | "incorrect") => {
      if (!report) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await submitFeedback(report.id, feedback);
    },
    [report, submitFeedback]
  );

  const handleDelete = useCallback(() => {
    if (!report) return;
    Alert.alert("حذف التقرير", "سيتم حذف هذا السجل نهائياً.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          await removeReport(report.id);
          router.back();
        },
      },
    ]);
  }, [report, removeReport]);

  // ─── v10: إرسال بلاغ حادث غير صحيح ───
  const handleFalseAlarmSubmit = useCallback(async () => {
    if (!report || !selectedReason) {
      Alert.alert("تنبيه", "الرجاء اختيار سبب البلاغ");
      return;
    }
    setIsSendingFalseAlarm(true);
    try {
      const reasonLabel = FALSE_ALARM_REASONS.find((r) => r.key === selectedReason)?.label ?? selectedReason;
      await markAccidentAsFalseAlarm(report.id, reasonLabel, falseAlarmDetails);
      await removeReport(report.id);
      setFalseAlarmModalVisible(false);
      Alert.alert("تم الإرسال", "شكراً لتبليغك، سيساعدنا ذلك في تحسين دقة النظام.", [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء إرسال البلاغ، حاول مرة أخرى.");
    } finally {
      setIsSendingFalseAlarm(false);
    }
  }, [report, selectedReason, falseAlarmDetails, removeReport]);

  if (!report) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>
            التقرير غير موجود
          </Text>
        </View>
      </View>
    );
  }

  const displayReport = liveReport ?? report;
  const sev = displayReport.severity ?? "moderate";
  const sevColor = SEVERITY_COLOR[sev];
  const currentFeedback = liveReport?.feedback ?? null;
  const speedDiff = displayReport.preCrashSpeedKmh - displayReport.speedKmh;
  const wasBraking = speedDiff > 5;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          تقرير الحادث
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={() => router.push({ pathname: '/report/assessment', params: { id: displayReport.id } })} style={styles.navBtn}>
            <Feather name="file-text" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.navBtn}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => exportReportToPDF(displayReport)} style={styles.navBtn}>
            <Feather name="share" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ملخص الحادث */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderStartWidth: 4,
              borderStartColor: sevColor,
            },
          ]}
        >
          <View style={styles.summaryTop}>
            <View style={styles.gforceBadge}>
              <Text style={[styles.gforceVal, { color: sevColor }]}>
                {displayReport.peakGForce.toFixed(1)}g
              </Text>
              <Text style={[styles.gforceLabel, { color: colors.mutedForeground }]}>
                قوة الاصطدام
              </Text>
            </View>
            <View style={styles.summaryRight}>
              <View style={styles.summaryTitleRow}>
                <View
                  style={[
                    styles.sevPill,
                    { backgroundColor: sevColor + "28" },
                  ]}
                >
                  <Text style={[styles.sevPillText, { color: sevColor }]}>
                    {SEVERITY_AR[sev]}
                  </Text>
                </View>
                {displayReport.crossVerifiedAnalysis && (
                  <View
                    style={[
                      styles.sevPill,
                      {
                        backgroundColor:
                          displayReport.crossVerifiedAnalysis.consistency_status === "VERIFIED"
                            ? "#3FB95028"
                            : displayReport.crossVerifiedAnalysis.consistency_status === "PARTIAL"
                            ? "#8B949E28"
                            : "#D2992228",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sevPillText,
                        {
                          color:
                            displayReport.crossVerifiedAnalysis.consistency_status === "VERIFIED"
                              ? "#3FB950"
                              : displayReport.crossVerifiedAnalysis.consistency_status === "PARTIAL"
                              ? "#8B949E"
                              : "#D29922",
                        },
                      ]}
                    >
                      {displayReport.crossVerifiedAnalysis.consistency_status === "VERIFIED"
                        ? "مطابق ✓"
                        : displayReport.crossVerifiedAnalysis.consistency_status === "PARTIAL"
                        ? "جزئي"
                        : "تعارض ⚠"}
                    </Text>
                  </View>
                )}
                <Text style={[styles.impactLabel, { color: colors.primary }]}>
                  {ZONE_LABELS_AR[displayReport.impactZone] || DIRECTION_AR[displayReport.impactDirection]}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                {formatDateTimeAr(displayReport.timestamp)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>
                {displayReport.speedKmh} كم/س
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                السرعة عند الاصطدام
              </Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>
                {displayReport.preCrashSpeedKmh} كم/س
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                قبل الاصطدام
              </Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text
                style={[
                  styles.statVal,
                  {
                    color:
                      displayReport.jerkPeak >= 20
                        ? "#FF4444"
                        : displayReport.jerkPeak >= 10
                        ? "#D29922"
                        : colors.foreground,
                  },
                ]}
              >
                {displayReport.jerkPeak.toFixed(0)} g/s
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                تسارع مفاجئ
              </Text>
            </View>
          </View>

          {(wasBraking || displayReport.latitude !== null || displayReport.gyroscope?.rolloverDetected) && (
            <View style={styles.extraRow}>
              {displayReport.gyroscope?.rolloverDetected && (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: "#FF4444" + "20", borderColor: "#FF4444", borderWidth: 1 },
                  ]}
                >
                  <Feather name="refresh-cw" size={12} color="#FF4444" />
                  <Text style={[styles.chipText, { color: "#FF4444", fontWeight: "bold" }]}>
                    تم رصد انقلاب
                  </Text>
                </View>
              )}
              {wasBraking && (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: "#3FB950" + "20" },
                  ]}
                >
                  <Feather name="trending-down" size={12} color="#3FB950" />
                  <Text style={[styles.chipText, { color: "#3FB950" }]}>
                    كانت السيارة تُكبّح
                  </Text>
                </View>
              )}
              {displayReport.latitude !== null && displayReport.longitude !== null && (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                    {displayReport.latitude.toFixed(4)}, {displayReport.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* الرسم التوضيحي */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            مخطط الاصطدام
          </Text>
          <View style={styles.diagramWrap}>
            <AccidentDiagram
              zone={displayReport.impactZone ?? "unknown"}
              width={300}
              height={280}
              crossVerifiedAnalysis={displayReport.crossVerifiedAnalysis}
              currentAccidentId={displayReport.id}
            />
          </View>
        </View>

        {/* الرسم البياني للسرعة */}
        {displayReport.speedHistory && displayReport.speedHistory.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              تغير السرعة (آخر 10 ثوانٍ)
            </Text>
            <View style={styles.diagramWrap}>
              <SpeedGraph data={displayReport.speedHistory} width={300} height={160} />
            </View>
          </View>
        )}

        {/* تقدير المسؤولية */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <LiabilityMeter
            userFaultPercent={displayReport.liabilityScore}
            confidence={displayReport.confidence}
            factorsAr={displayReport.factorsAr}
            crossVerifiedAnalysis={displayReport.crossVerifiedAnalysis}
            currentAccidentId={displayReport.id}
          />
        </View>

        {/* تحليل السيناريو */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            السيناريو المُقدَّر
          </Text>
          <Text style={[styles.scenarioTitle, { color: colors.foreground }]}>
            {displayReport.scenarioAr}
          </Text>
          <Text
            style={[
              styles.scenarioDesc,
              { color: colors.mutedForeground },
            ]}
          >
            {displayReport.descriptionAr}
          </Text>

          {displayReport.factorsAr && displayReport.factorsAr.length > 0 && (
            <View style={[styles.factorsBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.factorsTitle, { color: colors.foreground }]}>
                عوامل التحليل
              </Text>
              {displayReport.factorsAr.map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <View
                    style={[styles.factorDot, { backgroundColor: sevColor }]}
                  />
                  <Text style={[styles.factorText, { color: colors.mutedForeground }]}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* التقييم */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            قيّم دقة التحليل
          </Text>
          <Text
            style={[styles.feedbackSub, { color: colors.mutedForeground }]}
          >
            هل كان تقدير المسؤولية عادلاً ودقيقاً؟
          </Text>

          {currentFeedback ? (
            <View
              style={[
                styles.feedbackGiven,
                {
                  backgroundColor:
                    currentFeedback === "correct"
                      ? "#3FB950" + "22"
                      : "#FF4444" + "22",
                },
              ]}
            >
              <Feather
                name={
                  currentFeedback === "correct" ? "check-circle" : "x-circle"
                }
                size={20}
                color={currentFeedback === "correct" ? "#3FB950" : "#FF4444"}
              />
              <Text
                style={[
                  styles.feedbackGivenText,
                  {
                    color:
                      currentFeedback === "correct" ? "#3FB950" : "#FF4444",
                  },
                ]}
              >
                {currentFeedback === "correct"
                  ? "دقيق — شكراً لتقييمك"
                  : "غير دقيق — سيُستخدم لتحسين المحرك"}
              </Text>
            </View>
          ) : (
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                onPress={() => handleFeedback("incorrect")}
                activeOpacity={0.8}
                style={[
                  styles.feedbackBtn,
                  {
                    backgroundColor: "#FF4444" + "22",
                    borderColor: "#FF4444" + "44",
                  },
                ]}
              >
                <Text style={[styles.feedbackBtnText, { color: "#FF4444" }]}>
                  غير دقيق
                </Text>
                <Feather name="x" size={18} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleFeedback("correct")}
                activeOpacity={0.8}
                style={[
                  styles.feedbackBtn,
                  {
                    backgroundColor: "#3FB950" + "22",
                    borderColor: "#3FB950" + "44",
                  },
                ]}
              >
                <Text
                  style={[styles.feedbackBtnText, { color: "#3FB950" }]}
                >
                  دقيق
                </Text>
                <Feather name="check" size={18} color="#3FB950" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* v10: زر الحادث غير صحيح */}
        <TouchableOpacity
          onPress={() => {
            setSelectedReason(null);
            setFalseAlarmDetails("");
            setFalseAlarmModalVisible(true);
          }}
          activeOpacity={0.8}
          style={[
            styles.falseAlarmBtn,
            { borderColor: colors.border },
          ]}
        >
          <Feather name="alert-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.falseAlarmBtnText, { color: colors.mutedForeground }]}>
            هذا ليس حادثاً
          </Text>
        </TouchableOpacity>

        <Text
          style={[styles.legalNote, { color: colors.mutedForeground }]}
        >
          هذا التحليل للأغراض الاستعلامية فقط ولا يُعدّ حكماً قانونياً. قياسات
          قوة G مُقدَّرة بناءً على حساسات الهاتف وقد لا تكون دقيقة 100٪.
        </Text>
      </ScrollView>

      {/* v10: نافذة بلاغ الحادث غير الصحيح */}
      <Modal
        visible={falseAlarmModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFalseAlarmModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%" }}
            >
              <TouchableWithoutFeedback onPress={(e) => {
                // تمنع انتشار الضغط خارج الكارت لإغلاق المودال، ولكن تسمح بإغلاق الكيبورد عند الضغط على الكارت
                Keyboard.dismiss();
              }}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    تبليغ عن حادث غير صحيح
                  </Text>
                  <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                    اختر السبب الذي جعل التطبيق يسجل هذا الحادث بالخطأ
                  </Text>

                  <View style={styles.reasonsContainer}>
                    {FALSE_ALARM_REASONS.map((reason) => {
                      const isSelected = selectedReason === reason.key;
                      return (
                        <TouchableOpacity
                          key={reason.key}
                          onPress={() => {
                            setSelectedReason(reason.key);
                            Keyboard.dismiss();
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.reasonOption,
                            {
                              backgroundColor: isSelected ? colors.primary + "18" : colors.background,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.reasonRadio,
                              {
                                borderColor: isSelected ? colors.primary : colors.mutedForeground,
                                backgroundColor: isSelected ? colors.primary : "transparent",
                              },
                            ]}
                          >
                            {isSelected && <View style={styles.reasonRadioInner} />}
                          </View>
                          <Text
                            style={[
                              styles.reasonText,
                              { color: isSelected ? colors.primary : colors.foreground },
                            ]}
                          >
                            {reason.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* شريط المساعدة لإخفاء الكيبورد وكتابة الملاحظات */}
                  <View style={styles.inputHeaderRow}>
                    <TouchableOpacity
                      onPress={Keyboard.dismiss}
                      activeOpacity={0.7}
                      style={styles.hideKeyboardBtn}
                    >
                      <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.hideKeyboardText, { color: colors.mutedForeground }]}>
                        إغلاق الكيبورد
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.inputHeaderLabel, { color: colors.foreground }]}>
                      تفاصيل إضافية (اختياري)
                    </Text>
                  </View>

                  <TextInput
                    style={[
                      styles.falseAlarmInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="اكتب هنا أي تفاصيل إضافية..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    value={falseAlarmDetails}
                    onChangeText={setFalseAlarmDetails}
                    textAlign="right"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      onPress={() => setFalseAlarmModalVisible(false)}
                      style={[
                        styles.modalCancelBtn,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.modalCancelText, { color: colors.foreground }]}>إلغاء</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleFalseAlarmSubmit}
                      disabled={isSendingFalseAlarm || !selectedReason}
                      style={[
                        styles.modalConfirmBtn,
                        {
                          backgroundColor: colors.destructive,
                          opacity: isSendingFalseAlarm || !selectedReason ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.modalConfirmText}>
                        {isSendingFalseAlarm ? "جاري الإرسال..." : "تأكيد البلاغ"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  scroll: { paddingHorizontal: 20, gap: 12 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "right",
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  summaryRight: { flex: 1, alignItems: "flex-end", gap: 6 },
  summaryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  impactLabel: { fontSize: 18, fontWeight: "700" },
  sevPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sevPillText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 12, textAlign: "right" },
  gforceBadge: { alignItems: "center" },
  gforceVal: { fontSize: 30, fontWeight: "800" },
  gforceLabel: { fontSize: 11, marginTop: -2 },
  divider: { height: 1 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  statLbl: { fontSize: 10, textAlign: "center" },
  statDiv: { width: 1, height: 36 },
  extraRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: { fontSize: 12 },
  diagramWrap: { alignItems: "center" },
  scenarioTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 24,
  },
  scenarioDesc: { fontSize: 14, lineHeight: 24, textAlign: "right" },
  factorsBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  factorsTitle: { fontSize: 13, fontWeight: "700", textAlign: "right" },
  factorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  factorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  factorText: { fontSize: 13, lineHeight: 22, textAlign: "right", flex: 1 },
  feedbackSub: { fontSize: 14, textAlign: "right" },
  feedbackButtons: { flexDirection: "row", gap: 12 },
  feedbackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackBtnText: { fontSize: 15, fontWeight: "600" },
  feedbackGiven: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  feedbackGivenText: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  legalNote: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // ─── v10: أنماط بلاغ الحادث غير الصحيح ───
  falseAlarmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  falseAlarmBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  modalSub: {
    fontSize: 13,
    textAlign: "right",
    marginTop: -8,
  },
  reasonsContainer: {
    gap: 10,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  reasonText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  falseAlarmInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  inputHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  hideKeyboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  hideKeyboardText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputHeaderLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
});
