import { useState, useRef, useCallback, useEffect } from "react";
import {
  X, ArrowLeft, ScanFace, Hash, Loader2, AlertTriangle,
  Check, LogOut, DollarSign, Clock, Shield, ShieldOff, Delete,
  Camera, TrendingUp, TrendingDown, Minus, CreditCard, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { PDF417_HINTS, parseAAMVA, sha256hex, maskDL } from "@/lib/dlScan";
import { useAuth } from "@/hooks/useAuth";
import { useCheckedInDancersToday, useDancerCheckOut, useMarkDancerPayment, EARLY_LEAVE_FINE_AMOUNT } from "@/hooks/useDashboardData";

// ─── Constants ────────────────────────────────────────────────────────────────

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callCheckout(action: string, payload: Record<string, unknown>) {
  const res = await fetch(`${EDGE_BASE}/dancer-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

// ─── PIN Pad ──────────────────────────────────────────────────────────────────

function PinPad({
  value,
  onChange,
  label,
  sublabel,
  onSubmit,
  submitting,
  error,
  minDigits = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  sublabel?: string;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  minDigits?: number;
}) {
  const press = (d: string) => { if (value.length < 6) onChange(value + d); };
  const del   = () => onChange(value.slice(0, -1));

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>

      {/* Dots display */}
      <div className="flex justify-center gap-3 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < value.length
                ? "bg-primary border-primary scale-110"
                : "border-border bg-secondary/30"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {["1","2","3","4","5","6","7","8","9"].map(d => (
          <button
            key={d}
            onClick={() => press(d)}
            disabled={submitting}
            className="h-14 rounded-xl border-2 border-border text-xl font-semibold text-foreground hover:border-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-40"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press("0")}
          disabled={submitting}
          className="h-14 rounded-xl border-2 border-border text-xl font-semibold text-foreground hover:border-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-40"
        >
          0
        </button>
        <button
          onClick={del}
          disabled={submitting || value.length === 0}
          className="h-14 rounded-xl border-2 border-border text-foreground hover:border-destructive/40 hover:text-destructive active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting || value.length < minDigits}
        className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
      </button>
    </div>
  );
}

// ─── Dancer summary card ──────────────────────────────────────────────────────

function CheckoutSummary({
  dancer,
  summary,
  onConfirm,
  confirming,
}: {
  dancer: { dancer_id: string; dancers?: { stage_name?: string; full_name?: string } | null; id: string; clock_in: string };
  summary: any;
  onConfirm: (waiveCode: boolean, codeId?: string) => void;
  confirming: boolean;
}) {
  const [waiverCode, setWaiverCode]     = useState("");
  const [codeError, setCodeError]       = useState<string | null>(null);
  const [validating, setValidating]     = useState(false);
  const [validCode, setValidCode]       = useState<{ id: string; reason: string } | null>(null);
  const [ranOffConfirm, setRanOffConfirm] = useState(false);
  const markPayment = useMarkDancerPayment();

  const hasFine = (() => {
    const now = new Date(); const h = now.getHours(); const m = now.getMinutes();
    return (h >= 18) || (h < 2) || (h === 2 && m < 45);
  })();

  const fmt  = (n: number) => `$${Math.abs(n).toFixed(2)}`;
  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const validateCode = async () => {
    if (!waiverCode.trim()) return;
    setValidating(true); setCodeError(null); setValidCode(null);
    const { data, error } = await (supabase as any)
      .from("early_leave_codes")
      .select("id, reason, dancer_id, valid_from, valid_until")
      .eq("code", waiverCode.trim().toUpperCase())
      .eq("shift_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    setValidating(false);
    if (error || !data) { setCodeError("Code not found"); return; }
    if (data.dancer_id && data.dancer_id !== dancer.dancer_id) {
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

  const stageName = dancer.dancers?.stage_name ?? "Dancer";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center pb-1 border-b border-border">
        <p className="font-bold text-lg text-foreground">{stageName}</p>
        <p className="text-xs text-muted-foreground">
          Checked in at {time(dancer.clock_in)}
        </p>
      </div>

      {/* Tonight's summary */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tonight</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="px-4 py-3 rounded-xl bg-secondary/40 space-y-0.5">
            <p className="text-xs text-muted-foreground">Earnings</p>
            <p className="text-base font-bold text-green-600">{fmt(summary.tonightEarnings)}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-secondary/40 space-y-0.5">
            <p className="text-xs text-muted-foreground">Entrance Fee</p>
            <p className="text-base font-bold text-destructive">−{fmt(summary.entranceFee)}</p>
          </div>
          {summary.earlyFine > 0 && (
            <div className="px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 space-y-0.5">
              <p className="text-xs text-orange-700">Early Leave Fine</p>
              <p className="text-base font-bold text-orange-600">−{fmt(summary.earlyFine)}</p>
            </div>
          )}
        </div>

        {/* Room sessions */}
        {summary.sessions.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            {summary.sessions.map((s: any, i: number) => (
              <div key={s.id} className={`flex items-center justify-between px-3 py-2 text-sm ${i > 0 ? "border-t border-border/40" : ""}`}>
                <div>
                  <p className="font-medium text-foreground">{s.package_name ?? s.room_name ?? "Session"}</p>
                  <p className="text-xs text-muted-foreground">{time(s.entry_time)}{s.exit_time ? ` – ${time(s.exit_time)}` : " (active)"}</p>
                </div>
                <p className="font-semibold text-green-600">{fmt(s.dancer_cut ?? 0)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Net */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${
          summary.tonightNet >= 0 ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
        }`}>
          <div className="flex items-center gap-2">
            {summary.tonightNet >= 0
              ? <TrendingUp className="w-4 h-4 text-green-600" />
              : <TrendingDown className="w-4 h-4 text-orange-600" />}
            <span className={`text-sm font-semibold ${summary.tonightNet >= 0 ? "text-green-700" : "text-orange-700"}`}>
              {summary.tonightNet >= 0 ? "Club owes you" : "You owe club"}
            </span>
          </div>
          <span className={`text-lg font-extrabold ${summary.tonightNet >= 0 ? "text-green-700" : "text-orange-700"}`}>
            {summary.tonightNet >= 0 ? fmt(summary.tonightNet) : fmt(summary.tonightNet)}
          </span>
        </div>

        {/* Historical outstanding */}
        {summary.historicalOutstanding > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm">
            <span className="text-red-700 font-medium">Previous balance owed</span>
            <span className="text-red-700 font-bold">{fmt(summary.historicalOutstanding)}</span>
          </div>
        )}

        {/* ── House fee payment status ── */}
        {(() => {
          const houseFee   = Number(summary.entranceFee ?? 0);
          const musicFee   = 20;
          const amountPaid = Number(summary.amountPaid ?? 0);
          const totalOwed  = houseFee + musicFee - Number(summary.tonightEarnings ?? 0);
          const stillOwed  = Math.max(0, totalOwed - amountPaid);
          const payStatus  = summary.paymentStatus ?? "unpaid";
          const isSettled  = payStatus === "paid_checkin" || payStatus === "paid_during" || payStatus === "paid_checkout" || stillOwed <= 0;
          const isRanOff   = payStatus === "ran_off";

          if (isRanOff) return (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/10 border border-red-400 text-sm text-red-700 font-semibold">
              <X className="w-4 h-4 shrink-0" /> Marked as Ran Off — did not pay
            </div>
          );

          return (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">House Fee Payment</p>
              {/* Per-fee allocation: music first, then house */}
              {(() => {
                const musicPaid = Math.min(amountPaid, musicFee);
                const housePaid = Math.max(0, amountPaid - musicFee);
                const musicDone = musicPaid >= musicFee;
                const houseDone = housePaid >= houseFee;
                return (
                  <div className="space-y-1.5">
                    {/* Music Fee */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${musicDone ? "bg-green-50 border border-green-200" : "bg-secondary/40"}`}>
                      <div className="flex items-center gap-2">
                        {musicDone && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                        <span className={musicDone ? "line-through text-green-700 font-medium" : "text-muted-foreground"}>
                          Music Fee
                        </span>
                        {musicDone && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">PAID</span>}
                      </div>
                      <span className={`font-bold ${musicDone ? "line-through text-green-500" : "text-foreground"}`}>
                        {fmt(musicFee)}
                      </span>
                    </div>

                    {/* House Fee */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${houseDone ? "bg-green-50 border border-green-200" : housePaid > 0 ? "bg-blue-50/50 border border-blue-200" : "bg-secondary/40"}`}>
                      <div className="flex items-center gap-2">
                        {houseDone && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                        <span className={houseDone ? "line-through text-green-700 font-medium" : "text-muted-foreground"}>
                          House Fee
                        </span>
                        {houseDone && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">PAID</span>}
                        {housePaid > 0 && !houseDone && (
                          <span className="text-[9px] font-medium text-blue-600">−{fmt(housePaid)} applied</span>
                        )}
                      </div>
                      <span className={`font-bold ${houseDone ? "line-through text-green-500" : "text-foreground"}`}>
                        {fmt(houseFee)}
                      </span>
                    </div>

                    {/* Still owed summary */}
                    {stillOwed > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm">
                        <span className="text-red-700 font-semibold">Still Owed</span>
                        <span className="text-red-700 font-bold">{fmt(stillOwed)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {!isSettled && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    disabled={markPayment.isPending}
                    onClick={async () => {
                      await markPayment.mutateAsync({ attendanceId: dancer.id, amountPaid: houseFee + musicFee, status: "paid_checkout" });
                      toast.success("Payment recorded at check-out");
                    }}
                    className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {markPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Paid Now</>}
                  </button>
                  {!ranOffConfirm ? (
                    <button
                      onClick={() => setRanOffConfirm(true)}
                      className="py-3 rounded-xl border-2 border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-400 transition-all"
                    >
                      Ran Off
                    </button>
                  ) : (
                    <button
                      disabled={markPayment.isPending}
                      onClick={async () => {
                        await markPayment.mutateAsync({ attendanceId: dancer.id, amountPaid: 0, status: "ran_off" });
                        toast.warning(`${stageName} marked as ran off without paying`);
                        setRanOffConfirm(false);
                      }}
                      className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 animate-pulse"
                    >
                      {markPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Ran Off"}
                    </button>
                  )}
                </div>
              )}

              {isSettled && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-semibold">
                  <Check className="w-4 h-4 shrink-0" /> House fees settled
                  {payStatus === "paid_checkin" && <span className="text-xs font-normal text-green-600 ml-1">· paid at check-in</span>}
                  {payStatus === "paid_during" && <span className="text-xs font-normal text-green-600 ml-1">· paid during shift</span>}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Early leave fine handling */}
      {hasFine && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-3 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Early Leave — Before Midnight</p>
              <p className="text-xs mt-0.5">Fine: <span className="font-bold">${EARLY_LEAVE_FINE_AMOUNT}</span></p>
            </div>
          </div>

          {!validCode ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Manager one-time code to waive fine:</p>
              <div className="flex gap-2">
                <input
                  value={waiverCode}
                  onChange={e => { setWaiverCode(e.target.value.toUpperCase()); setCodeError(null); }}
                  placeholder="e.g. KX7M2QPL"
                  maxLength={12}
                  className={`flex-1 border rounded-xl px-3 py-2 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-primary ${codeError ? "border-destructive" : "border-border"}`}
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
              <button onClick={() => { setValidCode(null); setWaiverCode(""); }} className="text-green-600 hover:text-green-800">
                <ShieldOff className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {validCode ? (
              <button
                onClick={() => onConfirm(true, validCode.id)}
                disabled={confirming}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4" /> Check Out (Fine Waived)</>}
              </button>
            ) : (
              <button
                onClick={() => onConfirm(false)}
                disabled={confirming}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><DollarSign className="w-4 h-4" /> Check Out + ${EARLY_LEAVE_FINE_AMOUNT} Fine</>}
              </button>
            )}
          </div>
        </div>
      )}

      {!hasFine && (
        <button
          onClick={() => onConfirm(false)}
          disabled={confirming}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogOut className="w-4 h-4" /> Confirm Check-Out</>}
        </button>
      )}
    </div>
  );
}

// ─── Face scan step ───────────────────────────────────────────────────────────

function FaceScanStep({
  onIdentified,
  onBack,
}: {
  onIdentified: (dancerId: string, stageName: string) => void;
  onBack: () => void;
}) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"camera" | "processing" | "error">("camera");
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => { setStatus("error"); setError("Camera access denied"); });
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capture = useCallback(async () => {
    if (!videoRef.current) return;
    setStatus("processing");
    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

    try {
      const res = await fetch(`${EDGE_BASE}/rekognition-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ image_base64: base64 }),
      });
      const data = await res.json();

      if (!data.matched) {
        setError(data.reason === "no_face" ? "No face detected — try again" : "Dancer not recognised — try PIN instead");
        setStatus("camera");
        return;
      }
      onIdentified(data.dancer_id, data.stage_name);
    } catch {
      setError("Scan failed — check connection");
      setStatus("camera");
    }
  }, [onIdentified]);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">Dancer Face Scan</p>
        <p className="text-xs text-muted-foreground">Position dancer's face in the camera</p>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-h-56 mx-auto">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {status === "processing" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white text-sm font-medium">Scanning…</p>
          </div>
        )}
        {/* Guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-36 h-36 rounded-full border-4 border-white/40 border-dashed" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={capture}
        disabled={status === "processing"}
        className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "processing"
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
          : <><Camera className="w-4 h-4" /> Scan Face</>}
      </button>

      <button onClick={onBack} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back
      </button>
    </div>
  );
}

// ─── DL Scan checkout step ────────────────────────────────────────────────────

function DLScanCheckoutStep({
  selectedDancerId,
  onIdentified,
  onBack,
}: {
  selectedDancerId: string;
  onIdentified: (dancerId: string, stageName: string) => void;
  onBack: () => void;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const mountedRef  = useRef(true);

  const [scanStep, setScanStep] = useState<"idle" | "camera" | "flash" | "processing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopCamera(); };
  }, []);

  const stopCamera = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const processBarcode = useCallback(async (text: string) => {
    if (!mountedRef.current) return;
    setScanStep("processing");
    setProgress(30); setProgressLabel("Parsing license…");

    const { dlNumber } = parseAAMVA(text);
    const identifier = dlNumber ?? text;

    setProgress(60); setProgressLabel("Hashing identity…");
    const hash = await sha256hex(identifier);

    if (!mountedRef.current) return;
    setProgress(85); setProgressLabel("Looking up dancer…");

    const { data: dancer } = await (supabase as any)
      .from("dancers")
      .select("id, stage_name")
      .eq("dl_hash", hash)
      .maybeSingle();

    if (!mountedRef.current) return;
    setProgress(100);

    if (!dancer) {
      setErrorMsg("License not on file — use Face Scan or PIN instead");
      setScanStep("error");
      return;
    }
    if (dancer.id !== selectedDancerId) {
      setErrorMsg(`License belongs to ${dancer.stage_name} — not the selected dancer`);
      setScanStep("error");
      return;
    }
    onIdentified(dancer.id, dancer.stage_name);
  }, [selectedDancerId, onIdentified]);

  const startCamera = useCallback(async () => {
    setScanStep("camera");
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const reader = new BrowserMultiFormatReader(PDF417_HINTS);
        reader.decodeFromVideoElement(videoRef.current, (result, _err, controls) => {
          if (!result) return;
          if (!mountedRef.current) { controls.stop(); return; }
          controls.stop(); controlsRef.current = null;
          streamRef.current?.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          setScanStep("flash");
          const barcodeText = result.getText();
          setTimeout(() => { if (mountedRef.current) processBarcode(barcodeText); }, 300);
        }).then(ctrl => { controlsRef.current = ctrl; }).catch(() => {});
      }
    } catch {
      setErrorMsg("Camera access denied");
      setScanStep("error");
    }
  }, [processBarcode]);

  const captureManually = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    stopCamera();
    setScanStep("flash");
    setTimeout(async () => {
      try {
        const reader = new BrowserMultiFormatReader(PDF417_HINTS);
        const decoded = await reader.decodeFromImageUrl(canvas.toDataURL("image/jpeg", 0.9));
        processBarcode(decoded.getText());
      } catch {
        if (mountedRef.current) {
          setErrorMsg("No barcode detected — hold the ID steady and try again");
          setScanStep("error");
        }
      }
    }, 300);
  }, [stopCamera, processBarcode]);

  if (scanStep === "idle") return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/8 border border-primary/20 text-sm text-primary">
        <CreditCard className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold">Driver's License Scan</p>
          <p className="text-xs text-primary/70 mt-0.5">Scan the <strong>back</strong> of the dancer's ID (PDF417 barcode)</p>
        </div>
      </div>
      <button onClick={startCamera}
        className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
        <Camera className="w-5 h-5" /> Start ID Scan
      </button>
      <button onClick={onBack} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
    </div>
  );

  if (scanStep === "camera") return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">Point rear camera at the <strong>back of the ID</strong> — auto-detects barcode</p>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        {(["tl","tr","bl","br"] as const).map(c => (
          <div key={c} className={`absolute w-8 h-8 ${
            c === "tl" ? "top-2 left-2 border-t-2 border-l-2" :
            c === "tr" ? "top-2 right-2 border-t-2 border-r-2" :
            c === "bl" ? "bottom-2 left-2 border-b-2 border-l-2" :
                         "bottom-2 right-2 border-b-2 border-r-2"
          } border-primary`} />
        ))}
        <div className="absolute left-4 right-4 h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-scan-line" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="text-white/80 text-xs text-center">Align barcode within frame — hold steady</p>
        </div>
        <button onClick={() => { stopCamera(); setScanStep("idle"); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <button onClick={captureManually}
        className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-all">
        <Camera className="w-4 h-4" /> Capture Manually
      </button>
    </div>
  );

  if (scanStep === "flash") return (
    <div className="w-full aspect-video rounded-xl bg-white animate-[flashOut_0.3s_ease-out_forwards]" />
  );

  if (scanStep === "processing") return (
    <div className="space-y-4 py-6 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">{progressLabel}</p>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );

  if (scanStep === "error") return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3.5 bg-destructive/10 border border-destructive/20 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <p className="text-sm text-destructive font-medium">{errorMsg}</p>
      </div>
      <button onClick={startCamera}
        className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
        <RefreshCw className="w-4 h-4" /> Try Again
      </button>
      <button onClick={onBack} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
    </div>
  );

  return null;
}

// ─── Main checkout flow ───────────────────────────────────────────────────────

type Step =
  | "select"        // pick dancer from checked-in list
  | "method"        // Face Scan / PIN / DL Scan
  | "staff_pin"     // bouncer enters their PIN
  | "dancer_pin"    // dancer enters their PIN
  | "face_scan"     // camera face scan
  | "dl_scan"       // driver's license barcode scan
  | "summary";      // show data + confirm checkout

interface CheckOutFlowProps {
  onClose: () => void;
}

export function DancerCheckOutFlow({ onClose }: CheckOutFlowProps) {
  const { user } = useAuth();
  const { data: checkedIn = [], isLoading } = useCheckedInDancersToday();
  const checkOut = useDancerCheckOut();

  const [step, setStep] = useState<Step>("select");
  const [selectedDancer, setSelectedDancer] = useState<typeof checkedIn[0] | null>(null);
  const [staffPin, setStaffPin]   = useState("");
  const [dancerPin, setDancerPin] = useState("");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [dancerError, setDancerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const loadSummary = async (dancerId: string) => {
    setSummaryLoading(true);
    const data = await callCheckout("get_checkout_summary", { dancer_id: dancerId });
    setSummaryLoading(false);
    if (data.error) { toast.error("Failed to load dancer summary"); return false; }
    setSummary(data);
    return true;
  };

  const handleSelectDancer = (entry: typeof checkedIn[0]) => {
    setSelectedDancer(entry);
    setStep("method");
  };

  // Face scan: no PIN needed — face is proof of presence
  const handleFaceIdentified = async (dancerId: string, stageName: string) => {
    // Verify it matches the selected dancer (or auto-select if we went facescan first)
    if (selectedDancer && selectedDancer.dancer_id !== dancerId) {
      toast.error(`Face matched ${stageName} but you selected a different dancer`);
      return;
    }
    const ok = await loadSummary(selectedDancer?.dancer_id ?? dancerId);
    if (ok) setStep("summary");
  };

  const handleStaffPin = async () => {
    if (!user) return;
    setSubmitting(true); setStaffError(null);
    const data = await callCheckout("verify_staff_pin", { user_id: user.id, pin: staffPin });
    setSubmitting(false);
    if (!data.success) {
      setStaffError(data.reason === "wrong_pin" ? "Incorrect PIN — try again" : "Verification failed");
      setStaffPin("");
      return;
    }
    setStep("dancer_pin");
  };

  const handleDancerPin = async () => {
    if (!selectedDancer) return;
    setSubmitting(true); setDancerError(null);
    const data = await callCheckout("verify_dancer_pin", { dancer_id: selectedDancer.dancer_id, pin: dancerPin });
    setSubmitting(false);
    if (!data.success) {
      setDancerError(data.reason === "wrong_pin" ? "Incorrect PIN — dancer must enter their own PIN" : "Verification failed");
      setDancerPin("");
      return;
    }
    const ok = await loadSummary(selectedDancer.dancer_id);
    if (ok) setStep("summary");
  };

  const handleConfirmCheckout = async (waiveWithCode: boolean, codeId?: string) => {
    if (!selectedDancer || !user) return;
    const hasFine = (() => {
      const now = new Date(); const h = now.getHours(); const m = now.getMinutes();
      return (h >= 18) || (h < 2) || (h === 2 && m < 45);
    })();
    const fine    = hasFine && !waiveWithCode ? EARLY_LEAVE_FINE_AMOUNT : 0;
    const waived  = hasFine && waiveWithCode;
    setConfirming(true);
    try {
      await checkOut.mutateAsync({
        attendanceId: selectedDancer.id,
        dancerId:     selectedDancer.dancer_id,
        fine,
        fineWaived:   waived,
        waiverCodeId: waived && codeId ? codeId : undefined,
        checkedOutBy: user.id,
      });
      const name = selectedDancer.dancers?.stage_name ?? "Dancer";
      if (fine > 0)     toast.success(`${name} checked out — $${fine} early leave fine applied`);
      else if (waived)  toast.success(`${name} checked out — fine waived`);
      else              toast.success(`${name} checked out`);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
      setConfirming(false);
    }
  };

  const goBack = () => {
    if (step === "method")      { setStep("select"); setSelectedDancer(null); }
    else if (step === "staff_pin")  { setStep("method"); setStaffPin(""); setStaffError(null); }
    else if (step === "dancer_pin") { setStep("staff_pin"); setDancerPin(""); setDancerError(null); }
    else if (step === "face_scan")  { setStep("method"); }
    else if (step === "dl_scan")    { setStep("method"); }
    else if (step === "summary")    { setStep("method"); setSummary(null); }
    else onClose();
  };

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {step !== "select" && (
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors mr-1">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <LogOut className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-base text-foreground">Dancer Check-Out</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-5 pt-3">
          {(["select","method","staff_pin","dancer_pin","summary"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${
              ["select","method","staff_pin","dancer_pin","face_scan","summary"].indexOf(step) >= i
                ? "bg-primary" : "bg-border"
            }`} />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-5 max-h-[75vh] overflow-y-auto">

          {/* ── Select dancer ──────────────────────────────────────────────── */}
          {step === "select" && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Who is checking out?</p>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : checkedIn.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 italic">No dancers currently checked in</p>
              ) : (
                checkedIn.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => handleSelectDancer(entry)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-border hover:border-orange-300 hover:bg-orange-50/50 text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-orange-100">
                      {entry.dancers?.stage_name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{entry.dancers?.stage_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">In at {time(entry.clock_in)}</p>
                    </div>
                    <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Choose method ──────────────────────────────────────────────── */}
          {step === "method" && selectedDancer && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Checking out</p>
                <p className="font-bold text-xl text-foreground">{selectedDancer.dancers?.stage_name}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Dancer must verify their own identity to check out
              </p>
              <div className="grid grid-cols-1 gap-3 pt-1">
                <button
                  onClick={() => setStep("face_scan")}
                  className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ScanFace className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-foreground">Face Scan</p>
                    <p className="text-xs text-muted-foreground">Scan dancer's face to verify presence</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep("staff_pin")}
                  className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                    <Hash className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-foreground">PIN Entry</p>
                    <p className="text-xs text-muted-foreground">Bouncer PIN first, then dancer PIN</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep("dl_scan")}
                  className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                    <CreditCard className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-foreground">DL Scan</p>
                    <p className="text-xs text-muted-foreground">Scan back of driver's license</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Staff PIN ──────────────────────────────────────────────────── */}
          {step === "staff_pin" && (
            <PinPad
              value={staffPin}
              onChange={setStaffPin}
              label="Enter Your Bouncer PIN"
              sublabel="Confirm your identity before the dancer checks out"
              onSubmit={handleStaffPin}
              submitting={submitting}
              error={staffError}
            />
          )}

          {/* ── Dancer PIN ─────────────────────────────────────────────────── */}
          {step === "dancer_pin" && selectedDancer && (
            <PinPad
              value={dancerPin}
              onChange={setDancerPin}
              label={`${selectedDancer.dancers?.stage_name ?? "Dancer"} — Enter Your PIN`}
              sublabel="Dancer must enter their own PIN to confirm presence"
              onSubmit={handleDancerPin}
              submitting={submitting}
              error={dancerError}
            />
          )}

          {/* ── Face scan ──────────────────────────────────────────────────── */}
          {step === "face_scan" && (
            <FaceScanStep
              onIdentified={handleFaceIdentified}
              onBack={() => setStep("method")}
            />
          )}

          {/* ── DL Scan ────────────────────────────────────────────────────── */}
          {step === "dl_scan" && selectedDancer && (
            <DLScanCheckoutStep
              selectedDancerId={selectedDancer.dancer_id}
              onIdentified={handleFaceIdentified}
              onBack={() => setStep("method")}
            />
          )}

          {/* ── Summary + confirm ──────────────────────────────────────────── */}
          {step === "summary" && selectedDancer && (
            summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading tonight's summary…</p>
              </div>
            ) : summary ? (
              <CheckoutSummary
                dancer={selectedDancer}
                summary={summary}
                onConfirm={handleConfirmCheckout}
                confirming={confirming}
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
