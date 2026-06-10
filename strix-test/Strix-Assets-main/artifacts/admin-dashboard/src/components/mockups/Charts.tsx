import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import type { DashboardStats } from "../../types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ChartsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#8b5cf6", "#06b6d4"];

export default function Charts({ stats, loading }: ChartsProps) {
  if (loading || !stats) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4"><div className="h-[180px] bg-muted rounded" /></CardContent>
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

  return (
    <div className="space-y-4">
      {dayData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">الحوادث خلال آخر 30 يوم</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">توزيع الشدة</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={3} dataKey="value">
                  {severityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">مناطق الاصطدام</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
