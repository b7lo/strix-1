import type {
  DashboardStats,
  DashboardAccident,
  DashboardAssessment,
  DashboardMatched,
  DashboardFalseAlarm,
  DashboardLead,
  PaginatedResponse,
} from "../types/dashboard";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/dashboard";

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  getAccidents: async (
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<DashboardAccident>> => {
    const res = await fetch(`${API_BASE}/accidents?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch accidents");
    return res.json();
  },

  getAssessments: async (
    page = 1,
    limit = 20
  ): Promise<{ data: DashboardAssessment[]; total: number; averageDifference: number | null }> => {
    const res = await fetch(`${API_BASE}/assessments?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch assessments");
    return res.json();
  },

  getMatched: async (
    page = 1,
    limit = 20
  ): Promise<{ data: DashboardMatched[]; total: number }> => {
    const res = await fetch(`${API_BASE}/matched?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch matched accidents");
    return res.json();
  },

  getFalseAlarms: async (
    page = 1,
    limit = 20
  ): Promise<{ data: DashboardFalseAlarm[]; total: number }> => {
    const res = await fetch(`${API_BASE}/false-alarms?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch false alarms");
    return res.json();
  },

  getLeads: async (
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<DashboardLead>> => {
    const res = await fetch(`${API_BASE}/leads?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch leads");
    return res.json();
  },
};
