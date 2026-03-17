import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";
import { SummaryTab } from "@/components/dashboard/SummaryTab";
import { RevenueTab } from "@/components/dashboard/RevenueTab";
import { PerformersTab } from "@/components/dashboard/PerformersTab";
import { ReportsTab } from "@/components/dashboard/ReportsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";

const tabs = ["Summary", "Revenue", "Performers", "Reports", "Settings"] as const;
type Tab = typeof tabs[number];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("Summary");
  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <img src={logo} alt="2NYT Entertainment" className="h-10 w-auto" />
          </Link>
          <span className="font-heading text-lg tracking-wide text-foreground">Admin Dashboard</span>
        </div>

        {/* Sub-nav tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">{todayStr}</span>
          <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      {/* Mobile tab selector */}
      <div className="md:hidden flex overflow-x-auto gap-1 p-2 border-b border-border bg-background/80 backdrop-blur-md sticky top-[65px] z-40">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {activeTab === "Summary" && <SummaryTab />}
        {activeTab === "Revenue" && <RevenueTab />}
        {activeTab === "Performers" && <PerformersTab />}
        {activeTab === "Reports" && <ReportsTab />}
        {activeTab === "Settings" && <SettingsTab />}
      </div>
    </div>
  );
}
