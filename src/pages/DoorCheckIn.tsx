import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import {
  FileText, Plus, X, Play, ChevronRight, Mic2, Clock, SkipForward,
} from "lucide-react";
import { useStage, useElapsed } from "@/contexts/StageContext";
import { toast } from "sonner";
import DancerCheckInTab from "@/components/door/DancerCheckInTab";
import CameraIDScanner from "@/components/CameraIDScanner";
import {
  useEntryTiers,
  useDanceTiers,
  useActiveDancers,
  useGuestCheckIn,
  useLogDanceSession,
  useLogRoomSession,
  useExtendRoomSession,
  useActiveRoomSessions,
  useDoorStatusToday,
  useClubSettings,
} from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────


const STATUS_STYLES: Record<string, { border: string; bg: string; dot: string; label: string; labelColor: string }> = {
  on_stage:  { border: "border-green-400",  bg: "bg-green-50",   dot: "bg-green-500",  label: "ON STAGE", labelColor: "text-green-600" },
  available: { border: "border-yellow-400", bg: "bg-yellow-50",  dot: "bg-yellow-400", label: "NEXT",     labelColor: "text-yellow-600" },
  queued:    { border: "border-pink-300",   bg: "bg-pink-50",    dot: "bg-pink-400",   label: "QUEUED",   labelColor: "text-pink-500" },
  in_room:   { border: "border-pink-400",   bg: "bg-pink-50",    dot: "bg-pink-500",   label: "IN ROOM",  labelColor: "text-pink-600" },
  _default:  { border: "border-border",     bg: "bg-white",      dot: "bg-gray-300",   label: "",         labelColor: "text-muted-foreground" },
};

function getStatusStyle(status: string | null) {
  return STATUS_STYLES[status ?? ""] ?? STATUS_STYLES._default;
}

// ─── Dancer card ─────────────────────────────────────────────────────────────

function DancerCard({
  dancer,
  selected,
  onClick,
  roomTimer,
}: {
  dancer: { id: string; stage_name: string; live_status: string | null; dancer_number?: number | null };
  selected: boolean;
  onClick: () => void;
  roomTimer?: string;
}) {
  const s = getStatusStyle(dancer.live_status);
  const initial = dancer.stage_name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center
        ${selected
          ? "border-primary bg-primary/10"
          : `${s.border} ${s.bg} hover:border-primary/50`
        }`}
    >
      {/* Initial circle */}
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
          ${selected ? "bg-primary text-white" : "bg-white border border-border text-muted-foreground"}`}
      >
        {initial}
      </span>

      {/* Name */}
      <span className={`text-xs font-semibold leading-none ${selected ? "text-primary" : "text-foreground"}`}>
        {dancer.stage_name}
      </span>
      {dancer.dancer_number != null && (
        <span className="text-[9px] text-muted-foreground font-mono">D{String(dancer.dancer_number).padStart(3, "0")}</span>
      )}

      {/* Status */}
      {s.label && (
        <span className={`text-[10px] font-bold tracking-wider ${selected ? "text-primary" : s.labelColor}`}>
          {s.label}
        </span>
      )}
      {roomTimer && (
        <span className="text-[10px] text-pink-500 font-mono">{roomTimer}</span>
      )}
    </button>
  );
}

// ─── Stage status strip ───────────────────────────────────────────────────────

import type { StageEntry } from "@/contexts/StageContext";

function StageStatusStrip({
  current,
  queue,
  onNext,
}: {
  current: StageEntry | null;
  queue: StageEntry[];
  onNext: () => void;
}) {
  const elapsed = useElapsed(current?.startTime ?? null);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {/* On Stage pill */}
      {current && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-100 border-2 border-green-400 animate-pulse">
          <Mic2 className="w-4 h-4 text-green-600 shrink-0" />
          <div>
            <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider leading-none">On Stage</p>
            <p className="text-sm font-bold text-green-800 leading-none">{current.dancerName} · {elapsed}</p>
          </div>
          <button
            onClick={onNext}
            title="End & bring next dancer on"
            className="ml-1 p-1 rounded-lg bg-green-200 hover:bg-green-300 text-green-700 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Queue pills */}
      {queue.map((entry, i) => (
        <QueueEntryPill key={entry.dancerId} entry={entry} position={i + 1} />
      ))}
    </div>
  );
}

