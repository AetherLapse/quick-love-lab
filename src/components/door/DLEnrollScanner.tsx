import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera, X, AlertCircle, Loader2, Check, AlertTriangle, CreditCard, RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import {
  PDF417_HINTS, parseAAMVA, parseDOB, formatDOB, dobToISO, sha256hex, maskDL,
} from "@/lib/dlScan";
import { supabase } from "@/integrations/supabase/client";

export interface DLScanResult {
  hash:        string;
  dlMasked:    string;
  fullName:    string | null;
  dobISO:      string | null;
  dobFormatted:string | null;
  address:     string | null;
  isAdult:     boolean;
}

interface ReturningMatch {
  id:         string;
  stage_name: string;
  full_name:  string | null;
}

interface Props {
  currentDancerId: string;   // the dancer being enrolled — exclude from duplicate check
  onConfirm: (result: DLScanResult) => void;
  onBack: () => void;
}

type Step = "idle" | "camera" | "flash" | "processing" | "confirm" | "no_barcode" | "underage";

export default function DLEnrollScanner({ currentDancerId, onConfirm, onBack }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const mountedRef  = useRef(true);

  const [step,     setStep]     = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [label,    setLabel]    = useState("");
  const [scanResult, setScanResult] = useState<DLScanResult | null>(null);
  const [returning,  setReturning]  = useState<ReturningMatch | null>(null);
  const [cameraErr,  setCameraErr]  = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const processBarcode = useCallback(async (text: string) => {
    if (!mountedRef.current) return;
    setLabel("Parsing license data…"); setProgress(40);

    const { dlNumber, dobMMDDYYYY, fullName, address } = parseAAMVA(text);
    const identifier = dlNumber ?? text;

    setLabel("Hashing identity…"); setProgress(65);
    const hash = await sha256hex(identifier);

    if (!mountedRef.current) return;
    setLabel("Checking records…"); setProgress(85);

    // Age check
    const isAdult = dobMMDDYYYY ? (() => {
      const dob = parseDOB(dobMMDDYYYY);
      if (!dob) return false;
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18); // dancers: 18+
      return dob <= cutoff;
    })() : true; // no DOB found → don't block, staff can see

    const result: DLScanResult = {
      hash,
      dlMasked:     dlNumber ? maskDL(dlNumber) : hash.slice(0, 8).toUpperCase(),
      fullName,
      dobISO:       dobMMDDYYYY ? dobToISO(dobMMDDYYYY) : null,
      dobFormatted: dobMMDDYYYY ? formatDOB(dobMMDDYYYY) : null,
      address,
      isAdult,
    };

    // Returning dancer detection — query by dl_hash excluding current dancer
    const { data: match } = await (supabase as any)
      .from("dancers")
      .select("id, stage_name, full_name")
      .eq("dl_hash", hash)
      .neq("id", currentDancerId)
      .maybeSingle();

    if (!mountedRef.current) return;
    setProgress(100);
    setScanResult(result);
    setReturning(match ?? null);

    if (!isAdult) {
      setStep("underage");
    } else {
      setStep("confirm");
    }
  }, [currentDancerId]);

  const startCamera = useCallback(async () => {
    setStep("camera");
    setCameraErr(false);
    setScanResult(null);
    setReturning(null);
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
          controls.stop();
          controlsRef.current = null;
          streamRef.current?.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          setStep("flash");
          const text = result.getText();
          setTimeout(() => {
            if (!mountedRef.current) return;
            setStep("processing");
            setProgress(20);
            setLabel("Reading barcode…");
            processBarcode(text);
          }, 300);
        }).then(ctrl => { controlsRef.current = ctrl; }).catch(() => {});
      }
    } catch {
      setCameraErr(true);
    }
  }, [processBarcode]);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    stopCamera();
    setStep("flash");
    setTimeout(async () => {
      setStep("processing");
      setProgress(20);
      setLabel("Reading barcode…");
      try {
        const reader = new BrowserMultiFormatReader(PDF417_HINTS);
        const decoded = await reader.decodeFromImageUrl(canvas.toDataURL("image/jpeg", 0.9));
        processBarcode(decoded.getText());
      } catch {
        if (mountedRef.current) setStep("no_barcode");
      }
    }, 300);
  }, [stopCamera, processBarcode]);

  // ── IDLE ────────────────────────────────────────────────────────────────────

  if (step === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/8 border border-primary/20 text-sm text-primary">
          <CreditCard className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Driver's License Required</p>
            <p className="text-xs text-primary/70 mt-0.5">Scan the <strong>back</strong> of the ID — PDF417 barcode</p>
          </div>
        </div>
        <button
          onClick={startCamera}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <Camera className="w-5 h-5" /> Start ID Scan
        </button>
        <button onClick={onBack} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
      </div>
    );
  }

  // ── CAMERA ──────────────────────────────────────────────────────────────────

  if (step === "camera") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground text-center">Point rear camera at the <strong>back of the ID</strong> — auto-detects PDF417 barcode</p>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Corner guides */}
          {(["tl","tr","bl","br"] as const).map(c => (
            <div key={c} className={`absolute w-8 h-8 ${
              c === "tl" ? "top-2 left-2 border-t-2 border-l-2" :
              c === "tr" ? "top-2 right-2 border-t-2 border-r-2" :
              c === "bl" ? "bottom-2 left-2 border-b-2 border-l-2" :
                           "bottom-2 right-2 border-b-2 border-r-2"
            } border-primary`} />
          ))}

          {/* Scan line */}
          <div className="absolute left-4 right-4 h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-scan-line" />

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            <p className="text-white/80 text-xs text-center">Align barcode within frame — hold steady</p>
          </div>

          {cameraErr && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/90">
              <p className="text-muted-foreground text-sm text-center px-4">Camera unavailable — use manual capture</p>
            </div>
          )}

          <button onClick={() => { stopCamera(); setStep("idle"); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <button onClick={captureFrame}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-all">
          <Camera className="w-4 h-4" /> Capture Manually
        </button>
      </div>
    );
  }

  // ── FLASH ───────────────────────────────────────────────────────────────────

  if (step === "flash") {
    return <div className="w-full aspect-video rounded-xl bg-white animate-[flashOut_0.3s_ease-out_forwards]" />;
  }

  // ── PROCESSING ──────────────────────────────────────────────────────────────

  if (step === "processing") {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-primary font-mono">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        {progress >= 65 && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Checking identity records…
          </p>
        )}
      </div>
    );
  }

  // ── NO BARCODE ──────────────────────────────────────────────────────────────

  if (step === "no_barcode") {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800 text-sm">No barcode detected</p>
            <p className="text-xs text-orange-700 mt-0.5">Make sure the back of the ID is flat, well-lit, and the PDF417 barcode is fully visible.</p>
          </div>
        </div>
        <button onClick={startCamera}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
        <button onClick={onBack} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
      </div>
    );
  }

  // ── UNDERAGE ────────────────────────────────────────────────────────────────

  if (step === "underage" && scanResult) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border-2 border-red-300 rounded-xl px-5 py-5 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="font-bold text-red-800 text-lg">Dancer is Under 18</p>
          {scanResult.dobFormatted && (
            <p className="text-sm text-red-700">DOB: {scanResult.dobFormatted}</p>
          )}
          <p className="text-xs text-red-600">Cannot enroll — minimum age is 18</p>
        </div>
        <button onClick={() => setStep("idle")} className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/40 transition-all">
          Scan a Different ID
        </button>
        <button onClick={onBack} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
      </div>
    );
  }

  // ── CONFIRM ─────────────────────────────────────────────────────────────────

  if (step === "confirm" && scanResult) {
    return (
      <div className="space-y-4">
        {/* Returning dancer warning */}
        {returning && (
          <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Returning Dancer Detected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This license was previously used to enroll{" "}
                <span className="font-bold">{returning.stage_name}</span>
                {returning.full_name ? ` (${returning.full_name})` : ""}.
                They may have returned under a different name.
              </p>
            </div>
          </div>
        )}

        {/* Extracted data */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-secondary/40 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID Data Extracted</p>
          </div>
          <div className="divide-y divide-border/60">
            {[
              { label: "Name",    value: scanResult.fullName ?? "—" },
              { label: "DOB",     value: scanResult.dobFormatted ?? "—" },
              { label: "Address", value: scanResult.address ?? "—" },
              { label: "ID #",    value: scanResult.dlMasked },
            ].map(r => (
              <div key={r.label} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">{r.label}</span>
                <span className="text-sm text-foreground font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onConfirm(scanResult)}
          className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 transition-all"
        >
          <Check className="w-4 h-4" /> Confirm &amp; Continue to Face Enrollment
        </button>

        <button onClick={startCamera}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-all">
          <RefreshCw className="w-4 h-4" /> Scan Again
        </button>
      </div>
    );
  }

  return null;
}
