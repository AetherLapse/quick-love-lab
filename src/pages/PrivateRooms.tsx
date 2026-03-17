import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { Plus, Video, AlertTriangle } from "lucide-react";

interface Room {
  id: number;
  status: "active" | "available" | "attention" | "cleaning";
  dancer?: string;
  customer?: string;
  package?: string;
  price?: number;
  startTime?: number;
  split?: { house: number; dancer: number };
}

const initialRooms: Room[] = [
  { id: 1, status: "active", dancer: "Jade #4", customer: "#8f4b2a9c…", package: "3 Songs", price: 150, startTime: Date.now() - 512000, split: { house: 105, dancer: 45 } },
  { id: 2, status: "active", dancer: "Sky #7", customer: "#3d91cc2a…", package: "2 Songs", price: 100, startTime: Date.now() - 194000, split: { house: 70, dancer: 30 } },
  { id: 3, status: "attention", dancer: "Angel #9", customer: "#c2d1e4f5…", package: "1 Song", price: 50, startTime: Date.now() - 1065000, split: { house: 35, dancer: 15 } },
  { id: 4, status: "available" },
  { id: 5, status: "available" },
  { id: 6, status: "cleaning" },
];

const mockDancers = ["Jade #4", "Nova #2", "Sky #7", "Luna #1", "Star #5", "Angel #9", "Storm #6", "Raven #3"];
const packages = [
  { label: "1 Song", price: 50, house: 35, dancer: 15 },
  { label: "2 Songs", price: 100, house: 70, dancer: 30 },
  { label: "3 Songs", price: 150, house: 105, dancer: 45 },
];

