import { useState, useEffect, useRef, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import {
  FileText, Plus, X, Play, ChevronRight, Mic2, Clock, SkipForward, LogOut,
  DoorOpen, Users, BedDouble, Loader2, DollarSign, Check,
} from "lucide-react";
import { DancerCheckOutFlow } from "@/components/door/DancerCheckOutFlow";
import { useStage, useElapsed } from "@/contexts/StageContext";
import { toast } from "sonner";
import DancerCheckInTab from "@/components/door/DancerCheckInTab";
import { RoomsPanel } from "@/pages/PrivateRooms";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEntryTiers,
  useDanceTiers,
  usePresentDancersToday,
  useGuestCheckIn,
  useLogDanceSession,
  useLogRoomSession,
  useExtendRoomSession,
  useActiveRoomSessions,
  useDoorStatusToday,
  useAttendanceLogs,
  useRoomSessions,
  useDancerBalancesToday,
  useMarkDancerPayment,
  today,
} from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";

// TODO: make configurable by Super Admin (mirrors PrivateRooms)
const ROOM_LAYOUT = [
  { floor: "Floor 1", rooms: ["Private Room"] },
];
function buildRoomName(floor: string, room: string) { return `${floor} - ${room}`; }

// ─── Report Modals ────────────────────────────────────────────────────────────

type ReportType = "door" | "dancer" | "full";

