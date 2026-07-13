import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Bell, Lock, Palette, Database, Check } from "lucide-react";
import { useTheme } from "../../hooks/use-theme";

const SETTINGS_STORAGE_KEY = "strix-dashboard-settings";

interface DashboardPreferences {
  notificationsEmail: boolean;
  notificationsSMS: boolean;
  reportFrequency: string;
  dataRetention: string;
  language: string;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  notificationsEmail: true,
  notificationsSMS: false,
  reportFrequency: "daily",
  dataRetention: "12",
  language: "ar",
};

function loadPreferences(): DashboardPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export default function DashboardSettings() {
  const { resolvedTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<DashboardPreferences>(loadPreferences);
  const [saved, setSaved] = useState(false);

  // إخفاء رسالة التأكيد تلقائياً بعد لحظات.
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(t);
  }, [saved]);

  const handleSwitchChange = (key: keyof DashboardPreferences, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSelectChange = (key: keyof DashboardPreferences, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
    } catch (e) {
      console.error("تعذّر حفظ الإعدادات", e);
    }
  };

  const handleReset = () => {
    setSettings(loadPreferences());
    setSaved(false);
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة تفضيلات لوحة التحكم والإشعارات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
        {/* Notifications Settings */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">الإشعارات</h2>
              <p className="text-xs text-muted-foreground">اختر كيفية تلقيك للتنبيهات</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-sm">إشعارات البريد الإلكتروني</Label>
              <Switch
                checked={settings.notificationsEmail}
                onCheckedChange={(value) => handleSwitchChange("notificationsEmail", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-medium text-sm">إشعارات الرسائل النصية</Label>
              <Switch
                checked={settings.notificationsSMS}
                onCheckedChange={(value) => handleSwitchChange("notificationsSMS", value)}
              />
            </div>

            <div>
              <Label className="font-medium text-sm block mb-2">تكرار التقارير</Label>
              <Select value={settings.reportFrequency} onValueChange={(value) => handleSelectChange("reportFrequency", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Settings */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">البيانات</h2>
              <p className="text-xs text-muted-foreground">إدارة الاحتفاظ بالبيانات</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="font-medium text-sm block mb-2">مدة الاحتفاظ بالبيانات (بالأشهر)</Label>
              <Select value={settings.dataRetention} onValueChange={(value) => handleSelectChange("dataRetention", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 أشهر</SelectItem>
                  <SelectItem value="6">6 أشهر</SelectItem>
                  <SelectItem value="12">12 شهر</SelectItem>
                  <SelectItem value="24">24 شهر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 text-xs text-muted-foreground bg-muted p-3 rounded">
              البيانات الأقدم من المدة المحددة سيتم حذفها تلقائياً
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">المظهر</h2>
              <p className="text-xs text-muted-foreground">تخصيص مظهر الواجهة</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-sm">الوضع الليلي</Label>
              <Switch
                checked={resolvedTheme === "dark"}
                onCheckedChange={(value) => setTheme(value ? "dark" : "light")}
              />
            </div>

            <div>
              <Label className="font-medium text-sm block mb-2">اللغة</Label>
              <Select value={settings.language} onValueChange={(value) => handleSelectChange("language", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">الأمان</h2>
              <p className="text-xs text-muted-foreground">إدارة خيارات الأمان</p>
            </div>
          </div>

          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              تغيير كلمة المرور
            </Button>
            <Button variant="outline" className="w-full justify-start">
              جلسات نشطة
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 max-w-4xl">
        <Button onClick={handleSave} className="px-8">
          حفظ التغييرات
        </Button>
        <Button variant="outline" className="px-8" onClick={handleReset}>
          إلغاء
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <Check className="w-4 h-4" />
            تم حفظ الإعدادات
          </span>
        )}
      </div>
    </div>
  );
}
