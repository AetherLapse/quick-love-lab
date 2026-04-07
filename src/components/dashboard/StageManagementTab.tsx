import { useRef, useState } from "react";
import {
  Mic2, Play, Pause, SkipForward, RotateCcw, GripVertical,
  UserMinus, RefreshCw, Clock, BedDouble, ArrowUpFromLine, ArrowDownToLine,
} from "lucide-react";
import { useStage, useElapsed, type StageEntry } from "@/contexts/StageContext";
import { useAttendanceLogs, useActiveRoomSessions, useActiveDancers, today } from "@/hooks/useDashboardData";

// ── Countdown ring ────────────────────────────────────────────────────────────

function CountdownRing({ seconds, total = 600, paused }: { seconds: number; total?: number; paused: boolean }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const dash = circ * pct;

  const color = paused ? "#94a3b8" : seconds < 60 ? "#ef4444" : seconds < 180 ? "#f59e0b" : "hsl(328 78% 47%)";

  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <svg width="88" height="88" className="shrink-0">
      {/* track */}
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      {/* progress */}
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={{ transition: "stroke-dasharray 0.8s linear, stroke 0.4s" }}
      />
      <text x="44" y="40" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{mins}:{secs}</text>
      <text x="44" y="55" textAnchor="middle" fontSize="9" fill="#94a3b8">{paused ? "PAUSED" : "NEXT"}</text>
    </svg>
  );
}

// ── On-Stage card ─────────────────────────────────────────────────────────────

