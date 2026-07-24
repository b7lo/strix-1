import React, { useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { router, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { setOnboardingSeen } from "@/lib/onboarding";

const { width } = Dimensions.get("window");

type Slide = { icon: keyof typeof Feather.glyphMap; titleKey: string; descKey: string };

const SLIDES: Slide[] = [
  { icon: "zap", titleKey: "onboarding.slide1Title", descKey: "onboarding.slide1Desc" },
  { icon: "target", titleKey: "onboarding.slide2Title", descKey: "onboarding.slide2Desc" },
  { icon: "file-text", titleKey: "onboarding.slide3Title", descKey: "onboarding.slide3Desc" },
  { icon: "shield", titleKey: "onboarding.slide4Title", descKey: "onboarding.slide4Desc" },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, rtl } = useLanguage();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index >= SLIDES.length - 1;

  const finish = useCallback(async () => {
    await setOnboardingSeen();
    router.replace("/(auth)/welcome" as unknown as Href);
  }, []);

  const onNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }, [index, isLast, finish]);

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* تخطّي */}
      <View style={[styles.topBar, { flexDirection: rtl.flexDirection }]}>
        <TouchableOpacity onPress={finish} accessibilityRole="button" hitSlop={10}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]} weight="600">{t("onboarding.skip")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((s) => (
          <View key={s.titleKey} style={[styles.slide, { width }]}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Feather name={s.icon} size={56} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.foreground }]} weight="800">
              {t(s.titleKey)}
            </Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>
              {t(s.descKey)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* النقاط */}
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View
            key={s.titleKey}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? colors.primary : colors.border,
                width: i === index ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* الزر */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={onNext} activeOpacity={0.85} accessibilityRole="button" style={styles.btnWrap}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnText} weight="700">
              {isLast ? t("onboarding.start") : t("onboarding.next")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingVertical: 8, justifyContent: "flex-end" },
  skip: { fontSize: 15 },
  pager: { flex: 1 },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 24 },
  badge: {
    width: 132, height: 132, borderRadius: 66, alignItems: "center", justifyContent: "center",
    shadowColor: "#1DB768", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
  },
  title: { fontSize: 24, textAlign: "center" },
  desc: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginVertical: 20 },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24 },
  btnWrap: { borderRadius: 14, overflow: "hidden" },
  btn: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, color: "#FFFFFF" },
});
