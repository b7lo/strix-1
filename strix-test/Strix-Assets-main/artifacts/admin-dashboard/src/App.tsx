import { useState, useCallback, useEffect } from "react";
import Sidebar, { type Page } from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Login from "./components/Login";
import { isAuthed, logout as authLogout } from "./lib/auth";
import DashboardHome from "./components/mockups/DashboardHome";
import DashboardAccidents from "./components/mockups/DashboardAccidents";
import DashboardAssessments from "./components/mockups/DashboardAssessments";
import DashboardMatched from "./components/mockups/DashboardMatched";
import DashboardFalseAlarms from "./components/mockups/DashboardFalseAlarms";
import DashboardLeads from "./components/mockups/DashboardLeads";
import { useTheme } from "./hooks/use-theme";
import { ScrollArea } from "./components/ui/scroll-area";
import {
  LayoutDashboard,
  Car,
  FileBarChart,
  GitMerge,
  ShieldOff,
  Users,
  X,
} from "lucide-react";

const mobileNavItems: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "accidents", label: "سجل الحوادث", icon: Car },
  { id: "assessments", label: "تقييمات نجم", icon: FileBarChart },
  { id: "matched", label: "الحوادث المشتركة", icon: GitMerge },
  { id: "false-alarms", label: "الإنذارات الكاذبة", icon: ShieldOff },
  { id: "leads", label: "العملاء المسجّلون", icon: Users },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean>(isAuthed());
  const { theme, setTheme, resolvedTheme } = useTheme();

  // عند انتهاء الجلسة/401 من أي طلب، نعيد المستخدم لشاشة الدخول
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener("strix:unauthorized", onUnauthorized);
    return () => window.removeEventListener("strix:unauthorized", onUnauthorized);
  }, []);

  const handleLogout = useCallback(() => {
    authLogout();
    setAuthed(false);
  }, []);

  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page);
    setMobileSidebarOpen(false);
  }, []);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  }, [resolvedTheme, setTheme]);

  const pageComponents: Record<Page, React.ReactNode> = {
    home: <DashboardHome />,
    accidents: <DashboardAccidents />,
    assessments: <DashboardAssessments />,
    matched: <DashboardMatched />,
    "false-alarms": <DashboardFalseAlarms />,
    leads: <DashboardLeads />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-72 bg-sidebar text-sidebar-foreground shadow-2xl lg:hidden flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <span className="font-bold text-sidebar-primary-foreground text-xs tracking-wider">ST</span>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-sidebar-primary-foreground">Strix</h1>
                  <p className="text-[10px] text-sidebar-foreground/60">لوحة التحكم</p>
                </div>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-sidebar-foreground/60 hover:bg-sidebar-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="flex-1 py-3 px-3">
              <div className="space-y-1">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`
                        w-full flex items-center gap-3 rounded-lg text-sm font-medium px-3 py-3 transition-colors
                        ${isActive
                          ? "bg-sidebar-accent text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-sidebar-primary" : ""}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          currentPage={currentPage}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto">
          {pageComponents[currentPage]}
        </main>
      </div>
    </div>
  );
}
