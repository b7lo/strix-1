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
import { Stack } from "expo-router";
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
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { initI18n } from "@/lib/i18n";
import { ensureLTRNativeBase } from "@/lib/rtl";
import { initRemoteConfig } from "@/lib/remoteConfig";
import { flushSyncQueue } from "@/lib/accidentSync";

// Initialize background tasks early
import "@/lib/backgroundTasks";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="session"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen name="report/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="settings-detection" options={{ headerShown: false }} />
      <Stack.Screen name="settings-about" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
    </Stack>
  );
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
                <AppShell />
              </SessionProvider>
            </ReportsProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
