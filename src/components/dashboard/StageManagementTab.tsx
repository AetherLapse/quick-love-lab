import { useRef, useState, useEffect, useCallback } from "react";
import {
  Mic2, SkipForward, GripVertical,
  UserMinus, RefreshCw, Clock, BedDouble, ArrowUpFromLine, ArrowDownToLine,
  DollarSign, AlertTriangle, X, Trash2, History, Delete, Loader2, KeyRound,
} from "lucide-react";
import { useStage, useElapsed, useRoomGrace, type StageEntry, type StageHistoryEntry } from "@/contexts/StageContext";
import { useAttendanceLogs, useActiveRoomSessions, useActiveDancers, today } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Audio beep ────────────────────────────────────────────────────────────────
function playBeep(freq = 880, duration = 0.25, vol = 0.4) {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch { /* AudioContext blocked */ }
}

// ── Countdown ring ─────────────────────────────────────────────────────────────
function CountdownRing({ seconds, total = 600 }: { seconds: number; total?: number }) {
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * (seconds / total);
  const color = seconds < 60 ? "#ef4444" : seconds < 180 ? "#f59e0b" : "hsl(328 78% 47%)";

  return (
    <svg width="88" height="88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={{ transition: "stroke-dasharray 0.8s linear, stroke 0.4s" }} />
      <text x="44" y="40" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </text>
      <text x="44" y="55" textAnchor="middle" fontSize="9" fill="#94a3b8">NEXT</text>
    </svg>
  );
}

