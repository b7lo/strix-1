import React, { useMemo, useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Text } from "@/components/Text";;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useReports } from "@/context/ReportsContext";
import { AccidentDiagram } from "@/components/AccidentDiagram";
import { LiabilityMeter } from "@/components/LiabilityMeter";
import { SpeedGraph } from "@/components/SpeedGraph";
import { exportReportToPDF } from "@/lib/pdfExport";
import { fetchUpdatedReportFromSupabase, markAccidentAsFalseAlarm } from "@/lib/accidentSync";
import { flipIconName } from "@/lib/rtl";
import type { AccidentReport, Severity, ImpactDirection } from "@/lib/types";

const getDirectionAr = (t: any): Record<ImpactDirection, string> => ({
  front: t('liability.dirFront'),
  rear: t('liability.dirRear'),
  "side-left": t('liability.dirSideLeft'),
  "side-right": t('liability.dirSideRight'),
  unknown: t('liability.dirUnknown'),
});

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#FF4444",
  severe: "#FF6B35",
  moderate: "#D29922",
  minor: "#3FB950",
};

const getSeverityAr = (t: any): Record<Severity, string> => ({
  critical: t('report.severityCritical'),
  severe: t('report.severitySevere'),
  moderate: t('report.severityModerate'),
  minor: t('report.severityMinor'),
});

