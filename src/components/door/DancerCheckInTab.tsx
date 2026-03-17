import { useState, useRef, useCallback, useEffect } from "react";
import { Video, Check, DollarSign, Clock, AlertTriangle, Delete, User, Loader2, Camera } from "lucide-react";
import { useDancerCheckIn } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";

interface DancerLogEntry {
  name: string;
  time: string;
  method: "Face Scan" | "PIN Entry";
  fee: number;
}

interface DancerCheckInTabProps {
  onNewDancer: () => void;
}

type Step = "idle" | "face-camera" | "face-processing" | "face-failed" | "pin" | "success";

export default function DancerCheckInTab({ onNewDancer }: DancerCheckInTabProps) {
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<{ name: string; fee: number } | null>(null);
  const [resultMethod, setResultMethod] = useState<"Face Scan" | "PIN Entry">("Face Scan");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [dancerLog, setDancerLog] = useState<DancerLogEntry[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { findByPin, checkIn } = useDancerCheckIn();

  const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const addToLog = (name: string, method: "Face Scan" | "PIN Entry", fee: number) => {
    setDancerLog((prev) => [{ name, time: now(), method, fee }, ...prev].slice(0, 8));
  };

  const stopFaceCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopFaceCamera();
  }, [stopFaceCamera]);

  const performCheckIn = useCallback(
    async (dancerId: string, stageName: string, entranceFee: number, method: "pin" | "facial") => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await checkIn.mutateAsync({ dancerId, entranceFee, method, authorId: user.id });
      setResult({ name: stageName, fee: entranceFee });
      setResultMethod(method === "facial" ? "Face Scan" : "PIN Entry");
      setStep("success");
      addToLog(stageName, method === "facial" ? "Face Scan" : "PIN Entry", entranceFee);
      onNewDancer();
    },
    [checkIn, onNewDancer]
  );

  const handleFaceScan = useCallback(async () => {
    setFaceError(null);
    setStep("face-camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setFaceError("Camera unavailable. Please use PIN.");
      setStep("face-failed");
    }
  }, []);

  const handleFaceCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

    stopFaceCamera();
    setStep("face-processing");

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];

      const { data, error } = await supabase.functions.invoke("rekognition-search", {
        body: { image_base64: base64 },
      });

      if (error) throw error;

      if (data.matched) {
        await performCheckIn(data.dancer_id, data.stage_name, Number(data.entrance_fee), "facial");
      } else {
        const reasonMessages: Record<string, string> = {
          no_face: "No face detected. Please look directly at the camera.",
          no_match: "Face not recognized.",
          dancer_not_found: "Face not on file.",
          dancer_inactive: "Performer is not active.",
        };
        setFaceError(reasonMessages[data.reason] ?? "Face scan failed.");
        setStep("face-failed");
      }
    } catch {
      setFaceError("Scan error. Please try again or use PIN.");
      setStep("face-failed");
    }
  }, [stopFaceCamera, performCheckIn]);

  const handlePinSubmit = useCallback(async () => {
    if (pin.length !== 4) return;
    try {
      const dancer = await findByPin(pin);
      if (!dancer) {
        setPinError(true);
        setPin("");
        return;
      }
      setPin("");
      setPinError(false);
      await performCheckIn(dancer.id, dancer.stage_name, Number(dancer.entrance_fee), "pin");
    } catch {
      setPinError(true);
      setPin("");
    }
  }, [pin, findByPin, performCheckIn]);

  const handlePinKey = (key: string | number | null) => {
    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      setPinError(false);
    } else if (key !== null && pin.length < 4) {
      setPin((p) => p + key);
      setPinError(false);
    }
  };

  const reset = () => {
    stopFaceCamera();
    setStep("idle");
    setResult(null);
    setPin("");
    setPinError(false);
    setFaceError(null);
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">

        {/* IDLE */}
        {step === "idle" && (
          <>
            <button
              onClick={handleFaceScan}
              className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl mb-4 flex items-center justify-center gap-3 text-lg transition-all hover:glow-gold"
            >
              <Video className="w-5 h-5" />
              START FACE SCAN
            </button>
            <button
              onClick={() => { setStep("pin"); setPin(""); setPinError(false); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Use PIN Instead →
            </button>
          </>
        )}

        {/* FACE CAMERA — live viewfinder */}
        {step === "face-camera" && (
          <div className="animate-fade-in space-y-3">
            <div className="relative aspect-video bg-secondary/80 rounded-xl border border-border overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Face oval guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 rounded-full border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/80">
                Center your face in the oval
              </p>
            </div>
            <button
              onClick={handleFaceCapture}
              className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:glow-gold"
            >
              <Camera className="w-5 h-5" /> Capture Face
            </button>
            <button
              onClick={() => { stopFaceCamera(); setStep("pin"); setPin(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Use PIN Instead →
            </button>
          </div>
        )}

        {/* FACE PROCESSING */}
        {step === "face-processing" && (
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

        {/* FACE FAILED */}
        {step === "face-failed" && (
          <div className="animate-fade-in space-y-3">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-warning font-semibold">
                {faceError ?? "Face scan failed. Please enter your PIN."}
              </p>
            </div>
            <button
              onClick={() => { setStep("pin"); setPin(""); }}
              className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:glow-gold"
            >
              Enter PIN
            </button>
            <button
              onClick={handleFaceScan}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              ← Try Face Scan Again
            </button>
          </div>
        )}

        {/* PIN PAD */}
        {step === "pin" && (
          <div className="animate-fade-in">
            <p className="text-muted-foreground mb-5 text-center text-lg">Enter your 4-digit PIN</p>
            <div className={`flex justify-center gap-4 mb-6 ${pinError ? "animate-shake" : ""}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    i < pin.length ? "bg-primary border-primary scale-110" : "border-muted-foreground/50"
                  } ${pinError ? "border-destructive bg-destructive/30" : ""}`}
                />
              ))}
            </div>
            {pinError && <p className="text-destructive text-sm text-center mb-4">Incorrect PIN. Try again.</p>}
            <div className="grid grid-cols-3 gap-3 mb-4 max-w-[320px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "back"].map((key, i) => (
                <button
                  key={i}
                  onClick={() => handlePinKey(key)}
                  className={`rounded-xl font-semibold text-2xl transition-all flex items-center justify-center ${
                    key === null ? "invisible" : "bg-secondary hover:bg-secondary/80 text-foreground active:scale-95"
                  }`}
                  style={{ height: 72, minWidth: 72 }}
                >
                  {key === "back" ? <Delete className="w-6 h-6" /> : key}
                </button>
              ))}
            </div>
            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4 || checkIn.isPending}
              className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl disabled:opacity-40 transition-all hover:glow-gold mb-3 flex items-center justify-center gap-2"
            >
              {checkIn.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Logging in...</> : "Confirm"}
            </button>
            <button
              onClick={() => setStep("idle")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              ← Try Face Scan Again
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && result && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-xl p-5 space-y-1.5">
              <p className="text-success font-bold text-xl font-heading tracking-wide flex items-center gap-2">
                <Check className="w-5 h-5" /> {result.name} —{" "}
                {resultMethod === "Face Scan" ? "FACE VERIFIED" : "PIN VERIFIED"}
              </p>
              <p className="text-primary font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> ${result.fee} House Fee Applied
              </p>
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Check-in logged: {now()}
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full touch-target border border-border rounded-xl font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              Next Check-In
            </button>
          </div>
        )}
      </div>

      {/* Recent Dancer Check-Ins */}
      <div className="glass-card p-5">
        <h3 className="font-heading text-xl tracking-wide text-muted-foreground mb-4">Recent Dancer Check-Ins</h3>
        {dancerLog.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No check-ins this session.</p>
        ) : (
          <div className="space-y-2">
            {dancerLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-2.5 border-b border-border/30 last:border-0">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                <span className="text-foreground font-medium flex-1">{entry.name}</span>
                <span className="text-muted-foreground">{entry.time}</span>
                <span className="text-muted-foreground text-xs bg-secondary/60 px-2 py-0.5 rounded">{entry.method}</span>
                <span className="text-primary font-medium">${entry.fee} fee</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
