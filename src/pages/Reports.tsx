import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { FileText, Lock } from "lucide-react";
import DancerReport from "@/components/reports/DancerReport";
import DoorReport from "@/components/reports/DoorReport";
import FullReport from "@/components/reports/FullReport";
type ReportTab = "dancer" | "door" | "full";
type Period = "Current Night" | "Previous Night" | "This Week" | "This Month";

const PERIODS: Period[] = ["Current Night", "Previous Night", "This Week", "This Month"];

// ── Demo role guard ──────────────────────────────────────────────────────────
// In production this is enforced server-side via RLS.
// The demo uses the stored session role.
function useDemoRole(): "owner" | "manager" | "door_staff" | "room_attendant" | "house_mom" | null {
  try {
    return (localStorage.getItem("demo_role") as ReturnType<typeof useDemoRole>) ?? null;
  } catch {
    return null;
  }
}

export default function Reports() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("type") as ReportTab) ?? "door";

  const [tab,    setTab]    = useState<ReportTab>(initialTab);
  const [period, setPeriod] = useState<Period>("Current Night");

  const role = useDemoRole();
  const isOwner = role === "owner" || !role; // treat no-role as open access in demo

  const tabs: { key: ReportTab; label: string; ownerOnly?: boolean; managerPlus?: boolean }[] = [
    { key: "dancer", label: "Dancer Report" },
    { key: "door",   label: "Door Report",   managerPlus: true },
    { key: "full",   label: "Full Report",   ownerOnly: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopBar badge="Reports" centerLabel="Reports" />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

        {/* Report type tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => {
            const locked = (t.ownerOnly && !isOwner) || (t.managerPlus && role === "door_staff");
            return (
              <button
                key={t.key}
                onClick={() => !locked && setTab(t.key)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border-2
                  ${tab === t.key && !locked
                    ? "bg-primary text-primary-foreground border-primary"
                    : locked
                      ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-50"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }
                `}
              >
                <FileText className="w-4 h-4" />
                {t.label}
                {locked && <Lock className="w-3 h-3" />}
              </button>
            );
          })}
        </div>

        {/* Period selector */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                ${period === p
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Report content */}
        <div className="animate-fade-in">
          {tab === "dancer" && <DancerReport period={period} />}
          {tab === "door"   && <DoorReport   period={period} />}
          {tab === "full"   && <FullReport   period={period} isOwner={isOwner} />}
        </div>

      </div>
    </div>
  );
}
