import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";

export interface StageEntry {
  dancerId:   string;
  dancerName: string;
  startTime:  Date;
  inRoom?:    boolean;
}

export interface StageFine {
  id:         string;
  dancerId:   string;
  dancerName: string;
  reason:     string;
  amount:     number;
  issuedAt:   Date;
}

export interface StageHistoryEntry {
  id:              string;
  dancerId:        string;
  dancerName:      string;
  startTime:       Date;
  endTime:         Date;
  durationSeconds: number;
  endReason:       "completed" | "skipped" | "removed";
  skipReason?:     string;
}

const AUTO_ADVANCE_SECS  = 600; // 10 minutes
const ROOM_GRACE_SECS    = 120; // 2 minutes grace after room session

interface StageContextType {
  current:          StageEntry | null;
  queue:            StageEntry[];
  secondsUntilNext: number;
  fines:            StageFine[];
  stageHistory:     StageHistoryEntry[];
  roomExitTimes:    Record<string, Date>;
  putOnStage:       (dancerId: string, dancerName: string) => void;
  addToQueue:       (dancerId: string, dancerName: string) => void;
  advanceQueue:     () => void;
  offStageEarly:    () => void;
  removeFromQueue:  (dancerId: string, reason?: string) => void;
  reorderQueue:     (fromIdx: number, toIdx: number) => void;
  setFullQueue:     (entries: StageEntry[]) => void;
  skipDancer:       (reason: string) => void;
  clearStage:       () => void;
  issueFine:        (dancerId: string, dancerName: string, reason: string, amount: number) => void;
  notifyRoomExit:   (dancerId: string) => void;
  clearFines:       () => void;
}

const StageContext = createContext<StageContextType | undefined>(undefined);

export function StageProvider({ children }: { children: ReactNode }) {
  const [current,          setCurrent]          = useState<StageEntry | null>(null);
  const [queue,            setQueue]            = useState<StageEntry[]>([]);
  const [secondsUntilNext, setSecondsUntilNext] = useState(AUTO_ADVANCE_SECS);
  const [fines,            setFines]            = useState<StageFine[]>([]);
  const [stageHistory,     setStageHistory]     = useState<StageHistoryEntry[]>([]);
  const [roomExitTimes,    setRoomExitTimes]    = useState<Record<string, Date>>({});

  const currentRef = useRef(current);
  currentRef.current = current;

  // ── Auto-advance countdown ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!currentRef.current) return;
      setSecondsUntilNext(s => {
        if (s <= 1) {
          const finished = currentRef.current;
          if (finished) {
            const endTime = new Date();
            setStageHistory(prev => [{
              id:              crypto.randomUUID(),
              dancerId:        finished.dancerId,
              dancerName:      finished.dancerName,
              startTime:       finished.startTime,
              endTime,
              durationSeconds: Math.round((endTime.getTime() - finished.startTime.getTime()) / 1000),
              endReason:       "completed",
            }, ...prev]);
          }
          setQueue(prev => {
            const [next, ...rest] = prev;
            if (next) setCurrent({ ...next, startTime: new Date() });
            else      setCurrent(null);
            return rest;
          });
          return AUTO_ADVANCE_SECS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const putOnStage = useCallback((dancerId: string, dancerName: string) => {
    setCurrent({ dancerId, dancerName, startTime: new Date() });
    setQueue(prev => prev.filter(e => e.dancerId !== dancerId));
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
    setRoomExitTimes(prev => { const n = { ...prev }; delete n[dancerId]; return n; });
  }, []);

  const addToQueue = useCallback((dancerId: string, dancerName: string) => {
    setQueue(prev =>
      prev.some(e => e.dancerId === dancerId)
        ? prev
        : [...prev, { dancerId, dancerName, startTime: new Date() }]
    );
  }, []);

  const advanceQueue = useCallback(() => {
    setCurrent(null);
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
  }, []);

  const offStageEarly = useCallback(() => {
    setCurrent(prev => {
      if (prev) setQueue(q => [prev, ...q]);
      return null;
    });
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
  }, []);

  const removeFromQueue = useCallback((dancerId: string, reason?: string) => {
    setQueue(prev => {
      const entry = prev.find(e => e.dancerId === dancerId);
      if (entry && reason) {
        const endTime = new Date();
        setStageHistory(h => [{
          id:              crypto.randomUUID(),
          dancerId:        entry.dancerId,
          dancerName:      entry.dancerName,
          startTime:       entry.startTime,
          endTime,
          durationSeconds: Math.round((endTime.getTime() - entry.startTime.getTime()) / 1000),
          endReason:       "removed",
          skipReason:      reason,
        }, ...h]);
      }
      return prev.filter(e => e.dancerId !== dancerId);
    });
  }, []);

  const skipDancer = useCallback((reason: string) => {
    const prev = currentRef.current;
    if (prev) {
      const endTime = new Date();
      setStageHistory(h => [{
        id:              crypto.randomUUID(),
        dancerId:        prev.dancerId,
        dancerName:      prev.dancerName,
        startTime:       prev.startTime,
        endTime,
        durationSeconds: Math.round((endTime.getTime() - prev.startTime.getTime()) / 1000),
        endReason:       "skipped",
        skipReason:      reason,
      }, ...h]);
    }
    setQueue(q => {
      const [next, ...rest] = q;
      setCurrent(next ? { ...next, startTime: new Date() } : null);
      return rest;
    });
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
  }, []);

  const reorderQueue = useCallback((fromIdx: number, toIdx: number) => {
    setQueue(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const setFullQueue = useCallback((entries: StageEntry[]) => setQueue(entries), []);

  const clearStage = useCallback(() => setCurrent(null), []);

  const issueFine = useCallback((dancerId: string, dancerName: string, reason: string, amount: number) => {
    setFines(prev => [{
      id:         crypto.randomUUID(),
      dancerId, dancerName, reason, amount,
      issuedAt:   new Date(),
    }, ...prev]);
  }, []);

  const notifyRoomExit = useCallback((dancerId: string) => {
    setRoomExitTimes(prev => ({ ...prev, [dancerId]: new Date() }));
  }, []);

  const clearFines = useCallback(() => setFines([]), []);

  return (
    <StageContext.Provider value={{
      current, queue, secondsUntilNext, fines, stageHistory, roomExitTimes,
      putOnStage, addToQueue, advanceQueue, offStageEarly, removeFromQueue,
      reorderQueue, setFullQueue, skipDancer, clearStage,
      issueFine, notifyRoomExit, clearFines,
    }}>
      {children}
    </StageContext.Provider>
  );
}

export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used within StageProvider");
  return ctx;
}

// ── Elapsed time hook ──────────────────────────────────────────────────────────
export function useElapsed(startTime: Date | null) {
  const [elapsed, setElapsed] = useState("0:00");
  useEffect(() => {
    if (!startTime) { setElapsed("0:00"); return; }
    const tick = () => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsed(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

// ── Room grace countdown hook (seconds remaining, null if no grace active) ─────
export function useRoomGrace(dancerId: string): number | null {
  const { roomExitTimes } = useStage();
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    const exitTime = roomExitTimes[dancerId];
    if (!exitTime) { setSecs(null); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - exitTime.getTime()) / 1000);
      const remaining = ROOM_GRACE_SECS - elapsed;
      setSecs(remaining > 0 ? remaining : null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dancerId, roomExitTimes]);

  return secs;
}

export { ROOM_GRACE_SECS };