function OnStageCard({ entry, paused, secondsUntilNext, onAdvance, onOffStage, onPause, onReset }:
  { entry: StageEntry; paused: boolean; secondsUntilNext: number; onAdvance: () => void; onOffStage: () => void; onPause: () => void; onReset: () => void }) {
  const elapsed = useElapsed(entry.startTime);
  return (
    <div className="bg-white rounded-2xl border-2 border-green-400 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center shrink-0">
          <Mic2 className="w-6 h-6 text-green-600" />
        </div>

        {/* Info */}
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

        {/* Countdown ring */}
        <CountdownRing seconds={secondsUntilNext} paused={paused} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={onPause}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all
            ${paused ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:border-primary/50 transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Reset Timer
        </button>
        <div className="flex-1" />
        <button
          onClick={onOffStage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/10 text-sm font-medium transition-all"
        >
          <ArrowDownToLine className="w-4 h-4" /> Off Stage
        </button>
        <button
          onClick={onAdvance}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-all"
        >
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
        <button
          onClick={onStart}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-all"
        >
          <Play className="w-3.5 h-3.5" /> Auto-Start Rotation
        </button>
      </div>
      {queue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Put on stage manually:</p>
          {queue.slice(0, 4).map(entry => (
            <button
              key={entry.dancerId}
              onClick={() => onPutOnStage(entry.dancerId, entry.dancerName)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
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

// ── Draggable queue row ───────────────────────────────────────────────────────

function QueueRow({
  entry, index, onRemove, onDragStart, onDragOver, onDrop, dragging,
}: {
  entry: StageEntry;
  index: number;
  onRemove: () => void;
  onDragStart: (i: number) => void;
  onDragOver:  (i: number) => void;
  onDrop:      () => void;
  dragging:    number | null;
}) {
  const isDragging = dragging === index;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={onDrop}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none
        ${isDragging ? "opacity-40 scale-95 border-primary" : "border-border bg-white hover:border-primary/40"}`}
    >
      {/* Position badge */}
      <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
        {index + 1}
      </span>

      {/* Grip */}
      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{entry.dancerName}</p>
        {entry.inRoom && (
          <div className="flex items-center gap-1 mt-0.5">
            <BedDouble className="w-3 h-3 text-pink-500" />
            <span className="text-[10px] text-pink-500 font-medium">In Room Session</span>
          </div>
        )}
      </div>

      {/* Estimated slot */}
      <span className="text-xs text-muted-foreground font-mono shrink-0">
        ~{index + 1} set{index !== 0 ? "s" : ""} away
      </span>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
        title="Remove from queue"
      >
        <UserMinus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function StageManagementTab() {
  const {
    current, queue, paused, secondsUntilNext,
    advanceQueue, offStageEarly, removeFromQueue, reorderQueue,
    setFullQueue, togglePause, resetTimer, putOnStage,
  } = useStage();

  const todayStr = today();
  const { data: attendance    = [] } = useAttendanceLogs(todayStr, todayStr);
  const { data: roomSessions  = [] } = useActiveRoomSessions();
  const { data: activeDancers = [] } = useActiveDancers();

  // Derive inRoom status at render time (avoids setState loop)
  const inRoomIds = new Set(roomSessions.map((s: any) => s.dancer_id as string));
  const currentWithRoom = current ? { ...current, inRoom: inRoomIds.has(current.dancerId) } : null;
  const queueWithRoom   = queue.map(e => ({ ...e, inRoom: inRoomIds.has(e.dancerId) }));

  // ── Drag state ───────────────────────────────────────────────────────────
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (i: number) => { dragFrom.current = i; };
  const handleDragOver  = (i: number) => setDragOver(i);
  const handleDrop      = () => {
    if (dragFrom.current !== null && dragOver !== null && dragFrom.current !== dragOver) {
      reorderQueue(dragFrom.current, dragOver);
    }
    dragFrom.current = null;
    setDragOver(null);
  };

  // ── Build / refresh queue ────────────────────────────────────────────────
  // Primary source: attendance log sorted by clock_in (check-in order).
  // Fallback: all active dancers alphabetically (when no one has formally clocked in).
  const buildQueue = () => {
    const inRoomIds = new Set(roomSessions.map((s: any) => s.dancer_id as string));

    let entries: StageEntry[];

    if (attendance.length > 0) {
      // Use clock-in order
      entries = [...attendance]
        .sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime())
        .filter(a => !current || a.dancer_id !== current.dancerId)
        .map(a => ({
          dancerId:   a.dancer_id,
          dancerName: (a.dancers as any)?.stage_name ?? "Dancer",
          startTime:  new Date(),
          inRoom:     inRoomIds.has(a.dancer_id),
        }));
    } else {
      // Fallback: dancers with a live_status that means they're present tonight
      const presentStatuses = new Set(["available", "on_stage", "queued", "in_room"]);
      entries = activeDancers
        .filter(d => d.live_status && presentStatuses.has(d.live_status))
        .filter(d => !current || d.id !== current.dancerId)
        .map(d => ({
          dancerId:   d.id,
          dancerName: d.stage_name,
          startTime:  new Date(),
          inRoom:     inRoomIds.has(d.id),
        }));
    }

    // Just populate the queue — attendant manually picks who goes On Stage
    setFullQueue(entries);
  };

  const presentStatuses = new Set(["available", "on_stage", "queued", "in_room"]);
  const checkedInCount = attendance.length || activeDancers.filter(d => d.live_status && presentStatuses.has(d.live_status)).length;
  const inRoomCount = roomSessions.length;

  return (
    <div className="space-y-5">
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground">Stage Rotation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {checkedInCount} dancer{checkedInCount !== 1 ? "s" : ""} checked in
            {inRoomCount > 0 && ` · ${inRoomCount} in room`}
          </p>
        </div>
        <button
          onClick={buildQueue}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {queueWithRoom.length === 0 && !currentWithRoom ? "Build Queue" : "Rebuild from Check-ins"}
        </button>
      </div>

      {/* ── On-stage card ───────────────────────────────────────────────── */}
      {currentWithRoom ? (
        <OnStageCard
          entry={currentWithRoom}
          paused={paused}
          secondsUntilNext={secondsUntilNext}
          onAdvance={advanceQueue}
          onOffStage={offStageEarly}
          onPause={togglePause}
          onReset={resetTimer}
        />
      ) : (
        <EmptyStageCard
          onStart={buildQueue}
          queue={queueWithRoom}
          onPutOnStage={putOnStage}
        />
      )}

      {/* ── Queue ───────────────────────────────────────────────────────── */}
      {queueWithRoom.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Up Next</h3>
            <span className="text-xs text-muted-foreground">{queueWithRoom.length} in queue · drag to reorder</span>
          </div>
          <div className="space-y-2">
            {queueWithRoom.map((entry, i) => (
              <QueueRow
                key={entry.dancerId}
                entry={entry}
                index={i}

                onRemove={() => removeFromQueue(entry.dancerId)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                dragging={dragOver}
              />
            ))}
          </div>
        </div>
      ) : (
        currentWithRoom && (
          <div className="bg-white rounded-2xl border border-dashed border-border p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Queue is empty — rebuild from check-ins or add dancers manually from Door Panel</p>
          </div>
        )
      )}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> On Stage
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> In Room Session
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Queue Paused
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> &lt;1 min remaining
        </div>
      </div>
    </div>
  );
}
