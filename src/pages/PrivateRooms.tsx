import { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { Plus, AlertTriangle, Video, X, Loader2, Camera, User } from "lucide-react";
import { useActiveRoomSessions, useActiveDancers, useClubSettings, useRoomSessions, today } from "@/hooks/useDashboardData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ANON_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";

// Default layout — will be configurable from /dev-dashboard in future
const ROOM_LAYOUT = [
  { floor: "Floor 1", rooms: ["Room 1", "Room 2", "Room 3"] },
  { floor: "Floor 2", rooms: ["Room 1", "Room 2", "Room 3"] },
];

function buildRoomName(floor: string, room: string) {
  return `${floor} - ${room}`;
}

function formatTimer(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function PrivateRooms() {
  const [now, setNow] = useState(Date.now());
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedDancerId, setSelectedDancerId] = useState<string | null>(null);
  const [selectedDancerName, setSelectedDancerName] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [roomFloor, setRoomFloor] = useState("");
  const [roomName, setRoomName] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [customSongs, setCustomSongs] = useState(1);
  const [faceScanStep, setFaceScanStep] = useState<"idle" | "camera" | "scanning" | "done" | "error">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const { data: activeSessions = [] } = useActiveRoomSessions();
  const { data: dancers = [] } = useActiveDancers();
  const { data: settings } = useClubSettings();
  const { data: todaySessions = [] } = useRoomSessions(today(), today());
  const qc = useQueryClient();

  // Packages derived from settings
  const songPrice = Number(settings?.song_price ?? 50);
  const dancerPct = Number(settings?.default_dancer_payout_pct ?? 30) / 100;
  const packages = [1, 2, 3].map((songs) => {
    const gross = songs * songPrice;
    const dancer = Math.round(gross * dancerPct);
    return { songs, label: `${songs} Song${songs > 1 ? "s" : ""}`, price: gross, house: gross - dancer, dancer };
  });

  // Active package — index 0-2 = preset, 3 = custom
  const getActivePkg = () => {
    if (selectedPkg === null) return null;
    if (selectedPkg < packages.length) return packages[selectedPkg];
    const songs = Math.max(1, customSongs);
    const gross = songs * songPrice;
    const dancer = Math.round(gross * dancerPct);
    return { songs, label: `${songs} Song${songs !== 1 ? "s" : ""} (Custom)`, price: gross, house: gross - dancer, dancer };
  };

  // Map active sessions by room_name for O(1) lookup
  const sessionByRoom = Object.fromEntries(
    activeSessions.map((s) => [s.room_name ?? "", s])
  );

  // Session history (completed today)
  const completedSessions = todaySessions.filter((s) => s.exit_time);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopFaceCamera(); };
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const startSession = useMutation({
    mutationFn: async () => {
      if (!selectedDancerId || selectedPkg === null || !roomName.trim()) throw new Error("Missing selection");
      const pkg = getActivePkg();
      if (!pkg) throw new Error("Missing selection");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("room_sessions").insert({
        dancer_id: selectedDancerId,
        room_name: buildRoomName(roomFloor, roomName),
        entry_time: new Date().toISOString(),
        shift_date: today(),
        package_name: pkg.label,
        num_songs: pkg.songs,
        gross_amount: pkg.price,
        house_cut: pkg.house,
        dancer_cut: pkg.dancer,
        logged_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room_sessions_active"] });
      qc.invalidateQueries({ queryKey: ["room_sessions"] });
      toast.success("Session started");
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("room_sessions")
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

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openModal = (prefillFloor?: string, prefillRoom?: string) => {
    setShowModal(true);
    setModalStep(1);
    setSelectedDancerId(null);
    setSelectedDancerName(null);
    setSelectedPkg(null);
    setRoomFloor(prefillFloor ?? "");
    setRoomName(prefillRoom ?? "");
    setPinInput("");
    setCustomSongs(1);
    setFaceScanStep("idle");
  };

  const closeModal = () => {
    stopFaceCamera();
    setShowModal(false);
  };

  // ── PIN lookup ────────────────────────────────────────────────────────────

  const handlePinConfirm = async () => {
    if (pinInput.length < 4) return;
    setPinLoading(true);
    try {
      const { data, error } = await supabase
        .from("dancers")
        .select("id, stage_name")
        .eq("pin_code", pinInput)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("No dancer found with that PIN"); return; }
      setSelectedDancerId(data.id);
      setSelectedDancerName(data.stage_name);
      setPinInput("");
    } catch {
      toast.error("PIN lookup failed");
    } finally {
      setPinLoading(false);
    }
  };

  // ── Face scan ─────────────────────────────────────────────────────────────

  const stopFaceCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startFaceCamera = async () => {
    setFaceScanStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setFaceScanStep("error");
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

    stopFaceCamera();
    setFaceScanStep("scanning");

    const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? ANON_JWT;
      const res = await fetch(
        "https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/rekognition-search",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64 }),
        }
      );
      const data = await res.json();
      if (!mountedRef.current) return;
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      if (data.matched) {
        setSelectedDancerId(data.dancer_id);
        setSelectedDancerName(data.stage_name);
        setFaceScanStep("done");
      } else {
        const reasonMessages: Record<string, string> = {
          no_face: "No face detected. Look directly at camera.",
          no_match: "Face not recognized.",
          dancer_not_found: "Face not on file.",
          dancer_inactive: "Performer is not active.",
        };
        setFaceScanStep("error");
        toast.error(reasonMessages[data.reason] ?? "Face scan failed");
      }
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setFaceScanStep("error");
      toast.error(e instanceof Error ? e.message : "Face scan failed");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const activeCount = activeSessions.length;

  return (
    <div className="min-h-screen bg-background">
      <TopBar badge="Room Attendant" centerLabel="Private Room Tracking" />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <span className="text-primary font-medium">{activeCount} Active Session{activeCount !== 1 ? "s" : ""}</span>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-3 rounded-xl hover:glow-gold transition-all"
          >
            <Plus className="w-4 h-4" /> Start New Session
          </button>
        </div>

        {/* Floors & Rooms */}
        <div className="space-y-8 mb-8">
          {ROOM_LAYOUT.map(({ floor, rooms }) => (
            <div key={floor}>
              <h2 className="font-heading text-xl tracking-widest text-muted-foreground uppercase mb-3">
                {floor}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const key = buildRoomName(floor, room);
                  const session = sessionByRoom[key];
                  const elapsed = session ? now - new Date(session.entry_time).getTime() : 0;
                  const isOvertime = elapsed > 900000;
                  const dancer = session ? dancers.find((d) => d.id === session.dancer_id) : null;

                  if (session) {
                    return (
                      <div key={key} className={`glass-card p-5 border-2 transition-all ${isOvertime ? "border-destructive" : "border-primary/60 glow-gold"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-heading text-2xl tracking-wide">{room}</h3>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse-glow ${isOvertime ? "bg-destructive" : "bg-primary"}`} />
                            <span className={`text-xs font-medium uppercase tracking-wider ${isOvertime ? "text-destructive" : "text-primary"}`}>
                              {isOvertime ? "Overtime" : "Active"}
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
                            <span>{session.package_name} — ${session.gross_amount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Elapsed</span>
                            <span className={`font-mono font-bold ${isOvertime ? "text-destructive" : "text-primary"}`}>
                              {formatTimer(elapsed)}
                            </span>
                          </div>
                          {isOvertime && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Session overtime
                            </p>
                          )}
                          <div className="flex justify-between pt-2 border-t border-border/50">
                            <span className="text-muted-foreground">Split</span>
                            <span className="text-xs">
                              House <span className="text-primary font-semibold">${session.house_cut}</span>{" "}
                              | Dancer <span className="font-semibold">${session.dancer_cut}</span>
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => endSession.mutate(session.id)}
                          disabled={endSession.isPending}
                          className="w-full py-2.5 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/10 font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {endSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          End Session
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="glass-card p-5 border-2 border-success/20 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-heading text-2xl tracking-wide">{room}</h3>
                        <span className="text-xs font-medium uppercase tracking-wider text-success">Available</span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-6">
                        <button
                          onClick={() => openModal(floor, room)}
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

        {/* Session History */}
        {completedSessions.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="font-heading text-2xl tracking-wide mb-4">Tonight's Completed Sessions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Room</th>
                    <th className="pb-3 pr-4">Package</th>
                    <th className="pb-3 pr-4">Duration</th>
                    <th className="pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSessions.slice(0, 20).map((s) => {
                    const dur = s.exit_time
                      ? Math.round((new Date(s.exit_time).getTime() - new Date(s.entry_time).getTime()) / 60000)
                      : null;
                    return (
                      <tr key={s.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-muted-foreground">{formatTime(s.entry_time)}</td>
                        <td className="py-2.5 pr-4">{s.room_name}</td>
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
      </div>

      {/* ── 3-Step Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg border border-primary/20 animate-fade-in">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-all ${modalStep >= s ? "bg-primary" : "bg-secondary"}`} />
              ))}
            </div>

            {/* Step 1 — Identify Dancer */}
            {modalStep === 1 && (
              <div>
                <h3 className="font-heading text-3xl tracking-wide mb-4">Step 1 — Identify Dancer</h3>

                {/* Face scan */}
                {faceScanStep === "idle" && (
                  <div className="space-y-4">
                    <button
                      onClick={startFaceCamera}
                      className="w-full p-4 rounded-xl border border-border hover:border-primary/40 transition-all flex items-center gap-3"
                    >
                      <Video className="w-5 h-5 text-primary" />
                      <span className="font-medium">Scan Face with Camera</span>
                    </button>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Or enter PIN:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="4-digit PIN"
                          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-center font-mono tracking-widest"
                        />
                        <button
                          onClick={handlePinConfirm}
                          disabled={pinInput.length < 4 || pinLoading}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-1"
                        >
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
                      {/* Face oval guide */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-52 rounded-full border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                      </div>
                      <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/80">
                        Center dancer's face in the oval
                      </p>
                      <button
                        onClick={() => { stopFaceCamera(); setFaceScanStep("idle"); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={captureFace}
                      className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:glow-gold"
                    >
                      <Camera className="w-5 h-5" /> Capture Face
                    </button>
                  </div>
                )}

                {faceScanStep === "scanning" && (
                  <div className="animate-fade-in flex flex-col items-center gap-4 py-6">
                    <div className="relative w-28 h-28">
                      <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/30" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-scan-arc" />
                      <div className="absolute inset-4 flex items-center justify-center">
                        <User className="w-10 h-10 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">Matching face...</p>
                  </div>
                )}

                {faceScanStep === "error" && (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-destructive">Face scan failed</p>
                    <button onClick={() => setFaceScanStep("idle")} className="text-sm text-muted-foreground underline">
                      Try again
                    </button>
                  </div>
                )}

                {selectedDancerName && (
                  <div className="bg-success/10 border border-success/30 rounded-xl p-4 mt-4 animate-fade-in flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-heading text-lg text-primary">
                      {selectedDancerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-success font-semibold">{selectedDancerName} identified</p>
                      <p className="text-muted-foreground text-xs">Ready to proceed</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={() => setModalStep(2)}
                    disabled={!selectedDancerId}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:glow-gold transition-all disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Select Package */}
            {modalStep === 2 && (
              <div>
                <h3 className="font-heading text-3xl tracking-wide mb-4">Step 2 — Select Package</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {packages.map((pkg, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPkg(i)}
                      className={`py-5 rounded-xl text-center transition-all border-2 ${
                        selectedPkg === i
                          ? "bg-primary/10 border-primary glow-gold"
                          : "bg-secondary/50 border-border hover:border-primary/30"
                      }`}
                    >
                      <p className="font-heading text-xl">{pkg.label}</p>
                      <p className="text-primary font-bold text-lg">${pkg.price}</p>
                      <p className="text-xs text-muted-foreground mt-1">House ${pkg.house} | Dancer ${pkg.dancer}</p>
                    </button>
                  ))}
                  {/* Custom package */}
                  <button
                    onClick={() => setSelectedPkg(3)}
                    className={`py-5 rounded-xl text-center transition-all border-2 col-span-2 ${
                      selectedPkg === 3
                        ? "bg-primary/10 border-primary glow-gold"
                        : "bg-secondary/50 border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="font-heading text-xl">Custom</p>
                    <p className="text-xs text-muted-foreground mt-1">Enter number of songs</p>
                  </button>
                </div>

                {/* Custom song count input */}
                {selectedPkg === 3 && (() => {
                  const gross = Math.max(1, customSongs) * songPrice;
                  const dancer = Math.round(gross * dancerPct);
                  return (
                    <div className="bg-secondary/50 rounded-xl p-4 mb-4 animate-fade-in space-y-3">
                      <label className="text-sm text-muted-foreground">Number of Songs</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCustomSongs((n) => Math.max(1, n - 1))}
                          className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:border-primary/40 transition-all"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          value={customSongs}
                          onChange={(e) => setCustomSongs(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => setCustomSongs((n) => n + 1)}
                          className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:border-primary/40 transition-all"
                        >+</button>
                      </div>
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-muted-foreground">Total</span>
                        <span className="text-primary font-bold text-lg">${gross}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>House ${gross - dancer}</span>
                        <span>Dancer ${dancer}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-3">
                  <button onClick={() => setModalStep(1)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">
                    ← Back
                  </button>
                  <button
                    onClick={() => setModalStep(3)}
                    disabled={selectedPkg === null || (selectedPkg === 3 && customSongs < 1)}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:glow-gold transition-all disabled:opacity-40"
                  >
                    Next →
                  </button>
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
                        {rooms.map((room) => {
                          const key = buildRoomName(floor, room);
                          const occupied = !!sessionByRoom[key];
                          const selected = roomFloor === floor && roomName === room;
                          return (
                            <button
                              key={key}
                              onClick={() => { setRoomFloor(floor); setRoomName(room); }}
                              disabled={occupied}
                              className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                                occupied
                                  ? "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                                  : selected
                                  ? "border-primary bg-primary/10 text-foreground glow-gold"
                                  : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
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
                      <p><span className="text-muted-foreground">Split:</span> <span>House ${pkg.house} | Dancer ${pkg.dancer}</span></p>
                    </div>
                  );
                })()}

                <div className="flex gap-3">
                  <button onClick={() => setModalStep(2)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">
                    ← Back
                  </button>
                  <button
                    onClick={() => startSession.mutate()}
                    disabled={!roomName || !selectedDancerId || selectedPkg === null || startSession.isPending}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:glow-gold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
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