function formatTimer(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const statusStyles: Record<string, string> = {
  active: "border-primary/60 glow-gold",
  available: "border-success/20",
  attention: "border-warning/60",
  cleaning: "border-muted-foreground/20 opacity-60",
};

export default function PrivateRooms() {
  const [rooms, setRooms] = useState(initialRooms);
  const [now, setNow] = useState(Date.now());
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedDancer, setSelectedDancer] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [dancerScanState, setDancerScanState] = useState<"idle" | "scanning" | "done">("idle");
  const [pinInput, setPinInput] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = rooms.filter(r => r.status === "active").length;
  const availableCount = rooms.filter(r => r.status === "available").length;
  const attentionCount = rooms.filter(r => r.status === "attention").length;
  const cleaningCount = rooms.filter(r => r.status === "cleaning").length;
  const availableRooms = rooms.filter(r => r.status === "available");

  const openModal = () => {
    setShowModal(true);
    setModalStep(1);
    setSelectedDancer(null);
    setSelectedPackage(null);
    setSelectedRoom(availableRooms[0]?.id ?? null);
    setDancerScanState("idle");
    setPinInput("");
  };

  const handleFaceScan = () => {
    setDancerScanState("scanning");
    setTimeout(() => {
      const dancer = mockDancers[Math.floor(Math.random() * mockDancers.length)];
      setSelectedDancer(dancer);
      setDancerScanState("done");
    }, 2000);
  };

  const handlePinConfirm = () => {
    if (pinInput.length === 4) {
      const dancer = mockDancers[Math.floor(Math.random() * mockDancers.length)];
      setSelectedDancer(dancer);
      setDancerScanState("done");
      setPinInput("");
    }
  };

  const handleEndSession = (roomId: number) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { id: r.id, status: "available" as const } : r));
  };

  const handleStartSession = () => {
    if (!selectedDancer || selectedPackage === null || !selectedRoom) return;
    const pkg = packages[selectedPackage];
    setRooms(prev => prev.map(r =>
      r.id === selectedRoom ? {
        ...r,
        status: "active" as const,
        dancer: selectedDancer,
        customer: `#${Math.random().toString(16).slice(2, 10)}…`,
        package: pkg.label,
        price: pkg.price,
        startTime: Date.now(),
        split: { house: pkg.house, dancer: pkg.dancer },
      } : r
    ));
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar badge="Room Attendant" centerLabel="Private Room Tracking" />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-primary font-medium">{activeCount} Active</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-success font-medium">{availableCount} Available</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-warning font-medium">{attentionCount} Needs Attention</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{cleaningCount} Cleaning</span>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-3 rounded-xl hover:glow-gold transition-all"
          >
            <Plus className="w-4 h-4" /> Start New Room Session
          </button>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const elapsed = room.startTime ? now - room.startTime : 0;
            const isOvertime = room.status === "attention" || (room.status === "active" && elapsed > 900000);

            return (
              <div key={room.id} className={`glass-card p-5 border-2 transition-all ${statusStyles[room.status]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-2xl tracking-wide">Room {room.id}</h3>
                  <div className="flex items-center gap-2">
                    {(room.status === "active" || room.status === "attention") && (
                      <div className={`w-2.5 h-2.5 rounded-full animate-pulse-glow ${room.status === "attention" ? "bg-warning" : "bg-primary"}`} />
                    )}
                    <span className={`text-xs font-medium uppercase tracking-wider ${
                      room.status === "active" ? "text-primary" :
                      room.status === "available" ? "text-success" :
                      room.status === "attention" ? "text-warning" :
                      "text-muted-foreground"
                    }`}>{room.status === "attention" ? "Needs Attention" : room.status}</span>
                  </div>
                </div>

                {(room.status === "active" || room.status === "attention") && (
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dancer</span>
                      <span className="text-foreground font-medium">{room.dancer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guest</span>
                      <span className="text-muted-foreground font-mono text-xs">{room.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package</span>
                      <span className="text-foreground">{room.package} — ${room.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Elapsed</span>
                      <span className={`font-mono font-bold ${isOvertime ? "text-destructive" : "text-primary"}`}>
                        {formatTimer(elapsed)}
                      </span>
                    </div>
                    {isOvertime && (
                      <div className="flex items-center gap-1.5 text-warning text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> Session overtime
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">Split</span>
                      <span className="text-xs">
                        House <span className="text-primary font-semibold">${room.split?.house}</span> | Dancer <span className="font-semibold text-foreground">${room.split?.dancer}</span>
                      </span>
                    </div>
                    <button
                      onClick={() => handleEndSession(room.id)}
                      className={`w-full mt-2 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                        room.status === "attention"
                          ? "border-warning text-warning hover:bg-warning/10"
                          : "border-destructive/50 text-destructive hover:bg-destructive/10"
                      }`}
                    >
                      End Session
                    </button>
                  </div>
                )}

                {room.status === "available" && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <p className="text-success font-medium text-lg mb-3">Available</p>
                    <button
                      onClick={openModal}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Start Session
                    </button>
                  </div>
                )}

                {room.status === "cleaning" && (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <p className="text-lg mb-1">🧹 Cleaning in Progress</p>
                    <p className="text-xs">Estimated ready: ~10 min</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-step Modal */}
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

                {dancerScanState === "idle" && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={handleFaceScan}
                      className="p-4 rounded-xl border border-border hover:border-primary/40 transition-all text-center"
                    >
                      <Video className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <span className="text-sm font-medium">🎥 Scan Face</span>
                    </button>
                    <button
                      onClick={() => setDancerScanState("done")}
                      className="p-4 rounded-xl border border-border hover:border-primary/40 transition-all text-center hidden"
                    >
                      <span className="text-2xl mb-2 block">🔢</span>
                      <span className="text-sm font-medium">Enter PIN</span>
                    </button>
                    <div className="col-span-1">
                      <p className="text-xs text-muted-foreground mb-2">Or enter PIN:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="4-digit PIN"
                          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-center font-mono tracking-widest"
                        />
                        <button
                          onClick={handlePinConfirm}
                          disabled={pinInput.length < 4}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-40"
                        >
                          Go
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {dancerScanState === "scanning" && (
                  <div className="flex flex-col items-center py-8">
                    <div className="relative w-20 h-20 mb-4">
                      <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/30" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-scan-arc" />
                      <div className="absolute inset-3 flex items-center justify-center text-3xl">👤</div>
                    </div>
                    <p className="text-muted-foreground text-sm">Scanning face...</p>
                  </div>
                )}

                {dancerScanState === "done" && selectedDancer && (
                  <div className="bg-success/10 border border-success/30 rounded-xl p-4 mb-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-heading text-lg text-primary">
                        {selectedDancer.charAt(0)}
                      </div>
                      <div>
                        <p className="text-success font-semibold">{selectedDancer} identified</p>
                        <p className="text-muted-foreground text-xs">Ready to proceed</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">Cancel</button>
                  <button
                    onClick={() => setModalStep(2)}
                    disabled={!selectedDancer}
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
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {packages.map((pkg, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPackage(i)}
                      className={`py-5 rounded-xl text-center transition-all border-2 ${
                        selectedPackage === i
                          ? "bg-primary/10 border-primary glow-gold"
                          : "bg-secondary/50 border-border hover:border-primary/30"
                      }`}
                    >
                      <p className="font-heading text-xl">{pkg.label}</p>
                      <p className="text-primary font-bold text-lg">${pkg.price}</p>
                      <p className="text-xs text-muted-foreground mt-1">House ${pkg.house} | Dancer ${pkg.dancer}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModalStep(1)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">← Back</button>
                  <button
                    onClick={() => setModalStep(3)}
                    disabled={selectedPackage === null}
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
                {availableRooms.length > 0 ? (
                  <div className="space-y-2 mb-6">
                    {availableRooms.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRoom(r.id)}
                        className={`w-full py-3 px-4 rounded-xl text-left transition-all border-2 ${
                          selectedRoom === r.id
                            ? "border-primary bg-primary/10 glow-gold"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <span className="font-heading text-xl">Room {r.id}</span>
                        <span className="text-success text-xs ml-3">Available</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-warning text-sm mb-6">No rooms available.</p>
                )}

                {/* Summary */}
                {selectedDancer && selectedPackage !== null && selectedRoom && (
                  <div className="bg-secondary/50 rounded-xl p-4 mb-4 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Dancer:</span> <span className="text-foreground font-medium">{selectedDancer}</span></p>
                    <p><span className="text-muted-foreground">Package:</span> <span className="text-foreground">{packages[selectedPackage].label} — ${packages[selectedPackage].price}</span></p>
                    <p><span className="text-muted-foreground">Room:</span> <span className="text-foreground">Room {selectedRoom}</span></p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setModalStep(2)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">← Back</button>
                  <button
                    onClick={handleStartSession}
                    disabled={!selectedRoom || !selectedDancer || selectedPackage === null}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:glow-gold transition-all disabled:opacity-40"
                  >
                    ✅ Start Session
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
