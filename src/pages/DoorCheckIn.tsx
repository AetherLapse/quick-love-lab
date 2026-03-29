import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { LayoutGrid, List, TrendingUp, FileText } from "lucide-react";
import { toast } from "sonner";

import EntryTierButtons, { type EntryTier } from "@/components/door/EntryTierButtons";
import DancerGrid, { type DancerTile } from "@/components/door/DancerGrid";
import DanceOptionPanel, { type DanceSession } from "@/components/door/DanceOptionPanel";
import DoorStatusBar, { type TierBreakdown } from "@/components/door/DoorStatusBar";
import DancerCheckInTab from "@/components/door/DancerCheckInTab";

import {
  MOCK_DANCERS,
  MOCK_TIER_BREAKDOWN,
  MOCK_TOTAL_REVENUE,
  MOCK_TOTAL_GUESTS,
  MOCK_SESSION_EARNINGS,
  MOCK_DISTRIBUTORS,
} from "@/components/door/doorMockData";

type MainTab    = "door" | "dancer-checkin";
type ViewMode   = "icon" | "list";
type ViewSection = "dancers" | "dances";

export default function DoorCheckIn() {
  const navigate = useNavigate();

  const [tab,           setTab]          = useState<MainTab>("door");
  const [viewMode,      setViewMode]     = useState<ViewMode>("icon");
  const [viewSection,   setViewSection]  = useState<ViewSection>("dancers");
  const [selectedDancer, setSelectedDancer] = useState<DancerTile | null>(null);

  // Live-updating mock state so button taps feel real
  const [tierBreakdown, setTierBreakdown] = useState<TierBreakdown[]>(MOCK_TIER_BREAKDOWN);
  const [totalRevenue,  setTotalRevenue]  = useState(MOCK_TOTAL_REVENUE);
  const [totalGuests,   setTotalGuests]   = useState(MOCK_TOTAL_GUESTS);
  const [dancers,       setDancers]       = useState<DancerTile[]>(MOCK_DANCERS);
  const [dancerCount,   setDancerCount]   = useState(0);

  const TIER_FEES: Record<EntryTier, number> = {
    full_cover:  10,
    reduced:     5,
    vip:         0,
    ccc_card:    0,
    two_for_one: 10,
  };

  const handleTierEntry = useCallback(async (tier: EntryTier, distributorId?: string) => {
    const fee       = TIER_FEES[tier];
    const partySize = tier === "two_for_one" ? 2 : 1;

    // Update mock state to reflect the new entry immediately
    setTierBreakdown((prev) =>
      prev.map((row) =>
        row.tier === tier
          ? { ...row, count: row.count + partySize, revenue: row.revenue + fee }
          : row
      )
    );
    setTotalRevenue((r) => r + fee);
    setTotalGuests((g) => g + partySize);

    toast.success(
      `Entry logged: ${tier.replace(/_/g, " ").toUpperCase()} (+${partySize} guest${partySize > 1 ? "s" : ""}${fee > 0 ? ` · $${fee}` : ""})`
    );
  }, []);

  const handleSessionStart = useCallback(async (session: DanceSession) => {
    toast.success(`Session started: ${session.packageLabel} with ${session.dancerName} · $${session.gross}`);
    setSelectedDancer(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar badge="Door Staff" centerLabel="Door Panel" />

      <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4">

        {/* Live door status */}
        <DoorStatusBar
          tierBreakdown={tierBreakdown}
          totalRevenue={totalRevenue}
          totalGuests={totalGuests}
        />

        {/* Entry tier buttons */}
        <EntryTierButtons
          distributors={MOCK_DISTRIBUTORS}
          onEntry={handleTierEntry}
        />

        {/* Tab toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab("door")}
            className={`rounded-xl py-3 font-heading text-lg tracking-wide transition-all border-2 flex items-center justify-center gap-2
              ${tab === "door" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-primary/40 hover:border-primary/70"}`}
          >
            <LayoutGrid className="w-4 h-4" />
            FLOOR
          </button>
          <button
            onClick={() => { setTab("dancer-checkin"); setSelectedDancer(null); }}
            className={`rounded-xl py-3 font-heading text-lg tracking-wide transition-all border-2 flex items-center justify-center gap-2
              ${tab === "dancer-checkin" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-primary/40 hover:border-primary/70"}`}
          >
            DANCER CHECK-IN
          </button>
        </div>

        {/* FLOOR tab */}
        {tab === "door" && (
          <div className="space-y-4 animate-fade-in">
            {/* DANCERS / DANCES + List / Icon */}
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1.5">
                <button
                  onClick={() => setViewSection("dancers")}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border
                    ${viewSection === "dancers" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                >
                  DANCERS
                </button>
                <button
                  onClick={() => setViewSection("dances")}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border
                    ${viewSection === "dances" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                >
                  <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                  DANCES
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode("icon")}
                  className={`p-2.5 rounded-xl border transition-all ${viewMode === "icon" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-500"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 rounded-xl border transition-all ${viewMode === "list" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-500"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dancer grid */}
            <div className="glass-card p-4">
              <DancerGrid
                dancers={dancers}
                viewMode={viewMode}
                viewSection={viewSection}
                sessionEarningsByDancer={MOCK_SESSION_EARNINGS}
                onSelect={(d) => setSelectedDancer(selectedDancer?.id === d.id ? null : d)}
                selectedId={selectedDancer?.id}
              />
            </div>

            {/* Dance option panel */}
            {selectedDancer && (
              <DanceOptionPanel
                dancer={selectedDancer}
                allDancers={dancers.map((d) => ({ id: d.id, stage_name: d.stage_name }))}
                onStart={handleSessionStart}
                onClose={() => setSelectedDancer(null)}
              />
            )}
          </div>
        )}

        {/* DANCER CHECK-IN tab */}
        {tab === "dancer-checkin" && (
          <div className="animate-fade-in">
            <DancerCheckInTab onNewDancer={() => setDancerCount((c) => c + 1)} />
          </div>
        )}

        {/* Quick Reports */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={() => navigate("/reports?type=door")}
            className="glass-card py-3 px-2 text-center font-semibold text-sm hover:border-primary/50 transition-all flex flex-col items-center gap-1"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            Door Report
          </button>
          <button
            onClick={() => navigate("/reports?type=dancer")}
            className="glass-card py-3 px-2 text-center font-semibold text-sm hover:border-primary/50 transition-all flex flex-col items-center gap-1"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            Dancer Report
          </button>
          <button
            onClick={() => navigate("/reports?type=full")}
            className="glass-card py-3 px-2 text-center font-semibold text-sm hover:border-primary/50 transition-all flex flex-col items-center gap-1"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            Full Report
          </button>
        </div>

      </div>
    </div>
  );
}
