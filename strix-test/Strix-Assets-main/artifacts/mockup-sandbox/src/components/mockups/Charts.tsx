import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import type { DashboardStats } from "../../types/dashboard";

interface ChartsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Charts({ stats, loading }: ChartsProps) {
  if (loading || !stats) {
    return (
      <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-md border flex items-center justify-center">
        <span className="text-muted-foreground">Loading charts...</span>
      </div>
    );
  }

  const severityData = stats.accidentsBySeverity.map(item => ({
    name: item.severity,
    value: item.count
  }));

  const zoneData = stats.accidentsByImpactZone.map(item => ({
    name: item.zone.replace('_', ' '),
    count: item.count
  }));

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="rounded-md border bg-card text-card-foreground shadow-sm p-4 flex-1">
        <h3 className="font-semibold mb-4 text-sm">Accidents by Severity</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm p-4 flex-1">
        <h3 className="font-semibold mb-4 text-sm">Impact Zones</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={zoneData}
              margin={{
                top: 5,
                right: 30,
                left: -20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
