import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/Text";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";
import {
  getResearchConsent,
  setResearchConsent,
} from "@/lib/dataCollection/consent";
import {
  PHONE_PLACEMENTS,
  REPLAY_EVENT_LABELS,
  VEHICLE_CLASSES,
  submitReplayForResearch,
  type PhonePlacement,
  type ReplayEventLabel,
  type VehicleClass,
} from "@/lib/dataCollection/submission";
import { flipIconName } from "@/lib/rtl";

export default function DataCollectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL, rtl } = useLanguage();
  const { user } = useAuth();
  const { isActive, getLastReplay } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [label, setLabel] = useState<ReplayEventLabel | null>(null);
  const [phonePlacement, setPhonePlacement] = useState<PhonePlacement>("unknown");
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>("unknown");
  const replay = getLastReplay();

  useEffect(() => {
    getResearchConsent()
      .then((consent) => setEnabled(consent.enabled))
      .finally(() => setLoadingConsent(false));
  }, []);

  const toggleConsent = useCallback(async (next: boolean) => {
    if (next) {
      Alert.alert(
        t("dataCollection.consentTitle"),
        t("dataCollection.consentBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("dataCollection.agree"),
            onPress: async () => {
              await setResearchConsent(true);
              setEnabled(true);
            },
          },
        ],
      );
      return;
    }
    await setResearchConsent(false);
    setEnabled(false);
  }, [t]);

  const submit = useCallback(async () => {
    const currentReplay = getLastReplay();
    if (!currentReplay || !label || !enabled || !user) return;
    setSubmitting(true);
    try {
      await submitReplayForResearch(currentReplay, {
        label,
        phonePlacement,
        vehicleClass,
        labelConfidence: 70,
      });
      Alert.alert(t("dataCollection.successTitle"), t("dataCollection.successBody"));
      setLabel(null);
    } catch (error) {
      console.warn("[Strix Research] Replay submission failed:", error);
      Alert.alert(t("dataCollection.errorTitle"), t("dataCollection.errorBody"));
    } finally {
      setSubmitting(false);
    }
  }, [enabled, getLastReplay, label, phonePlacement, t, user, vehicleClass]);

  const renderOptions = <T extends string>(
    values: readonly T[],
    selected: T | null,
    onSelect: (value: T) => void,
    translationPrefix: string,
  ) => (
    <View style={[styles.options, { flexDirection: rtl.flexDirection }]}>
      {values.map((value) => {
        const active = selected === value;
        return (
          <TouchableOpacity
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(value)}
            style={[
              styles.option,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary + "18" : colors.card,
              },
            ]}
          >
            <Text style={{ color: active ? colors.primary : colors.foreground, fontWeight: "600" }}>
              {t(`${translationPrefix}.${value}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const canSubmit = enabled && Boolean(replay) && Boolean(label) && Boolean(user) && !isActive && !submitting;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { flexDirection: rtl.flexDirection }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.back")}
        >
          <Feather name={flipIconName("arrow-left", isRTL) as keyof typeof Feather.glyphMap} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("dataCollection.title")}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { flexDirection: rtl.flexDirection }]}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>{t("dataCollection.optInTitle")}</Text>
              <Text style={[styles.body, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>{t("dataCollection.optInBody")}</Text>
            </View>
            {loadingConsent ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch value={enabled} onValueChange={toggleConsent} trackColor={{ true: colors.primary }} />
            )}
          </View>
          <View style={[styles.privacyNote, { backgroundColor: colors.primary + "10", flexDirection: rtl.flexDirection }]}>
            <Feather name="shield" size={17} color={colors.primary} />
            <Text style={[styles.body, { color: colors.primary, flex: 1, textAlign: rtl.textAlign }]}>{t("dataCollection.privacyNote")}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: enabled ? 1 : 0.55 }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>{t("dataCollection.lastRecording")}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {isActive
              ? t("dataCollection.stopFirst")
              : replay
                ? t("dataCollection.recordingReady", { count: replay.samples.length })
                : t("dataCollection.noRecording")}
          </Text>
        </View>

        {enabled && replay && !isActive ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>{t("dataCollection.eventLabel")}</Text>
              {renderOptions(REPLAY_EVENT_LABELS, label, setLabel, "dataCollection.labels")}
            </View>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>{t("dataCollection.phonePlacement")}</Text>
              {renderOptions(PHONE_PLACEMENTS, phonePlacement, setPhonePlacement, "dataCollection.placements")}
            </View>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>{t("dataCollection.vehicleClass")}</Text>
              {renderOptions(VEHICLE_CLASSES, vehicleClass, setVehicleClass, "dataCollection.vehicles")}
            </View>
          </>
        ) : null}

        <TouchableOpacity
          disabled={!canSubmit}
          onPress={submit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.submit, { backgroundColor: canSubmit ? colors.primary : colors.border }]}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Feather name="upload-cloud" size={19} color="#FFFFFF" />}
          <Text style={styles.submitText}>{t("dataCollection.submit")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 19, fontWeight: "800" },
  content: { padding: 20, gap: 18 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  row: { alignItems: "center", gap: 16 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 20 },
  privacyNote: { alignItems: "center", gap: 10, borderRadius: 12, padding: 12 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  options: { flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  submit: { minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