const getFalseAlarmReasons = (t: any) => [
  { key: "phone_drop", label: t('falseAlarm.phoneDrop') },
  { key: "speed_bump", label: t('falseAlarm.speedBump') },
  { key: "hard_brake", label: t('falseAlarm.hardBrake') },
  { key: "other", label: t('falseAlarm.other') },
];

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { reports, submitFeedback, removeReport, updateReport } = useReports();
  const { t, isRTL, rtl, formatDate: fmtDate, formatGForce: fmtG, formatSpeed: fmtS } = useLanguage();

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
    Alert.alert(t("report.deleteReportTitle"), t("report.deleteReportMessage"), [
      { text: t("report.cancel"), style: "cancel" },
      {
        text: t("report.delete"),
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
      Alert.alert(t("report.alert"), t("falseAlarm.selectReasonPrompt"));
      return;
    }
    setIsSendingFalseAlarm(true);
    try {
      const reasonLabel = getFalseAlarmReasons(t).find((r) => r.key === selectedReason)?.label ?? selectedReason;
      await markAccidentAsFalseAlarm(report.id, reasonLabel, falseAlarmDetails);
      await removeReport(report.id);
      setFalseAlarmModalVisible(false);
      Alert.alert(t("report.success"), t("falseAlarm.thankYouMessage"), [
        { text: t("report.ok"), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t("report.error"), t("falseAlarm.errorMessage"));
    } finally {
      setIsSendingFalseAlarm(false);
    }
  }, [report, selectedReason, falseAlarmDetails, removeReport]);

  if (!report) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, flexDirection: rtl.flexDirection }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather
              name={flipIconName("arrow-left", isRTL) as any}
              size={22}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>
            {t("report.notFound")}
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
        <View style={[styles.header, { paddingTop: topPad, flexDirection: rtl.flexDirection }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather
            name={flipIconName("arrow-left", isRTL) as any}
            size={22}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("report.title")}
        </Text>
        <View style={{ flexDirection: rtl.flexDirection, gap: 12 }}>
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
          <View style={[styles.summaryTop, { flexDirection: rtl.flexDirection }]}>
            <View style={styles.gforceBadge}>
              <Text style={[styles.gforceVal, { color: sevColor }]}>
                {displayReport.peakGForce.toFixed(1)}g
              </Text>
              <Text style={[styles.gforceLabel, { color: colors.mutedForeground }]}>
                {t("report.impactForce")}
              </Text>
            </View>
            <View style={[styles.summaryRight, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View style={[styles.summaryTitleRow, { flexDirection: rtl.flexDirection }]}>
                <View
                  style={[
                    styles.sevPill,
                    { backgroundColor: sevColor + "28" },
                  ]}
                >
                  <Text style={[styles.sevPillText, { color: sevColor }]}>
                    {getSeverityAr(t)[sev]}
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
                        ? t("report.verifiedMatch")
                        : displayReport.crossVerifiedAnalysis.consistency_status === "PARTIAL"
                        ? t("report.partialMatch")
                        : t("report.conflictMatch")}
                    </Text>
                  </View>
                )}
                <Text style={[styles.impactLabel, { color: colors.primary, textAlign: rtl.textAlign }]}>
                  {`${t(`zone.${displayReport.impactZone}`, { defaultValue: getDirectionAr(t)[displayReport.impactDirection] })}`}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
                {fmtDate(displayReport.timestamp)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={[styles.statsRow, { flexDirection: rtl.flexDirection }]}>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>
                {displayReport.speedKmh} {t("report.kmh")}
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                {t("report.speedAtImpact")}
              </Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>
                {displayReport.preCrashSpeedKmh} {t("report.kmh")}
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                {t("report.speedBeforeImpact")}
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
                {t("report.suddenAcceleration")}
              </Text>
            </View>
          </View>

          {(wasBraking || displayReport.latitude !== null || displayReport.gyroscope?.rolloverDetected) && (
            <View
              style={[
                styles.extraRow,
                {
                  flexDirection: rtl.flexDirection,
                  justifyContent: isRTL ? "flex-end" : "flex-start",
                },
              ]}
            >
              {displayReport.gyroscope?.rolloverDetected && (
                <View
                  style={[
                    styles.chip,
                    { flexDirection: rtl.flexDirection },
                    { backgroundColor: "#FF4444" + "20", borderColor: "#FF4444", borderWidth: 1 },
                  ]}
                >
                  <Feather name="refresh-cw" size={12} color="#FF4444" />
                  <Text style={[styles.chipText, { color: "#FF4444", fontWeight: "bold" }]}>
                    {t("report.rolloverDetected")}
                  </Text>
                </View>
              )}
              {wasBraking && (
                <View
                  style={[
                    styles.chip,
                    { flexDirection: rtl.flexDirection },
                    { backgroundColor: "#3FB950" + "20" },
                  ]}
                >
                  <Feather name="trending-down" size={12} color="#3FB950" />
                  <Text style={[styles.chipText, { color: "#3FB950" }]}>
                    {t("report.brakingDetected")}
                  </Text>
                </View>
              )}
              {displayReport.latitude !== null && displayReport.longitude !== null && (
                <View
                  style={[
                    styles.chip,
                    { flexDirection: rtl.flexDirection },
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
           <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {t("report.impactDiagram")}
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
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
              {t("report.speedChangeLast10s")}
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
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {t("report.estimatedScenario")}
          </Text>
          <Text style={[styles.scenarioTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>
            {displayReport.scenarioAr}
          </Text>
          <Text
            style={[
              styles.scenarioDesc,
              { color: colors.mutedForeground, textAlign: rtl.textAlign },
            ]}
          >
            {displayReport.descriptionAr}
          </Text>

          {displayReport.factorsAr && displayReport.factorsAr.length > 0 && (
            <View style={[styles.factorsBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.factorsTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>
                {t("report.analysisFactors")}
              </Text>
              {displayReport.factorsAr.map((f, i) => (
                <View key={i} style={[styles.factorRow, { flexDirection: rtl.flexDirection }]}>
                  <View
                    style={[styles.factorDot, { backgroundColor: sevColor }]}
                  />
                  <Text style={[styles.factorText, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
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
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {t("report.rateAccuracy")}
          </Text>
          <Text
            style={[styles.feedbackSub, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}
          >
            {t("report.wasAssessmentFair")}
          </Text>

          {currentFeedback ? (
            <View
              style={[
                styles.feedbackGiven,
                {
                  flexDirection: rtl.flexDirection,
                  justifyContent: isRTL ? "flex-end" : "flex-start",
                },
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
                    textAlign: rtl.textAlign,
                  },
                ]}
              >
                {currentFeedback === "correct"
                  ? t("report.accurateFeedback")
                  : t("report.inaccurateFeedback")}
              </Text>
            </View>
          ) : (
            <View style={[styles.feedbackButtons, { flexDirection: rtl.flexDirection }]}>
              <TouchableOpacity
                onPress={() => handleFeedback("incorrect")}
                activeOpacity={0.8}
                style={[
                  styles.feedbackBtn,
                  { flexDirection: rtl.flexDirection },
                  {
                    backgroundColor: "#FF4444" + "22",
                    borderColor: "#FF4444" + "44",
                  },
                ]}
              >
                <Text style={[styles.feedbackBtnText, { color: "#FF4444" }]}>
                  {t("report.inaccurate")}
                </Text>
                <Feather name="x" size={18} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleFeedback("correct")}
                activeOpacity={0.8}
                style={[
                  styles.feedbackBtn,
                  { flexDirection: rtl.flexDirection },
                  {
                    backgroundColor: "#3FB950" + "22",
                    borderColor: "#3FB950" + "44",
                  },
                ]}
              >
                <Text
                  style={[styles.feedbackBtnText, { color: "#3FB950" }]}
                >
                  {t("report.accurate")}
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
            { flexDirection: rtl.flexDirection },
            { borderColor: colors.border },
          ]}
        >
          <Feather name="alert-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.falseAlarmBtnText, { color: colors.mutedForeground }]}>
            {t("report.notAnAccident")}
          </Text>
        </TouchableOpacity>

        <Text
          style={[styles.legalNote, { color: colors.mutedForeground }]}
        >
          {t("report.legalNote")}
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
                  <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>
                    {t("falseAlarm.modalTitle")}
                  </Text>
                  <Text style={[styles.modalSub, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
                    {t("falseAlarm.modalSubtitle")}
                  </Text>

                  <View style={styles.reasonsContainer}>
                    {getFalseAlarmReasons(t).map((reason) => {
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
                            { flexDirection: rtl.flexDirection },
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
                              {
                                color: isSelected ? colors.primary : colors.foreground,
                                textAlign: rtl.textAlign,
                              },
                            ]}
                          >
                            {reason.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* شريط المساعدة لإخفاء الكيبورد وكتابة الملاحظات */}
                  <View style={[styles.inputHeaderRow, { flexDirection: rtl.flexDirection }]}>
                    <TouchableOpacity
                      onPress={Keyboard.dismiss}
                      activeOpacity={0.7}
                      style={[styles.hideKeyboardBtn, { flexDirection: rtl.flexDirection }]}
                    >
                      <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.hideKeyboardText, { color: colors.mutedForeground }]}>
                        {t("falseAlarm.closeKeyboard")}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.inputHeaderLabel, { color: colors.foreground, textAlign: rtl.textAlign }]}>
                      {t("falseAlarm.extraDetailsOptional")}
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
                    placeholder={t("falseAlarm.detailsPlaceholder")}
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    value={falseAlarmDetails}
                    onChangeText={setFalseAlarmDetails}
                    textAlign={rtl.textAlign}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <View style={[styles.modalButtons, { flexDirection: rtl.flexDirection }]}>
                    <TouchableOpacity
                      onPress={() => setFalseAlarmModalVisible(false)}
                      style={[
                        styles.modalCancelBtn,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.modalCancelText, { color: colors.foreground }]}>
                        {t("falseAlarm.cancel")}
                      </Text>
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
                        {isSendingFalseAlarm ? t("falseAlarm.sending") : t("falseAlarm.confirmReport")}
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  summaryTop: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 14,
  },
  summaryRight: { flex: 1, gap: 6 },
  summaryTitleRow: { alignItems: "center", gap: 8, flexWrap: "wrap" },
  impactLabel: { fontSize: 18, fontWeight: "700" },
  sevPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sevPillText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 12 },
  gforceBadge: { alignItems: "center" },
  gforceVal: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  gforceLabel: { fontSize: 11, marginTop: -2, letterSpacing: 0.3 },
  divider: { height: 1 },
  statsRow: {
    alignItems: "center",
  },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  statLbl: { fontSize: 10, textAlign: "center", letterSpacing: 0.2 },
  statDiv: { width: 1, height: 36 },
  extraRow: { flexWrap: "wrap", gap: 8 },
  chip: {
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
    lineHeight: 24,
  },
  scenarioDesc: { fontSize: 14, lineHeight: 24 },
  factorsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  factorsTitle: { fontSize: 13, fontWeight: "800" },
  factorRow: {
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
  factorText: { fontSize: 13, lineHeight: 22, flex: 1 },
  feedbackSub: { fontSize: 14 },
  feedbackButtons: { gap: 12 },
  feedbackBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackBtnText: { fontSize: 15, fontWeight: "700" },
  feedbackGiven: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  feedbackGivenText: { flex: 1, fontSize: 14, fontWeight: "600" },
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
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  modalSub: {
    fontSize: 13,
    marginTop: -8,
  },
  reasonsContainer: {
    gap: 10,
  },
  reasonOption: {
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
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  hideKeyboardBtn: {
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
  },
});
