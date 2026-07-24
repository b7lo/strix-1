import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import type { DashboardStats } from "../../types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ChartsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const CHART_COLORS = [
  "hsl(213, 56%, 32%)",  // Navy
  "hsl(152, 56%, 39%)",  // Green
  "hsl(38, 92%, 50%)",   // Amber
  "hsl(262, 52%, 47%)",  // Purple
  "hsl(0, 72%, 51%)",    // Red
  "hsl(200, 60%, 45%)",  // Teal
];

export default function Charts({ stats, loading }: ChartsProps) {
  if (loading || !stats) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm border-border animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[160px] bg-muted rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const severityData = stats.accidentsBySeverity.map(item => ({
    name: { critical: "حرج", severe: "شديد", moderate: "متوسط", minor: "طفيف" }[item.severity] || item.severity,
    value: item.count,
  }));

  const zoneData = stats.accidentsByImpactZone.map(item => ({
    name: item.zone.replace(/-/g, " "),
    count: item.count,
  }));

  const dayData = stats.accidentsByDay?.length
    ? stats.accidentsByDay.map(d => ({ date: d.date.slice(5), count: d.count }))
    : [];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(var(--card-foreground))",
    boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
    padding: "8px 12px",
  };

  return (
    <div className="space-y-4">
      {/* Area chart: Accidents over time */}
      {dayData.length > 0 && (
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">نشاط الحوادث</CardTitle>
            <p className="text-xs text-muted-foreground">آخر 30 يوم</p>
          </CardHeader>
          <CardContent className="px-2 pb-4 pt-2">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(213, 56%, 32%)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(213, 56%, 32%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="hsl(213, 56%, 32%)" strokeWidth={2} fill="url(#areaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie chart: Severity distribution */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-0 px-5 pt-5">
          <CardTitle className="text-sm font-semibold">توزيع شدة الاصطدامات</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4 pt-2">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="45%"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {severityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar chart: Impact zones */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-0 px-5 pt-5">
          <CardTitle className="text-sm font-semibold">مناطق الاصطدام الشائعة</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4 pt-2">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                <Bar dataKey="count" fill="hsl(213, 56%, 32%)" radius={[3, 3, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
