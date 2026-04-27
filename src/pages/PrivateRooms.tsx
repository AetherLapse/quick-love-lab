import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Plus, AlertTriangle, Video, X, Loader2, Camera, User,
  Clock, DollarSign, Play, CheckCircle2,
} from "lucide-react";
import {
  useActiveRoomSessions, useActiveDancers, useClubSettings, useRoomSessions,
  useExtendRoomSession, useDanceTiers, today,
} from "@/hooks/useDashboardData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";

// TODO: make configurable by Super Admin
const ROOM_LAYOUT = [
  { floor: "Floor 1", rooms: ["VIP Room 1", "VIP Room 2"] },
];

function buildRoomName(floor: string, room: string) { return `${floor} - ${room}`; }
function formatTimer(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function formatCountdown(secs: number) {
  // Negative while time remains (-3:43 = 3m43s left), positive once in overtime
  const abs = Math.abs(secs);
  const m = String(Math.floor(abs / 60)).padStart(2, "0");
  const s = String(abs % 60).padStart(2, "0");
  return secs > 0 ? `-${m}:${s}` : `${m}:${s}`;
}
function getCountdownSecs(session: { entry_time?: string | null; duration_minutes?: number | null; extension_minutes?: number | null }, nowMs: number) {
  if (!session.entry_time || !session.duration_minutes) return null;
  const totalSecs = (session.duration_minutes + (session.extension_minutes ?? 0)) * 60 + 45;
  const elapsedSecs = Math.floor((nowMs - new Date(session.entry_time).getTime()) / 1000);
  return totalSecs - elapsedSecs;
}
function playBeep(frequency: number, duration: number, repeats = 1) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < repeats; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.6 + duration);
      osc.start(ctx.currentTime + i * 0.6);
      osc.stop(ctx.currentTime + i * 0.6 + duration);
    }
  } catch { /* AudioContext unavailable */ }
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function formatTimeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

type Session = Awaited<ReturnType<typeof useActiveRoomSessions>>["data"][number];

