import { useState, useRef, useCallback, useEffect } from "react";
import { Video, Check, DollarSign, Clock, AlertTriangle, Delete, User, Loader2, Camera, UserPlus, ArrowLeft, Search, LogOut, ShieldOff, Shield, ChevronRight, Ban, X } from "lucide-react";
import { useDancerCheckIn, useCheckedInDancersToday, useDancerCheckOut, useMarkDancerPayment, EARLY_LEAVE_FINE_AMOUNT } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DLEnrollScanner, { type DLScanResult } from "@/components/door/DLEnrollScanner";
import { encryptField } from "@/lib/dlScan";

// ─── Ban blocked alert ────────────────────────────────────────────────────────
function BanBlockedModal({
  name, reason, enrollId, onClose,
}: {
  name: string; reason: string | null; enrollId: string; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-red-950 border-2 border-red-500 shadow-2xl shadow-red-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Entry Blocked</p>
              <p className="text-white text-xl font-extrabold leading-tight">{name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4 mt-3">
          <div className="rounded-2xl bg-red-900/50 border border-red-500/40 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-200 text-sm font-semibold">This performer is permanently banned</p>
                {reason && <p className="text-red-300/80 text-xs mt-1">Reason: {reason}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-red-400/70">
            <Shield className="w-3 h-3" />
            <span>ID: {enrollId} · Alert logged</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

interface DancerLogEntry {
  name: string;
  time: string;
  method: "Face Scan" | "PIN Entry";
  fee: number;
  paidAtCheckin: boolean;
}

interface DancerCheckInTabProps {
  onNewDancer: () => void;
}

type Step = "idle" | "face-camera" | "face-processing" | "face-failed" | "pin" | "success" | "payment";

// ─── Enrollment panel ─────────────────────────────────────────────────────────
type EnrollStep = "staff_pin" | "dl_scan" | "details" | "face" | "processing" | "done" | "error";

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";

function calcAge(dobISO: string | null): number | null {
  if (!dobISO) return null;
  const dob   = new Date(dobISO);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function EnrollDancerPanel({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [step, setStep]         = useState<EnrollStep>("staff_pin");
  const [dlData, setDlData]     = useState<DLScanResult | null>(null);
  const [stageName, setStageName] = useState("");
  const [phone, setPhone]       = useState("");
  const [dancerPin, setDancerPin] = useState("");
  const [pinErr, setPinErr]     = useState<string | null>(null);
  const [staffPin, setStaffPin] = useState("");
  const [staffPinErr, setStaffPinErr] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [newDancerId, setNewDancerId] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [ssn, setSsn]           = useState("");
  const [ssnErr, setSsnErr]     = useState<string | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (step === "face") {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          });
          streamRef.current = stream;
          if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        } catch { setError("Camera unavailable."); }
      })();
    } else stopCamera();
  }, [step, stopCamera]);

  // ── Step 1: Verify bouncer PIN ─────────────────────────────────────────────
  const handleStaffPin = async () => {
    if (!user) return;
    setVerifying(true); setStaffPinErr(null);
    const res = await fetch(`${EDGE_BASE}/dancer-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: "verify_staff_pin", user_id: user.id, pin: staffPin }),
    });
    const data = await res.json();
    setVerifying(false);
    if (!data.success) {
      setStaffPinErr(data.reason === "wrong_pin" ? "Incorrect PIN — try again" : "Verification failed");
      setStaffPin("");
      return;
    }
    setStep("dl_scan");
  };

  // ── Step 3: Create dancer record + proceed to face ─────────────────────────
  const handleDetailsConfirm = async () => {
    if (!stageName.trim()) { setPinErr("Stage name is required"); return; }
    if (dancerPin.length < 4) { setPinErr("PIN must be at least 4 digits"); return; }

    // Hard under-18 enforcement — defensive double-check
    const age = calcAge(dlData?.dobISO ?? null);
    if (age !== null && age < 18) {
      setPinErr("Registration blocked — dancer is under 18.");
      return;
    }

    // SSN validation
    const ssnDigits = ssn.replace(/\D/g, "");
    if (ssnDigits.length > 0 && ssnDigits.length !== 9) {
      setSsnErr("SSN must be 9 digits (XXX-XX-XXXX)");
      return;
    }
    setSsnErr(null);
    setPinErr(null);

    // Auto-generate enroll_id
    const enrollId = "D" + Date.now().toString(36).toUpperCase().slice(-6);

    const insertData: Record<string, any> = {
      stage_name:   stageName.trim(),
      enroll_id:    enrollId,
      pin_code:     dancerPin,
      full_name:    dlData?.fullName ?? stageName.trim(),
      is_active:    true,
      is_enrolled:  false,
    };
    if (dlData) {
      insertData.dl_hash      = dlData.hash;
      insertData.dl_masked    = dlData.dlMasked;
      insertData.dl_full_name = dlData.fullName;
      insertData.dob          = dlData.dobISO;
      insertData.dl_address   = dlData.address;
    }
    if (phone.trim()) insertData.phone = phone.trim();

    // Encrypt SSN before storing — AES-256-GCM, never plain text
    if (ssnDigits.length === 9) {
      const { ciphertext, iv } = await encryptField(ssnDigits, ANON_KEY);
      insertData.ssn_encrypted = ciphertext;
      insertData.ssn_iv        = iv;
    }

    const { data: inserted, error: insErr } = await (supabase as any)
      .from("dancers")
      .insert(insertData)
      .select("id")
      .single();

    if (insErr || !inserted) {
      setError(insErr?.message ?? "Failed to create dancer record");
      setStep("error");
      return;
    }
    setNewDancerId(inserted.id);
    setStep("face");
  };

  // ── Step 4: Face capture + Rekognition index ───────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !newDancerId) return;
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    stopCamera();
    setStep("processing");

    const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    try {
      const res = await fetch(`${EDGE_BASE}/rekognition-index`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ dancer_id: newDancerId, image_base64: base64 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error ?? json?.message ?? "Face enrollment failed");
      setStep("done");
    } catch (e: any) {
      // Delete the created dancer record so it's not orphaned
      await (supabase as any).from("dancers").delete().eq("id", newDancerId);
      setNewDancerId(null);
      setError(e.message ?? "Face enrollment failed — dancer record removed, try again");
      setStep("error");
    }
  };

  const resetAll = () => {
    setStep("staff_pin"); setDlData(null); setStageName(""); setPhone("");
    setDancerPin(""); setStaffPin(""); setStaffPinErr(null); setPinErr(null);
    setNewDancerId(null); setError(null); setSsn(""); setSsnErr(null);
  };

  // ── Step indicators ────────────────────────────────────────────────────────
  const steps: EnrollStep[] = ["staff_pin", "dl_scan", "details", "face", "done"];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={step === "staff_pin" ? onBack : () => {
          if (step === "dl_scan") setStep("staff_pin");
          else if (step === "details") setStep("dl_scan");
          else if (step === "face") { setStep("details"); setNewDancerId(null); }
        }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-foreground">New Dancer Enrollment</h3>
      </div>

      {/* Step dots */}
      {step !== "processing" && step !== "done" && step !== "error" && (
        <div className="flex gap-1.5 pb-1">
          {steps.slice(0, 4).map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= stepIdx ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      )}

      {/* ── Staff PIN ──────────────────────────────────────────────────────── */}
      {step === "staff_pin" && (
        <div className="space-y-4">
          <div className="px-4 py-3 rounded-xl bg-primary/8 border border-primary/20 text-sm text-primary">
            <p className="font-semibold">Bouncer Authorisation Required</p>
            <p className="text-xs text-primary/70 mt-0.5">Enter your PIN to begin a new dancer enrollment</p>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < staffPin.length ? "bg-primary border-primary scale-110" : "border-border bg-secondary/30"}`} />
            ))}
          </div>

          {staffPinErr && (
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{staffPinErr}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map(d => (
              <button key={d} onClick={() => { if (staffPin.length < 6) setStaffPin(p => p + d); }} disabled={verifying}
                className="h-14 rounded-xl border-2 border-border text-xl font-semibold hover:border-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-40">{d}</button>
            ))}
            <div />
            <button onClick={() => { if (staffPin.length < 6) setStaffPin(p => p + "0"); }} disabled={verifying}
              className="h-14 rounded-xl border-2 border-border text-xl font-semibold hover:border-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-40">0</button>
            <button onClick={() => setStaffPin(p => p.slice(0, -1))} disabled={verifying || staffPin.length === 0}
              className="h-14 rounded-xl border-2 border-border hover:border-destructive/40 hover:text-destructive active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center">
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <button onClick={handleStaffPin} disabled={verifying || staffPin.length < 4}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Continue"}
          </button>
        </div>
      )}

      {/* ── DL Scan ───────────────────────────────────────────────────────── */}
      {step === "dl_scan" && (
        <DLEnrollScanner
          currentDancerId=""
          onConfirm={data => {
            setDlData(data);
            setStageName(data.fullName?.split(" ")[0] ?? "");
            setStep("details");
          }}
          onBack={() => setStep("staff_pin")}
        />
      )}

      {/* ── Details form ──────────────────────────────────────────────────── */}
      {step === "details" && dlData && (() => {
        const age = calcAge(dlData.dobISO);
        // Hard block — should never reach here if DLEnrollScanner is working, but enforce defensively
        if (age !== null && age < 18) {
          return (
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-300 rounded-xl px-5 py-5 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="font-bold text-red-800 text-lg">Registration Blocked</p>
                <p className="text-sm text-red-700">Dancer is {age} years old — minimum age is 18.</p>
                <p className="text-xs text-red-600">This is a hard system restriction. No override available.</p>
              </div>
              <button onClick={() => setStep("dl_scan")} className="w-full py-2.5 rounded-xl border border-border text-sm font-medium transition-all">
                ← Scan Different ID
              </button>
            </div>
          );
        }
        return (
        <div className="space-y-4">
          {/* DL data summary + age badge */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-secondary/40 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From Driver's License</p>
              {age !== null && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${age >= 21 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  Age {age}{age >= 21 ? " ✓ 21+" : " · 18–20"}
                </span>
              )}
            </div>
            <div className="divide-y divide-border/60">
              {[
                { label: "Legal Name", value: dlData.fullName ?? "—" },
                { label: "DOB",        value: dlData.dobFormatted ?? "—" },
                { label: "ID #",       value: dlData.dlMasked },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{r.label}</span>
                  <span className="text-sm font-medium text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage Name *</label>
            <input
              value={stageName}
              onChange={e => setStageName(e.target.value)}
              placeholder="Working name / stage name"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* SSN — encrypted before storage */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              Social Security Number
              <span className="normal-case font-normal text-muted-foreground">(AES-256 encrypted)</span>
            </label>
            <div className="relative">
              <input
                value={ssn}
                onChange={e => { setSsn(formatSSN(e.target.value)); setSsnErr(null); }}
                placeholder="XXX-XX-XXXX"
                inputMode="numeric"
                maxLength={11}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm font-mono focus:outline-none focus:border-primary tracking-widest"
              />
              {ssn.replace(/\D/g, "").length === 9 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                  <Shield className="w-4 h-4" />
                </div>
              )}
            </div>
            {ssnErr && <p className="text-xs text-destructive">{ssnErr}</p>}
            <p className="text-xs text-muted-foreground">Stored encrypted — never readable in plain text</p>
          </div>

          {/* Phone (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone (optional)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Dancer PIN */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Set Check-In PIN * <span className="normal-case font-normal">(dancer enters below)</span></label>
            <div className="flex justify-center gap-3 py-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < dancerPin.length ? "bg-primary border-primary scale-110" : "border-border bg-secondary/30"}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["1","2","3","4","5","6","7","8","9"].map(d => (
                <button key={d} onClick={() => { if (dancerPin.length < 6) setDancerPin(p => p + d); }}
                  className="h-12 rounded-xl border-2 border-border text-lg font-semibold hover:border-primary hover:bg-primary/5 active:scale-95 transition-all">{d}</button>
              ))}
              <div />
              <button onClick={() => { if (dancerPin.length < 6) setDancerPin(p => p + "0"); }}
                className="h-12 rounded-xl border-2 border-border text-lg font-semibold hover:border-primary hover:bg-primary/5 active:scale-95 transition-all">0</button>
              <button onClick={() => setDancerPin(p => p.slice(0, -1))} disabled={dancerPin.length === 0}
                className="h-12 rounded-xl border-2 border-border hover:border-destructive/40 hover:text-destructive active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center">
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {pinErr && <p className="text-xs text-destructive">{pinErr}</p>}

          <button onClick={handleDetailsConfirm} disabled={!stageName.trim() || dancerPin.length < 4}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            Continue to Face Scan
          </button>
        </div>
        );
      })()}

      {/* ── Face scan ─────────────────────────────────────────────────────── */}
      {step === "face" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">Center the dancer's face in the oval, then capture</p>
          <div className="relative aspect-video bg-secondary/80 rounded-xl border border-border overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 rounded-full border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button onClick={handleCapture}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:opacity-90">
            <Camera className="w-5 h-5" /> Capture & Finalise Enrollment
          </button>
        </div>
      )}

      {/* ── Processing ────────────────────────────────────────────────────── */}
      {step === "processing" && (
        <div className="flex flex-col items-center gap-4 py-10">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Indexing face with AWS Rekognition…</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {step === "error" && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Enrollment Failed</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button onClick={resetAll}
            className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/50 transition-colors">
            Start Over
          </button>
        </div>
      )}

      {/* ── Done ──────────────────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-5 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-800 text-lg">{stageName} enrolled!</p>
              <p className="text-sm text-green-700 mt-1">ID verified · Face indexed · Ready to check in</p>
            </div>
          </div>
          <button onClick={resetAll}
            className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/50 transition-colors">
            Enroll Another Dancer
          </button>
          <button onClick={onBack}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Done
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

  // Fine applies from 6 PM through 2:29 AM (early leave cutoff)
  const hasFine = (() => {
    const now = new Date(); const h = now.getHours(); const m = now.getMinutes();
    return (h >= 18) || (h < 2) || (h === 2 && m < 45);
  })();

  const validateCode = async () => {
    if (!selected || !waiverCode.trim()) return;
    setValidating(true); setCodeError(null); setValidCode(null);
    const { data, error } = await (supabase as any)
      .from("early_leave_codes")
      .select("id, reason, dancer_id, valid_from, valid_until")
      .eq("code", waiverCode.trim().toUpperCase())
      .eq("shift_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    setValidating(false);
    if (error || !data) { setCodeError("Code not found"); return; }
    if (data.dancer_id && data.dancer_id !== selected.dancer_id) {
      setCodeError("Code not valid for this dancer"); return;
    }
    if (data.valid_from && data.valid_until) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const [fh, fm] = data.valid_from.slice(0, 5).split(":").map(Number);
      const [uh, um] = data.valid_until.slice(0, 5).split(":").map(Number);
      const fromMins = fh * 60 + fm;
      const untilMins = uh * 60 + um;
      const inWindow = fromMins <= untilMins
        ? nowMins >= fromMins && nowMins <= untilMins
        : nowMins >= fromMins || nowMins <= untilMins;
      if (!inWindow) { setCodeError(`Code only valid ${data.valid_from.slice(0,5)}–${data.valid_until.slice(0,5)}`); return; }
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
  const [result, setResult] = useState<{ name: string; fee: number; attendanceId: string } | null>(null);
  const [resultMethod, setResultMethod] = useState<"Face Scan" | "PIN Entry">("Face Scan");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [dancerLog, setDancerLog] = useState<DancerLogEntry[]>([]);
  const [bannedInfo, setBannedInfo] = useState<{ name: string; reason: string | null; enrollId: string } | null>(null);


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { findByPin, checkIn } = useDancerCheckIn();
  const markPayment = useMarkDancerPayment();

  const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const addToLog = (name: string, method: "Face Scan" | "PIN Entry", fee: number, paidAtCheckin = false) => {
    setDancerLog((prev) => [{ name, time: now(), method, fee, paidAtCheckin }, ...prev].slice(0, 8));
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

      // ── Ban check ────────────────────────────────────────────────────────────
      const { data: dancerRecord } = await (supabase as any)
        .from("dancers")
        .select("is_banned, ban_reason, enroll_id, stage_name")
        .eq("id", dancerId)
        .maybeSingle();
      if (dancerRecord?.is_banned) {
        setStep("idle");
        setBannedInfo({
          name:     dancerRecord.stage_name ?? stageName,
          reason:   dancerRecord.ban_reason ?? null,
          enrollId: dancerRecord.enroll_id ?? dancerId,
        });
        toast.error(`⛔ Entry blocked — ${dancerRecord.stage_name ?? stageName} is banned`);
        return;
      }

      const { attendanceId } = await checkIn.mutateAsync({ dancerId, entranceFee, method, authorId: user.id });
      setResult({ name: stageName, fee: entranceFee, attendanceId });
      setResultMethod(method === "facial" ? "Face Scan" : "PIN Entry");
      setStep("payment");
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

  const handleEnrollClick = () => setMode("enroll");

  if (mode === "enroll") {
    return <EnrollDancerPanel onBack={() => setMode("checkin")} />;
  }

  if (mode === "checkout") {
    return <CheckOutPanel onBack={() => setMode("checkin")} />;
  }

  return (
    <div className="space-y-4">
      {bannedInfo && (
        <BanBlockedModal
          name={bannedInfo.name}
          reason={bannedInfo.reason}
          enrollId={bannedInfo.enrollId}
          onClose={() => setBannedInfo(null)}
        />
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
            <button
              onClick={handleEnrollClick}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all group mt-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base text-primary">Enroll Dancer</p>
                  <p className="text-xs text-primary/60">Scan ID + face to register</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
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

        {/* PAYMENT PROMPT — shown right after identity verified */}
        {step === "payment" && result && (
          <div className="animate-fade-in space-y-4">
            {/* Identity confirmed banner */}
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">{result.name} — {resultMethod === "Face Scan" ? "Face Verified" : "PIN Verified"}</p>
                <p className="text-xs text-green-600">Checked in at {now()}</p>
              </div>
            </div>

            {/* Fee + payment prompt */}
            <div className="rounded-2xl bg-secondary/40 px-5 py-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">House Fee Due</p>
              <p className="text-4xl font-extrabold text-foreground">${result.fee}</p>
            </div>

            <p className="text-sm font-semibold text-center text-foreground">Did she pay now?</p>

            <div className="grid grid-cols-1 gap-2">
              <button
                disabled={markPayment.isPending}
                onClick={async () => {
                  await markPayment.mutateAsync({ attendanceId: result.attendanceId, amountPaid: result.fee, status: "paid_checkin" });
                  addToLog(result.name, resultMethod, result.fee, true);
                  toast.success(`${result.name} — $${result.fee} paid at check-in`);
                  setStep("success");
                }}
                className="w-full py-5 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {markPayment.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Yes — Paid ${result.fee}</>}
              </button>

              <button
                onClick={() => { addToLog(result.name, resultMethod, result.fee, false); setStep("success"); }}
                className="w-full py-4 rounded-2xl border-2 border-border hover:border-primary/50 text-base font-semibold text-muted-foreground hover:text-foreground transition-all active:scale-95"
              >
                No — Will Pay Later
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS — after payment decision */}
        {step === "success" && result && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-xl p-5 space-y-1.5">
              <p className="text-success font-bold text-xl font-heading tracking-wide flex items-center gap-2">
                <Check className="w-5 h-5" /> {result.name} checked in
              </p>
              <p className="text-primary font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> ${result.fee} house fee
              </p>
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {now()}
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
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.paidAtCheckin ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {entry.paidAtCheckin ? "Paid" : "Owes $" + entry.fee}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
