import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import DashboardAccidents from "./DashboardAccidents";
import DashboardAssessments from "./DashboardAssessments";
import DashboardMatched from "./DashboardMatched";
import DashboardFalseAlarms from "./DashboardFalseAlarms";
import StatsCards from "./StatsCards";
import Charts from "./Charts";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardStats } from "../../types/dashboard";
import { useEffect, useState as useStateFn } from "react";

export default function DashboardHome() {
  const [stats, setStats] = useStateFn<DashboardStats | null>(null);
  const [loading, setLoading] = useStateFn(true);
  const [error, setError] = useStateFn<string | null>(null);
  const [tab, setTab] = useStateFn("overview");

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
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">لوحة التحكم</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">نظرة عامة على الحوادث والتقييمات</p>
        </div>
        {!loading && stats && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            النظام محدث
          </div>
        )}
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      ) : (
        <StatsCards stats={stats} loading={loading} />
      )}

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">الحوادث</TabsTrigger>
              <TabsTrigger value="assessments">تقييم نجم</TabsTrigger>
              <TabsTrigger value="matched">مشتركة</TabsTrigger>
              <TabsTrigger value="false-alarms">إنذارات كاذبة</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <DashboardAccidents compact />
            </TabsContent>
            <TabsContent value="assessments" className="mt-4">
              <DashboardAssessments compact />
            </TabsContent>
            <TabsContent value="matched" className="mt-4">
              <DashboardMatched compact />
            </TabsContent>
            <TabsContent value="false-alarms" className="mt-4">
              <DashboardFalseAlarms compact />
            </TabsContent>
          </Tabs>
        </div>
        <div className="lg:col-span-3">
          <Charts stats={stats} loading={loading} />
        </div>
      </div>
    </div>
  );
}
