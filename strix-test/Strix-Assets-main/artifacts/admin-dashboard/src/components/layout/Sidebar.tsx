import { useState, useCallback } from "react";
import {
  LayoutDashboard,
  Car,
  FileBarChart,
  GitMerge,
  ShieldOff,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { ScrollArea } from "../ui/scroll-area";

export type Page = "home" | "accidents" | "assessments" | "matched" | "false-alarms";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navGroups = [
  {
    label: "الرئيسية",
    items: [
      { id: "home" as Page, label: "نظرة عامة", icon: LayoutDashboard },
    ],
  },
  {
    label: "إدارة البيانات",
    items: [
      { id: "accidents" as Page, label: "سجل الحوادث", icon: Car },
      { id: "assessments" as Page, label: "تقييمات نجم", icon: FileBarChart },
      { id: "matched" as Page, label: "الحوادث المشتركة", icon: GitMerge },
      { id: "false-alarms" as Page, label: "الإنذارات الكاذبة", icon: ShieldOff },
    ],
  },
];

const bottomItems = [
  { id: "settings", label: "الإعدادات", icon: Settings },
  { id: "help", label: "المساعدة", icon: HelpCircle },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`
          hidden lg:flex flex-col h-screen sticky top-0
          bg-sidebar text-sidebar-foreground border-l border-sidebar-border
          sidebar-transition z-40
          ${collapsed ? "w-[68px]" : "w-[260px]"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-2" : "px-5"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
              <span className="font-bold text-sidebar-primary-foreground text-sm tracking-wider">ST</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-primary-foreground leading-tight truncate">Strix</h1>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">لوحة التحكم الإدارية</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className={`space-y-5 ${collapsed ? "px-2" : "px-3"}`}>
            {navGroups.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-2 px-3">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    const btn = (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`
                          w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150
                          ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}
                          ${isActive
                            ? "bg-sidebar-accent text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
                        `}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {isActive && !collapsed && (
                          <div className="mr-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                        )}
                      </button>
                    );

                    if (collapsed) {
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return btn;
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom actions */}
        <div className={`border-t border-sidebar-border py-2 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const btn = (
              <button
                key={item.id}
                className={`
                  w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150
                  text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground
                  ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}
                `}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="w-8 h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
