import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic2, Clock, ArrowUpFromLine, UserMinus, RefreshCw, BedDouble,
  SkipForward, ArrowDownToLine, GripVertical, DollarSign, AlertTriangle,
  X, Trash2, History, Delete, Loader2, KeyRound, BarChart3, Users, LogOut,
} from "lucide-react";
import { useStage, useElapsed, useRoomGrace, type StageEntry, type StageHistoryEntry } from "@/contexts/StageContext";
import { useAttendanceLogs, useActiveRoomSessions, useActiveDancers, today } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import logo from "@/assets/logo-2nyt.png";

// ── Live clock ────────────────────────────────────────────────────────────────
function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

// ── Audio beep ────────────────────────────────────────────────────────────────
function playBeep(freq = 880, duration = 0.25, vol = 0.4) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch { /* blocked */ }
}

// ── Countdown ring (purple theme) ─────────────────────────────────────────────
function CountdownRing({ seconds, total = 600 }: { seconds: number; total?: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * (seconds / total);
  const color = seconds < 60 ? "#f87171" : seconds < 180 ? "#fbbf24" : "#a78bfa";
  return (
    <svg width="96" height="96" className="shrink-0">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dasharray 0.8s linear, stroke 0.4s" }} />
      <text x="48" y="44" textAnchor="middle" fontSize="15" fontWeight="bold" fill={color}>
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </text>
      <text x="48" y="59" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">NEXT</text>
    </svg>
  );
}

// ── PIN verify modal ──────────────────────────────────────────────────────────
function PinVerifyModal({ title, onVerified, onCancel }: {
  title: string; onVerified: () => void; onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (pin.length < 4) return;
    setLoading(true); setError(null);
    const [{ data: staff }, { data: dancer }] = await Promise.all([
      supabase.from("profiles").select("id").eq("pin_code", pin).eq("is_active", true).maybeSingle(),
      (supabase as any).from("dancers").select("id").eq("pin_code", pin).eq("is_active", true).maybeSingle(),
    ]);
    setLoading(false);
    if (!staff && !dancer) { setError("Incorrect PIN"); setPin(""); return; }
    onVerified();
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl p-6 w-80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h3 className="text-base font-bold text-white">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 text-white/40"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-white/50 text-center">Enter PIN to authorise</p>
        <div className="flex justify-center gap-3 py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${i < pin.length ? "bg-purple-400 border-purple-400 scale-110" : "border-white/20"}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {keys.map((k, i) => {
            if (k === "") return <div key={i} />;
            if (k === "⌫") return (
              <button key={i} onClick={() => { setPin(p => p.slice(0, -1)); setError(null); }}
                className="aspect-square flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 transition-all">
                <Delete className="w-4 h-4" />
              </button>
            );
            return (
              <button key={i} onClick={() => { if (pin.length < 6) { setPin(p => p + k); setError(null); } }}
                className="aspect-square flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-purple-500/10 text-white text-lg font-bold transition-all active:scale-95">
                {k}
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={verify} disabled={pin.length < 4 || loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-purple-500 transition-all flex items-center justify-center gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reason modal ──────────────────────────────────────────────────────────────
const SKIP_REASONS   = ["Not ready", "In room session", "Taking a break", "Customer request", "Technical issue", "Other"];
const REMOVE_REASONS = ["Left for the night", "Called out sick", "Personal reason", "Customer complaint", "Other"];

function ReasonModal({ title, reasons, onConfirm, onCancel }: {
  title: string; reasons: string[]; onConfirm: (reason: string) => void; onCancel: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const reason = selected === "Other" ? custom.trim() : selected;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl p-6 w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 text-white/40"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2">
          {reasons.map(r => (
            <button key={r} onClick={() => setSelected(r)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${selected === r ? "border-purple-400 bg-purple-500/20 text-purple-300" : "border-white/10 text-white/70 hover:border-purple-400/40"}`}>
              {r}
            </button>
          ))}
        </div>
        {selected === "Other" && (
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Enter reason…" autoFocus
            className="w-full border border-white/10 bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400" />
        )}
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={() => reason && onConfirm(reason)} disabled={!reason}
            className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-purple-500 transition-all">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Fine popover ──────────────────────────────────────────────────────────────
function FinePopover({ dancerId, dancerName, onClose }: { dancerId: string; dancerName: string; onClose: () => void }) {
  const { issueFine } = useStage();
  const [custom, setCustom] = useState("");
  const PRESETS = [10, 25, 50, 100];
  const issue = (amount: number, reason = "Stage violation") => {
    issueFine(dancerId, dancerName, reason, amount);
    toast.error(`$${amount} fine issued to ${dancerName}`);
    onClose();
  };
  return (
    <div className="absolute right-0 top-8 z-30 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-white uppercase tracking-wider">Fine — {dancerName}</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/40"><X className="w-3 h-3" /></button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map(a => (
          <button key={a} onClick={() => issue(a)}
            className="py-2 rounded-xl border border-white/10 text-sm font-bold text-white/80 hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-300 transition-all">${a}</button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input value={custom} onChange={e => setCustom(e.target.value.replace(/\D/g, ""))} placeholder="Custom $"
          className="flex-1 border border-white/10 bg-white/5 rounded-xl px-2.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400 font-mono" />
        <button onClick={() => custom && issue(Number(custom), "Custom fine")} disabled={!custom}
          className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-40 hover:bg-red-500 transition-all">Fine</button>
      </div>
    </div>
  );
}

// ── Waiting row ───────────────────────────────────────────────────────────────
function WaitingRow({ entry, onPromote, onRemove }: {
  entry: StageEntry; onPromote: (id: string) => void; onRemove: (id: string) => void;
}) {
  const elapsed = useElapsed(entry.startTime);
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
      <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-white truncate">{entry.dancerName}</p>
        <p className="text-sm text-white/40">Waiting · {elapsed}</p>
      </div>
      <button onClick={() => onPromote(entry.dancerId)}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all shadow-lg shadow-purple-500/20">
        <ArrowUpFromLine className="w-4 h-4" /> On Stage
      </button>
      <button onClick={() => onRemove(entry.dancerId)}
        className="p-3 rounded-xl border border-white/10 text-white/30 hover:text-red-400 hover:border-red-400/40 transition-all" title="Remove">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Queue row ─────────────────────────────────────────────────────────────────
function QueueRow({
  entry, index, onRemove, onDragStart, onDragOver, onDrop, dragging,
}: {
  entry: StageEntry; index: number;
  onRemove: (reason: string) => void;
  onDragStart: (i: number) => void;
  onDragOver:  (i: number) => void;
  onDrop:      () => void;
  dragging:    number | null;
}) {
  const isDragging = dragging === index;
  const [showFine, setShowFine] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const graceSeconds = useRoomGrace(entry.dancerId);
  const isNextUp = index === 0;

  return (
    <div className="relative">
      <div
        draggable onDragStart={() => onDragStart(index)}
        onDragOver={e => { e.preventDefault(); onDragOver(index); }} onDrop={onDrop}
        className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing select-none
          ${isDragging ? "opacity-40 scale-95 border-purple-400" : "border-white/10 bg-white/5 hover:border-purple-400/40"}
          ${isNextUp ? "border-purple-400/40 bg-purple-500/5" : ""}`}
      >
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
          ${isNextUp ? "bg-purple-500 text-white" : "bg-white/10 text-white/50"}`}>{index + 1}</span>
        <GripVertical className="w-5 h-5 text-white/20 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-white truncate">{entry.dancerName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entry.inRoom && (
              <div className="flex items-center gap-1"><BedDouble className="w-4 h-4 text-pink-400" /><span className="text-xs text-pink-400 font-medium">In Room</span></div>
            )}
            {graceSeconds !== null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${graceSeconds > 60 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300 animate-pulse"}`}>
                ⏱ {Math.floor(graceSeconds / 60)}:{String(graceSeconds % 60).padStart(2, "0")} grace
              </span>
            )}
            {isNextUp && graceSeconds === null && !entry.inRoom && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">UP NEXT</span>
            )}
          </div>
        </div>
        <button onClick={() => setShowFine(s => !s)} className="p-2 rounded-xl hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors shrink-0" title="Fine">
          <DollarSign className="w-5 h-5" />
        </button>
        <button onClick={() => setShowRemove(true)} className="p-2 rounded-xl hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors shrink-0" title="Remove">
          <UserMinus className="w-5 h-5" />
        </button>
      </div>
      {showFine && <FinePopover dancerId={entry.dancerId} dancerName={entry.dancerName} onClose={() => setShowFine(false)} />}
      {showRemove && <ReasonModal title={`Remove ${entry.dancerName}`} reasons={REMOVE_REASONS}
        onConfirm={reason => { onRemove(reason); setShowRemove(false); }} onCancel={() => setShowRemove(false)} />}
    </div>
  );
}

// ── Stage history panel ───────────────────────────────────────────────────────
function StageHistoryPanel({ history }: { history: StageHistoryEntry[] }) {
  const dotColor = (r: StageHistoryEntry["endReason"]) =>
    r === "completed" ? "bg-green-400" : r === "skipped" ? "bg-amber-400" : "bg-red-400";
  const badgeStyle = (r: StageHistoryEntry["endReason"]) =>
    r === "completed" ? "bg-green-500/20 text-green-300" : r === "skipped" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <History className="w-5 h-5 text-white/40" />
        <h3 className="text-base font-bold text-white uppercase tracking-wider">History</h3>
        <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/50 text-xs font-bold">{history.length}</span>
      </div>
      <div className="space-y-2">
        {history.map(h => (
          <div key={h.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className={`w-3 h-3 rounded-full shrink-0 ${dotColor(h.endReason)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white truncate">{h.dancerName}</p>
              {h.skipReason && <p className="text-sm text-white/40">{h.endReason === "skipped" ? "Skipped" : "Removed"}: {h.skipReason}</p>}
            </div>
            <span className="text-sm text-white/40 font-mono shrink-0">
              {Math.floor(h.durationSeconds / 60)}:{String(h.durationSeconds % 60).padStart(2, "0")}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 capitalize ${badgeStyle(h.endReason)}`}>{h.endReason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stage Analytics (Admin only) ──────────────────────────────────────────────
function StageAnalytics() {
  const todayStr = today();
  const { data: sessions = [] } = useQuery({
    queryKey: ["stage_sessions", todayStr],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("stage_sessions")
        .select("dancer_id, dancer_name, started_at, ended_at, duration_sec, end_reason")
        .eq("shift_date", todayStr)
        .order("started_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  if (sessions.length === 0) return null;

  const byDancer: Record<string, { name: string; visits: number; totalSec: number }> = {};
  for (const s of sessions) {
    const key = s.dancer_id;
    if (!byDancer[key]) byDancer[key] = { name: s.dancer_name, visits: 0, totalSec: 0 };
    byDancer[key].visits++;
    byDancer[key].totalSec += s.duration_sec ?? 0;
  }

  const sorted = Object.entries(byDancer).sort((a, b) => b[1].totalSec - a[1].totalSec);
  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-5 h-5 text-purple-400" />
        <h3 className="text-base font-bold text-white uppercase tracking-wider">Stage Analytics</h3>
        <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">{sessions.length} sessions</span>
      </div>
      <div className="space-y-2">
        {sorted.map(([dancerId, d]) => (
          <div key={dancerId} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Mic2 className="w-5 h-5 text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white truncate">{d.name}</p>
              <p className="text-sm text-white/40">{d.visits} visit{d.visits !== 1 ? "s" : ""}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-purple-300 font-mono">{fmtTime(d.totalSec)}</p>
              <p className="text-xs text-white/30">total</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function StageManager() {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const now = useNow();
  const isAdmin = role === "admin" || role === "owner" || role === "manager";

  const {
    current, queue, waiting, secondsUntilNext, fines, stageHistory,
    advanceQueue, offStageEarly, removeFromQueue, reorderQueue,
    setFullQueue, skipDancer, putOnStage, addToWaiting,
    promoteFromWaiting, removeFromWaiting, notifyRoomExit, clearFines,
  } = useStage();

  const [showSkipPin, setShowSkipPin] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const todayStr = today();
  const { data: attendance = [] } = useAttendanceLogs(todayStr, todayStr);
  const { data: roomSessions = [] } = useActiveRoomSessions();
  const { data: activeDancers = [] } = useActiveDancers();

  // Track room session changes
  const prevRoomIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(roomSessions.map((s: any) => s.dancer_id as string));
    const newlyEntered: string[] = [];
    currentIds.forEach(id => { if (!prevRoomIdsRef.current.has(id)) newlyEntered.push(id); });
    if (newlyEntered.length > 0) {
      const entering = new Set(newlyEntered);
      const front = queue.filter((e: StageEntry) => !entering.has(e.dancerId));
      const back = queue.filter((e: StageEntry) => entering.has(e.dancerId));
      setFullQueue([...front, ...back]);
    }
    prevRoomIdsRef.current.forEach(id => {
      if (!currentIds.has(id) && queue[0]?.dancerId === id) notifyRoomExit(id);
    });
    prevRoomIdsRef.current = currentIds;
  }, [roomSessions, queue, notifyRoomExit, setFullQueue]);

  // Auto-add newly checked-in dancers to waiting
  const seenAttendanceRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (attendance.length === 0) return;
    const currentIds = new Set(attendance.map((a: any) => a.dancer_id as string));
    if (seenAttendanceRef.current.size === 0) { seenAttendanceRef.current = currentIds; return; }
    currentIds.forEach(id => {
      if (!seenAttendanceRef.current.has(id)) {
        const att = attendance.find((a: any) => a.dancer_id === id);
        const name = (att?.dancers as any)?.stage_name ?? "Dancer";
        if (!current || current.dancerId !== id) addToWaiting(id, name);
      }
    });
    seenAttendanceRef.current = currentIds;
  }, [attendance, current, addToWaiting]);

  const inRoomIds = new Set(roomSessions.map((s: any) => s.dancer_id as string));
  const currentWithRoom = current ? { ...current, inRoom: inRoomIds.has(current.dancerId) } : null;
  const queueWithRoom = queue.map(e => ({ ...e, inRoom: inRoomIds.has(e.dancerId) }));

  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const handleDragStart = (i: number) => { dragFrom.current = i; };
  const handleDragOver = (i: number) => setDragOver(i);
  const handleDrop = () => {
    if (dragFrom.current !== null && dragOver !== null && dragFrom.current !== dragOver) reorderQueue(dragFrom.current, dragOver);
    dragFrom.current = null; setDragOver(null);
  };

  const buildEntries = useCallback((): StageEntry[] => {
    const inRoomSet = new Set(roomSessions.map((s: any) => s.dancer_id as string));
    const skippedIds = new Set(stageHistory.filter(h => h.endReason === "skipped").map(h => h.dancerId));
    let entries: StageEntry[];
    if (attendance.length > 0) {
      entries = [...attendance]
        .sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime())
        .filter(a => (!current || a.dancer_id !== current.dancerId) && !skippedIds.has(a.dancer_id))
        .map(a => ({ dancerId: a.dancer_id, dancerName: (a.dancers as any)?.stage_name ?? "Dancer", startTime: new Date(), inRoom: inRoomSet.has(a.dancer_id) }));
    } else {
      const ps = new Set(["available", "on_stage", "queued", "in_room"]);
      entries = activeDancers
        .filter(d => d.live_status && ps.has(d.live_status))
        .filter(d => (!current || d.id !== current.dancerId) && !skippedIds.has(d.id))
        .map(d => ({ dancerId: d.id, dancerName: d.stage_name, startTime: new Date(), inRoom: inRoomSet.has(d.id) }));
    }
    return [...entries.filter(e => !e.inRoom), ...entries.filter(e => e.inRoom)];
  }, [attendance, activeDancers, roomSessions, current, stageHistory]);

  const startRotation = useCallback(() => {
    const entries = buildEntries();
    if (entries.length === 0) { toast.error("No dancers checked in"); return; }
    const [first, ...rest] = entries;
    putOnStage(first.dancerId, first.dancerName);
    setFullQueue(rest);
  }, [buildEntries, putOnStage, setFullQueue]);

  // Beep on imminent advance
  const beeped = useRef(false);
  useEffect(() => {
    if (current && secondsUntilNext <= 60 && !beeped.current) { playBeep(660, 0.3); beeped.current = true; }
    if (secondsUntilNext > 60) beeped.current = false;
  }, [secondsUntilNext, current]);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  const checkedInCount = attendance.length || activeDancers.filter(d => d.live_status && ["available","on_stage","queued","in_room"].includes(d.live_status ?? "")).length;

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: "linear-gradient(135deg, hsl(250 30% 8%) 0%, hsl(270 25% 12%) 50%, hsl(250 30% 8%) 100%)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-purple-500/10">
        <div className="flex items-center gap-4">
          <img src={logo} alt="2NYT" className="h-11 w-auto opacity-80" />
          <div>
            <p className="text-white font-bold text-base">2NYT Entertainment</p>
            <p className="text-purple-300/50 text-sm">Stage Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right mr-2">
            <p className="text-sm text-white/30">{checkedInCount} checked in{waiting.length > 0 ? ` · ${waiting.length} waiting` : ""}</p>
          </div>
          <span className="font-mono text-2xl font-bold text-white/70">{timeStr}</span>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6">

        {/* Waiting */}
        {waiting.length > 0 && (
          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Waiting</h3>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">{waiting.length}</span>
              </div>
              <p className="text-xs text-white/30">Checked in — tap "On Stage" to queue</p>
            </div>
            <div className="space-y-3">
              {waiting.map(entry => (
                <WaitingRow key={entry.dancerId} entry={entry} onPromote={promoteFromWaiting} onRemove={removeFromWaiting} />
              ))}
            </div>
          </div>
        )}

        {/* On-stage */}
        {currentWithRoom ? (
          <div className="rounded-3xl border-4 border-green-500/40 bg-green-500/5 px-8 py-7">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center shrink-0">
                <Mic2 className="w-9 h-9 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-green-400 uppercase tracking-[0.2em]">On Stage Now</p>
                <p className="text-4xl md:text-5xl font-extrabold text-white truncate">{currentWithRoom.dancerName}</p>
                {currentWithRoom.inRoom && <span className="text-xs font-bold text-pink-400 bg-pink-500/15 px-3 py-1 rounded-full mt-1 inline-block">IN ROOM</span>}
              </div>
              <CountdownRing seconds={secondsUntilNext} />
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => setShowSkipPin(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-base font-semibold transition-all">
                <SkipForward className="w-5 h-5" /> Skip
              </button>
              <div className="flex-1" />
              <button onClick={offStageEarly}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-red-400/30 text-red-400 hover:bg-red-500/10 text-base font-semibold transition-all">
                <ArrowDownToLine className="w-5 h-5" /> Off Stage
              </button>
              <button onClick={advanceQueue}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-base font-bold transition-all shadow-lg shadow-purple-500/20">
                <SkipForward className="w-5 h-5" /> Next
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border-4 border-dashed border-white/10 bg-white/5 px-8 py-7">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 text-white/30">
                <Mic2 className="w-7 h-7" />
                <span className="text-lg font-semibold">Stage is empty</span>
              </div>
              <button onClick={startRotation}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all shadow-lg shadow-purple-500/20">
                <SkipForward className="w-4 h-4" /> Auto-Start Rotation
              </button>
            </div>
            {queueWithRoom.length > 0 && (
              <div className="flex items-center gap-4 px-6 py-5 rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/10">
                <Clock className="w-6 h-6 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-yellow-400 uppercase tracking-[0.2em]">Waiting</p>
                  <p className="text-2xl font-bold text-yellow-200 truncate">{queueWithRoom[0].dancerName}</p>
                </div>
                <button onClick={() => putOnStage(queueWithRoom[0].dancerId, queueWithRoom[0].dancerName)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all shadow-lg shadow-purple-500/20">
                  <ArrowUpFromLine className="w-4 h-4" /> On Stage
                </button>
              </div>
            )}
          </div>
        )}

        {/* Skip modals */}
        {showSkipPin && (
          <PinVerifyModal title="Skip Dancer"
            onVerified={() => { setShowSkipPin(false); setShowSkipModal(true); }}
            onCancel={() => setShowSkipPin(false)} />
        )}
        {showSkipModal && (
          <ReasonModal title={`Skip ${currentWithRoom?.dancerName ?? "Dancer"}`} reasons={SKIP_REASONS}
            onConfirm={reason => { skipDancer(reason); setShowSkipModal(false); }}
            onCancel={() => setShowSkipModal(false)} />
        )}

        {/* Queue */}
        {queueWithRoom.length > 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Up Next</h3>
              <span className="text-sm text-white/30">{queueWithRoom.length} in queue</span>
            </div>
            <div className="space-y-3">
              {queueWithRoom.map((entry, i) => (
                <QueueRow key={entry.dancerId} entry={entry} index={i}
                  onRemove={reason => removeFromQueue(entry.dancerId, reason)}
                  onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} dragging={dragOver} />
              ))}
            </div>
          </div>
        ) : currentWithRoom && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <p className="text-base text-white/30">Queue empty — promote dancers from waiting</p>
          </div>
        )}

        {/* Fines */}
        {fines.length > 0 && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Fines</h3>
                <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold">{fines.length}</span>
              </div>
              <button onClick={clearFines}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-sm text-white/40 hover:text-red-400 hover:border-red-400/40 transition-all">
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </div>
            <div className="space-y-2">
              {fines.map(f => (
                <div key={f.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <span className="text-lg font-bold text-red-400 w-14 shrink-0">${f.amount}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white truncate">{f.dancerName}</p>
                    <p className="text-sm text-white/40">{f.reason}</p>
                  </div>
                  <span className="text-sm text-white/30 font-mono shrink-0">
                    {f.issuedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-red-500/10 mt-2">
                <span className="text-sm text-white/40 font-semibold">Total</span>
                <span className="text-lg font-bold text-red-400">${fines.reduce((s, f) => s + f.amount, 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {stageHistory.length > 0 && <StageHistoryPanel history={stageHistory} />}

        {/* Analytics (admin only) */}
        {isAdmin && <StageAnalytics />}

        {/* Legend */}
        <div className="flex flex-wrap gap-5 text-sm text-white/30 pt-2">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-400" /> Waiting</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400" /> On Stage</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-400" /> In Queue</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-400" /> In Room</div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="px-8 py-4 border-t border-purple-500/10 flex items-center justify-between text-sm text-white/30">
        <button onClick={async () => { await signOut(); navigate("/login"); }}
          className="flex items-center gap-2 text-white/30 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
        <span>{queue.length} in queue{waiting.length > 0 ? ` · ${waiting.length} waiting` : ""}</span>
        <span>Stage Manager</span>
      </footer>
    </div>
  );
}
