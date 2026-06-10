import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useLanguage, type Locale } from "@/context/LanguageContext";
// import type { EmergencyContact } from "@/lib/storage"; // DEMO: disabled for client demo

const THRESHOLD_OPTIONS: Array<{ value: number; labelAr: string }> = [
  { value: 1.5, labelAr: "عالية جداً" },
  { value: 2.0, labelAr: "قياسي" },
  { value: 2.5, labelAr: "متوسطة" },
  { value: 3.0, labelAr: "منخفضة" },
  { value: 3.5, labelAr: "شديدة" },
  { value: 4.0, labelAr: "قوية فقط" },
];

const SAMPLE_RATE_OPTIONS: Array<{ value: number; labelAr: string }> = [
  { value: 10, labelAr: "اقتصادي" },
  { value: 25, labelAr: "متوازن" },
  { value: 50, labelAr: "قياسي" },
  { value: 100, labelAr: "أقصى دقة" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, settings, loadAll, updateContacts, updateSettings, reports } =
    useReports();
  const { locale, setLocale, t } = useLanguage();

  // DEMO: Emergency contact state disabled for client demo
  // const [name, setName] = useState("");
  // const [phone, setPhone] = useState("");
  // const [isAdding, setIsAdding] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // DEMO: Emergency contact handlers disabled for client demo
  // const handleAddContact = useCallback(async () => { ... }, []);
  // const handleRemove = useCallback((id: string) => { ... }, []);

  const handleThreshold = useCallback(
    async (value: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateSettings({ ...settings, crashThresholdG: value });
    },
    [settings, updateSettings]
  );

  // DEMO: Auto-alert handler disabled for client demo
  // const handleAutoAlert = useCallback(
  //   async (value: boolean) => {
  //     await updateSettings({ ...settings, autoAlertEnabled: value });
  //   },
  //   [settings, updateSettings]
  // );

  const handleGyroscope = useCallback(
    async (value: boolean) => {
      await updateSettings({ ...settings, gyroscopeEnabled: value });
    },
    [settings, updateSettings]
  );

  const handleSampleRate = useCallback(
    async (value: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateSettings({ ...settings, sampleRateHz: value });
    },
    [settings, updateSettings]
  );

  const totalCrashes = reports.length;
  const avgGForce =
    reports.length > 0
      ? reports.reduce((s, r) => s + r.peakGForce, 0) / reports.length
      : 0;
  const correctFeedback = reports.filter((r) => r.feedback === "correct").length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <View style={{ width: 36 }} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            الإعدادات
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottomPad + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* DEMO: اللغة / Language — hidden for client demo */}

          {/* DEMO: جهات الطوارئ — hidden for client demo */}
          {/* DEMO: إعدادات التنبيه التلقائي — hidden for client demo */}

          {/* الجيروسكوب */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  التحقق بالجيروسكوب
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  تقليل الإنذارات الكاذبة عبر تأكيد الدوران
                </Text>
              </View>
              <Switch
                value={settings.gyroscopeEnabled}
                onValueChange={handleGyroscope}
                trackColor={{ false: "#30363D", true: "#3FB95055" }}
                thumbColor={settings.gyroscopeEnabled ? "#3FB950" : "#8B949E"}
              />
            </View>
          </View>

          {/* تردد أخذ العينات */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  تردد أخذ العينات
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  كلما زاد التردد زادت الدقة واستهلاك البطارية
                </Text>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: "#3B82F6" + "22" },
                ]}
              >
                <Feather name="cpu" size={16} color="#3B82F6" />
              </View>
            </View>

            <View style={styles.thresholdGrid}>
              {SAMPLE_RATE_OPTIONS.map((opt) => {
                const active = opt.value === settings.sampleRateHz;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleSampleRate(opt.value)}
                    activeOpacity={0.7}
                    style={[
                      styles.thresholdChip,
                      active
                        ? {
                            backgroundColor: "#3B82F6" + "22",
                            borderColor: "#3B82F6",
                          }
                        : {
                            backgroundColor: colors.secondary,
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thresholdVal,
                        { color: active ? "#3B82F6" : colors.foreground },
                      ]}
                    >
                      {opt.value} Hz
                    </Text>
                    <Text
                      style={[
                        styles.thresholdLbl,
                        {
                          color: active ? "#3B82F6" : colors.mutedForeground,
                        },
                      ]}
                    >
                      {opt.labelAr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* حساسية الكشف */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  حساسية الكشف
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  عتبة التسارع المطلوبة لتفعيل الكشف
                </Text>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: "#3FB950" + "22" },
                ]}
              >
                <Feather name="sliders" size={16} color="#3FB950" />
              </View>
            </View>

            <View style={styles.thresholdGrid}>
              {THRESHOLD_OPTIONS.map((opt) => {
                const active =
                  Math.abs(opt.value - settings.crashThresholdG) < 0.01;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleThreshold(opt.value)}
                    activeOpacity={0.7}
                    style={[
                      styles.thresholdChip,
                      active
                        ? {
                            backgroundColor: "#3FB950" + "22",
                            borderColor: "#3FB950",
                          }
                        : {
                            backgroundColor: colors.secondary,
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thresholdVal,
                        { color: active ? "#3FB950" : colors.foreground },
                      ]}
                    >
                      {opt.value.toFixed(1)}g
                    </Text>
                    <Text
                      style={[
                        styles.thresholdLbl,
                        {
                          color: active ? "#3FB950" : colors.mutedForeground,
                        },
                      ]}
                    >
                      {opt.labelAr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.thresholdHint, { color: colors.mutedForeground }]}>
              {settings.crashThresholdG <= 1.5
                ? "قد تُسجَّل اهتزازات الطريق كحوادث — استخدم في السيارات الرياضية"
                : settings.crashThresholdG >= 3.5
                ? "يكتشف الحوادث القوية فقط — مناسب للطرق الوعرة"
                : "مناسب للاستخدام اليومي في السيارات العادية"}
            </Text>
          </View>



          {/* إحصائيات */}
          {totalCrashes > 0 && (
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTextBlock}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    إحصائيات
                  </Text>
                </View>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Feather name="bar-chart-2" size={16} color={colors.mutedForeground} />
                </View>
              </View>
              {[
                { label: "إجمالي الحوادث المسجّلة", value: String(totalCrashes) },
                { label: "متوسط قوة G", value: `${avgGForce.toFixed(1)}g` },
                {
                  label: "تقييمات صحيحة",
                  value: `${correctFeedback} / ${reports.filter((r) => r.feedback !== null).length}`,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[styles.infoRow, { borderColor: colors.border }]}
                >
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>
                    {item.value}
                  </Text>
                  <Text
                    style={[styles.infoLabel, { color: colors.mutedForeground }]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* عن ستركس */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  عن ستركس
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  v3.0 — محرك Fusion متعدد الحساسات
                </Text>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Feather name="info" size={16} color={colors.mutedForeground} />
              </View>
            </View>
            <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
              يستخدم ستركس مستشعر التسارع (Accelerometer) والجيروسكوب (Gyroscope)
              معاً في نظام Sensor Fusion مع خوارزمية High-Pass Filter لعزل حركة
              الاصطدام عن جاذبية الأرض. يحسب محرك التحليل v4 قوة G الذروة
              والتسارع المفاجئ (Jerk) واتجاه الاصطدام والسرعة وبيانات الفرملة
              والدوران معاً لتقدير نسبة المسؤولية بدقة أعلى.
            </Text>
            <View style={[styles.techRow, { borderColor: colors.border }]}>
              {[
                { k: "معدل أخذ العينات", v: `${settings.sampleRateHz} Hz` },
                { k: "فلتر الإشارة", v: "α=0.8" },
                { k: "ذاكرة الحلقة", v: "3 ثوان" },
                { k: "فترة التبريد", v: "8 ثوان" },
                { k: "الجيروسكوب", v: settings.gyroscopeEnabled ? "مُفعّل" : "معطّل" },
                { k: "كشف الفرملة", v: "تلقائي" },
              ].map((t) => (
                <View key={t.k} style={styles.techChip}>
                  <Text style={[styles.techVal, { color: colors.foreground }]}>
                    {t.v}
                  </Text>
                  <Text
                    style={[styles.techKey, { color: colors.mutedForeground }]}
                  >
                    {t.k}
                  </Text>
                </View>
              ))}
            </View>
            <Text
              style={[styles.disclaimer, { color: colors.mutedForeground }]}
            >
              البيانات محفوظة محلياً على الجهاز فقط. هذا التطبيق للأغراض
              الاستعلامية ولا يُعدّ بديلاً عن الجهات الرسمية.
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  scroll: { paddingHorizontal: 20, gap: 14 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTextBlock: { flex: 1, gap: 2, alignItems: "flex-start" },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  sectionSub: { fontSize: 12 },
  emptyContacts: {
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  emptyText: { fontSize: 13 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: { flex: 1, gap: 2, alignItems: "flex-start" },
  contactName: { fontSize: 15, fontWeight: "600" },
  contactPhone: { fontSize: 13 },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addForm: { gap: 10, paddingTop: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  saveBtn: {
    flex: 2,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: { fontSize: 15, fontWeight: "500" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 14, fontWeight: "500" },
  thresholdGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  thresholdChip: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
    gap: 2,
  },
  thresholdVal: { fontSize: 16, fontWeight: "700" },
  thresholdLbl: { fontSize: 10 },
  thresholdHint: { fontSize: 12, lineHeight: 18, textAlign: "right", fontStyle: "italic" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  aboutText: { fontSize: 13, lineHeight: 22, textAlign: "right" },
  techRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    justifyContent: "flex-start",
  },
  techChip: { alignItems: "center", gap: 2 },
  techVal: { fontSize: 13, fontWeight: "700" },
  techKey: { fontSize: 10 },
  disclaimer: {
    fontSize: 11,
    lineHeight: 18,
    fontStyle: "italic",
    textAlign: "right",
  },
});
