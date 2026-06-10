import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import type { DashboardStats } from "../../types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ChartsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#06b6d4"];

export default function Charts({ stats, loading }: ChartsProps) {
  if (loading || !stats) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse border-slate-800/60 bg-slate-900/20">
            <CardContent className="p-6">
              <div className="h-[140px] bg-slate-800/50 rounded-lg" />
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

  return (
    <div className="space-y-4">
      {dayData.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2 px-4 pt-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-400">نشاط الحوادث (آخر 30 يوم)</CardTitle>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData}>
                  <defs>
                    <linearGradient id="accidentsGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(15, 23, 42, 0.9)", 
                      border: "1px solid #1e293b", 
                      borderRadius: "10px", 
                      fontSize: "11px",
                      color: "#f8fafc"
                    }} 
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#accidentsGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold text-slate-400">توزيع شدة الاصطدامات</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={severityData} 
                    cx="50%" 
                    cy="45%" 
                    innerRadius={45} 
                    outerRadius={60} 
                    paddingAngle={4} 
                    dataKey="value"
                  >
                    {severityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(15, 23, 42, 0.9)", 
                      border: "1px solid #1e293b", 
                      borderRadius: "10px", 
                      fontSize: "11px",
                      color: "#f8fafc"
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold text-slate-400">أكثر مناطق تعرضاً للاصطدام</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(15, 23, 42, 0.9)", 
                      border: "1px solid #1e293b", 
                      borderRadius: "10px", 
                      fontSize: "11px",
                      color: "#f8fafc"
                    }} 
                  />
                  <Bar dataKey="count" fill="url(#barGlow)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
