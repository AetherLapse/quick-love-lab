import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Lock, ShieldCheck, ShieldX, Hand } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function generateHash() {
  return Math.random().toString(16).slice(2, 10);
}

type ScanStep = "idle" | "camera" | "flash" | "processing" | "result";

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

  const [step, setStep] = useState<ScanStep>("idle");
  const [processProgress, setProcessProgress] = useState(0);
  const [processLabel, setProcessLabel] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

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
        videoRef.current.play();
      }
    } catch {
      setCameraError(true);
    }
  }, []);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setStep("idle");
    setResult(null);
  }, [stopCamera]);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      ctx?.drawImage(videoRef.current, 0, 0);
    }
    stopCamera();

    setStep("flash");
    setTimeout(() => {
      setStep("processing");
      runProcessingAnimation();
    }, 300);
  }, [stopCamera]);

  const runProcessingAnimation = useCallback(() => {
    setProcessProgress(0);
    setProcessLabel("Analyzing barcode...");

    const start = Date.now();
    const phase1 = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(80, (elapsed / 1000) * 80);
      setProcessProgress(pct);
      if (pct >= 80) {
        clearInterval(phase1);
        setProcessLabel("Processing...");
        const start2 = Date.now();
        const phase2 = setInterval(() => {
          const elapsed2 = Date.now() - start2;
          const pct2 = Math.min(100, 80 + (elapsed2 / 600) * 20);
          setProcessProgress(pct2);
          if (pct2 >= 100) {
            clearInterval(phase2);
            setTimeout(() => showResult(), 200);
          }
        }, 30);
      }
    }, 30);
  }, []);

  const showResult = useCallback(() => {
    const denied = Math.random() < 0.1;
    const hash = generateHash();
    const isReturning = !denied && Math.random() < 0.3;
    const scanResult: ScanResult = {
      hash,
      denied,
      isReturning,
      visitCount: isReturning ? Math.floor(Math.random() * 8) + 2 : undefined,
    };
    setResult(scanResult);
    setStep("result");

    if (!denied) {
      onEntry(scanResult);
    }

    setTimeout(() => {
      setStep("idle");
      setResult(null);
    }, 5000);
  }, [onEntry]);

  useEffect(() => {
    return () => stopCamera();
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

          <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-primary" />

          <div className="absolute left-3 right-3 h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-scan-line" />

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
            <p className="text-foreground/80 text-xs text-center">
              Point camera at back of Driver's License
            </p>
          </div>

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/90">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">Camera unavailable</p>
                <p className="text-muted-foreground text-xs">Tap capture to simulate scan</p>
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
          className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl mt-3 flex items-center justify-center gap-2 text-lg transition-all hover:glow-gold active:scale-[0.98]"
        >
          <Camera className="w-5 h-5" /> Capture ID
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
          {processProgress >= 80 && (
            <p className="text-xs text-muted-foreground text-center animate-fade-in flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Hashing identity data...
            </p>
          )}
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
            <Lock className="w-4 h-4" /> User ID: <span className="font-mono">#{result.hash}</span>
          </p>
          {result.isReturning && (
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
              <Hand className="w-4 h-4" /> Welcome back — Visit #{result.visitCount} this month
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