function QueueEntryPill({ entry, position }: { entry: StageEntry; position: number }) {
  const elapsed = useElapsed(entry.startTime);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-50 border-2 border-yellow-300 animate-pulse">
      <Clock className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
      <div>
        <p className="text-[10px] text-yellow-700 font-bold uppercase tracking-wider leading-none">Queue #{position}</p>
        <p className="text-sm font-bold text-yellow-800 leading-none">{entry.dancerName} · {elapsed}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DoorCheckIn() {
  const navigate = useNavigate();

  const { data: entryTiers = [] }    = useEntryTiers();
  const { data: danceTiers = [] }    = useDanceTiers();
  const { data: activeDancers = [] } = useActiveDancers();
  const { data: settings }           = useClubSettings();
  const { totalGuests, totalRevenue } = useDoorStatusToday();
  const { scanAdd, manualAdd }        = useGuestCheckIn();
  const logDance  = useLogDanceSession();
  const logRoom   = useLogRoomSession();
  const { current: stageOccupied, queue: stageQueue, putOnStage, addToQueue, advanceQueue } = useStage();

  // ── Vendors (for distributor-tracked entry tiers) ─────────────────────────
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    (supabase as any).from("vendors").select("id, name").eq("is_active", true).order("name")
      .then(({ data }: any) => setVendors(data ?? []));
  }, []);

  // Pending vendor-tracked tier (shows vendor picker before logging)
  const [pendingTier, setPendingTier] = useState<{ id: string; name: string; price: number; admits_count: number } | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<"door" | "checkin">("door");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Selected dancers for a session (supports multiple)
  const [selectedDancers, setSelectedDancers] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState<{ id: string; name: string; price: number; duration_minutes: number | null } | null>(null);
  const [customPrice, setCustomPrice] = useState(50);

  // Timer (count-up from 0) - removed, timer starts when session exits queue
  // const [timerSecs, setTimerSecs] = useState(0);
  // const [timerRunning, setTimerRunning] = useState(false);
  // const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = async () => {
    if (!selectedTier || selectedDancers.length === 0) {
      toast.error("Select a dancer and package first");
      return;
    }
    const amount = selectedTier.price === 0 ? customPrice : selectedTier.price;
    const primaryDancer = activeDancers.find(d => d.id === selectedDancers[0]);
    if (!primaryDancer) return;

    try {
      await logRoom.mutateAsync({
        dancerId: primaryDancer.id,
        roomName: "Queue",
        packageName: selectedTier.name,
        amount,
      });
      toast.success(`Room session for ${primaryDancer.stage_name} added to queue`);
      resetAll();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start session");
    }
  };

  // const startTimer = () => {
  //   if (timerRunning) return;
  //   setTimerRunning(true);
  //   timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
  // };
  // const stopTimer = () => {
  //   setTimerRunning(false);
  //   if (timerRef.current) clearInterval(timerRef.current);
  // };
  const resetAll = () => {
    // stopTimer();
    // setTimerSecs(0);
    setSelectedDancers([]);
    setSelectedTier(null);
  };


  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  // ── Entry tier quick-add ─────────────────────────────────────────────────
  const handleEntryTier = async (tierId: string, price: number, admitsCount: number, vendorId?: string) => {
    const uid = await getCurrentUserId();
    if (!uid) return;
    try {
      await manualAdd.mutateAsync({ doorFee: price, loggedBy: uid, tierId, guestCount: admitsCount, vendorId: vendorId || undefined });
      const guestLabel = admitsCount > 1 ? `${admitsCount} guests` : "1 guest";
      toast.success(`Entry logged — ${guestLabel} · $${price}${vendorId ? " · vendor tracked" : ""}`);
    } catch (e: any) {
      toast.error(e.message ?? "Entry failed");
    }
  };

  const handleTierClick = (tier: { id: string; name: string; price: number; admits_count: number; requires_distributor: boolean }) => {
    if (tier.requires_distributor) {
      setPendingTier(tier);
      setSelectedVendorId("");
    } else {
      handleEntryTier(tier.id, tier.price, tier.admits_count);
    }
  };

  const confirmVendorEntry = async () => {
    if (!pendingTier) return;
    await handleEntryTier(pendingTier.id, pendingTier.price, pendingTier.admits_count, selectedVendorId || undefined);
    setPendingTier(null);
    setSelectedVendorId("");
  };

  // ── Scan entry ───────────────────────────────────────────────────────────
  const handleScanEntry = useCallback(async (result: {
    hash: string; denied: boolean; isReturning: boolean;
    visitCount?: number; fullName?: string | null; address?: string | null;
  }) => {
    if (result.denied) { toast.error("Entry denied — underage"); return; }
    const uid = await getCurrentUserId();
    if (!uid) return;
    const fee = Number(settings?.default_door_fee ?? 10);
    try {
      const data = await scanAdd.mutateAsync({
        dlHash: result.hash,
        displayId: result.hash.slice(0, 8).toUpperCase(),
        doorFee: fee,
        loggedBy: uid,
        fullName: result.fullName ?? undefined,
        address: result.address ?? undefined,
      });
      toast.success(data.isReturning ? `Welcome back! Visit #${data.visitCount}` : "New guest checked in");
    } catch (e: any) {
      toast.error(e.message ?? "Scan failed");
    }
  }, [scanAdd, settings]);

  // ── Toggle dancer selection ───────────────────────────────────────────────
  const toggleDancer = (id: string) => {
    setSelectedDancers(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  // ── Log dance session ────────────────────────────────────────────────────
  const handleDanceTier = async (tier: { id: string; name: string; price: number; duration_minutes: number | null }) => {
    if (selectedDancers.length === 0) { toast.error("Select at least one dancer"); return; }
    const amount = tier.price === 0 ? customPrice : tier.price;

    // Stage tier — queue management instead of immediate session log
    const isStage = tier.name.toLowerCase().includes("stage");
    if (isStage) {
      selectedDancers.forEach(dancerId => {
        const d = activeDancers.find(a => a.id === dancerId);
        if (!d) return;
        if (!stageOccupied) {
          putOnStage(dancerId, d.stage_name);
          toast.success(`${d.stage_name} is now on stage!`);
        } else {
          addToQueue(dancerId, d.stage_name);
          toast.success(`${d.stage_name} added to stage queue`);
        }
      });
      // Still log the session for financials
    }

    try {
      await Promise.all(
        selectedDancers.map(dancerId =>
          logDance.mutateAsync({
            dancerId,
            tierId: tier.id,
            totalAmount: amount,
            durationMinutes: tier.duration_minutes ?? undefined,
          })
        )
      );
      if (!isStage) {
        toast.success(`${tier.name} logged — $${amount}${selectedDancers.length > 1 ? ` × ${selectedDancers.length} dancers` : ""}`);
      }
      resetAll();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to log dance");
    }
  };

  // Primary selected dancer name for panel header
  const primaryDancer = activeDancers.find(d => d.id === selectedDancers[0]);
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <AppLayout>
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Door Entry</h1>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: "hsl(328 78% 47%)" }}>
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{totalGuests} guests</p>
        </div>
      </div>

      {/* ── Panel toggle (Door / Dancer Check-In) ────────────────────────── */}
      <div className="flex gap-2 mb-5">
        {(["door", "checkin"] as const).map(p => (
          <button key={p} onClick={() => setActivePanel(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all
              ${activePanel === p ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/50"}`}>
            {p === "door" ? "Door Entry" : "Dancer Check-In"}
          </button>
        ))}
      </div>

      {/* ── Stage Status Strip ─────────────────────────────────────────── */}
      {(stageOccupied || stageQueue.length > 0) && (
        <StageStatusStrip
          current={stageOccupied}
          queue={stageQueue}
          onNext={advanceQueue}
        />
      )}

      {activePanel === "checkin" ? (
        <DancerCheckInTab onNewDancer={() => {}} />
      ) : (
        <div className="space-y-5">
          {/* ── Entry tier buttons ──────────────────────────────────────── */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {entryTiers.filter(t => t.is_active).map(tier => (
              <button
                key={tier.id}
                onClick={() => handleTierClick(tier as any)}
                disabled={manualAdd.isPending}
                className={`flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border-2 transition-all disabled:opacity-50
                  ${pendingTier?.id === tier.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-white hover:border-primary/60 hover:bg-primary/5"}`}
              >
                <span className="text-sm font-semibold text-foreground">{tier.name}</span>
                <span className="text-xs text-muted-foreground">
                  {tier.price === 0 ? "Free" : (tier as any).admits_count > 1 ? `$${tier.price} / ${(tier as any).admits_count} people` : `$${tier.price}`}
                </span>
              </button>
            ))}
          </div>

          {/* ── Vendor picker (shown when a distributor-tracked tier is selected) ── */}
          {pendingTier && (
            <div className="bg-white rounded-2xl border-2 border-primary/30 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{pendingTier.name}</p>
                  <p className="text-xs text-muted-foreground">Select the vendor / distributor for this card</p>
                </div>
                <button onClick={() => setPendingTier(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {vendors.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No active vendors — add vendors in Settings → Promo Codes</p>
                ) : (
                  vendors.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVendorId(v.id)}
                      className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all
                        ${selectedVendorId === v.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 hover:border-primary/50"}`}
                    >
                      {v.name}
                    </button>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => confirmVendorEntry()}
                  disabled={manualAdd.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {manualAdd.isPending ? "Logging…" : `Confirm — $${pendingTier.price}${selectedVendorId ? "" : " (no vendor)"}`}
                </button>
              </div>
            </div>
          )}

          {/* ── Card Scanner (collapsible) ────────────────────────────────── */}
          <details className="bg-white rounded-2xl border border-border shadow-sm">
            <summary className="px-5 py-3 text-sm font-semibold text-foreground cursor-pointer select-none list-none flex items-center justify-between">
              <span>Card Scanner</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </summary>
            <div className="px-5 pb-5 pt-1">
              <CameraIDScanner onEntry={handleScanEntry} />
            </div>
          </details>

          {/* ── Dancer grid ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Dancers
              </h2>
              <div className="flex gap-1">
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                    <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
                  </svg>
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {activeDancers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No dancers checked in yet</p>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-2">
                {activeDancers.map(d => (
                  <DancerCard
                    key={d.id}
                    dancer={d}
                    selected={selectedDancers.includes(d.id)}
                    onClick={() => toggleDancer(d.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {activeDancers.map(d => {
                  const s = getStatusStyle(d.live_status);
                  const isSelected = selectedDancers.includes(d.id);
                  return (
                    <button key={d.id} onClick={() => toggleDancer(d.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all
                        ${isSelected ? "border-primary bg-primary/10 text-primary" : `border-border hover:border-primary/50 ${s.bg}`}`}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? "bg-primary" : s.dot}`} />
                      <span className="flex-1 font-semibold text-left">{d.stage_name}</span>
                      {s.label && <span className={`text-xs font-bold ${isSelected ? "text-primary" : s.labelColor}`}>{s.label}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Dance session panel (shown when dancer(s) selected) ──────── */}
          {selectedDancers.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Dance — {primaryDancer?.stage_name ?? ""}
                  {selectedDancers.length > 1 && (
                    <span className="ml-2 text-xs text-muted-foreground">+{selectedDancers.length - 1} more</span>
                  )}
                </h2>
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedDancers.length} Girl{selectedDancers.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Dance tier grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {danceTiers.map(tier => {
                  const isActive = selectedTier?.id === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border transition-all text-left
                        ${isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/30 hover:border-primary/60 hover:bg-primary/5"}`}
                    >
                      <span className={`text-xs ${isActive ? "text-primary/80" : "text-muted-foreground"}`}>{tier.name}</span>
                      <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                        {tier.price === 0 ? "Custom" : `$${tier.price}`}
                      </span>
                    </button>
                  );
                })}

                {/* Custom price entry inline */}
                {danceTiers.some(t => t.price === 0) && (
                  <div className="flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border border-border bg-secondary/30">
                    <span className="text-xs text-muted-foreground">Custom price</span>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={e => setCustomPrice(Number(e.target.value))}
                      className="w-full text-sm font-bold bg-transparent focus:outline-none text-foreground"
                      min={0}
                    />
                  </div>
                )}

                {/* Bottle Service */}
                <button
                  onClick={() => {
                    const customTier = danceTiers.find(t => t.price === 0);
                    if (customTier) handleDanceTier({ ...customTier, name: "Bottle Service" });
                  }}
                  disabled={logDance.isPending}
                  className="flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border border-border bg-secondary/30 hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50 transition-all text-left"
                >
                  <span className="text-xs text-muted-foreground">Bottle Service</span>
                  <span className="text-sm font-bold text-foreground">Custom</span>
                </button>
              </div>

              {/* Bottom action row */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {}}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Dancer
                </button>

                <button
                  onClick={resetAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-destructive hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                >
                  <X className="w-4 h-4" /> Clear
                </button>

                <div className="flex-1" />

                <button
                  onClick={startSession}
                  disabled={logRoom.isPending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  <Play className="w-4 h-4" />
                  {logRoom.isPending ? "Starting…" : "Start"}
                </button>
              </div>
            </div>
          )}

          {/* ── Report shortcuts ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate("/reports?type=door")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:border-primary/50 text-sm font-medium text-foreground transition-all shadow-sm">
              <FileText className="w-4 h-4" /> Run Door Report
            </button>
            <button onClick={() => navigate("/reports?type=dancer")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:border-primary/50 text-sm font-medium text-foreground transition-all shadow-sm">
              <FileText className="w-4 h-4" /> Run Dancer Report
            </button>
            <button onClick={() => navigate("/reports?type=full")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:border-primary/50 text-sm font-medium text-foreground transition-all shadow-sm">
              <FileText className="w-4 h-4" /> Run Full Report
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
