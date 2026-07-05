import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, I18nManager } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

/**
 * U-8: شريط تنقّل سفلي حقيقي (الرئيسية / السجل / الإعدادات).
 * RTL: نعكس ترتيب تعريف التبويبات في العربية ليظهر الترتيب:
 *   الرئيسية (يمين) ← السجل ← الإعدادات (يسار).
 * نثبّت initialRouteName="index" حتى تبقى الرئيسية شاشة البداية مهما كان الترتيب.
 *
 * شريط التبويبات صفٌّ أفقي يقوم React Native بقلبه تلقائيًا عندما تكون قاعدة
 * التخطيط الأصلية RTL (جهاز عربي، I18nManager.isRTL === true). لذلك نعكس ترتيب
 * التبويبات يدويًا فقط عند effectiveFlip = isRTL XOR I18nManager.isRTL، حتى
 * يُطبَّق الاتجاه مرة واحدة بلا انعكاس مزدوج. على أجهزة LTR والويب يساوي
 * السلوك السابق تمامًا.
 */
export default function TabLayout() {
  const colors = useColors();
  const { t, isRTL } = useLanguage();

  const homeTab = (
    <Tabs.Screen
      key="index"
      name="index"
      options={{
        title: t("nav.home"),
        tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
      }}
    />
  );
  const logTab = (
    <Tabs.Screen
      key="log"
      name="log"
      options={{
        title: t("nav.log"),
        tabBarIcon: ({ color, size }) => <Feather name="list" size={size} color={color} />,
      }}
    />
  );
  const settingsTab = (
    <Tabs.Screen
      key="settings"
      name="settings"
      options={{
        title: t("nav.settings"),
        tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
      }}
    />
  );

  // الترتيب البصري من اليسار لليمين — واعٍ بقاعدة الاتجاه الأصلية للنظام
  const effectiveFlip = isRTL !== I18nManager.isRTL;
  const order = effectiveFlip ? [settingsTab, logTab, homeTab] : [homeTab, logTab, settingsTab];

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {order}
    </Tabs>
  );
}
