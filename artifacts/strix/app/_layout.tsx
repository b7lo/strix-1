import "react-native-gesture-handler";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, I18nManager } from "react-native";

// Force React Native's native RTL off as early as possible since we handle RTL
// layout styling manually. On an Arabic *device* this alone does NOT flip
// I18nManager.isRTL for the current session — ensureLTRNativeBase() (called at
// startup) reloads once so the forced-LTR base takes effect, making the app
// independent of the device language.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReportsProvider } from "@/context/ReportsContext";
import { SessionProvider } from "@/context/SessionContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { initI18n } from "@/lib/i18n";
import { ensureLTRNativeBase } from "@/lib/rtl";
import { initRemoteConfig } from "@/lib/remoteConfig";
import { flushSyncQueue } from "@/lib/accidentSync";
import { getOnboardingSeen } from "@/lib/onboarding";

// Initialize background tasks early
import "@/lib/backgroundTasks";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="session"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen name="report/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
      <Stack.Screen name="settings-detection" options={{ headerShown: false }} />
      <Stack.Screen name="settings-about" options={{ headerShown: false }} />
      <Stack.Screen name="data-collection" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * حارس التنقّل (auth guard) — المتطلبات 6.1، 6.2، 7.3.
 *  ─ المصادقة إلزامية (د1): غير المسجّل يُوجَّه لمجموعة (auth).
 *  ─ المسجّل بملف ناقص (مثل مستخدم Apple لأول مرة) يُوجَّه لـ complete-profile.
 *  ─ المسجّل مكتمل الملف يُوجَّه بعيداً عن شاشات (auth) للرئيسية.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, profileComplete, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  // نحمّل علم "شاهد الترحيب" مرة واحدة عند الإقلاع.
  useEffect(() => {
    getOnboardingSeen().then(setOnboardingSeen);
  }, []);

  useEffect(() => {
    if (loading || onboardingSeen === null) return;

    const onOnboarding = (segments[0] as string) === "onboarding";
    const inAuthGroup = segments[0] === "(auth)";
    const onCompleteProfile = segments[1] === "complete-profile";

    if (!session) {
      // نبقي المستخدم على شاشة الترحيب إن كان داخلها (لا نطرده منها).
      if (onOnboarding) return;
      // أول فتح (لم يشاهد الترحيب بعد) → شاشات الترحيب.
      if (!onboardingSeen && !inAuthGroup) {
        router.replace("/onboarding" as unknown as Href);
        return;
      }
      // غير مسجّل → شاشة الاختيار (welcome) ضمن مجموعة (auth).
      if (!inAuthGroup) router.replace("/(auth)/welcome" as unknown as Href);
      return;
    }

    // مسجّل لكن ملفه ناقص → إجبار إكمال الملف.
    // شرط `profile` مهم: لو تعذّر تحميل الملف (مثلاً دون إنترنت) يكون `profile === null`
    // فلا نحبس المستخدم في شاشة الإكمال؛ نتركه يدخل التطبيق (المراقبة تعمل دون إنترنت).
    if (profile && !profileComplete) {
      if (!onCompleteProfile) router.replace("/(auth)/complete-profile");
      return;
    }

    // مسجّل ومكتمل → لا يبقى في شاشات (auth).
    if (inAuthGroup) router.replace("/(tabs)");
  }, [session, profile, profileComplete, loading, segments, router]);

  return <>{children}</>;
}

function AppShell() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <RootLayoutNav />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  const [i18nReady, setI18nReady] = useState(false);

  // Guarantee an LTR native base (reloading once on RTL devices), then
  // initialize i18n (device locale detection + SecureStore read) before render.
  useEffect(() => {
    (async () => {
      const reloading = await ensureLTRNativeBase();
      if (reloading) return; // app is about to reload; skip further init
      // Remote Config (best-effort): يعاير العتبات من الخادم مع بقاء الافتراضيات
      await initRemoteConfig().catch(() => {});
      await initI18n();
      setI18nReady(true);
    })();
    flushSyncQueue().catch(console.error);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return <View style={{ flex: 1, backgroundColor: "#0D1117" }} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <ReportsProvider>
              <SessionProvider>
                <AuthProvider>
                  <AuthGate>
                    <AppShell />
                  </AuthGate>
                </AuthProvider>
              </SessionProvider>
            </ReportsProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
