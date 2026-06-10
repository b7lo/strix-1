import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Activity, AlertTriangle, CheckCircle, Shield, FileText, Gauge } from "lucide-react";
import type { DashboardStats } from "../../types/dashboard";

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse border-slate-800/60 bg-slate-900/20">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="h-3 w-16 bg-slate-800 rounded" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-7 w-12 bg-slate-800 rounded mb-1.5" />
              <div className="h-2 w-20 bg-slate-800 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "إجمالي الحوادث",
      value: stats.totalAccidents,
      sub: "حادث مسجل بالكامل",
      icon: Activity,
      color: "text-blue-400",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:border-blue-500/30",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "إنذارات كاذبة",
      value: stats.totalFalseAlarms,
      sub: "تصفية تلقائية للإنذار",
      icon: Shield,
      color: "text-rose-400",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] group-hover:border-rose-500/30",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      title: "حوادث مشتركة",
      value: stats.totalMatchedAccidents,
      sub: "مطابقة متعددة الأطراف",
      icon: CheckCircle,
      color: "text-emerald-400",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:border-emerald-500/30",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "تقييمات نجم",
      value: stats.totalAssessments,
      sub: "تحليلات مقارنة المسؤولية",
      icon: FileText,
      color: "text-sky-400",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] group-hover:border-sky-500/30",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "متوسط الفرق",
      value: stats.averageNajmDifference !== null ? `${stats.averageNajmDifference.toFixed(1)}%` : "N/A",
      sub: "الانحراف مع تقدير نجم",
      icon: AlertTriangle,
      color: "text-amber-400",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:border-amber-500/30",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "متوسط القوة",
      value: `${stats.averageGForce.toFixed(2)} G`,
      sub: "شدة الاصطدام القصوى",
      icon: Gauge,
      color: "text-indigo-400",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] group-hover:border-indigo-500/30",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.title} 
            className={`group relative overflow-hidden border-slate-800 bg-slate-900/40 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${card.glowColor}`}
          >
            {/* Top border indicator */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-700 to-transparent group-hover:via-current opacity-70 ${card.color}`} />
            
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold text-slate-400">{card.title}</CardTitle>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-2xl font-bold tracking-tight ${card.color}`}>{card.value}</div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
