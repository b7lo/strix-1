import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import DashboardAccidents from "./DashboardAccidents";
import DashboardAssessments from "./DashboardAssessments";
import DashboardMatched from "./DashboardMatched";
import DashboardFalseAlarms from "./DashboardFalseAlarms";
import StatsCards from "./StatsCards";
import Charts from "./Charts";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardStats } from "../../types/dashboard";

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (err) {
        setError("تعذر تحميل الإحصائيات");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-radial from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-12">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-black text-white text-lg tracking-wider">ST</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Strix Control Center
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">لوحة التحكم والمراقبة الذكية للحوادث</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!loading && stats && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                مراقبة حية نشطة
              </div>
            )}
            <div className="text-left hidden md:block">
              <div className="text-xs text-slate-400">التاريخ اليوم</div>
              <div className="text-xs font-semibold text-slate-200">
                {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {error ? (
          <Card className="border-red-500/20 bg-red-950/10 backdrop-blur-sm">
            <CardContent className="p-6 text-red-400 text-sm flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </CardContent>
          </Card>
        ) : (
          <StatsCards stats={stats} loading={loading} />
        )}

        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 flex-wrap gap-3">
                    <TabsList className="bg-slate-950/60 border border-slate-800 p-1 rounded-xl">
                      <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
                        الحوادث
                      </TabsTrigger>
                      <TabsTrigger value="assessments" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
                        تقييم نجم
                      </TabsTrigger>
                      <TabsTrigger value="matched" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
                        مشتركة
                      </TabsTrigger>
                      <TabsTrigger value="false-alarms" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
                        إنذارات كاذبة
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                    <DashboardAccidents compact />
                  </TabsContent>
                  <TabsContent value="assessments" className="mt-0 focus-visible:outline-none">
                    <DashboardAssessments compact />
                  </TabsContent>
                  <TabsContent value="matched" className="mt-0 focus-visible:outline-none">
                    <DashboardMatched compact />
                  </TabsContent>
                  <TabsContent value="false-alarms" className="mt-0 focus-visible:outline-none">
                    <DashboardFalseAlarms compact />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
            <Charts stats={stats} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}
