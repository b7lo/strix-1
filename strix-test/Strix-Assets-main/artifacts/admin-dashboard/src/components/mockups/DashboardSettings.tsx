import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Bell, Lock, Palette, Database } from "lucide-react";

export default function DashboardSettings() {
  const [settings, setSettings] = useState({
    notificationsEmail: true,
    notificationsSMS: false,
    reportFrequency: "daily",
    dataRetention: "12",
    darkMode: false,
    language: "ar",
  });

  const handleSwitchChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    console.log("Settings saved:", settings);
    // Here you would typically make an API call to save settings
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
                checked={settings.darkMode}
                onCheckedChange={(value) => handleSwitchChange("darkMode", value)}
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
      <div className="flex gap-3 max-w-4xl">
        <Button onClick={handleSave} className="px-8">
          حفظ التغييرات
        </Button>
        <Button variant="outline" className="px-8">
          إلغاء
        </Button>
      </div>
    </div>
  );
}
