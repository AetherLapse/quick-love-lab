import { useEffect, useRef, useState } from "react";
import { Mic2, Clock, BedDouble, CheckCircle2, Volume2, VolumeX, User } from "lucide-react";
import { useStage, useElapsed } from "@/contexts/StageContext";
import { useActiveRoomSessions } from "@/hooks/useDashboardData";
import logo from "@/assets/logo-2nyt.png";

// ── Web Audio beep ─────────────────────────────────────────────────────────────
function beep(pattern: "soft" | "urgent" | "alert") {
  try {
    const ctx  = new AudioContext();
    const play = (freq: number, start: number, dur: number, vol = 0.5) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    if (pattern === "soft")   { play(660, 0, 0.3); }
    if (pattern === "urgent") { play(880, 0, 0.15); play(880, 0.2, 0.15); play(1100, 0.4, 0.25); }
    if (pattern === "alert")  { [0, 0.18, 0.36, 0.54, 0.72].forEach(t => play(1100, t, 0.12, 0.6)); }
  } catch { /* blocked */ }
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── On-Stage display ──────────────────────────────────────────────────────────
function OnStagePanel({ name, inRoom }: { name: string; inRoom: boolean }) {
  const elapsed = useElapsed(null); // pass null, just display via stage context
  return (
    <div className="rounded-3xl border-4 border-green-500 bg-green-950/60 px-8 py-7 text-center space-y-2">
      <div className="flex items-center justify-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        <p className="text-green-400 text-sm font-bold uppercase tracking-[0.2em]">On Stage Now</p>
      </div>
      <p className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">{name}</p>
      {inRoom && (
        <div className="flex items-center justify-center gap-2 mt-1">
          <BedDouble className="w-4 h-4 text-pink-400" />
          <span className="text-pink-400 text-sm font-semibold">Currently in Room Session</span>
        </div>
      )}
    </div>
  );
}

// ── Up-Next display ───────────────────────────────────────────────────────────
function UpNextPanel({
  name, inRoom, secondsUntilNext, paused, acknowledged, onAcknowledge,
}: {
  name: string; inRoom: boolean; secondsUntilNext: number;
  paused: boolean; acknowledged: boolean; onAcknowledge: () => void;
}) {
  const isUrgent  = !paused && secondsUntilNext <= 120;
  const isCritical = !paused && secondsUntilNext <= 30;

  const mins = Math.floor(secondsUntilNext / 60);
  const secs = String(secondsUntilNext % 60).padStart(2, "0");

  return (
    <div className={`rounded-3xl border-4 px-8 py-7 text-center space-y-3 transition-all duration-500 relative overflow-hidden
      ${isCritical
        ? "border-red-500 bg-red-950/70 animate-pulse"
        : isUrgent
          ? "border-amber-400 bg-amber-950/60"
          : "border-white/20 bg-white/5"
      }`}
    >
      {/* Blinking overlay for critical */}
      {isCritical && (
        <div className="absolute inset-0 bg-red-500/10 animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite] rounded-3xl pointer-events-none" />
      )}

      <div className="flex items-center justify-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isUrgent ? "bg-amber-400 animate-pulse" : "bg-white/40"}`} />
        <p className={`text-sm font-bold uppercase tracking-[0.2em] ${isUrgent ? "text-amber-400" : "text-white/60"}`}>
          {isCritical ? "🚨 GO NOW!" : "Up Next"}
        </p>
      </div>

      <p className={`text-5xl md:text-6xl font-extrabold tracking-tight ${isCritical ? "text-red-300" : isUrgent ? "text-amber-200" : "text-white"}`}>
        {name}
      </p>

      {inRoom && (
        <div className="flex items-center justify-center gap-2">
          <BedDouble className="w-4 h-4 text-pink-400" />
          <span className="text-pink-400 text-sm font-semibold">In Room — 2-min grace applies</span>
        </div>
      )}

      {/* Timer */}
      <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-2xl font-mono font-bold
        ${isCritical ? "bg-red-500/30 text-red-200" : isUrgent ? "bg-amber-500/20 text-amber-200" : "bg-white/10 text-white/70"}`}
      >
        <Clock className="w-5 h-5" />
        {paused ? "Paused" : `${mins}:${secs}`}
      </div>

      {/* Acknowledge button — shown when urgent */}
      {isUrgent && !acknowledged && (
        <button
          onClick={onAcknowledge}
          className={`mt-2 w-full py-4 rounded-2xl text-xl font-extrabold transition-all active:scale-95
            ${isCritical
              ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/40"
              : "bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/40"
            }`}
        >
          ✓ I'm Heading Up
        </button>
      )}
      {acknowledged && (
        <div className="flex items-center justify-center gap-2 py-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-semibold">Acknowledged — heading to stage</span>
        </div>
      )}
    </div>
  );
}

// ── Private Rooms live panel ──────────────────────────────────────────────────

function useElapsedTimer() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function RoomsPanel() {
  useElapsedTimer(); // re-renders every second for live timers
  const { data: sessions = [] } = useActiveRoomSessions();

  const formatElapsed = (entryTime: string) => {
    const secs = Math.floor((Date.now() - new Date(entryTime).getTime()) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  return (
    <div className="w-full mt-4">
      <div className="flex items-center gap-2 mb-3">
        <BedDouble className="w-4 h-4 text-pink-400" />
        <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Private Rooms</p>
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30">{sessions.length} active</span>
      </div>

      {sessions.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-white/10 bg-white/5">
          <BedDouble className="w-4 h-4 text-white/20" />
          <span className="text-white/30 text-sm">No active room sessions</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sessions.map((s: any) => {
            const name = s.dancers?.stage_name ?? "Performer";
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-pink-500/30 bg-pink-500/10"
              >
                <div className="w-9 h-9 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-pink-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{name}</p>
                  <p className="text-pink-300/70 text-xs truncate">{s.package_name ?? s.room_name ?? "Session"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-pink-200 font-mono text-sm font-bold">{formatElapsed(s.entry_time)}</p>
                  <p className="text-pink-400/50 text-[10px]">elapsed</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Backroom TV ──────────────────────────────────────────────────────────
export default function BackroomTV() {
  const { current, queue, secondsUntilNext, paused } = useStage();
  const now     = useNow();
  const nextUp  = queue[0] ?? null;

  const [acknowledged, setAcknowledged] = useState(false);
  const [muted, setMuted]               = useState(false);
  const lastBeepRef  = useRef<"soft"|"urgent"|"alert"|null>(null);
  const lastNextIdRef = useRef<string | null>(null);

  // Reset acknowledge when next dancer changes
  useEffect(() => {
    if (nextUp?.dancerId !== lastNextIdRef.current) {
      setAcknowledged(false);
      lastNextIdRef.current = nextUp?.dancerId ?? null;
    }
  }, [nextUp?.dancerId]);

  // Audio alerts
  useEffect(() => {
    if (muted || paused || !nextUp) return;
    if (secondsUntilNext <= 30 && lastBeepRef.current !== "alert") {
      if (!muted) beep("alert");
      lastBeepRef.current = "alert";
    } else if (secondsUntilNext <= 120 && secondsUntilNext > 30 && lastBeepRef.current !== "urgent") {
      if (!muted) beep("urgent");
      lastBeepRef.current = "urgent";
    } else if (secondsUntilNext > 120) {
      lastBeepRef.current = null;
    }
  }, [secondsUntilNext, paused, nextUp, muted]);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={logo} alt="2NYT" className="h-10 w-auto opacity-80" />
          <div>
            <p className="text-white font-bold text-sm">2NYT Entertainment</p>
            <p className="text-white/40 text-xs">Backroom Stage Display</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMuted(m => !m)}
            className="p-2 rounded-xl border border-white/20 hover:border-white/40 text-white/60 hover:text-white transition-colors"
            title={muted ? "Unmute alerts" : "Mute alerts"}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <span className="font-mono text-2xl font-bold text-white/80">{timeStr}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6 max-w-2xl mx-auto w-full">

        {/* No rotation running */}
        {!current && !nextUp && (
          <div className="text-center space-y-4">
            <Mic2 className="w-24 h-24 text-white/10 mx-auto" />
            <p className="text-white/40 text-2xl font-bold">No rotation running</p>
            <p className="text-white/25 text-sm">Stage rotation will appear here when started from the Dashboard</p>
          </div>
        )}

        {/* On stage */}
        {current && (
          <div className="w-full">
            <OnStagePanel name={current.dancerName} inRoom={current.inRoom ?? false} />
          </div>
        )}

        {/* Up next */}
        {nextUp && (
          <div className="w-full">
            <UpNextPanel
              name={nextUp.dancerName}
              inRoom={nextUp.inRoom ?? false}
              secondsUntilNext={secondsUntilNext}
              paused={paused}
              acknowledged={acknowledged}
              onAcknowledge={() => { setAcknowledged(true); if (!muted) beep("soft"); }}
            />
          </div>
        )}

        {/* Queue preview */}
        {queue.length > 1 && (
          <div className="w-full mt-2">
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 text-center">Coming Up</p>
            <div className="flex flex-wrap justify-center gap-2">
              {queue.slice(1, 6).map((e, i) => (
                <div key={e.dancerId}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <span className="text-white/30 text-xs font-bold">{i + 2}</span>
                  <span className="text-white/70 text-sm font-semibold">{e.dancerName}</span>
                  {e.inRoom && <BedDouble className="w-3 h-3 text-pink-400" />}
                </div>
              ))}
              {queue.length > 6 && (
                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/30 text-xs">
                  +{queue.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Private rooms live status */}
        <RoomsPanel />
      </main>

      {/* Footer status */}
      <footer className="px-8 py-3 border-t border-white/10 flex items-center justify-between text-xs text-white/30">
        <span>{queue.length} in queue</span>
        {paused && <span className="text-amber-400 font-semibold">⏸ Rotation Paused</span>}
        <span>Backroom TV · {muted ? "Muted 🔇" : "Sound On 🔊"}</span>
      </footer>
    </div>
  );
}
