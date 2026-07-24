import { Card, CardContent } from "../ui/card";
import { Activity, Shield, CheckCircle, FileText, AlertTriangle, Gauge, Users } from "lucide-react";
import type { DashboardStats } from "../../types/dashboard";

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i} className="shadow-sm border-border animate-pulse">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded-lg" />
              </div>
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "العملاء المسجّلون",
      value: Number(stats.totalLeads ?? 0).toLocaleString("ar-SA"),
      icon: Users,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "إجمالي الحوادث",
      value: stats.totalAccidents,
      icon: Activity,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "الإنذارات الكاذبة",
      value: stats.totalFalseAlarms,
      icon: Shield,
      iconBg: "bg-destructive/8",
      iconColor: "text-destructive",
    },
    {
      title: "حوادث مشتركة",
      value: stats.totalMatchedAccidents,
      icon: CheckCircle,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "تقييم الجهات الرسمية",
      value: stats.totalAssessments,
      icon: FileText,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "متوسط الانحراف",
      value: stats.averageNajmDifference !== null ? `${Number(stats.averageNajmDifference).toFixed(1)}%` : "—",
      icon: AlertTriangle,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      title: "متوسط القوة",
      value: `${Number(stats.averageGForce).toFixed(2)} G`,
      icon: Gauge,
      iconBg: "bg-chart-4/10",
      iconColor: "text-chart-4",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className="shadow-sm border-border hover:shadow-md transition-shadow duration-200 group"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className={`w-[18px] h-[18px] ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{card.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
