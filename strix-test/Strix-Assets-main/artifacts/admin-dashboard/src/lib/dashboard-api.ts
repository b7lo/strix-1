import type {
  DashboardStats,
  DashboardAccident,
  DashboardAssessment,
  DashboardMatched,
  DashboardFalseAlarm,
  DashboardLead,
  AccidentDetail,
  PaginatedResponse,
} from "../types/dashboard";
import { authedFetch } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/dashboard";

/** يبني سلسلة الاستعلام مع تجاهل القيم الفارغة. */
function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await authedFetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  getAccidents: async (
    page = 1,
    limit = 20,
    opts: { search?: string; severity?: string } = {}
  ): Promise<PaginatedResponse<DashboardAccident>> => {
    const res = await authedFetch(
      `${API_BASE}/accidents${qs({ page, limit, search: opts.search, severity: opts.severity })}`
    );
    if (!res.ok) throw new Error("Failed to fetch accidents");
    return res.json();
  },

  getAccidentDetail: async (id: string): Promise<AccidentDetail> => {
    const res = await authedFetch(`${API_BASE}/accidents/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to fetch accident detail");
    return res.json();
  },

  getAssessments: async (
    page = 1,
    limit = 20,
    opts: { search?: string } = {}
  ): Promise<{ data: DashboardAssessment[]; total: number; averageDifference: number | null }> => {
    const res = await authedFetch(`${API_BASE}/assessments${qs({ page, limit, search: opts.search })}`);
    if (!res.ok) throw new Error("Failed to fetch assessments");
    return res.json();
  },

  getMatched: async (
    page = 1,
    limit = 20,
    opts: { search?: string } = {}
  ): Promise<{ data: DashboardMatched[]; total: number }> => {
    const res = await authedFetch(`${API_BASE}/matched${qs({ page, limit, search: opts.search })}`);
    if (!res.ok) throw new Error("Failed to fetch matched accidents");
    return res.json();
  },

  getFalseAlarms: async (
    page = 1,
    limit = 20,
    opts: { search?: string } = {}
  ): Promise<{ data: DashboardFalseAlarm[]; total: number }> => {
    const res = await authedFetch(`${API_BASE}/false-alarms${qs({ page, limit, search: opts.search })}`);
    if (!res.ok) throw new Error("Failed to fetch false alarms");
    return res.json();
  },

  getLeads: async (
    page = 1,
    limit = 20,
    opts: { search?: string } = {}
  ): Promise<PaginatedResponse<DashboardLead>> => {
    const res = await authedFetch(`${API_BASE}/leads${qs({ page, limit, search: opts.search })}`);
    if (!res.ok) throw new Error("Failed to fetch leads");
    return res.json();
  },
};
