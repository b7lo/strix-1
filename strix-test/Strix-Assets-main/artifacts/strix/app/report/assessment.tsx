import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useLanguage } from "@/context/LanguageContext";
import { flipIconName, getRTLStyles } from "@/lib/rtl";
import type { AuthoritySource } from "@/lib/types";

const LIABILITY_OPTIONS = [100, 75, 50, 25, 0];
const AUTHORITY_OPTIONS: AuthoritySource[] = ["najm", "saudi_traffic", "other"];

export default function AssessmentScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { reports, updateReport } = useReports();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isRTL = i18n.language === "ar";
  const textAlign = isRTL ? "right" : "left";
  // Native-aware: counters React Native's auto-flip on RTL devices so the row
  // direction follows the in-app language, not the device language.
  const rowDirection = getRTLStyles(isRTL).flexDirection;

  const report = reports.find((r) => r.id === id) ?? null;

  const initialNajm = report?.faultAssessment?.najmLiability ?? null;
  const initialDesc = report?.faultAssessment?.userDescription ?? "";
  const initialAuthority = report?.faultAssessment?.authoritySource ?? null;
  const initialAuthorityOther = report?.faultAssessment?.authorityOther ?? "";

  const [najmLiability, setNajmLiability] = useState<number | null>(initialNajm);
  const [description, setDescription] = useState<string>(initialDesc);
  const [authoritySource, setAuthoritySource] = useState<AuthoritySource | null>(initialAuthority);
  const [authorityOther, setAuthorityOther] = useState<string>(initialAuthorityOther);
  const [isSaving, setIsSaving] = useState(false);

  if (!report) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather
              name={isRTL ? "arrow-right" : "arrow-left"}
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

  const appLiability =
    report.crossVerifiedAnalysis?.accident_a_id === report.id
      ? report.crossVerifiedAnalysis.liability_a_percent
      : report.crossVerifiedAnalysis?.accident_b_id === report.id
      ? report.crossVerifiedAnalysis.liability_b_percent
      : report.liabilityScore;

  // T008: Map app liability
  const mappedAppLiability = LIABILITY_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - appLiability) < Math.abs(prev - appLiability)
      ? curr
      : prev
  );

  // To show directional difference we can just subtract, but usually absolute difference is preferred for metrics,
  // or signed to know who was favored. Let's use signed: App - Najm
  const signedDifference = najmLiability !== null ? mappedAppLiability - najmLiability : null;

  const handleSave = async () => {
    if (!authoritySource) {
      Alert.alert(t("assessment.alertMissingTitle"), t("assessment.alertMissing"));
      return;
    }
    if (authoritySource === "other" && authorityOther.trim().length === 0) {
      Alert.alert(t("assessment.alertMissingTitle"), t("assessment.alertMissing"));
      return;
    }
    if (najmLiability === null) {
      Alert.alert(t("assessment.alertMissingTitle"), t("assessment.alertMissing"));
      return;
    }
    
    setIsSaving(true);
    try {
      const updatedReport = {
        ...report,
        faultAssessment: {
          appLiability: mappedAppLiability,
          najmLiability,
          liabilityDifference: signedDifference!,
          userDescription: description,
          authoritySource,
          authorityOther: authoritySource === "other" ? authorityOther.trim() : undefined,
          createdAt: report.faultAssessment?.createdAt ?? Date.now(),
        },
      };
      
      await updateReport(updatedReport);
      Alert.alert(t("assessment.alertSuccessTitle"), t("assessment.alertSuccess"), [
        { text: t("report.ok"), onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert(t("assessment.alertErrorTitle"), t("assessment.alertError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("assessment.title")}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Liability (US1) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t("assessment.appEstimate")}
          </Text>
          <View style={[styles.liabilityRow, { flexDirection: rowDirection }]}>
            <View style={styles.liabilityBox}>
              <Text style={[styles.liabilityVal, { color: colors.primary }]}>
                {mappedAppLiability}%
              </Text>
              <Text style={[styles.liabilityLbl, { color: colors.mutedForeground }]}>
                {t("assessment.faultUser")}
              </Text>
            </View>
            <View
              style={[
                styles.liabilityBox,
                isRTL
                  ? { borderRightWidth: 1, borderRightColor: colors.border }
                  : { borderLeftWidth: 1, borderLeftColor: colors.border },
              ]}
            >
              <Text style={[styles.liabilityVal, { color: colors.secondaryForeground }]}>
                {100 - mappedAppLiability}%
              </Text>
              <Text style={[styles.liabilityLbl, { color: colors.mutedForeground }]}>
                {t("assessment.faultOther")}
              </Text>
            </View>
          </View>
        </View>

        {/* Reporting Authority Selector */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t("assessment.authorityLabel")}
          </Text>
          <View style={[styles.optionsRow, { flexDirection: rowDirection }]}>
            {AUTHORITY_OPTIONS.map((opt) => {
              const isSelected = authoritySource === opt;
              const label =
                opt === "najm"
                  ? t("assessment.authorityNajm")
                  : opt === "saudi_traffic"
                  ? t("assessment.authoritySaudiTraffic")
                  : t("assessment.authorityOther");
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setAuthoritySource(opt)}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      styles.authorityText,
                      { color: isSelected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {authoritySource === "other" && (
            <TextInput
              style={[
                styles.input,
                styles.authorityOtherInput,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t("assessment.authorityOtherPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              value={authorityOther}
              onChangeText={setAuthorityOther}
              textAlign={textAlign}
            />
          )}
        </View>

        {/* Najm Liability Input (US2) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t("assessment.najmEstimate")}
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground, textAlign }]}>
            {t("assessment.najmSub")}
          </Text>
          <View style={[styles.optionsRow, { flexDirection: rowDirection }]}>
            {LIABILITY_OPTIONS.map((opt) => {
              const isSelected = najmLiability === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setNajmLiability(opt)}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {opt}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Difference Display */}
          {signedDifference !== null && (
            <View
              style={[
                styles.diffBox,
                {
                  backgroundColor: signedDifference === 0 ? "#3FB95020" : "#D2992220",
                  borderColor: signedDifference === 0 ? "#3FB950" : "#D29922",
                },
              ]}
            >
              <Text
                style={[
                  styles.diffText,
                  { color: signedDifference === 0 ? "#3FB950" : "#D29922" },
                ]}
              >
                {signedDifference === 0
                  ? t("assessment.differenceMatch")
                  : t("assessment.differenceValue", { diff: Math.abs(signedDifference) })}
              </Text>
            </View>
          )}
        </View>

        {/* User Description (US3) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t("assessment.notesLabel")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder={t("assessment.notesPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlign={textAlign}
          />
        </View>

        {/* Save Button (US4) */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.saveBtnText}>{t("assessment.save")}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSub: {
    fontSize: 13,
    marginTop: -6,
  },
  liabilityRow: {
    alignItems: "center",
    marginTop: 8,
  },
  liabilityBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  liabilityVal: {
    fontSize: 28,
    fontWeight: "800",
  },
  liabilityLbl: {
    fontSize: 12,
  },
  optionsRow: {
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "700",
  },
  authorityText: {
    fontSize: 14,
  },
  authorityOtherInput: {
    minHeight: 48,
    marginTop: 12,
  },
  diffBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  diffText: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
