import { useState } from "react";
import { Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { SummaryTab } from "@/components/dashboard/SummaryTab";
import { RevenueTab } from "@/components/dashboard/RevenueTab";
import { PerformersTab } from "@/components/dashboard/PerformersTab";
import { ReportsTab } from "@/components/dashboard/ReportsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { GuestsTab } from "@/components/dashboard/GuestsTab";
import { useAuth } from "@/hooks/useAuth";

const tabs = ["Summary", "Revenue", "Performers", "Guests", "Reports", "Settings"] as const;
type Tab = typeof tabs[number];

const TAB_TITLES: Record<Tab, string> = {
  Summary:    "Dashboard",
  Revenue:    "Revenue",
  Performers: "Dancers",
  Guests:     "Guests",
  Reports:    "Reports",
  Settings:   "Settings",
};

function useCurrentTime() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
  useState(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    }, 30000);
    return () => clearInterval(id);
  });
  return time;
}

export default function Dashboard({ defaultTab }: { defaultTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab ?? "Summary");
  const { user } = useAuth();
  const time = useCurrentTime();

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

      {/* Mobile tab pills (hidden on desktop — use sidebar instead) */}
      <div className="md:hidden flex overflow-x-auto gap-1 pb-3 mb-4 -mx-4 px-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "Summary"    && <SummaryTab />}
      {activeTab === "Revenue"    && <RevenueTab />}
      {activeTab === "Performers" && <PerformersTab />}
      {activeTab === "Guests"     && <GuestsTab />}
      {activeTab === "Reports"    && <ReportsTab />}
      {activeTab === "Settings"   && <SettingsTab />}
    </AppLayout>
  );
}
