import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { SummaryTab } from "@/components/dashboard/SummaryTab";
import { RevenueTab } from "@/components/dashboard/RevenueTab";
import { PerformersTab } from "@/components/dashboard/PerformersTab";
import { ReportsTab } from "@/components/dashboard/ReportsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { GuestsTab } from "@/components/dashboard/GuestsTab";
import { StageManagementTab } from "@/components/dashboard/StageManagementTab";
import { KiosksTab } from "@/components/dashboard/KiosksTab";
import { LogsTab } from "@/components/dashboard/LogsTab";
import { useAuth } from "@/hooks/useAuth";

const tabs = ["Summary", "Revenue", "Performers", "Guests", "Stage", "Reports", "Logs", "Settings", "Kiosks"] as const;
type Tab = typeof tabs[number];

const OWNER_MANAGER_TABS: Tab[] = ["Logs", "Settings", "Kiosks"];

const TAB_TITLES: Record<Tab, string> = {
  Summary:    "Dashboard",
  Revenue:    "Revenue",
  Performers: "Dancers",
  Guests:     "Guests",
  Stage:      "Stage Management",
  Reports:    "Reports",
  Logs:       "Staff Action Logs",
  Settings:   "Settings",
  Kiosks:     "Active Kiosks",
};

function useCurrentTime() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Dashboard({ defaultTab }: { defaultTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab ?? "Summary");
  // Track which tabs have been visited — once mounted, keep them alive (avoids re-fetch on switch)
  const [mounted, setMounted] = useState<Set<Tab>>(() => new Set([defaultTab ?? "Summary"]));
  const { user, role } = useAuth();
  const time = useCurrentTime();

  // Sync active tab when the route changes (e.g. /stage → /reports renders same component)
  useEffect(() => {
    const tab = defaultTab ?? "Summary";
    setActiveTab(tab);
    setMounted(prev => prev.has(tab) ? prev : new Set([...prev, tab]));
  }, [defaultTab]);

  const isOwnerManager = role === "admin" || role === "owner" || role === "manager";
  const visibleTabs = tabs.filter(t => !OWNER_MANAGER_TABS.includes(t) || isOwnerManager);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setMounted(prev => prev.has(tab) ? prev : new Set([...prev, tab]));
  };

  const displayName = user?.email?.split("@")[0] ?? "Admin";
  const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{TAB_TITLES[activeTab]}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {capitalized}</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <Clock className="w-4 h-4" />
          {time}
        </div>
      </div>

      {/* Content */}
      {activeTab === "Summary"    && <SummaryTab />}
      {activeTab === "Revenue"    && <RevenueTab />}
      {activeTab === "Performers" && <PerformersTab />}
      {activeTab === "Guests"     && <GuestsTab />}
      {activeTab === "Stage"      && <StageManagementTab />}
      {activeTab === "Reports"    && <ReportsTab />}
      {activeTab === "Logs"       && <LogsTab />}
      {activeTab === "Settings"   && <SettingsTab />}
      {activeTab === "Kiosks"     && <KiosksTab />}
    </AppLayout>
  );
}
