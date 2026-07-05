import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AccidentReport } from "@/lib/types";
import {
  saveReport,
  updateReport as updateStoredReport,
  getReports,
  updateReportFeedback,
  deleteReport,
  getContacts,
  saveContacts,
  getSettings,
  saveSettings,
  clearAllReports,
  type EmergencyContact,
  type AppSettings,
} from "@/lib/storage";
import { MOCK_REPORTS } from "@/lib/mockData";

interface ReportsContextValue {
  reports: AccidentReport[];
  contacts: EmergencyContact[];
  settings: AppSettings;
  isLoaded: boolean;
  loadAll: () => Promise<void>;
  addReport: (report: AccidentReport) => Promise<void>;
  updateReport: (report: AccidentReport) => Promise<void>;
  submitFeedback: (id: string, feedback: "correct" | "incorrect") => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  clearAllReports: () => Promise<void>;
  updateContacts: (contacts: EmergencyContact[]) => Promise<void>;
  updateSettings: (s: AppSettings) => Promise<void>;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<AccidentReport[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    crashThresholdG: 2.0,
    autoAlertEnabled: true,
    sampleRateHz: 100,
    gyroscopeEnabled: true,
    gyroscopeThreshold: 80,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const loadAll = useCallback(async () => {
    const [r, c, s] = await Promise.all([
      getReports(),
      getContacts(),
      getSettings(),
    ]);

    const initialReports = r;

    setReports(initialReports);
    setContacts(c);
    setSettings(s);
    setIsLoaded(true);
  }, []);

  const addReport = useCallback(async (report: AccidentReport) => {
    await saveReport(report);
    setReports((prev) => {
      if (prev.some((r) => r.id === report.id)) return prev;
      return [report, ...prev];
    });
  }, []);

  const updateReport = useCallback(async (report: AccidentReport) => {
    await updateStoredReport(report);
    // مزامنة التحديث مع قاعدة البيانات السحابية (Supabase)
    try {
      const { syncReportUpdate } = require("../lib/accidentSync");
      await syncReportUpdate(report);
    } catch (e) {
      console.warn("Failed to sync report update to server", e);
    }
    setReports((prev) => {
      let found = false;
      const updated = prev.map((r) => {
        if (r.id !== report.id) return r;
        found = true;
        return report;
      });

      return found ? updated : [report, ...prev];
    });
  }, []);

  const submitFeedback = useCallback(
    async (id: string, feedback: "correct" | "incorrect") => {
      await updateReportFeedback(id, feedback);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, feedback } : r))
      );
    },
    []
  );

  const removeReport = useCallback(async (id: string) => {
    await deleteReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClearAllReports = useCallback(async () => {
    await clearAllReports();
    setReports([]);
  }, []);

  const updateContacts = useCallback(
    async (newContacts: EmergencyContact[]) => {
      await saveContacts(newContacts);
      setContacts(newContacts);
    },
    []
  );

  const updateSettings = useCallback(async (s: AppSettings) => {
    await saveSettings(s);
    setSettings(s);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <ReportsContext.Provider
      value={{
        reports,
        contacts,
        settings,
        isLoaded,
        loadAll,
        addReport,
        updateReport,
        submitFeedback,
        removeReport,
        clearAllReports: handleClearAllReports,
        updateContacts,
        updateSettings,
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within ReportsProvider");
  return ctx;
}