function ReportModal({ type, onClose }: { type: ReportType; onClose: () => void }) {
  const todayStr  = today();
  const { rows: doorRows, totalGuests, totalRevenue, isLoading: doorLoading } = useDoorStatusToday();
  const { data: attendance = [], isLoading: attLoading } = useAttendanceLogs(todayStr, todayStr);
  const { data: roomSessions = [], isLoading: roomLoading } = useRoomSessions(todayStr, todayStr);

  const isLoading = doorLoading || attLoading || roomLoading;

  const MUSIC_FEE = 20; // fixed $20 per dancer per night

  const fmtCur  = (n: number) => `$${Number(n).toFixed(2)}`;
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Dancer summary from attendance
  const dancerSummary = useMemo(() => {
    return (attendance as any[]).map((a: any) => {
      const roomCut    = (roomSessions as any[])
        .filter((r: any) => r.dancer_id === a.dancer_id)
        .reduce((s: number, r: any) => s + Number(r.dancer_cut ?? 0), 0);
      const earlyFine  = Number(a.early_leave_fine ?? 0);
      const houseFee   = Number(a.entrance_fee_amount ?? 0);
      const net        = roomCut - houseFee - MUSIC_FEE - earlyFine;
      return {
        id:          a.dancer_id,
        name:        a.dancers?.stage_name ?? "Unknown",
        clockIn:     a.clock_in,
        clockOut:    a.clock_out,
        houseFee,
        musicFee:    MUSIC_FEE,
        roomCut,
        earlyFine,
        net,
        sessions:    (roomSessions as any[]).filter((r: any) => r.dancer_id === a.dancer_id).length,
      };
    });
  }, [attendance, roomSessions]);

  const totalRoomRevenue = (roomSessions as any[]).reduce((s: number, r: any) => s + Number(r.house_cut ?? 0), 0);
  const totalHouseFees   = (attendance as any[]).reduce((s: number, a: any) => s + Number(a.entrance_fee_amount ?? 0), 0);
  const totalMusicFees   = dancerSummary.length * MUSIC_FEE;
  const grossTotal       = totalRevenue + totalHouseFees + totalMusicFees + totalRoomRevenue;

  const titles: Record<ReportType, string> = {
    door:   "Door Report",
    dancer: "Dancer Report",
    full:   "Full Night Report",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg text-foreground">{titles[type]}</p>
              <p className="text-xs text-muted-foreground">{dateLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── DOOR SECTION ── */}
              {(type === "door" || type === "full") && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Door Entry</h3>
                  </div>

                  {/* KPI row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total Guests</p>
                      <p className="text-2xl font-extrabold text-foreground">{totalGuests}</p>
                    </div>
                    <div className="rounded-2xl bg-green-500/5 border border-green-500/10 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Door Revenue</p>
                      <p className="text-2xl font-extrabold text-green-600">{fmtCur(totalRevenue)}</p>
                    </div>
                  </div>

                  {/* Tier breakdown */}
                  {doorRows.length > 0 && (
                    <div className="rounded-2xl border border-border overflow-hidden">
                      <div className="px-4 py-2.5 bg-secondary/30 flex items-center">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">Tier</p>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16 text-right">Guests</p>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20 text-right">Revenue</p>
                      </div>
                      {doorRows.map((r, i) => (
                        <div key={r.id} className={`flex items-center px-4 py-3 text-sm ${i > 0 ? "border-t border-border/40" : ""}`}>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{fmtCur(r.price)} / person</p>
                          </div>
                          <p className="w-16 text-right font-semibold text-foreground">{r.guestCount}</p>
                          <p className="w-20 text-right font-bold text-green-600">{fmtCur(r.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* ── DANCER SECTION ── */}
              {(type === "dancer" || type === "full") && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Dancer Summary</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Checked In</p>
                      <p className="text-2xl font-extrabold text-foreground">{dancerSummary.length}</p>
                    </div>
                    <div className="rounded-2xl bg-pink-500/5 border border-pink-500/10 p-4">
                      <p className="text-xs text-muted-foreground mb-1">House Fees</p>
                      <p className="text-2xl font-extrabold text-pink-600">{fmtCur(totalHouseFees)}</p>
                    </div>
                    <div className="rounded-2xl bg-violet-500/5 border border-violet-500/10 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Music Fees</p>
                      <p className="text-2xl font-extrabold text-violet-600">{fmtCur(totalMusicFees)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">${MUSIC_FEE} × {dancerSummary.length}</p>
                    </div>
                  </div>

                  {dancerSummary.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No dancers checked in today</p>
                  ) : (
                    <div className="rounded-2xl border border-border overflow-hidden">
                      <div className="px-4 py-2.5 bg-secondary/30 grid grid-cols-[1fr_auto_auto_auto] gap-3">
                        {["Dancer", "In / Out", "Rooms", "Net"].map(h => (
                          <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider last:text-right">{h}</p>
                        ))}
                      </div>
                      {dancerSummary.map((d, i) => (
                        <div key={d.id} className={`px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-sm ${i > 0 ? "border-t border-border/40" : ""}`}>
                          <div>
                            <p className="font-semibold text-foreground">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              House {fmtCur(d.houseFee)} · Music {fmtCur(d.musicFee)}
                              {d.earlyFine > 0 && <span className="text-orange-500"> · Early fine {fmtCur(d.earlyFine)}</span>}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground text-center whitespace-nowrap">
                            <p>{fmtTime(d.clockIn)}</p>
                            <p>{d.clockOut ? fmtTime(d.clockOut) : <span className="text-green-500">Active</span>}</p>
                          </div>
                          <p className="text-center text-muted-foreground">{d.sessions}</p>
                          <p className={`text-right font-bold ${d.net >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {d.net >= 0 ? "+" : ""}{fmtCur(d.net)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* ── FULL REPORT TOTALS ── */}
              {type === "full" && (
                <section className="rounded-2xl bg-foreground/5 border border-border p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Night Summary</p>
                  {[
                    { label: "Door Revenue",   value: totalRevenue,      color: "text-foreground" },
                    { label: "House Fees",      value: totalHouseFees,    color: "text-foreground" },
                    { label: "Music Fees",      value: totalMusicFees,    color: "text-foreground" },
                    { label: "Room Revenue",    value: totalRoomRevenue,  color: "text-foreground" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-semibold ${row.color}`}>{fmtCur(row.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-bold text-foreground">Gross Total</span>
                    <span className="font-extrabold text-primary text-lg">{fmtCur(grossTotal)}</span>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-semibold text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
      className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-all text-center active:scale-95
        ${selected
          ? "border-primary bg-primary/10"
          : `${s.border} ${s.bg} hover:border-primary/50`
        }`}
    >
      {/* Initial circle */}
      <span
        className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold
          ${selected ? "bg-primary text-white" : "bg-white border border-border text-muted-foreground"}`}
      >
        {initial}
      </span>

      {/* Name */}
      <span className={`text-sm font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
        {dancer.stage_name}
      </span>
      {dancer.dancer_number != null && (
        <span className="text-[10px] text-muted-foreground font-mono">D{String(dancer.dancer_number).padStart(3, "0")}</span>
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

// ─── Room session helpers ─────────────────────────────────────────────────────

function playBeep(frequency: number, duration: number, repeats = 1) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < repeats; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.6 + duration);
      osc.start(ctx.currentTime + i * 0.6);
      osc.stop(ctx.currentTime + i * 0.6 + duration);
    }
  } catch { /* AudioContext unavailable */ }
}

function getRoomCountdownSecs(session: { entry_time?: string | null; duration_minutes?: number | null; extension_minutes?: number | null }, nowMs: number) {
  if (!session.entry_time || !session.duration_minutes) return null;
  const totalSecs = (session.duration_minutes + (session.extension_minutes ?? 0)) * 60 + 45;
  const elapsedSecs = Math.floor((nowMs - new Date(session.entry_time).getTime()) / 1000);
  return totalSecs - elapsedSecs;
}

function formatCountdown(secs: number) {
  // Negative while time remains (-3:43 = 3m43s left), positive once in overtime
  const abs = Math.abs(secs);
  const m = String(Math.floor(abs / 60)).padStart(2, "0");
  const s = String(abs % 60).padStart(2, "0");
  return secs > 0 ? `-${m}:${s}` : `${m}:${s}`;
}

function ActiveRoomSessionsStrip({
  sessions,
  dancers,
  danceTiers,
  onExtend,
  onEnd,
}: {
  sessions: any[];
  dancers: { id: string; stage_name: string }[];
  danceTiers: { id: string; name: string; price: number; duration_minutes: number | null }[];
  onExtend: (sessionId: string, packageName: string, amount: number, extraMinutes: number) => void;
  onEnd: (sessionId: string) => void;
}) {
  const [nowMs, setNowMs]             = useState(Date.now());
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assigning,   setAssigning]   = useState(false);
  const beepedWarning  = useRef<Set<string>>(new Set());
  const beepedOvertime = useRef<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Beep logic
  useEffect(() => {
    sessions.forEach(s => {
      if (!s.entry_time || !s.duration_minutes) return;
      const remaining = getRoomCountdownSecs(s, nowMs)!;
      if (remaining <= 60 && remaining > 0 && !beepedWarning.current.has(s.id)) {
        beepedWarning.current.add(s.id);
        playBeep(880, 0.25, 3);
      }
      if (remaining <= 0 && !beepedOvertime.current.has(s.id)) {
        beepedOvertime.current.add(s.id);
        playBeep(440, 0.4, 5);
      }
      if (remaining < 0 && Math.abs(remaining) % 30 === 0) {
        playBeep(440, 0.4, 5);
      }
    });
  }, [nowMs, sessions]);

  const tiersWithDuration = danceTiers.filter(t => t.duration_minutes != null);
  const queued        = sessions.filter(s => s.room_name === "Queue");
  const active        = sessions.filter(s => s.entry_time && s.room_name !== "Queue");
  const isEmpty       = queued.length === 0 && active.length === 0;
  const occupiedRooms = new Set(active.map(s => s.room_name));

  const handleAssign = async (sessionId: string, floor: string, room: string) => {
    setAssigning(true);
    try {
      const { error } = await supabase.from("room_sessions").update({
        room_name:  buildRoomName(floor, room),
        entry_time: new Date().toISOString(),
      }).eq("id", sessionId);
      if (error) throw error;
      setAssigningId(null);
      await qc.refetchQueries({ queryKey: ["room_sessions_active"] });
      toast.success(`Assigned to ${buildRoomName(floor, room)}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to assign room");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room Sessions</h3>
        <span className="text-xs text-muted-foreground">{active.length} active · {queued.length} queued</span>
      </div>

      {isEmpty && (
        <div className="flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
          <BedDouble className="w-4 h-4 opacity-40" />
          <span>No active room sessions</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">

        {/* ── Queued cards ── */}
        {queued.map(s => {
          const dancer = dancers.find(d => d.id === s.dancer_id);
          const isOpen = assigningId === s.id;
          return (
            <div key={s.id} className="rounded-xl border-2 border-amber-400 bg-amber-50/40 flex flex-col overflow-hidden transition-all">
              {/* Card header */}
              <div className="px-3 pt-3 pb-2 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Queued</span>
                </div>
                <p className="text-sm font-bold text-foreground leading-tight truncate">{dancer?.stage_name ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.package_name}</p>
                <p className="text-xs font-bold text-foreground">${s.gross_amount}</p>
              </div>
              {/* Assign button */}
              <button
                onClick={() => setAssigningId(isOpen ? null : s.id)}
                className={`w-full py-2 text-xs font-semibold border-t transition-all
                  ${isOpen ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-amber-400/20 hover:bg-amber-400 hover:text-white text-amber-700 border-amber-300"}`}>
                {isOpen ? "Cancel" : "Assign Room"}
              </button>
              {/* Room picker */}
              {isOpen && (
                <div className="px-2 pb-2 pt-1 border-t border-amber-200 space-y-1">
                  {ROOM_LAYOUT.map(({ floor, rooms }) => (
                    <div key={floor}>
                      <p className="text-[9px] text-amber-600/70 uppercase tracking-wider mb-1">{floor}</p>
                      <div className="flex flex-wrap gap-1">
                        {rooms.map(room => {
                          const key = buildRoomName(floor, room);
                          const occupied = occupiedRooms.has(key);
                          return (
                            <button key={key} disabled={occupied || assigning}
                              onClick={() => handleAssign(s.id, floor, room)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all
                                ${occupied ? "border-border bg-secondary text-muted-foreground opacity-40 cursor-not-allowed"
                                  : "border-amber-400 bg-white text-amber-700 hover:bg-amber-400 hover:text-white"}`}>
                              {room}{occupied ? " ●" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Active session cards ── */}
        {active.map(s => {
          const dancer     = dancers.find(d => d.id === s.dancer_id);
          const remaining  = s.duration_minutes ? getRoomCountdownSecs(s, nowMs) : null;
          const isWarning  = remaining !== null && remaining <= 60 && remaining > 0;
          const isOvertime = remaining !== null && remaining <= 0;
          const isExpanding = extendingId === s.id;

          return (
            <div key={s.id} className={`rounded-xl border-2 flex flex-col overflow-hidden transition-all
              ${isOvertime ? "border-red-400 bg-red-50/40" : isWarning ? "border-orange-400 bg-orange-50/40" : "border-green-300 bg-green-50/30"}`}>
              {/* Card body */}
              <div className="px-3 pt-3 pb-2 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full animate-pulse shrink-0
                    ${isOvertime ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-green-500"}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider
                    ${isOvertime ? "text-red-600" : isWarning ? "text-orange-600" : "text-green-700"}`}>
                    {isOvertime ? "Overtime" : isWarning ? "Ending Soon" : "Active"}
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground leading-tight truncate">{dancer?.stage_name ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.room_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.package_name}</p>
                {remaining !== null && (
                  <p className={`text-base font-mono font-bold ${isOvertime ? "text-red-600 animate-pulse" : isWarning ? "text-orange-600" : "text-green-700"}`}>
                    {isOvertime ? "+" : ""}{formatCountdown(remaining)}
                  </p>
                )}
              </div>
              {/* Action buttons */}
              <div className="grid grid-cols-2 border-t">
                <button
                  onClick={() => setExtendingId(isExpanding ? null : s.id)}
                  className={`py-3.5 text-sm font-semibold border-r transition-all
                    ${isExpanding ? "bg-green-100 text-green-700" : "hover:bg-green-50 text-muted-foreground hover:text-green-700"}`}>
                  {isExpanding ? "Cancel" : "Extend"}
                </button>
                <button
                  onClick={() => onEnd(s.id)}
                  className="py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-all">
                  End
                </button>
              </div>
              {/* Extend tier picker */}
              {isExpanding && (
                <div className="px-2 pb-2 pt-1 border-t grid grid-cols-1 gap-1">
                  {tiersWithDuration.map(t => (
                    <button key={t.id}
                      onClick={() => { onExtend(s.id, t.name, t.price, t.duration_minutes!); setExtendingId(null); }}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg border border-border hover:border-green-400 hover:bg-green-50 transition-all text-left">
                      <div>
                        <p className="text-[11px] font-semibold">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">+{t.duration_minutes} min</p>
                      </div>
                      <span className="text-[11px] font-bold text-green-700">+${t.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}

// ─── Dancer Balances Panel ───────────────────────────────────────────────────

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unpaid:        { label: "Unpaid",          color: "bg-amber-100 text-amber-700" },
  paid_checkin:  { label: "Paid at Check-In", color: "bg-green-100 text-green-700" },
  paid_during:   { label: "Paid During Shift", color: "bg-green-100 text-green-700" },
  paid_checkout: { label: "Paid at Check-Out", color: "bg-green-100 text-green-700" },
  ran_off:       { label: "Ran Off",           color: "bg-red-100 text-red-700" },
};

function DancerBalancesPanel() {
  const { data: balances = [] } = useDancerBalancesToday();
  const markPayment = useMarkDancerPayment();

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payInput, setPayInput] = useState("");
  const [expanded, setExpanded] = useState(false);

  const fmtCur = (n: number) => `$${Number(n).toFixed(2)}`;

  const handleRecordPayment = async (attendanceId: string) => {
    const amount = parseFloat(payInput);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid amount"); return; }
    const current   = balances.find(b => b.attendanceId === attendanceId);
    const newTotal  = (current?.amountPaid ?? 0) + amount;
    const totalDue  = current?.totalDue ?? 0;
    const newStatus = newTotal >= totalDue ? "paid_during" : "unpaid";
    try {
      await markPayment.mutateAsync({ attendanceId, amountPaid: newTotal, status: newStatus as any });
      toast.success(`Payment of ${fmtCur(amount)} recorded`);
      setPayingId(null);
      setPayInput("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to record payment");
    }
  };

  const totalOwed = balances.reduce((s, b) => s + b.stillOwed, 0);
  const anyOwed   = totalOwed > 0;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header — always visible, tap to expand/collapse */}
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dancer Balances</h3>
          <span className="text-xs text-muted-foreground">· {balances.length} active</span>
        </div>
        <div className="flex items-center gap-3">
          {anyOwed && (
            <span className="text-sm font-bold text-red-500">{fmtCur(totalOwed)} owed</span>
          )}
          {!anyOwed && balances.length > 0 && (
            <span className="text-sm font-bold text-green-600">All settled</span>
          )}
          <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border/50">
          {balances.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-5">No dancers checked in</p>
          )}

          {balances.map(b => {
            const isPaying    = payingId === b.attendanceId;
            const isSettled   = b.stillOwed <= 0;

            return (
              <div key={b.attendanceId} className="px-4 py-3 space-y-2">
                {/* Dancer name row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {b.stageName.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold text-foreground truncate">{b.stageName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const ps = PAYMENT_STATUS_LABELS[b.paymentStatus] ?? PAYMENT_STATUS_LABELS.unpaid;
                      return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ps.color}`}>{ps.label}</span>;
                    })()}
                    {isSettled ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : b.paymentStatus !== "ran_off" ? (
                      <span className="text-red-500 font-bold text-sm">{fmtCur(b.stillOwed)}</span>
                    ) : null}
                  </div>
                </div>

                {/* Fee breakdown — music fee covered first, then house fee */}
                {(() => {
                  const musicPaid = Math.min(b.amountPaid, b.musicFee);
                  const housePaid = Math.max(0, b.amountPaid - b.musicFee);
                  const musicDone = musicPaid >= b.musicFee;
                  const houseDone = housePaid >= b.houseFee;
                  return (
                    <div className="space-y-1 px-1">
                      {/* Music Fee row */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {musicDone && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                          <span className={musicDone ? "line-through text-green-600 font-medium" : "text-muted-foreground"}>
                            Music Fee
                          </span>
                          {musicDone && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">PAID</span>}
                        </div>
                        <span className={`font-medium ${musicDone ? "line-through text-green-500" : "text-foreground"}`}>
                          {fmtCur(b.musicFee)}
                        </span>
                      </div>

                      {/* House Fee row */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {houseDone && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                          <span className={houseDone ? "line-through text-green-600 font-medium" : "text-muted-foreground"}>
                            House Fee
                          </span>
                          {houseDone && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">PAID</span>}
                        </div>
                        <span className={`font-medium ${houseDone ? "line-through text-green-500" : "text-foreground"}`}>
                          {fmtCur(b.houseFee)}
                          {housePaid > 0 && !houseDone && (
                            <span className="text-blue-500 ml-1">(−{fmtCur(housePaid)})</span>
                          )}
                        </span>
                      </div>

                      {/* Fine row */}
                      {b.fines > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-orange-500">Fine</span>
                          <span className="font-medium text-orange-500">+{fmtCur(b.fines)}</span>
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* Record payment */}
                {!isSettled && b.paymentStatus !== "ran_off" && !isPaying && (
                  <button
                    onClick={() => { setPayingId(b.attendanceId); setPayInput(""); }}
                    className="w-full py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-all active:scale-95"
                  >
                    Record Payment
                  </button>
                )}

                {isPaying && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-semibold text-muted-foreground">$</span>
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      step="0.01"
                      value={payInput}
                      onChange={e => setPayInput(e.target.value)}
                      placeholder={`up to ${fmtCur(b.stillOwed)}`}
                      className="flex-1 px-3 py-2.5 rounded-xl border-2 border-primary/30 focus:border-primary text-sm font-bold focus:outline-none"
                      onKeyDown={e => { if (e.key === "Enter") handleRecordPayment(b.attendanceId); if (e.key === "Escape") { setPayingId(null); setPayInput(""); } }}
                    />
                    <button
                      onClick={() => handleRecordPayment(b.attendanceId)}
                      disabled={markPayment.isPending || !payInput}
                      className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
                    >
                      {markPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                    </button>
                    <button
                      onClick={() => { setPayingId(null); setPayInput(""); }}
                      className="px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DoorCheckIn() {
  const [reportType, setReportType] = useState<ReportType | null>(null);

  const { data: entryTiers = [] }    = useEntryTiers();
  const { data: danceTiers = [] }    = useDanceTiers();
  const { data: activeDancers = [] } = usePresentDancersToday();
  const { totalGuests, totalRevenue } = useDoorStatusToday();
  const { manualAdd }                 = useGuestCheckIn();
  const logDance  = useLogDanceSession();
  const logRoom   = useLogRoomSession();
  const extendRoom = useExtendRoomSession();
  const { data: activeRoomSessions = [] } = useActiveRoomSessions();
  const pageQc = useQueryClient();

  const handleEndSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.from("room_sessions")
        .update({ exit_time: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
      await pageQc.refetchQueries({ queryKey: ["room_sessions_active"] });
      toast.success("Session ended");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to end session");
    }
  };
  const { current: stageOccupied, queue: stageQueue, putOnStage, addToQueue, advanceQueue } = useStage();

  // ── Vendors (for distributor-tracked entry tiers) ─────────────────────────
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    (supabase as any).from("vendors").select("id, name").eq("is_active", true).order("name")
      .then(({ data }: any) => setVendors(data ?? []));
  }, []);

  // Pending entry confirmation
  const [pendingTier, setPendingTier] = useState<{ id: string; name: string; price: number; admits_count: number; requires_distributor: boolean } | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [manualVendorMode, setManualVendorMode] = useState(false);
  const [manualVendorName, setManualVendorName] = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<"door" | "checkin" | "rooms">("door");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
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
        durationMinutes: selectedTier.duration_minutes ?? undefined,
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
  const handleEntryTier = async (tierId: string, totalPrice: number, totalGuests: number, vendorId?: string, vendorName?: string) => {
    const uid = await getCurrentUserId();
    if (!uid) return;
    try {
      await manualAdd.mutateAsync({ doorFee: totalPrice, loggedBy: uid, tierId, guestCount: totalGuests, vendorId: vendorId || undefined, vendorName: vendorName || undefined });
      const guestLabel = totalGuests > 1 ? `${totalGuests} guests` : "1 guest";
      const vendorLabel = vendorName ? ` · ${vendorName}` : vendorId ? " · vendor tracked" : "";
      toast.success(`Entry logged — ${guestLabel}${totalPrice > 0 ? ` · $${totalPrice}` : " · Free"}${vendorLabel}`);
    } catch (e: any) {
      toast.error(e.message ?? "Entry failed");
    }
  };

  const handleTierClick = (tier: { id: string; name: string; price: number; admits_count: number; requires_distributor: boolean }) => {
    setPendingTier(tier);
    setPendingQuantity(1);
    setSelectedVendorId("");
    setManualVendorMode(false);
    setManualVendorName("");
  };

  const confirmVendorEntry = async () => {
    if (!pendingTier) return;
    const totalGuests = pendingQuantity * pendingTier.admits_count;
    const totalPrice  = pendingQuantity * pendingTier.price;
    const vId   = !manualVendorMode ? (selectedVendorId || undefined) : undefined;
    const vName = manualVendorMode ? (manualVendorName.trim() || undefined) : undefined;
    await handleEntryTier(pendingTier.id, totalPrice, totalGuests, vId, vName);
    setPendingTier(null);
    setPendingQuantity(1);
    setSelectedVendorId("");
    setManualVendorMode(false);
    setManualVendorName("");
  };

  // ── Scan entry ───────────────────────────────────────────────────────────
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Door Entry</h1>
          <p className="text-base text-muted-foreground">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold" style={{ color: "hsl(328 78% 47%)" }}>
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">{totalGuests} guests</p>
        </div>
      </div>

      {/* ── Panel toggle (Door / Dancer Check-In / Rooms) ───────────────── */}
      <div className="flex gap-3 mb-6">
        {(["door", "checkin", "rooms"] as const).map(p => (
          <button key={p} onClick={() => setActivePanel(p)}
            className={`flex-1 py-4 rounded-2xl text-lg font-bold border-2 transition-all active:scale-95
              ${activePanel === p ? "border-primary bg-primary text-white shadow-md" : "border-border bg-white text-muted-foreground hover:border-primary/50"}`}>
            {p === "door" ? "Door Entry" : p === "checkin" ? "Dancer Check-In" : "Rooms"}
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

      {/* ── Active room sessions strip ─────────────────────────────────── */}
      <div className="mb-4">
        <ActiveRoomSessionsStrip
          sessions={activeRoomSessions}
          dancers={activeDancers}
          danceTiers={danceTiers}
          onExtend={(sessionId, packageName, amount, extraMinutes) =>
            extendRoom.mutate({ sessionId, packageName, amount, extraMinutes })
          }
          onEnd={handleEndSession}
        />
      </div>

      {/* ── Dancer Balances ────────────────────────────────────────────── */}
      <div className="mb-5">
        <DancerBalancesPanel />
      </div>

      {activePanel === "checkin" ? (
        <DancerCheckInTab onNewDancer={() => {}} />
      ) : activePanel === "rooms" ? (
        <RoomsPanel />
      ) : (
        <div className="space-y-5">
          {/* ── Entry tier buttons ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entryTiers.filter(t => t.is_active).map(tier => (
              <button
                key={tier.id}
                onClick={() => handleTierClick(tier as any)}
                disabled={manualAdd.isPending}
                className={`flex flex-col items-center justify-center gap-2 py-7 px-4 rounded-2xl border-2 transition-all disabled:opacity-50 active:scale-95 min-h-[96px]
                  ${pendingTier?.id === tier.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-white hover:border-primary/60 hover:bg-primary/5"}`}
              >
                <span className="text-lg font-bold text-foreground leading-tight text-center">{tier.name}</span>
                <span className="text-base font-semibold text-muted-foreground">
                  {tier.price === 0 ? "Free" : (tier as any).admits_count > 1 ? `$${tier.price} / ${(tier as any).admits_count}` : `$${tier.price}`}
                </span>
              </button>
            ))}
          </div>

          {/* ── Confirm panel ── */}
          {pendingTier && (() => {
            const totalGuests = pendingQuantity * pendingTier.admits_count;
            const totalPrice  = pendingQuantity * pendingTier.price;
            const isFree      = pendingTier.price === 0;
            return (
              <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/50">
                  <p className="text-sm font-bold text-foreground">{pendingTier.name}</p>
                  <button onClick={() => setPendingTier(null)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* ── Guest count controls ── */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Guests</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPendingQuantity(q => Math.max(1, q - 1))}
                        disabled={pendingQuantity <= 1}
                        className="w-14 h-14 rounded-xl border-2 border-border text-2xl font-bold text-foreground hover:border-primary hover:text-primary disabled:opacity-30 transition-all active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-3xl font-bold text-foreground tabular-nums">{pendingQuantity}</span>
                      <button
                        onClick={() => setPendingQuantity(q => q + 1)}
                        className="w-14 h-14 rounded-xl border-2 border-border text-2xl font-bold text-foreground hover:border-primary hover:text-primary transition-all active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* ── Prominent total display ── */}
                  <div className="rounded-2xl bg-secondary/40 px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-extrabold text-foreground tabular-nums">
                        {isFree ? "Free" : `$${totalPrice}`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {totalGuests === 1 ? "1 guest" : `${totalGuests} guests`}
                        {pendingTier.admits_count > 1 && <span className="ml-1 text-xs">({pendingQuantity} × {pendingTier.admits_count}-pack)</span>}
                      </p>
                    </div>
                    {!isFree && pendingQuantity > 1 && (
                      <p className="text-xs text-muted-foreground text-right">
                        ${pendingTier.price} × {pendingQuantity}
                      </p>
                    )}
                  </div>

                  {/* Vendor picker — only for distributor-tracked tiers */}
                  {pendingTier.requires_distributor && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Select vendor / distributor:</p>

                      {/* Known vendors */}
                      <div className="flex gap-2 flex-wrap">
                        {vendors.map(v => (
                          <button
                            key={v.id}
                            onClick={() => { setSelectedVendorId(v.id); setManualVendorMode(false); setManualVendorName(""); }}
                            className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all
                              ${!manualVendorMode && selectedVendorId === v.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary/30 hover:border-primary/50"}`}
                          >
                            {v.name}
                          </button>
                        ))}

                        {/* Enter Manually option */}
                        <button
                          onClick={() => { setManualVendorMode(true); setSelectedVendorId(""); }}
                          className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all
                            ${manualVendorMode
                              ? "border-amber-400 bg-amber-50 text-amber-700"
                              : "border-dashed border-border bg-secondary/20 text-muted-foreground hover:border-amber-400/60 hover:text-amber-600"}`}
                        >
                          + Enter Manually
                        </button>
                      </div>

                      {/* Manual name input */}
                      {manualVendorMode && (
                        <div className="flex gap-2 items-center pt-1">
                          <input
                            autoFocus
                            type="text"
                            value={manualVendorName}
                            onChange={e => setManualVendorName(e.target.value)}
                            placeholder="Vendor / distributor name…"
                            className="flex-1 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-amber-400"
                            maxLength={80}
                          />
                          {manualVendorName.trim() && (
                            <span className="text-xs text-amber-600 font-medium whitespace-nowrap">Will be logged</span>
                          )}
                        </div>
                      )}

                      {/* No vendors warning */}
                      {vendors.length === 0 && !manualVendorMode && (
                        <p className="text-xs text-muted-foreground italic">No active vendors — use "Enter Manually" or add in Settings → Promo Codes</p>
                      )}
                    </div>
                  )}

                  {/* ── Actions ── */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setPendingTier(null)}
                      className="px-5 py-4 rounded-xl border border-border text-base font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmVendorEntry}
                      disabled={
                        manualAdd.isPending ||
                        (pendingTier.requires_distributor && manualVendorMode && !manualVendorName.trim()) ||
                        (pendingTier.requires_distributor && !manualVendorMode && !selectedVendorId)
                      }
                      className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {manualAdd.isPending
                        ? "Logging…"
                        : `Confirm Entry — ${isFree ? "Free" : `$${totalPrice}`}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

{/* ── Dancer Check-Out button ──────────────────────────────────── */}
          <button
            onClick={() => setCheckoutOpen(true)}
            className="w-full flex items-center justify-between px-6 py-5 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition-all group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-600 transition-colors">
                <LogOut className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg text-orange-800">Dancer Check-Out</p>
                <p className="text-sm text-orange-600">Requires dancer PIN or face scan</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-orange-400 group-hover:text-orange-600 transition-colors" />
          </button>

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
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                      className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-base transition-all active:scale-[0.99]
                        ${isSelected ? "border-primary bg-primary/10 text-primary" : `border-border hover:border-primary/50 ${s.bg}`}`}>
                      <span className={`w-3 h-3 rounded-full shrink-0 ${isSelected ? "bg-primary" : s.dot}`} />
                      <span className="flex-1 font-semibold text-left">{d.stage_name}</span>
                      {s.label && <span className={`text-sm font-bold ${isSelected ? "text-primary" : s.labelColor}`}>{s.label}</span>}
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
              <div className="grid grid-cols-2 gap-3 mb-4">
                {danceTiers.map(tier => {
                  const isActive = selectedTier?.id === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`flex flex-col items-start gap-1.5 px-5 py-5 rounded-2xl border-2 transition-all text-left active:scale-95 min-h-[80px]
                        ${isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/30 hover:border-primary/60 hover:bg-primary/5"}`}
                    >
                      <span className={`text-sm font-medium ${isActive ? "text-primary/80" : "text-muted-foreground"}`}>{tier.name}</span>
                      <span className={`text-xl font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
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
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setReportType("door")}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-border bg-white hover:border-primary/50 text-base font-semibold text-foreground transition-all shadow-sm active:scale-95">
              <FileText className="w-5 h-5" /> Door Report
            </button>
            <button onClick={() => setReportType("dancer")}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-border bg-white hover:border-primary/50 text-base font-semibold text-foreground transition-all shadow-sm active:scale-95">
              <FileText className="w-5 h-5" /> Dancer Report
            </button>
            <button onClick={() => setReportType("full")}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-border bg-white hover:border-primary/50 text-base font-semibold text-foreground transition-all shadow-sm active:scale-95">
              <FileText className="w-5 h-5" /> Full Report
            </button>
          </div>
        </div>
      )}

      {/* ── Dancer Check-Out modal ────────────────────────────────────────── */}
      {checkoutOpen && (
        <DancerCheckOutFlow onClose={() => setCheckoutOpen(false)} />
      )}

      {reportType && (
        <ReportModal type={reportType} onClose={() => setReportType(null)} />
      )}
    </AppLayout>
  );
}
