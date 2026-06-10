import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";

const LIABILITY_OPTIONS = [100, 75, 50, 25, 0];

export default function AssessmentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { reports, updateReport } = useReports();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const report = reports.find((r) => r.id === id) ?? null;

  const initialNajm = report?.faultAssessment?.najmLiability ?? null;
  const initialDesc = report?.faultAssessment?.userDescription ?? "";

  const [najmLiability, setNajmLiability] = useState<number | null>(initialNajm);
  const [description, setDescription] = useState<string>(initialDesc);
  const [isSaving, setIsSaving] = useState(false);

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
    if (najmLiability === null) {
      Alert.alert("تنبيه", "الرجاء اختيار نسبة خطأ نجم");
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
          createdAt: report.faultAssessment?.createdAt ?? Date.now(),
        },
      };
      
      await updateReport(updatedReport);
      Alert.alert("نجاح", "تم حفظ التقييم بنجاح", [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ التقييم");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          مقارنة تقدير نجم
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Liability (US1) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            تقدير التطبيق
          </Text>
          <View style={styles.liabilityRow}>
            <View style={styles.liabilityBox}>
              <Text style={[styles.liabilityVal, { color: colors.primary }]}>
                {mappedAppLiability}%
              </Text>
              <Text style={[styles.liabilityLbl, { color: colors.mutedForeground }]}>
                نسبة الخطأ عليك
              </Text>
            </View>
            <View style={[styles.liabilityBox, { borderRightWidth: 1, borderRightColor: colors.border }]}>
              <Text style={[styles.liabilityVal, { color: colors.secondaryForeground }]}>
                {100 - mappedAppLiability}%
              </Text>
              <Text style={[styles.liabilityLbl, { color: colors.mutedForeground }]}>
                على الطرف الآخر
              </Text>
            </View>
          </View>
        </View>

        {/* Najm Liability Input (US2) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            تقدير نجم الفعلي
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            اختر نسبة الخطأ عليك حسب تقرير نجم
          </Text>
          <View style={styles.optionsRow}>
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
                  ? "تقدير التطبيق مطابق لتقدير نجم ✓"
                  : `الفرق بين التطبيق ونجم: ${Math.abs(signedDifference)}%`}
              </Text>
            </View>
          )}
        </View>

        {/* User Description (US3) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            ملاحظات إضافية (اختياري)
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
            placeholder="اكتب تفاصيل إضافية حول الحادث أو سبب الاختلاف..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlign="right"
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
          <Text style={styles.saveBtnText}>حفظ التقييم</Text>
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
    textAlign: "right",
  },
  sectionSub: {
    fontSize: 13,
    textAlign: "right",
    marginTop: -6,
  },
  liabilityRow: {
    flexDirection: "row-reverse",
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
    flexDirection: "row-reverse",
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
