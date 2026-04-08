import { useState, useRef, useCallback, useEffect } from "react";
import { Video, Check, DollarSign, Clock, AlertTriangle, Delete, User, Loader2, Camera, UserPlus, ArrowLeft, Search, LogOut, ShieldOff, Shield } from "lucide-react";
import { useDancerCheckIn, useCheckedInDancersToday, useDancerCheckOut, EARLY_LEAVE_FINE_AMOUNT } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
type EnrollStep = "lookup" | "camera" | "processing" | "done" | "already-enrolled" | "error";

// ─── Enrollment panel ─────────────────────────────────────────────────────────
function EnrollDancerPanel({ onBack }: { onBack: () => void }) {
  const [enrollStep, setEnrollStep] = useState<EnrollStep>("lookup");
  const [empId, setEmpId]           = useState("");
  const [dancer, setDancer]         = useState<{ id: string; stage_name: string; is_enrolled: boolean } | null>(null);
  const [searching, setSearching]   = useState(false);
  const [, setEnrolling]            = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleLookup = async () => {
    if (!empId.trim()) return;
    setSearching(true); setError(null);
    const { data, error: err } = await supabase
      .from("dancers")
      .select("id, stage_name, is_enrolled")
      .ilike("employee_id", empId.trim())
      .single();
    setSearching(false);
    if (err || !data) { setError("No dancer found for that Employee ID."); return; }
    setDancer(data as any);
    if ((data as any).is_enrolled) setEnrollStep("already-enrolled");
    else setEnrollStep("camera");
  };

  const startCamera = async () => {
    setError(null);
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

  useEffect(() => {
    if (enrollStep === "camera") startCamera();
    else stopCamera();
  }, [enrollStep]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !dancer) return;
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    stopCamera();
    setEnrollStep("processing");
    setEnrolling(true);

    const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

    try {
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";
      const res = await fetch("https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/rekognition-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ dancer_id: dancer.id, image_base64: base64 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? `HTTP ${res.status}: ${JSON.stringify(json)}`);
      if (!json?.success) throw new Error(json?.error ?? json?.message ?? "Enrollment failed");

      setEnrollStep("done");
    } catch (e: any) {
      setError(e.message ?? "Enrollment failed. Try again.");
      setEnrollStep("error");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-foreground">Enroll Dancer Face</h3>
      </div>

      {/* Step: lookup */}
      {enrollStep === "lookup" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Enter the dancer's Employee ID given by admin to begin enrollment.</p>
          <div className="flex gap-2">
            <input
              value={empId}
              onChange={e => setEmpId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleLookup()}
              placeholder="e.g. EMP-004"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <button onClick={handleLookup} disabled={searching || !empId.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Find
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {/* Step: camera */}
      {enrollStep === "camera" && dancer && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium">
            <User className="w-4 h-4" /> Enrolling: <span className="font-bold">{dancer.stage_name}</span>
          </div>
          <div className="relative aspect-video bg-secondary/80 rounded-xl border border-border overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 rounded-full border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/80">Center face in oval, then capture</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button onClick={handleCapture}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90">
            <Camera className="w-5 h-5" /> Capture & Enroll
          </button>
        </div>
      )}

      {/* Step: processing */}
      {enrollStep === "processing" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Indexing face with AWS Rekognition…</p>
        </div>
      )}

      {/* Step: error */}
      {enrollStep === "error" && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Enrollment Failed</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => { setError(null); setEnrollStep("camera"); startCamera(); }}
            className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/50 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Step: already enrolled */}
      {enrollStep === "already-enrolled" && dancer && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
            <strong>{dancer.stage_name}</strong> is already enrolled. Re-enrolling will replace their existing face data.
          </div>
          <button onClick={() => setEnrollStep("camera")}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold">
            Re-Enroll Face
          </button>
        </div>
      )}

      {/* Step: done */}
      {enrollStep === "done" && dancer && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800">{dancer.stage_name} enrolled!</p>
              <p className="text-sm text-green-700">Face indexed with AWS Rekognition. They can now check in via face scan.</p>
            </div>
          </div>
          <button onClick={() => { setEnrollStep("lookup"); setEmpId(""); setDancer(null); setError(null); }}
            className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/50 transition-colors">
            Enroll Another Dancer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Dancer Check-Out panel ───────────────────────────────────────────────────

function CheckOutPanel({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: checkedIn = [], isLoading } = useCheckedInDancersToday();
  const checkOut = useDancerCheckOut();

  const [selected, setSelected]     = useState<typeof checkedIn[0] | null>(null);
  const [waiverCode, setWaiverCode] = useState("");
  const [codeError, setCodeError]   = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validCode, setValidCode]   = useState<{ id: string; reason: string } | null>(null);

  // Fine applies if current time is before midnight (hour 0–23 on the shift day, after 6 PM)
  // After midnight (hour 0–5 AM next day) → no fine.
  const hasFine = (() => {
    const h = new Date().getHours();
    return h >= 18 && h <= 23; // 6 PM – 11:59 PM = before midnight, fine applies
  })();

  const validateCode = async () => {
    if (!selected || !waiverCode.trim()) return;
    setValidating(true); setCodeError(null); setValidCode(null);
    const { data, error } = await (supabase as any)
      .from("early_leave_codes")
      .select("id, reason, dancer_id, used")
      .eq("code", waiverCode.trim().toUpperCase())
      .eq("shift_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    setValidating(false);
    if (error || !data) { setCodeError("Code not found"); return; }
    if (data.used) { setCodeError("Code already used"); return; }
    if (data.dancer_id && data.dancer_id !== selected.dancer_id) {
      setCodeError("Code not valid for this dancer"); return;
    }
    setValidCode({ id: data.id, reason: data.reason });
  };

  const handleCheckOut = async (waiveWithCode: boolean) => {
    if (!selected || !user) return;
    const fine   = hasFine && !waiveWithCode ? EARLY_LEAVE_FINE_AMOUNT : 0;
    const waived = hasFine && waiveWithCode;
    try {
      await checkOut.mutateAsync({
        attendanceId:  selected.id,
        dancerId:      selected.dancer_id,
        fine,
        fineWaived:    waived,
        waiverCodeId:  waived && validCode ? validCode.id : undefined,
        checkedOutBy:  user.id,
      });
      const name = selected.dancers?.stage_name ?? "Dancer";
      if (fine > 0)        toast.success(`${name} checked out — $${fine} early leave fine applied`);
      else if (waived)     toast.success(`${name} checked out — fine waived (${validCode?.reason})`);
      else                 toast.success(`${name} checked out`);
      setSelected(null); setWaiverCode(""); setValidCode(null);
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
    }
  };

  const clockInTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-heading text-lg tracking-wide">Dancer Check-Out</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : checkedIn.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No dancers currently checked in</p>
      ) : (
        <div className="space-y-2">
          {checkedIn.map(entry => (
            <button
              key={entry.id}
              onClick={() => { setSelected(entry); setWaiverCode(""); setValidCode(null); setCodeError(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected?.id === entry.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
                {entry.dancers?.stage_name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{entry.dancers?.stage_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">In at {clockInTime(entry.clock_in)}</p>
              </div>
              <LogOut className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Checkout modal for selected dancer */}
      {selected && (
        <div className="glass-card border-2 border-primary/20 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{selected.dancers?.stage_name}</p>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {hasFine ? (
            <div className="space-y-3">
              {/* Fine warning */}
              <div className="flex items-start gap-2 px-3 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Early Leave — Before Midnight</p>
                  <p className="text-xs mt-0.5">Fine: <span className="font-bold">${EARLY_LEAVE_FINE_AMOUNT}</span></p>
                </div>
              </div>

              {/* Waiver code entry */}
              {!validCode ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Have a manager one-time code? Enter it to waive the fine:</p>
                  <div className="flex gap-2">
                    <input
                      value={waiverCode}
                      onChange={e => { setWaiverCode(e.target.value.toUpperCase()); setCodeError(null); }}
                      placeholder="e.g. KX7M2QPL"
                      maxLength={12}
                      className={`flex-1 border rounded-xl px-3 py-2 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-primary
                        ${codeError ? "border-destructive" : "border-border"}`}
                    />
                    <button
                      onClick={validateCode}
                      disabled={validating || !waiverCode.trim()}
                      className="px-3 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 transition-all"
                    >
                      {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  {codeError && <p className="text-xs text-destructive">{codeError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                  <Shield className="w-4 h-4 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Code valid — fine waived</p>
                    <p className="text-xs text-green-700">{validCode.reason}</p>
                  </div>
                  <button onClick={() => { setValidCode(null); setWaiverCode(""); }} className="text-green-600 hover:text-green-800 transition-colors">
                    <ShieldOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                {validCode ? (
                  <button
                    onClick={() => handleCheckOut(true)}
                    disabled={checkOut.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {checkOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4" /> Check Out (Fine Waived)</>}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckOut(false)}
                    disabled={checkOut.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {checkOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><DollarSign className="w-4 h-4" /> Check Out + ${EARLY_LEAVE_FINE_AMOUNT} Fine</>}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                <Check className="w-4 h-4 shrink-0" />
                <p>After midnight — no fine applies</p>
              </div>
              <button
                onClick={() => handleCheckOut(false)}
                disabled={checkOut.isPending}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {checkOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogOut className="w-4 h-4" /> Check Out</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DancerCheckInTab({ onNewDancer }: DancerCheckInTabProps) {
  const { user, role } = useAuth();
  const [mode, setMode] = useState<"checkin" | "enroll" | "checkout">("checkin");
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<{ name: string; fee: number } | null>(null);
  const [resultMethod, setResultMethod] = useState<"Face Scan" | "PIN Entry">("Face Scan");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [dancerLog, setDancerLog] = useState<DancerLogEntry[]>([]);

  // PIN verification before enrollment (door_staff only)
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [enrollPin, setEnrollPin] = useState("");
  const [enrollPinError, setEnrollPinError] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);

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

  const applyLateFee = (baseFee: number): number => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(20, 30, 0, 0); // 8:30 PM
    return now >= cutoff ? baseFee + 20 : baseFee;
  };

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

      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";
      const res = await fetch(
        "https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/rekognition-search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({ image_base64: base64 }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? `HTTP ${res.status}`);

      if (data.matched) {
        await performCheckIn(data.dancer_id, data.stage_name, applyLateFee(Number(data.entrance_fee)), "facial");
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
      await performCheckIn(dancer.id, dancer.stage_name, applyLateFee(Number(dancer.entrance_fee)), "pin");
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

  const handleEnrollClick = () => {
    if (role === "door_staff") {
      setEnrollPin("");
      setEnrollPinError(false);
      setShowPinVerify(true);
    } else {
      setMode("enroll");
    }
  };

  const handleVerifyEnrollPin = async () => {
    if (!user) return;
    setVerifyingPin(true);
    const { data } = await supabase
      .from("profiles")
      .select("pin_code")
      .eq("user_id", user.id)
      .single();
    setVerifyingPin(false);
    if (!data?.pin_code || data.pin_code !== enrollPin) {
      setEnrollPinError(true);
      return;
    }
    setShowPinVerify(false);
    setMode("enroll");
  };

  if (mode === "enroll") {
    return <EnrollDancerPanel onBack={() => setMode("checkin")} />;
  }

  if (mode === "checkout") {
    return <CheckOutPanel onBack={() => setMode("checkin")} />;
  }

  return (
    <div className="space-y-4">
      {/* PIN Verify Overlay */}
      {showPinVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="bg-background rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-4">
            <p className="text-sm font-semibold text-center text-foreground">Enter Your Staff PIN to Continue</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              value={enrollPin}
              onChange={e => { setEnrollPin(e.target.value.replace(/\D/g, "")); setEnrollPinError(false); }}
              className={`w-full border rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] bg-white focus:outline-none ${enrollPinError ? "border-destructive" : "border-border"}`}
              placeholder="••••"
            />
            {enrollPinError && <p className="text-destructive text-xs text-center">Incorrect PIN</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPinVerify(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyEnrollPin}
                disabled={verifyingPin || enrollPin.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {verifyingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="border-t border-border/40 mt-3 pt-3 flex gap-2">
              <button
                onClick={handleEnrollClick}
                className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-1.5"
              >
                <UserPlus className="w-4 h-4" /> Enroll Dancer →
              </button>
              <button
                onClick={() => setMode("checkout")}
                className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-orange-600 transition-colors py-1.5 border-l border-border/40"
              >
                <LogOut className="w-4 h-4" /> Check Out →
              </button>
            </div>
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
