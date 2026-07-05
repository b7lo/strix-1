import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  AlertTriangle,
  ArrowUpLeft,
  ArrowDownLeft,
  Clock,
  Car,
  FileBarChart,
  GitMerge,
  ShieldOff,
  Users,
  RefreshCw,
} from "lucide-react";
import DashboardAccidents from "./DashboardAccidents";
import DashboardAssessments from "./DashboardAssessments";
import DashboardMatched from "./DashboardMatched";
import DashboardFalseAlarms from "./DashboardFalseAlarms";
import DashboardLeads from "./DashboardLeads";
import StatsCards from "./StatsCards";
import Charts from "./Charts";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardStats } from "../../types/dashboard";

function formatGregorianDate(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "gregory",
  });
}

function formatGregorianTime(): string {
  return new Date().toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("accidents");
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
      setError(null);
    } catch {
      setError("تعذر الاتصال بالخادم. تأكد من تشغيل الخدمة.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">مرحباً بك في لوحة التحكم</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatGregorianDate()} — {formatGregorianTime()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            النظام متصل
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => loadStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destructive">خطأ في الاتصال</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="mr-auto text-xs shrink-0" onClick={() => loadStats()}>
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <StatsCards stats={stats} loading={loading} />

      {/* Main content grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Data tables section */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="border-b px-5 py-4 bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base font-semibold">البيانات التفصيلية</CardTitle>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="h-9 bg-muted p-1 gap-1">
                    <TabsTrigger value="accidents" className="text-xs px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <Car className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">الحوادث</span>
                    </TabsTrigger>
                    <TabsTrigger value="assessments" className="text-xs px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <FileBarChart className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تقييم نجم</span>
                    </TabsTrigger>
                    <TabsTrigger value="matched" className="text-xs px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <GitMerge className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">المشتركة</span>
                    </TabsTrigger>
                    <TabsTrigger value="false-alarms" className="text-xs px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <ShieldOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">المرفوضة</span>
                    </TabsTrigger>
                    <TabsTrigger value="leads" className="text-xs px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <Users className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">العملاء</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsContent value="accidents" className="m-0 border-0 p-0 focus-visible:outline-none">
                  <DashboardAccidents compact />
                </TabsContent>
                <TabsContent value="assessments" className="m-0 border-0 p-0 focus-visible:outline-none">
                  <DashboardAssessments compact />
                </TabsContent>
                <TabsContent value="matched" className="m-0 border-0 p-0 focus-visible:outline-none">
                  <DashboardMatched compact />
                </TabsContent>
                <TabsContent value="false-alarms" className="m-0 border-0 p-0 focus-visible:outline-none">
                  <DashboardFalseAlarms compact />
                </TabsContent>
                <TabsContent value="leads" className="m-0 border-0 p-0 focus-visible:outline-none">
                  <DashboardLeads compact />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Quick activity log */}
          <Card className="shadow-sm border-border">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                آخر الأنشطة
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-3">
                {[
                  { action: "تم رصد حادث جديد — منطقة الاصطدام: أمامي يسار", time: "منذ 5 دقائق", type: "accident" },
                  { action: "تم تحديث تقييم نجم — الفرق: 12%", time: "منذ 23 دقيقة", type: "assessment" },
                  { action: "تم رفض إنذار كاذب — السبب: اهتزاز خفيف", time: "منذ ساعة", type: "false-alarm" },
                  { action: "تم مطابقة حادث مشترك — نسبة التطابق: كامل", time: "منذ ساعتين", type: "matched" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm group">
                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                      item.type === "accident" ? "bg-primary" :
                      item.type === "assessment" ? "bg-chart-2" :
                      item.type === "false-alarm" ? "bg-destructive" :
                      "bg-chart-4"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/90 truncate">{item.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts sidebar */}
        <div className="xl:col-span-1">
          <Charts stats={stats} loading={loading} />
        </div>
      </div>
    </div>
  );
}
