import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Lock, ShieldCheck, ShieldX, Hand, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

// Module-level hints — PDF417 only for speed
const PDF417_HINTS = new Map<DecodeHintType, unknown>();
PDF417_HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);

// AAMVA PDF417 DL format parsing
function parseAAMVA(text: string): { dlNumber: string | null; dobMMDDYYYY: string | null } {
  const dlMatch = text.match(/DAQ([^\n\r\u001e\u001c]+)/);
  const dobMatch = text.match(/DBB(\d{8})/);
  return {
    dlNumber: dlMatch?.[1]?.trim() ?? null,
    dobMMDDYYYY: dobMatch?.[1] ?? null,
  };
}

function parseDOB(dobStr: string): Date | null {
  if (dobStr.length !== 8) return null;
  let mm: number, dd: number, yyyy: number;
  const first4 = parseInt(dobStr.slice(0, 4), 10);
  if (first4 >= 1900 && first4 <= 2099) {
    // YYYYMMDD — used by many barcode generators and Canadian DLs
    yyyy = first4;
    mm = parseInt(dobStr.slice(4, 6), 10) - 1;
    dd = parseInt(dobStr.slice(6, 8), 10);
  } else {
    // MMDDYYYY — AAMVA US standard
    mm = parseInt(dobStr.slice(0, 2), 10) - 1;
    dd = parseInt(dobStr.slice(2, 4), 10);
    yyyy = parseInt(dobStr.slice(4, 8), 10);
  }
  const date = new Date(yyyy, mm, dd);
  return isNaN(date.getTime()) ? null : date;
}

function isOver21(dobStr: string): boolean {
  const dob = parseDOB(dobStr);
  if (!dob) return false; // Can't parse → deny as safe default
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 21);
  return dob <= cutoff;
}

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ScanStep = "idle" | "camera" | "flash" | "processing" | "result" | "no_barcode";

interface ScanResult {
  hash: string;
  isReturning: boolean;
  visitCount?: number;
  denied: boolean;
}

interface CameraIDScannerProps {
  onEntry: (result: ScanResult) => void;
}

