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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="h-3 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-7 w-12 bg-muted rounded mb-1" />
              <div className="h-2 w-24 bg-muted rounded" />
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
      sub: "حادث مسجل",
      icon: Activity,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "إنذارات كاذبة",
      value: stats.totalFalseAlarms,
      sub: "تم تصفيتها",
      icon: Shield,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "حوادث مشتركة",
      value: stats.totalMatchedAccidents,
      sub: "مطابقة بين طرفين",
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      title: "تقييمات نجم",
      value: stats.totalAssessments,
      sub: "مقارنة مكتملة",
      icon: FileText,
      color: "text-sky-400",
      bg: "bg-sky-400/10",
    },
    {
      title: "متوسط الفرق",
      value: stats.averageNajmDifference !== null ? `${stats.averageNajmDifference.toFixed(1)}%` : "N/A",
      sub: "التطبيق vs نجم",
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      title: "متوسط القوة",
      value: `${stats.averageGForce.toFixed(2)} G`,
      sub: "معدل G-Force",
      icon: Gauge,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border-border/50 hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-1.5 rounded-md ${card.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-xl font-bold tracking-tight ${card.color}`}>{card.value}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