// ── PIN verification modal ────────────────────────────────────────────────────
function PinVerifyModal({ title, onVerified, onCancel }: {
  title:      string;
  onVerified: () => void;
  onCancel:   () => void;
}) {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError(null);
    // Accept any active staff profile PIN or dancer PIN
    const [{ data: staff }, { data: dancer }] = await Promise.all([
      supabase.from("profiles").select("id").eq("pin_code", pin).eq("is_active", true).maybeSingle(),
      (supabase as any).from("dancers").select("id").eq("pin_code", pin).eq("is_active", true).maybeSingle(),
    ]);
    setLoading(false);
    if (!staff && !dancer) {
      setError("Incorrect PIN — try again");
      setPin("");
      return;
    }
    onVerified();
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center">Enter your PIN to authorise this action</p>

        {/* Dots */}
        <div className="flex justify-center gap-3 py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
              i < pin.length ? "bg-primary border-primary scale-110" : "border-border"
            }`} />
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2">
          {keys.map((k, i) => {
            if (k === "") return <div key={i} />;
            if (k === "⌫") return (
              <button key={i} onClick={() => { setPin(p => p.slice(0, -1)); setError(null); }}
                className="aspect-square flex items-center justify-center rounded-xl border border-border bg-white hover:bg-secondary text-muted-foreground transition-all shadow-sm">
                <Delete className="w-4 h-4" />
              </button>
            );
            return (
              <button key={i} onClick={() => { if (pin.length < 6) { setPin(p => p + k); setError(null); } }}
                className="aspect-square flex items-center justify-center rounded-xl border border-border bg-white hover:border-primary hover:bg-primary/5 text-foreground text-lg font-bold transition-all shadow-sm active:scale-95">
                {k}
              </button>
            );
          })}
        </div>

        {error && <p className="text-xs text-destructive text-center">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-all">
            Cancel
          </button>
          <button onClick={verify} disabled={pin.length < 4 || loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all flex items-center justify-center gap-1.5">
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
  title:     string;
  reasons:   string[];
  onConfirm: (reason: string) => void;
  onCancel:  () => void;
}) {
  const [selected, setSelected] = useState("");
  const [custom,   setCustom]   = useState("");
  const reason = selected === "Other" ? custom.trim() : selected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2">
          {reasons.map(r => (
            <button key={r} onClick={() => setSelected(r)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${selected === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
              {r}
            </button>
          ))}
        </div>
        {selected === "Other" && (
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Enter reason…"
            autoFocus
            className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        )}
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-all">
            Cancel
          </button>
          <button onClick={() => reason && onConfirm(reason)} disabled={!reason}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all">
            Confirm
          </button>
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
    <div className="absolute right-0 top-8 z-30 w-56 bg-white border border-border rounded-2xl shadow-xl p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider">Issue Fine — {dancerName}</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-3 h-3" /></button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map(a => (
          <button key={a} onClick={() => issue(a)}
            className="py-2 rounded-xl border-2 border-border text-sm font-bold hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive transition-all">
            ${a}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value.replace(/\D/g, ""))}
          placeholder="Custom $"
          className="flex-1 border border-border rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:border-primary font-mono"
        />
        <button
          onClick={() => custom && issue(Number(custom), "Custom fine")}
          disabled={!custom}
          className="px-3 py-2 rounded-xl bg-destructive text-white text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-all"
        >
          Fine
        </button>
      </div>
    </div>
  );
}

// ── On-Stage card ─────────────────────────────────────────────────────────────
function OnStageCard({ entry, secondsUntilNext, onAdvance, onOffStage, onSkip }:
  { entry: StageEntry; secondsUntilNext: number; onAdvance: () => void; onOffStage: () => void; onSkip: () => void }) {
  const elapsed = useElapsed(entry.startTime);

  const beeped = useRef(false);
  useEffect(() => {
    if (secondsUntilNext <= 60 && !beeped.current) {
      playBeep(660, 0.3);
      beeped.current = true;
    }
    if (secondsUntilNext > 60) beeped.current = false;
  }, [secondsUntilNext]);

  return (
    <div className="bg-white rounded-2xl border-2 border-green-400 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center shrink-0">
          <Mic2 className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">On Stage Now</p>
          <p className="text-lg font-bold text-foreground truncate">{entry.dancerName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono">{elapsed}</span>
            {entry.inRoom && (
              <span className="ml-2 text-[10px] font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">IN ROOM</span>
            )}
          </div>
        </div>
        <CountdownRing seconds={secondsUntilNext} />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={onSkip}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium transition-all">
          <SkipForward className="w-4 h-4" /> Skip Dancer
        </button>
        <div className="flex-1" />
        <button onClick={onOffStage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/10 text-sm font-medium transition-all">
          <ArrowDownToLine className="w-4 h-4" /> Off Stage
        </button>
        <button onClick={onAdvance}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-all">
          <SkipForward className="w-4 h-4" /> Next Dancer
        </button>
      </div>
    </div>
  );
}

// ── Empty stage card ──────────────────────────────────────────────────────────
function EmptyStageCard({ onStart, queue, onPutOnStage }: {
  onStart: () => void;
  queue: StageEntry[];
  onPutOnStage: (id: string, name: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mic2 className="w-5 h-5 opacity-40" />
          <span className="text-sm font-semibold">Stage is empty</span>
        </div>
        <button onClick={onStart}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-all">
          <SkipForward className="w-3.5 h-3.5" /> Auto-Start Rotation
        </button>
      </div>
      {queue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Put on stage manually:</p>
          {queue.slice(0, 4).map(entry => (
            <button key={entry.dancerId} onClick={() => onPutOnStage(entry.dancerId, entry.dancerName)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
              <ArrowUpFromLine className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{entry.dancerName}</span>
              {entry.inRoom && <span className="ml-auto text-[10px] text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">IN ROOM</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Queue row ─────────────────────────────────────────────────────────────────
function QueueRow({
  entry, index, onRemove, onFine, onDragStart, onDragOver, onDrop, dragging,
}: {
  entry: StageEntry; index: number;
  onRemove: (reason: string) => void; onFine: () => void;
  onDragStart: (i: number) => void;
  onDragOver:  (i: number) => void;
  onDrop:      () => void;
  dragging:    number | null;
}) {
  const isDragging    = dragging === index;
  const [showFine,   setShowFine]   = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const graceSeconds  = useRoomGrace(entry.dancerId);
  const isNextUp      = index === 0;
  const isLate        = isNextUp && graceSeconds === null && !entry.inRoom;

  return (
    <div className="relative">
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={e => { e.preventDefault(); onDragOver(index); }}
        onDrop={onDrop}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none
          ${isDragging ? "opacity-40 scale-95 border-primary" : "border-border bg-white hover:border-primary/40"}
          ${isNextUp ? "border-primary/40 bg-primary/3" : ""}
        `}
      >
        {/* Position badge */}
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${isNextUp ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
          {index + 1}
        </span>

        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{entry.dancerName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {entry.inRoom && (
              <div className="flex items-center gap-1">
                <BedDouble className="w-3 h-3 text-pink-500" />
                <span className="text-[10px] text-pink-500 font-medium">In Room Session</span>
              </div>
            )}
            {graceSeconds !== null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${graceSeconds > 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700 animate-pulse"}`}>
                ⏱ {Math.floor(graceSeconds / 60)}:{String(graceSeconds % 60).padStart(2, "0")} grace
              </span>
            )}
            {isNextUp && graceSeconds === null && !entry.inRoom && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">UP NEXT</span>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-mono shrink-0">
          ~{index + 1} set{index !== 0 ? "s" : ""} away
        </span>

        {/* Fine button */}
        <button
          onClick={() => setShowFine(s => !s)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title="Issue fine"
        >
          <DollarSign className="w-3.5 h-3.5" />
        </button>

        {/* Remove */}
        <button onClick={() => setShowRemove(true)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title="Remove from queue">
          <UserMinus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fine popover */}
      {showFine && (
        <FinePopover
          dancerId={entry.dancerId}
          dancerName={entry.dancerName}
          onClose={() => setShowFine(false)}
        />
      )}

      {/* Remove reason modal */}
      {showRemove && (
        <ReasonModal
          title={`Remove ${entry.dancerName}`}
          reasons={REMOVE_REASONS}
          onConfirm={reason => { onRemove(reason); setShowRemove(false); }}
          onCancel={() => setShowRemove(false)}
        />
      )}
    </div>
  );
}

// ── Stage history panel ───────────────────────────────────────────────────────
function StageHistoryPanel({ history }: { history: StageHistoryEntry[] }) {
  const endReasonStyle = (r: StageHistoryEntry["endReason"]) =>
    r === "completed" ? "bg-green-100 text-green-700" :
    r === "skipped"   ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700";

  const dotColor = (r: StageHistoryEntry["endReason"]) =>
    r === "completed" ? "bg-green-500" : r === "skipped" ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Stage History Tonight</h3>
        <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">{history.length}</span>
      </div>
      <div className="space-y-1.5">
        {history.map(h => (
          <div key={h.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border">
            <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor(h.endReason)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{h.dancerName}</p>
              {h.skipReason && (
                <p className="text-xs text-muted-foreground">
                  {h.endReason === "skipped" ? "Skipped" : "Removed"}: {h.skipReason}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {Math.floor(h.durationSeconds / 60)}:{String(h.durationSeconds % 60).padStart(2, "0")}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 capitalize ${endReasonStyle(h.endReason)}`}>
              {h.endReason}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function StageManagementTab() {
  const {
    current, queue, secondsUntilNext, fines, stageHistory,
    advanceQueue, offStageEarly, removeFromQueue, reorderQueue,
    setFullQueue, skipDancer, putOnStage, notifyRoomExit, clearFines,
  } = useStage();

  const [showSkipPin,   setShowSkipPin]   = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const todayStr = today();
  const { data: attendance    = [] } = useAttendanceLogs(todayStr, todayStr);
  const { data: roomSessions  = [] } = useActiveRoomSessions();
  const { data: activeDancers = [] } = useActiveDancers();

  // Track room session changes — push newly-in-room dancers to back; notify grace on exit
  const prevRoomIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(roomSessions.map((s: any) => s.dancer_id as string));

    // Dancer entered a room → move them to the back of the queue
    const newlyEntered: string[] = [];
    currentIds.forEach(id => {
      if (!prevRoomIdsRef.current.has(id)) newlyEntered.push(id);
    });
    if (newlyEntered.length > 0) {
      const entering = new Set(newlyEntered);
      const front = queue.filter((e: StageEntry) => !entering.has(e.dancerId));
      const back  = queue.filter((e: StageEntry) =>  entering.has(e.dancerId));
      setFullQueue([...front, ...back]);
    }

    // Dancer left a room → start grace period if they're next
    prevRoomIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        const isNextInQueue = queue[0]?.dancerId === id;
        if (isNextInQueue) notifyRoomExit(id);
      }
    });

    prevRoomIdsRef.current = currentIds;
  }, [roomSessions, queue, notifyRoomExit, setFullQueue]);

  const inRoomIds       = new Set(roomSessions.map((s: any) => s.dancer_id as string));
  const currentWithRoom = current ? { ...current, inRoom: inRoomIds.has(current.dancerId) } : null;
  const queueWithRoom   = queue.map(e => ({ ...e, inRoom: inRoomIds.has(e.dancerId) }));

  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (i: number) => { dragFrom.current = i; };
  const handleDragOver  = (i: number) => setDragOver(i);
  const handleDrop      = () => {
    if (dragFrom.current !== null && dragOver !== null && dragFrom.current !== dragOver) {
      reorderQueue(dragFrom.current, dragOver);
    }
    dragFrom.current = null; setDragOver(null);
  };

  const buildEntries = useCallback((): StageEntry[] => {
    const inRoomSet = new Set(roomSessions.map((s: any) => s.dancer_id as string));
    let entries: StageEntry[];
    if (attendance.length > 0) {
      entries = [...attendance]
        .sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime())
        .filter(a => !current || a.dancer_id !== current.dancerId)
        .map(a => ({
          dancerId:   a.dancer_id,
          dancerName: (a.dancers as any)?.stage_name ?? "Dancer",
          startTime:  new Date(),
          inRoom:     inRoomSet.has(a.dancer_id),
        }));
    } else {
      const presentStatuses = new Set(["available", "on_stage", "queued", "in_room"]);
      entries = activeDancers
        .filter(d => d.live_status && presentStatuses.has(d.live_status))
        .filter(d => !current || d.id !== current.dancerId)
        .map(d => ({
          dancerId:   d.id,
          dancerName: d.stage_name,
          startTime:  new Date(),
          inRoom:     inRoomSet.has(d.id),
        }));
    }
    // In-room dancers always go to the back
    return [...entries.filter(e => !e.inRoom), ...entries.filter(e => e.inRoom)];
  }, [attendance, activeDancers, roomSessions, current]);

  const buildQueue = useCallback(() => {
    setFullQueue(buildEntries());
  }, [buildEntries, setFullQueue]);

  const startRotation = useCallback(() => {
    const entries = buildEntries();
    if (entries.length === 0) { toast.error("No dancers checked in"); return; }
    const [first, ...rest] = entries;
    putOnStage(first.dancerId, first.dancerName);
    setFullQueue(rest);
  }, [buildEntries, putOnStage, setFullQueue]);

  const presentStatuses = new Set(["available", "on_stage", "queued", "in_room"]);
  const checkedInCount  = attendance.length || activeDancers.filter(d => d.live_status && presentStatuses.has(d.live_status)).length;
  const inRoomCount     = roomSessions.length;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground">Stage Rotation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {checkedInCount} dancer{checkedInCount !== 1 ? "s" : ""} checked in
            {inRoomCount > 0 && ` · ${inRoomCount} in room`}
            {fines.length > 0 && ` · ${fines.length} fine${fines.length !== 1 ? "s" : ""} issued`}
          </p>
        </div>
        <a
          href="/backroom"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/60 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all shadow-sm"
        >
          📺 Backroom TV
        </a>
        <button onClick={buildQueue}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all shadow-sm">
          <RefreshCw className="w-4 h-4" />
          {queueWithRoom.length === 0 && !currentWithRoom ? "Build Queue" : "Rebuild"}
        </button>
      </div>

      {/* ── On-stage card ───────────────────────────────────────────────── */}
      {currentWithRoom ? (
        <OnStageCard
          entry={currentWithRoom}
          secondsUntilNext={secondsUntilNext}
          onAdvance={advanceQueue}
          onOffStage={offStageEarly}
          onSkip={() => setShowSkipPin(true)}
        />
      ) : (
        <EmptyStageCard onStart={startRotation} queue={queueWithRoom} onPutOnStage={putOnStage} />
      )}

      {/* ── Skip: PIN gate ───────────────────────────────────────────────── */}
      {showSkipPin && (
        <PinVerifyModal
          title="Skip Dancer"
          onVerified={() => { setShowSkipPin(false); setShowSkipModal(true); }}
          onCancel={() => setShowSkipPin(false)}
        />
      )}

      {/* ── Skip: reason modal ───────────────────────────────────────────── */}
      {showSkipModal && (
        <ReasonModal
          title={`Skip ${currentWithRoom?.dancerName ?? "Dancer"}`}
          reasons={SKIP_REASONS}
          onConfirm={reason => { skipDancer(reason); setShowSkipModal(false); }}
          onCancel={() => setShowSkipModal(false)}
        />
      )}

      {/* ── Queue ───────────────────────────────────────────────────────── */}
      {queueWithRoom.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Up Next</h3>
            <span className="text-xs text-muted-foreground">{queueWithRoom.length} in queue · drag to reorder · $ to fine</span>
          </div>
          <div className="space-y-2">
            {queueWithRoom.map((entry, i) => (
              <QueueRow
                key={entry.dancerId}
                entry={entry}
                index={i}
                onRemove={reason => removeFromQueue(entry.dancerId, reason)}
                onFine={() => {}}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                dragging={dragOver}
              />
            ))}
          </div>
        </div>
      ) : currentWithRoom && (
        <div className="bg-white rounded-2xl border border-dashed border-border p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Queue is empty — rebuild from check-ins</p>
        </div>
      )}

      {/* ── Fines log ───────────────────────────────────────────────────── */}
      {fines.length > 0 && (
        <div className="bg-white rounded-2xl border border-destructive/30 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Fines Issued Tonight</h3>
              <span className="px-2 py-0.5 rounded-full bg-destructive text-white text-[10px] font-bold">{fines.length}</span>
            </div>
            <button onClick={clearFines}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="space-y-1.5">
            {fines.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-destructive/5 border border-destructive/20">
                <span className="text-sm font-bold text-destructive w-12 shrink-0">${f.amount}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{f.dancerName}</p>
                  <p className="text-xs text-muted-foreground">{f.reason}</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {f.issuedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 border-t border-destructive/20 mt-1">
              <span className="text-xs text-muted-foreground font-semibold">Total</span>
              <span className="text-sm font-bold text-destructive">${fines.reduce((s, f) => s + f.amount, 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage history ────────────────────────────────────────────────── */}
      {stageHistory.length > 0 && <StageHistoryPanel history={stageHistory} />}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> On Stage</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> In Room</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Grace Period</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> &lt;1 min remaining</div>
      </div>
    </div>
  );
}