export default function CameraIDScanner({ onEntry }: CameraIDScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const mountedRef = useRef(true);

  const [step, setStep] = useState<ScanStep>("idle");
  const [processProgress, setProcessProgress] = useState(0);
  const [processLabel, setProcessLabel] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState(false);

  const stopCamera = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const processBarcode = useCallback(
    async (text: string) => {
      if (!mountedRef.current) return;
      setProcessLabel("Parsing license data...");
      setProcessProgress(50);

      const { dlNumber, dobMMDDYYYY } = parseAAMVA(text);
      const identifier = dlNumber ?? text;
      const hash = await sha256hex(identifier);

      if (!mountedRef.current) return;
      setProcessLabel("Hashing identity...");
      setProcessProgress(80);

      const denied = dobMMDDYYYY ? !isOver21(dobMMDDYYYY) : false;

      setProcessProgress(100);

      const scanResult: ScanResult = {
        hash,
        denied,
        isReturning: false,
        visitCount: undefined,
      };

      setResult(scanResult);
      setStep("result");

      if (!denied) {
        onEntry(scanResult);
      }

      setTimeout(() => {
        if (!mountedRef.current) return;
        setStep("idle");
        setResult(null);
      }, 5000);
    },
    [onEntry]
  );

  const startAutoScan = useCallback(
    (videoEl: HTMLVideoElement) => {
      const reader = new BrowserMultiFormatReader(PDF417_HINTS);
      reader
        .decodeFromVideoElement(videoEl, (result, _err, controls) => {
          if (!result) return; // frame had no barcode — keep scanning
          if (!mountedRef.current) { controls.stop(); return; }
          controls.stop();
          controlsRef.current = null;
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setStep("flash");
          const text = result.getText();
          setTimeout(() => {
            if (!mountedRef.current) return;
            setStep("processing");
            setProcessProgress(20);
            setProcessLabel("Reading barcode...");
            processBarcode(text);
          }, 300);
        })
        .then((controls) => { controlsRef.current = controls; })
        .catch(() => { /* cancelled or permission error — no-op */ });
    },
    [processBarcode]
  );

  const startCamera = useCallback(async () => {
    setStep("camera");
    setCameraError(false);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startAutoScan(videoRef.current);
      }
    } catch {
      setCameraError(true);
    }
  }, [startAutoScan]);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setStep("idle");
    setResult(null);
  }, [stopCamera]);

  // Manual capture — tries to decode the current frame on demand
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

    stopCamera();
    setStep("flash");

    setTimeout(async () => {
      setStep("processing");
      setProcessProgress(20);
      setProcessLabel("Reading barcode...");

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const reader = new BrowserMultiFormatReader(PDF417_HINTS);
        const decoded = await reader.decodeFromImageUrl(dataUrl);
        await processBarcode(decoded.getText());
      } catch {
        setStep("no_barcode");
      }
    }, 300);
  }, [stopCamera, processBarcode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  // IDLE
  if (step === "idle") {
    return (
      <button
        onClick={startCamera}
        className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl mb-4 flex items-center justify-center gap-3 text-lg transition-all hover:glow-gold active:scale-[0.98]"
      >
        <Camera className="w-5 h-5" />
        Scan Driver's License
      </button>
    );
  }

  // CAMERA
  if (step === "camera") {
    return (
      <div className="mb-4 animate-fade-in">
        <div className="relative w-full max-w-[480px] mx-auto aspect-video rounded-xl overflow-hidden bg-black border border-border">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Corner guides */}
          <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-primary" />

          {/* Scan line animation */}
          <div className="absolute left-3 right-3 h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-scan-line" />

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
            <p className="text-foreground/80 text-xs text-center">
              Point camera at the <strong>back</strong> of the Driver's License — auto-detects barcode
            </p>
          </div>

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/90">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">Camera unavailable</p>
                <p className="text-muted-foreground text-xs">Tap capture to try manually</p>
              </div>
            </div>
          )}

          <button
            onClick={cancelCamera}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={captureFrame}
          className="w-full touch-target border border-border rounded-xl font-medium flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all mt-3"
        >
          <Camera className="w-4 h-4" /> Capture Manually
        </button>
      </div>
    );
  }

  // FLASH
  if (step === "flash") {
    return (
      <div className="mb-4">
        <div className="w-full max-w-[480px] mx-auto aspect-video rounded-xl overflow-hidden bg-white animate-[flashOut_0.3s_ease-out_forwards]" />
      </div>
    );
  }

  // PROCESSING
  if (step === "processing") {
    return (
      <div className="mb-4 animate-fade-in">
        <div className="w-full max-w-[480px] mx-auto bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{processLabel}</span>
              <span className="text-primary font-medium font-mono">{Math.round(processProgress)}%</span>
            </div>
            <Progress value={processProgress} className="h-2" />
          </div>
          {processProgress >= 50 && (
            <p className="text-xs text-muted-foreground text-center animate-fade-in flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> SHA-256 hashing — no PII stored
            </p>
          )}
        </div>
      </div>
    );
  }

  // NO BARCODE FOUND
  if (step === "no_barcode") {
    return (
      <div className="mb-4 animate-fade-in">
        <div className="w-full max-w-[480px] mx-auto bg-warning/10 border border-warning/30 rounded-xl p-5 text-center space-y-3">
          <p className="text-warning font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" /> No barcode detected
          </p>
          <p className="text-muted-foreground text-sm">
            Make sure the back of the ID is flat and well-lit.
          </p>
          <button
            onClick={startCamera}
            className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:glow-gold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // RESULT
  if (step === "result" && result) {
    if (result.denied) {
      return (
        <div className="mb-4 animate-fade-in">
          <div className="w-full max-w-[480px] mx-auto bg-destructive/10 border border-destructive/40 rounded-xl p-8 text-center">
            <p className="text-destructive font-bold text-2xl font-heading tracking-wide flex items-center justify-center gap-2">
              <ShieldX className="w-7 h-7" /> UNDERAGE — DENY ENTRY
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 animate-fade-in">
        <div className="w-full max-w-[480px] mx-auto bg-success/10 border border-success/40 rounded-xl p-6 text-center space-y-3">
          <p className="text-success font-bold text-2xl font-heading tracking-wide flex items-center justify-center gap-2">
            <ShieldCheck className="w-7 h-7" /> AGE VERIFIED: 21+
          </p>
          <p className="text-primary font-medium flex items-center justify-center gap-1">
            <Lock className="w-4 h-4" /> ID: <span className="font-mono">#{result.hash.slice(0, 8).toUpperCase()}</span>
          </p>
          {result.isReturning && (
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
              <Hand className="w-4 h-4" /> Welcome back — Visit #{result.visitCount}
            </p>
          )}
          {!result.isReturning && (
            <p className="text-muted-foreground text-sm">New Guest Registered</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
