import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface StageEntry {
  dancerId: string;
  dancerName: string;
  startTime: Date;
}

interface StageContextType {
  current: StageEntry | null;
  queue: StageEntry[];
  putOnStage: (dancerId: string, dancerName: string) => void;
  addToQueue: (dancerId: string, dancerName: string) => void;
  advanceQueue: () => void;         // move first in queue onto stage
  removeFromQueue: (dancerId: string) => void;
  clearStage: () => void;
}

const StageContext = createContext<StageContextType | undefined>(undefined);

export function StageProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<StageEntry | null>(null);
  const [queue, setQueue]     = useState<StageEntry[]>([]);

  const putOnStage = (dancerId: string, dancerName: string) => {
    setCurrent({ dancerId, dancerName, startTime: new Date() });
  };

  const addToQueue = (dancerId: string, dancerName: string) => {
    // Prevent duplicates
    setQueue(prev =>
      prev.some(e => e.dancerId === dancerId)
        ? prev
        : [...prev, { dancerId, dancerName, startTime: new Date() }]
    );
  };

  const advanceQueue = () => {
    setQueue(prev => {
      const [next, ...rest] = prev;
      if (next) setCurrent({ ...next, startTime: new Date() });
      else setCurrent(null);
      return rest;
    });
  };

  const removeFromQueue = (dancerId: string) => {
    setQueue(prev => prev.filter(e => e.dancerId !== dancerId));
  };

  const clearStage = () => setCurrent(null);

  return (
    <StageContext.Provider value={{ current, queue, putOnStage, addToQueue, advanceQueue, removeFromQueue, clearStage }}>
      {children}
    </StageContext.Provider>
  );
}

export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used within StageProvider");
  return ctx;
}

// ── Elapsed time hook ─────────────────────────────────────────────────────────
export function useElapsed(startTime: Date | null) {
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (!startTime) { setElapsed("0:00"); return; }
    const tick = () => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const m = Math.floor(secs / 60);
      const s = String(secs % 60).padStart(2, "0");
      setElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}
