import React, { useEffect, useState } from "react";
import StatsCards from "./StatsCards";
import DashboardAccidents from "./DashboardAccidents";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardStats } from "../../types/dashboard";

import Charts from "./Charts";

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (err) {
        setError("Failed to load dashboard statistics.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Strix Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of accident telemetry, cross-verification, and fault assessments.
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          {error}
        </div>
      ) : (
        <StatsCards stats={stats} loading={loading} />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <DashboardAccidents />
        </div>
        <div className="col-span-3">
          <Charts stats={stats} loading={loading} />
        </div>
      </div>
    </div>
  );
}