export function RoomsPanel() {
  const [now, setNow] = useState(Date.now());

  // ── New session modal ────────────────────────────────────────────────────────
  const [showNewModal, setShowNewModal]     = useState(false);
  const [modalStep, setModalStep]           = useState(1);
  const [selectedDancerId, setSelectedDancerId]     = useState<string | null>(null);
  const [selectedDancerName, setSelectedDancerName] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg]       = useState<number | null>(null);
  const [roomFloor, setRoomFloor]           = useState("");
  const [roomName, setRoomName]             = useState("");
  const [pinInput, setPinInput]             = useState("");
  const [pinLoading, setPinLoading]         = useState(false);
  const [customSongs, setCustomSongs]       = useState(1);
  const [customPrice, setCustomPrice]       = useState(50);
  const [faceScanStep, setFaceScanStep]     = useState<"idle" | "camera" | "scanning" | "done" | "error">("idle");

  // ── Assign-queue-to-room modal ────────────────────────────────────────────────
  const [assignSession, setAssignSession]   = useState<Session | null>(null);

  // ── Extend modal ─────────────────────────────────────────────────────────────
  const [extendSession, setExtendSession]   = useState<Session | null>(null);

  // ── Beep tracking ─────────────────────────────────────────────────────────────
  const beepedWarning  = useRef<Set<string>>(new Set());
  const beepedOvertime = useRef<Set<string>>(new Set());

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const { data: allActive = [] } = useActiveRoomSessions();
  const { data: dancers = [] }   = useActiveDancers();
  const { data: settings }       = useClubSettings();
  const { data: todaySessions = [] } = useRoomSessions(today(), today());
  const { data: danceTiers = [] } = useDanceTiers();
  const qc = useQueryClient();

  // Split active query into queue vs truly active
  const queued  = allActive.filter(s => !s.entry_time || s.room_name === "Queue");
  const active  = allActive.filter(s => s.entry_time && s.room_name !== "Queue");
  const completed = todaySessions.filter(s => s.exit_time);

  // Map active by room for O(1) lookup
  const sessionByRoom = Object.fromEntries(active.map(s => [s.room_name ?? "", s]));

  // Packages
  const songPrice  = Number(settings?.song_price ?? 50);
  const dancerPct  = Number(settings?.default_dancer_payout_pct ?? 30) / 100;
  const packages   = [1, 2, 3].map(songs => {
    const gross  = songs * songPrice;
    const dancer = Math.round(gross * dancerPct);
    return { songs, label: `${songs} Song${songs > 1 ? "s" : ""}`, price: gross, house: gross - dancer, dancer };
  });

  const getActivePkg = () => {
    if (selectedPkg === null) return null;
    if (selectedPkg < packages.length) return packages[selectedPkg];
    const songs = Math.max(1, customSongs);
    const gross = songs * Math.max(1, customPrice);
    const dancer = Math.round(gross * dancerPct);
    return { songs, label: `${songs} Song${songs !== 1 ? "s" : ""} (Custom)`, price: gross, house: gross - dancer, dancer };
  };

  useEffect(() => {
    if (settings?.song_price) setCustomPrice(Number(settings.song_price));
  }, [settings?.song_price]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // ── Beep alerts ───────────────────────────────────────────────────────────────
  useEffect(() => {
    active.forEach(s => {
      const remaining = getCountdownSecs(s, now);
      if (remaining === null) return;
      if (remaining <= 60 && remaining > 0 && !beepedWarning.current.has(s.id)) {
        beepedWarning.current.add(s.id);
        playBeep(880, 0.25, 3);
      }
      if (remaining <= 0 && !beepedOvertime.current.has(s.id)) {
        beepedOvertime.current.add(s.id);
        playBeep(440, 0.4, 5);
      }
      // Repeating overtime beep every 30s
      if (remaining < 0 && Math.abs(remaining) % 30 === 0) {
        playBeep(440, 0.4, 5);
      }
    });
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopFaceCamera(); };
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const startSession = useMutation({
    mutationFn: async () => {
      if (!selectedDancerId || selectedPkg === null || !roomName.trim()) throw new Error("Missing selection");
      const pkg = getActivePkg();
      if (!pkg) throw new Error("Missing selection");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("room_sessions").insert({
        dancer_id:    selectedDancerId,
        room_name:    buildRoomName(roomFloor, roomName),
        entry_time:   new Date().toISOString(),
        shift_date:   today(),
        package_name: pkg.label,
        num_songs:    pkg.songs,
        gross_amount: pkg.price,
        house_cut:    pkg.house,
        dancer_cut:   pkg.dancer,
        logged_by:    user?.id,
        package_log:  `${pkg.label} ($${pkg.price})`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room_sessions_active"] });
      qc.invalidateQueries({ queryKey: ["room_sessions"] });
      toast.success("Session started");
      closeNewModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignToRoom = useMutation({
    mutationFn: async ({ sessionId, floor, room }: { sessionId: string; floor: string; room: string }) => {
      const { error } = await supabase.from("room_sessions").update({
        room_name:  buildRoomName(floor, room),
        entry_time: new Date().toISOString(),
      }).eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room_sessions_active"] });
      qc.invalidateQueries({ queryKey: ["room_sessions"] });
      toast.success("Session assigned to room");
      setAssignSession(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("room_sessions")
        .update({ exit_time: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room_sessions_active"] });
      qc.invalidateQueries({ queryKey: ["room_sessions"] });
      toast.success("Session ended");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extendMutation = useExtendRoomSession();

  // ── New session modal helpers ─────────────────────────────────────────────────

  const openNewModal = (prefillFloor?: string, prefillRoom?: string) => {
    setShowNewModal(true); setModalStep(1);
    setSelectedDancerId(null); setSelectedDancerName(null); setSelectedPkg(null);
    setRoomFloor(prefillFloor ?? ""); setRoomName(prefillRoom ?? "");
    setPinInput(""); setCustomSongs(1); setCustomPrice(songPrice); setFaceScanStep("idle");
  };

  const closeNewModal = () => { stopFaceCamera(); setShowNewModal(false); };

  // ── PIN lookup ───────────────────────────────────────────────────────────────

  const handlePinConfirm = async () => {
    if (pinInput.length < 4) return;
    setPinLoading(true);
    try {
      const { data, error } = await supabase.from("dancers")
        .select("id, stage_name").eq("pin_code", pinInput).eq("is_active", true).maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("No dancer found with that PIN"); return; }
      setSelectedDancerId(data.id); setSelectedDancerName(data.stage_name); setPinInput("");
    } catch { toast.error("PIN lookup failed"); }
    finally { setPinLoading(false); }
  };

  // ── Face scan ────────────────────────────────────────────────────────────────

  const stopFaceCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };

  const startFaceCamera = async () => {
    setFaceScanStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { setFaceScanStep("error"); }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    stopFaceCamera(); setFaceScanStep("scanning");
    const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    try {
      const res = await fetch("https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/rekognition-search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ image_base64: base64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!mountedRef.current) return;
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? `HTTP ${res.status}`);
      if (data.matched) {
        setSelectedDancerId(data.dancer_id); setSelectedDancerName(data.stage_name); setFaceScanStep("done");
      } else {
        const msgs: Record<string, string> = { no_face: "No face detected.", no_match: "Face not recognized.", dancer_not_found: "Face not on file.", dancer_inactive: "Performer not active." };
        setFaceScanStep("error"); toast.error(msgs[data.reason] ?? "Face scan failed");
      }
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setFaceScanStep("error"); toast.error(e instanceof Error ? e.message : "Face scan failed");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl tracking-wide">VIP Rooms</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {active.length} active · {queued.length} in queue
            </p>
          </div>
          <button
            onClick={() => openNewModal()}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>

        {/* ── Queue ── */}
        {queued.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading text-lg tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Queue
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {queued.map(s => {
                const dancer = dancers.find(d => d.id === s.dancer_id);
                return (
                  <div key={s.id} className="glass-card p-4 border border-border/60 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{dancer?.stage_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{s.package_name} · <span className="text-primary font-medium">${s.gross_amount}</span></p>
                      </div>
                      <span className="text-xs text-muted-foreground">{s.created_at ? formatTimeAgo(s.created_at) : ""}</span>
                    </div>
                    <div className="flex gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      House ${s.house_cut} · Dancer ${s.dancer_cut}
                    </div>
                    <button
                      onClick={() => setAssignSession(s)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> Assign to Room
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Room Grid ── */}
        <div className="space-y-8 mb-8">
          {ROOM_LAYOUT.map(({ floor, rooms }) => (
            <div key={floor}>
              <h2 className="font-heading text-xl tracking-widest text-muted-foreground uppercase mb-3">{floor}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {rooms.map(room => {
                  const key     = buildRoomName(floor, room);
                  const session = sessionByRoom[key];
                  const elapsed = session ? now - new Date(session.entry_time).getTime() : 0;
                  const remaining = session ? getCountdownSecs(session, now) : null;
                  const isOvertime = remaining !== null ? remaining <= 0 : elapsed > 900_000;
                  const isWarning  = remaining !== null && remaining <= 60 && remaining > 0;
                  const dancer = session ? dancers.find(d => d.id === session.dancer_id) : null;

                  if (session) {
                    return (
                      <div key={key} className={`glass-card p-5 border-2 transition-all
                        ${isOvertime ? "border-red-500 bg-red-50/30" : isWarning ? "border-orange-400 bg-orange-50/30" : "border-green-400 bg-green-50/20"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-heading text-2xl tracking-wide">{room}</h3>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse
                              ${isOvertime ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-green-500"}`} />
                            <span className={`text-xs font-medium uppercase tracking-wider
                              ${isOvertime ? "text-red-600" : isWarning ? "text-orange-600" : "text-green-600"}`}>
                              {isOvertime ? "Overtime" : isWarning ? "Ending Soon" : "Active"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dancer</span>
                            <span className="font-medium">{dancer?.stage_name ?? "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Package</span>
                            <span className="font-medium">{(session as any).package_log ?? `${session.package_name} — $${session.gross_amount}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-bold text-foreground">${session.gross_amount}</span>
                          </div>
                          {remaining !== null ? (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">
                                {isOvertime ? "Overtime" : "Remaining"}
                              </span>
                              <span className={`font-mono font-bold text-base ${
                                isOvertime
                                  ? "text-red-600 animate-pulse"
                                  : isWarning
                                    ? "text-orange-600"
                                    : "text-green-600"
                              }`}>
                                {formatCountdown(remaining)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Elapsed</span>
                              <span className={`font-mono font-bold ${isOvertime ? "text-red-600 animate-pulse" : "text-green-600"}`}>
                                {formatTimer(elapsed)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-border/50">
                            <span className="text-muted-foreground">Split</span>
                            <span className="text-xs">
                              House <span className="font-semibold">${session.house_cut}</span>{" "}
                              | Dancer <span className="font-semibold">${session.dancer_cut}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setExtendSession(session)}
                            className="flex-1 py-2 rounded-xl border border-green-400 text-green-700 hover:bg-green-50 font-medium text-sm transition-all"
                          >
                            Extend
                          </button>
                          <button
                            onClick={() => endSession.mutate(session.id)}
                            disabled={endSession.isPending}
                            className="flex-1 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {endSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "End Session"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="glass-card p-5 border-2 border-dashed border-border/40 transition-all hover:border-primary/30">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-heading text-2xl tracking-wide">{room}</h3>
                        <span className="text-xs font-medium uppercase tracking-wider text-green-500">Available</span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-5 gap-2">
                        {queued.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-1">{queued.length} in queue</p>
                        )}
                        <button
                          onClick={() => openNewModal(floor, room)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Start Session
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Completed today ── */}
        {completed.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="font-heading text-2xl tracking-wide mb-4">Tonight's Completed Sessions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Room</th>
                    <th className="pb-3 pr-4">Dancer</th>
                    <th className="pb-3 pr-4">Package</th>
                    <th className="pb-3 pr-4">Duration</th>
                    <th className="pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.slice(0, 20).map(s => {
                    const dur = s.exit_time
                      ? Math.round((new Date(s.exit_time).getTime() - new Date(s.entry_time ?? s.created_at).getTime()) / 60000)
                      : null;
                    const dancer = dancers.find(d => d.id === s.dancer_id);
                    return (
                      <tr key={s.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-muted-foreground">{formatTime(s.entry_time ?? s.created_at)}</td>
                        <td className="py-2.5 pr-4">{s.room_name}</td>
                        <td className="py-2.5 pr-4">{dancer?.stage_name ?? "—"}</td>
                        <td className="py-2.5 pr-4">{s.package_name}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{dur != null ? `${dur} min` : "—"}</td>
                        <td className="py-2.5 text-right text-primary font-semibold">${s.gross_amount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      {/* ── Extend Session Modal ── */}
      {extendSession && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-sm border border-primary/20 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-2xl tracking-wide">Extend Session</h3>
              <button onClick={() => setExtendSession(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current total */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-5 text-sm space-y-1">
              <p><span className="text-muted-foreground">Dancer:</span> <span className="font-medium">{dancers.find(d => d.id === extendSession.dancer_id)?.stage_name ?? "—"}</span></p>
              <p><span className="text-muted-foreground">Current total:</span> <span className="font-bold">${extendSession.gross_amount}</span></p>
              {(extendSession as any).package_log && (
                <p className="text-xs text-muted-foreground font-mono break-all">{(extendSession as any).package_log}</p>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">Choose a package to add:</p>
            <div className="space-y-2">
              {danceTiers.filter(t => t.duration_minutes != null).map(tier => (
                <button
                  key={tier.id}
                  disabled={extendMutation.isPending}
                  onClick={async () => {
                    await extendMutation.mutateAsync({
                      sessionId:   extendSession.id,
                      packageName: tier.name,
                      amount:      tier.price,
                      extraMinutes: tier.duration_minutes!,
                    });
                    toast.success(`Extended: +${tier.name} (+$${tier.price})`);
                    setExtendSession(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-border hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 text-left"
                >
                  <div>
                    <p className="font-semibold text-sm">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">+{tier.duration_minutes} min</p>
                  </div>
                  <span className="font-bold text-green-700">+${tier.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Assign to Room Modal ── */}
      {assignSession && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md border border-primary/20 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-2xl tracking-wide">Assign to Room</h3>
              <button onClick={() => setAssignSession(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session info */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-5 text-sm space-y-1">
              <p><span className="text-muted-foreground">Dancer:</span> <span className="font-medium">{dancers.find(d => d.id === assignSession.dancer_id)?.stage_name ?? "—"}</span></p>
              <p><span className="text-muted-foreground">Package:</span> <span>{assignSession.package_name} — ${assignSession.gross_amount}</span></p>
            </div>

            {/* Room picker */}
            <div className="space-y-4">
              {ROOM_LAYOUT.map(({ floor, rooms }) => (
                <div key={floor}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{floor}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {rooms.map(room => {
                      const key = buildRoomName(floor, room);
                      const occupied = !!sessionByRoom[key];
                      return (
                        <button
                          key={key}
                          disabled={occupied || assignToRoom.isPending}
                          onClick={() => assignToRoom.mutate({ sessionId: assignSession.id, floor, room })}
                          className={`py-3 rounded-xl text-sm font-medium transition-all border-2 flex flex-col items-center justify-center ${
                            occupied
                              ? "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                              : "border-border hover:border-primary hover:bg-primary/10 text-foreground"
                          }`}
                        >
                          {assignToRoom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : room}
                          {occupied && <span className="text-xs text-muted-foreground/40">In use</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── New Session Modal (3 steps) ── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg border border-primary/20 animate-fade-in">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-all ${modalStep >= s ? "bg-primary" : "bg-secondary"}`} />
              ))}
            </div>

            {/* Step 1 — Identify Dancer */}
            {modalStep === 1 && (
              <div>
                <h3 className="font-heading text-3xl tracking-wide mb-4">Step 1 — Identify Dancer</h3>
                {faceScanStep === "idle" && (
                  <div className="space-y-4">
                    <button onClick={startFaceCamera} className="w-full p-4 rounded-xl border border-border hover:border-primary/40 transition-all flex items-center gap-3">
                      <Video className="w-5 h-5 text-primary" />
                      <span className="font-medium">Scan Face with Camera</span>
                    </button>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Or enter PIN:</p>
                      <div className="flex gap-2">
                        <input type="text" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="Dancer PIN" className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-center font-mono tracking-widest" />
                        <button onClick={handlePinConfirm} disabled={pinInput.length < 4 || pinLoading}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-1">
                          {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {faceScanStep === "camera" && (
                  <div className="space-y-3 mb-4 animate-fade-in">
                    <div className="relative aspect-video bg-secondary/80 rounded-xl border border-border overflow-hidden">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-52 rounded-full border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                      </div>
                      <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/80">Center dancer's face in the oval</p>
                      <button onClick={() => { stopFaceCamera(); setFaceScanStep("idle"); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={captureFace}
                      className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90">
                      <Camera className="w-5 h-5" /> Capture Face
                    </button>
                  </div>
                )}
                {faceScanStep === "scanning" && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Matching face…</p>
                  </div>
                )}
                {faceScanStep === "error" && (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-destructive">Face scan failed</p>
                    <button onClick={() => setFaceScanStep("idle")} className="text-sm text-muted-foreground underline">Try again</button>
                  </div>
                )}
                {selectedDancerName && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 animate-fade-in flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-green-800 font-semibold">{selectedDancerName} identified</p>
                      <p className="text-green-700 text-xs">Ready to proceed</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeNewModal} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">Cancel</button>
                  <button onClick={() => setModalStep(2)} disabled={!selectedDancerId}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}

            {/* Step 2 — Select Package */}
            {modalStep === 2 && (
              <div>
                <h3 className="font-heading text-3xl tracking-wide mb-4">Step 2 — Select Package</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {packages.map((pkg, i) => (
                    <button key={i} onClick={() => setSelectedPkg(i)}
                      className={`py-5 rounded-xl text-center transition-all border-2 ${selectedPkg === i ? "bg-primary/10 border-primary" : "bg-secondary/50 border-border hover:border-primary/30"}`}>
                      <p className="font-heading text-xl">{pkg.label}</p>
                      <p className="text-primary font-bold text-lg">${pkg.price}</p>
                      <p className="text-xs text-muted-foreground mt-1">House ${pkg.house} | Dancer ${pkg.dancer}</p>
                    </button>
                  ))}
                  <button onClick={() => setSelectedPkg(3)}
                    className={`py-5 rounded-xl text-center transition-all border-2 col-span-2 ${selectedPkg === 3 ? "bg-primary/10 border-primary" : "bg-secondary/50 border-border hover:border-primary/30"}`}>
                    <p className="font-heading text-xl">Custom</p>
                    <p className="text-xs text-muted-foreground mt-1">Enter number of songs</p>
                  </button>
                </div>
                {selectedPkg === 3 && (() => {
                  const songs = Math.max(1, customSongs);
                  const pricePerSong = Math.max(1, customPrice);
                  const gross = songs * pricePerSong;
                  const dancer = Math.round(gross * dancerPct);
                  return (
                    <div className="bg-secondary/50 rounded-xl p-4 mb-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Number of Songs</label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setCustomSongs(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:border-primary/40">−</button>
                          <input type="number" min={1} value={customSongs} onChange={e => setCustomSongs(Math.max(1, parseInt(e.target.value) || 1))}
                            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-center font-mono text-xl focus:outline-none focus:border-primary" />
                          <button onClick={() => setCustomSongs(n => n + 1)} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:border-primary/40">+</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Price per Song</label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setCustomPrice(n => Math.max(1, n - 5))} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:border-primary/40">−</button>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                            <input type="number" min={1} value={customPrice} onChange={e => setCustomPrice(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-background border border-border rounded-xl pl-7 pr-3 py-2 text-center font-mono text-xl focus:outline-none focus:border-primary" />
                          </div>
                          <button onClick={() => setCustomPrice(n => n + 5)} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:border-primary/40">+</button>
                        </div>
                      </div>
                      <div className="border-t border-border pt-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{songs} song{songs !== 1 ? "s" : ""} × ${pricePerSong}</span>
                          <span className="text-primary font-bold text-xl">${gross}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>House ${gross - dancer}</span><span>Dancer ${dancer}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex gap-3">
                  <button onClick={() => setModalStep(1)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">← Back</button>
                  <button onClick={() => setModalStep(3)} disabled={selectedPkg === null || (selectedPkg === 3 && customSongs < 1)}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}

            {/* Step 3 — Select Room */}
            {modalStep === 3 && (
              <div>
                <h3 className="font-heading text-3xl tracking-wide mb-4">Step 3 — Select Room</h3>
                <div className="space-y-4 mb-4">
                  {ROOM_LAYOUT.map(({ floor, rooms }) => (
                    <div key={floor}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{floor}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {rooms.map(room => {
                          const key = buildRoomName(floor, room);
                          const occupied = !!sessionByRoom[key];
                          const selected = roomFloor === floor && roomName === room;
                          return (
                            <button key={key} onClick={() => { setRoomFloor(floor); setRoomName(room); }} disabled={occupied}
                              className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${occupied ? "border-border/30 text-muted-foreground/30 cursor-not-allowed" : selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"}`}>
                              {room}
                              {occupied && <span className="block text-xs text-muted-foreground/40">In use</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedDancerName && selectedPkg !== null && roomName && (() => {
                  const pkg = getActivePkg();
                  if (!pkg) return null;
                  return (
                    <div className="bg-secondary/50 rounded-xl p-4 mb-4 text-sm space-y-1">
                      <p><span className="text-muted-foreground">Dancer:</span> <span className="font-medium">{selectedDancerName}</span></p>
                      <p><span className="text-muted-foreground">Package:</span> <span>{pkg.label} — ${pkg.price}</span></p>
                      <p><span className="text-muted-foreground">Location:</span> <span>{roomFloor} — {roomName}</span></p>
                    </div>
                  );
                })()}
                <div className="flex gap-3">
                  <button onClick={() => setModalStep(2)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">← Back</button>
                  <button onClick={() => startSession.mutate()} disabled={!roomName || !selectedDancerId || selectedPkg === null || startSession.isPending}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {startSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "✅ Start Session"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrivateRooms() {
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <RoomsPanel />
      </div>
    </AppLayout>
  );
}
