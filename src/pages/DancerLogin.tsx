import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScanFace, Mail, ArrowLeft, Loader2, Camera, AlertTriangle, Delete, Hash, LogIn } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";

type Method = "choose" | "face" | "pin";
type FaceStep = "camera" | "processing" | "failed";

const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";

export default function DancerLogin() {
  const navigate    = useNavigate();
  const [method, setMethod] = useState<Method>("choose");

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(328 78% 90% / 0.45) 0%, hsl(0 0% 100%) 70%)",
      }}
    >
      {/* Left panel */}
      <div
        className="hidden md:flex flex-col items-center justify-center w-72 px-8 shrink-0"
        style={{ background: "hsl(240 18% 10%)" }}
      >
        <img src={logo} alt="2NYT Entertainment" className="h-20 w-auto mb-6" />
        <p className="text-white/40 text-xs tracking-widest uppercase text-center leading-relaxed">
          Venue Intelligence<br />Built for the Floor
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="md:hidden mb-8">
          <img src={logo} alt="2NYT" className="h-14 w-auto" />
        </div>

        <div className="w-full max-w-sm">
          {method === "choose" && <ChooseMethod onSelect={setMethod} onBack={() => navigate("/")} />}
          {method === "face"   && <FaceLogin onBack={() => setMethod("choose")} />}
          {method === "pin"    && <EmailPinLogin onBack={() => setMethod("choose")} />}
        </div>
      </div>
    </div>
  );
}

// ─── Method picker ────────────────────────────────────────────────────────────
function ChooseMethod({ onSelect, onBack }: { onSelect: (m: Method) => void; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading tracking-widest text-foreground mb-1">DANCER LOGIN</h1>
        <p className="text-sm text-muted-foreground">Choose how you'd like to sign in</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onSelect("face")}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-border bg-white hover:border-primary hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <ScanFace className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground text-sm">Face Scan</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sign in instantly using facial recognition</p>
          </div>
        </button>

        <button
          onClick={() => onSelect("pin")}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-border bg-white hover:border-primary hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground text-sm">Email &amp; PIN</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sign in with your email address and PIN</p>
          </div>
        </button>
      </div>

      <button
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
      >
        ← Back to home
      </button>
    </div>
  );
}

// ─── Face scan login ──────────────────────────────────────────────────────────
function FaceLogin({ onBack }: { onBack: () => void }) {
  const navigate   = useNavigate();
  const [faceStep, setFaceStep] = useState<FaceStep>("camera");
  const [error, setError]       = useState<string | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch {
        setError("Camera unavailable. Please use Email & PIN instead.");
      }
    };
    start();
    return () => stopCamera();
  }, [stopCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    stopCamera();
    setFaceStep("processing");
    setError(null);

    try {
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      const res = await fetch("https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/rekognition-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ image_base64: base64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      if (data.matched) {
        const dancer = { id: data.dancer_id, name: data.full_name, stage_name: data.stage_name, method: "face" };
        sessionStorage.setItem("dancer_session", JSON.stringify(dancer));
        navigate("/dancer-portal");
      } else {
        const msgs: Record<string, string> = {
          no_face:         "No face detected. Look directly at the camera.",
          no_match:        "Face not recognized. Try Email & PIN instead.",
          dancer_not_found: "No account found for this face.",
          dancer_inactive:  "This account is currently inactive.",
        };
        setError(msgs[data.reason] ?? "Face not recognized.");
        setFaceStep("failed");
      }
    } catch (e: any) {
      setError(e.message ?? "Scan failed. Please try again.");
      setFaceStep("failed");
    }
  };

  const retry = async () => {
    setError(null);
    setFaceStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch {
      setError("Camera unavailable.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-heading tracking-widest text-foreground">FACE SCAN</h1>
          <p className="text-xs text-muted-foreground">Center your face in the oval and tap Scan</p>
        </div>
      </div>

      {/* Camera / processing / failed states */}
      {faceStep === "camera" && (
        <>
          <div className="relative aspect-video bg-secondary/80 rounded-2xl border border-border overflow-hidden shadow-sm">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-48 rounded-full border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <button
            onClick={handleCapture}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
          >
            <Camera className="w-5 h-5" /> Scan My Face
          </button>
        </>
      )}

      {faceStep === "processing" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your identity…</p>
        </div>
      )}

      {faceStep === "failed" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
          <button onClick={retry}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" /> Try Again
          </button>
          <button onClick={onBack}
            className="w-full py-3 rounded-xl border border-border text-sm font-medium hover:border-primary/50 transition-colors">
            Use Email &amp; PIN Instead
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Email + PIN login ────────────────────────────────────────────────────────
function EmailPinLogin({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail]   = useState("");
  const [pin, setPin]       = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake]   = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePinKey = (key: string | number | "back") => {
    setError(null);
    if (key === "back") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length < 6) setPin(p => p + key);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address"); return; }
    if (pin.length < 4)                         { setError("PIN must be at least 4 digits"); return; }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/dancer-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim(), pin }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      if (!data.success) {
        const msgs: Record<string, string> = {
          not_found: "Email or PIN is incorrect",
          inactive:  "Your account is currently inactive. Contact management.",
          server_error: "Server error. Please try again.",
        };
        setError(msgs[data.reason] ?? "Email or PIN is incorrect");
        setPin("");
        triggerShake();
        return;
      }

      const dancer = { id: data.dancer_id, name: data.full_name, stage_name: data.stage_name, method: "pin" };
      sessionStorage.setItem("dancer_session", JSON.stringify(dancer));
      navigate("/dancer-portal");
    } catch (e: any) {
      setError(e.message ?? "Login failed. Please try again.");
      setPin("");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };


  const PAD = [1,2,3,4,5,6,7,8,9,null,0,"back"] as const;

  return (
    <div className={`space-y-5 ${shake ? "animate-shake" : ""}`}>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-heading tracking-widest text-foreground">EMAIL &amp; PIN</h1>
          <p className="text-xs text-muted-foreground">Enter your registered email and PIN</p>
        </div>
      </div>

      {/* Email field */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(null); }}
          placeholder="your@email.com"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* PIN display */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Hash className="w-3 h-3" /> PIN
        </label>
        <div className="flex items-center justify-center gap-3 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all
                ${i < pin.length
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white text-transparent"
                }`}
            >
              {i < pin.length ? "•" : "·"}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2">
        {PAD.map((key, i) => (
          key === null ? (
            <div key={i} />
          ) : key === "back" ? (
            <button
              key={i}
              onClick={() => handlePinKey("back")}
              disabled={loading}
              className="h-14 rounded-xl border border-border bg-white flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all active:scale-95 disabled:opacity-40"
            >
              <Delete className="w-5 h-5" />
            </button>
          ) : (
            <button
              key={i}
              onClick={() => handlePinKey(key)}
              disabled={loading || pin.length >= 6}
              className="h-14 rounded-xl border border-border bg-white text-xl font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-40"
            >
              {key}
            </button>
          )
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || pin.length < 4 || !email.includes("@")}
        className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
        {loading ? "Verifying…" : "Sign In"}
      </button>
    </div>
  );
}
