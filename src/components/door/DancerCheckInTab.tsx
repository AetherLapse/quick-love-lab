import { useState, useCallback } from "react";
import { Video, Check, DollarSign, Clock, AlertTriangle, Delete, User } from "lucide-react";

const mockDancerNames: Record<string, string> = {
  "1234": "Jade #4",
  "5678": "Nova #2",
  "9012": "Sky #7",
  "3456": "Angel #9",
  "7890": "Luna #1",
};

const faceScanDancers = ["Jade #4", "Nova #2", "Sky #7", "Angel #9", "Luna #1", "Storm #6", "Raven #3", "Blaze #11"];

interface DancerLogEntry {
  name: string;
  time: string;
  method: "Face Scan" | "PIN Entry";
}

const initialLog: DancerLogEntry[] = [
  { name: "Jade #4", time: "9:12 PM", method: "Face Scan" },
  { name: "Nova #2", time: "8:58 PM", method: "PIN Entry" },
  { name: "Sky #7", time: "8:45 PM", method: "Face Scan" },
  { name: "Angel #9", time: "8:30 PM", method: "Face Scan" },
  { name: "Luna #1", time: "8:15 PM", method: "PIN Entry" },
];

interface DancerCheckInTabProps {
  onNewDancer: () => void;
}

type Step = "idle" | "face-scanning" | "face-failed" | "pin" | "success";

export default function DancerCheckInTab({ onNewDancer }: DancerCheckInTabProps) {
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [resultMethod, setResultMethod] = useState<"Face Scan" | "PIN Entry">("Face Scan");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [dancerLog, setDancerLog] = useState<DancerLogEntry[]>(initialLog);

  const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const addToLog = (name: string, method: "Face Scan" | "PIN Entry") => {
    setDancerLog((prev) => [{ name, time: now(), method }, ...prev].slice(0, 8));
  };

  const handleFaceScan = useCallback(() => {
    setStep("face-scanning");
    setResult(null);
    setTimeout(() => {
      if (Math.random() < 0.3) {
        setStep("face-failed");
      } else {
        const dancer = faceScanDancers[Math.floor(Math.random() * faceScanDancers.length)];
        setResult(dancer);
        setResultMethod("Face Scan");
        setStep("success");
        addToLog(dancer, "Face Scan");
        onNewDancer();
      }
    }, 2000);
  }, [onNewDancer]);

  const handlePinSubmit = useCallback(() => {
    if (pin.length !== 4) return;
    const dancer = mockDancerNames[pin];
    if (!dancer) {
      setPinError(true);
      setPin("");
      return;
    }
    setResult(dancer);
    setResultMethod("PIN Entry");
    setStep("success");
    addToLog(dancer, "PIN Entry");
    onNewDancer();
    setPin("");
    setPinError(false);
  }, [pin, onNewDancer]);

  const handlePinKey = (key: string | number | null) => {
    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      setPinError(false);
    } else if (key !== null && pin.length < 4) {
      setPin((p) => p + key);
      setPinError(false);
    }
  };

  const resetDancer = () => {
    setStep("idle");
    setResult(null);
    setPin("");
    setPinError(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        {/* IDLE / SCANNING */}
        {(step === "idle" || step === "face-scanning") && (
          <>
            {step === "face-scanning" && (
              <div className="relative aspect-video bg-secondary/80 rounded-xl border border-border mb-4 overflow-hidden flex items-center justify-center">
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-scan-arc" />
                  <div className="absolute inset-4 flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleFaceScan}
              disabled={step === "face-scanning"}
              className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl mb-4 flex items-center justify-center gap-3 text-lg transition-all hover:glow-gold disabled:opacity-60"
            >
              <Video className="w-5 h-5" />
              {step === "face-scanning" ? "Scanning..." : "START FACE SCAN"}
            </button>

            <button
              onClick={() => {
                setStep("pin");
                setPin("");
                setPinError(false);
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Use PIN Instead →
            </button>
          </>
        )}

        {/* FACE FAILED */}
        {step === "face-failed" && (
          <div className="animate-fade-in space-y-3">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-warning font-semibold">Face scan failed. Please enter your PIN.</p>
            </div>
            <button
              onClick={() => {
                setStep("pin");
                setPin("");
              }}
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

            {/* PIN dots */}
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

            {pinError && (
              <p className="text-destructive text-sm text-center mb-4">Incorrect PIN. Try again.</p>
            )}

            {/* Number pad — large touch targets */}
            <div className="grid grid-cols-3 gap-3 mb-4 max-w-[320px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "back"].map((key, i) => (
                <button
                  key={i}
                  onClick={() => handlePinKey(key)}
                  className={`rounded-xl font-semibold text-2xl transition-all flex items-center justify-center ${
                    key === null
                      ? "invisible"
                      : "bg-secondary hover:bg-secondary/80 text-foreground active:scale-95"
                  }`}
                  style={{ height: 72, minWidth: 72 }}
                >
                  {key === "back" ? <Delete className="w-6 h-6" /> : key}
                </button>
              ))}
            </div>

            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4}
              className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl disabled:opacity-40 transition-all hover:glow-gold mb-3"
            >
              Confirm
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
                <Check className="w-5 h-5" /> {result} — FACE VERIFIED
              </p>
              <p className="text-primary font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> $50 House Fee Applied
              </p>
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Check-in logged: {now()}
              </p>
            </div>
            <button
              onClick={resetDancer}
              className="w-full touch-target border border-border rounded-xl font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              Next Check-In
            </button>
          </div>
        )}
      </div>

      {/* Recent Dancer Check-Ins */}
      <div className="glass-card p-5">
        <h3 className="font-heading text-xl tracking-wide text-muted-foreground mb-4">
          Recent Dancer Check-Ins
        </h3>
        <div className="space-y-2">
          {dancerLog.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-sm py-2.5 border-b border-border/30 last:border-0"
            >
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-foreground font-medium flex-1">{entry.name}</span>
              <span className="text-muted-foreground">{entry.time}</span>
              <span className="text-muted-foreground text-xs bg-secondary/60 px-2 py-0.5 rounded">
                {entry.method}
              </span>
              <span className="text-primary font-medium">$50 fee</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
