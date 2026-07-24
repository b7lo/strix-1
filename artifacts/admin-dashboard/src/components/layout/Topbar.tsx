import {
  Bell,
  Sun,
  Moon,
  Menu,
  User,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { Page } from "./Sidebar";

interface TopbarProps {
  currentPage: Page;
  theme: "light" | "dark" | "system";
  onToggleTheme: () => void;
  onOpenMobileSidebar: () => void;
  onLogout?: () => void;
}

const pageLabels: Record<Page, string> = {
  home: "نظرة عامة",
  accidents: "سجل الحوادث",
  assessments: "تقييم الجهات الرسمية",
  matched: "الحوادث المشتركة",
  "false-alarms": "الإنذارات الكاذبة",
  leads: "العملاء المسجّلون",
  settings: "الإعدادات",
};

function formatGregorianDate(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "gregory",
  });
}

export default function Topbar({ currentPage, theme, onToggleTheme, onOpenMobileSidebar, onLogout }: TopbarProps) {
  const resolvedTheme = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Right side: Mobile menu + breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden w-9 h-9"
            onClick={onOpenMobileSidebar}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-[10px] tracking-wider">ST</span>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">لوحة التحكم</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-medium text-foreground">{pageLabels[currentPage]}</span>
          </div>
        </div>

        {/* Left side: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground relative">
                <Bell className="w-[18px] h-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-semibold">الإشعارات</p>
              </div>
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                لا توجد إشعارات جديدة
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date display */}
          <div className="hidden xl:flex items-center text-xs text-muted-foreground px-2">
            {formatGregorianDate()}
          </div>

          <div className="w-px h-6 bg-border hidden sm:block" />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="w-9 h-9 text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === "light" ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2 text-sm">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-foreground font-medium">المشرف</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-semibold">المشرف العام</p>
                <p className="text-xs text-muted-foreground">admin@strixsa.com</p>
              </div>
              <DropdownMenuItem className="gap-2 text-destructive cursor-pointer" onClick={onLogout}>
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
