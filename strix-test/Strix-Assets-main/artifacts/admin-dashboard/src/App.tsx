import { useState } from "react";
import { LayoutDashboard, Table, BarChart3, Cross, Bell } from "lucide-react";
import DashboardHome from "./components/mockups/DashboardHome";
import DashboardAccidents from "./components/mockups/DashboardAccidents";
import DashboardAssessments from "./components/mockups/DashboardAssessments";
import DashboardMatched from "./components/mockups/DashboardMatched";
import DashboardFalseAlarms from "./components/mockups/DashboardFalseAlarms";

type Page = "home" | "accidents" | "assessments" | "matched" | "false-alarms";

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "الرئيسية", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "accidents", label: "الحوادث", icon: <Table className="w-4 h-4" /> },
  { id: "assessments", label: "تقييم نجم", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "matched", label: "الحوادث المشتركة", icon: <Cross className="w-4 h-4" /> },
  { id: "false-alarms", label: "الإنذارات الكاذبة", icon: <Bell className="w-4 h-4" /> },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageComponents: Record<Page, React.ReactNode> = {
    home: <DashboardHome />,
    accidents: <DashboardAccidents />,
    assessments: <DashboardAssessments />,
    matched: <DashboardMatched />,
    "false-alarms": <DashboardFalseAlarms />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-card border-l border-border transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold text-primary">Strix</h1>
            <p className="text-xs text-muted-foreground">لوحة التحكم</p>
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  currentPage === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="w-4 h-4">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Strix Dashboard v2.0</p>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold text-primary">Strix</h1>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-secondary">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {pageComponents[currentPage]}
      </main>
    </div>
  );
}
