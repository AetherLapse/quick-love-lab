import { Lock } from "lucide-react";

export function KioskLockScreen({ isLocked }: { isLocked: boolean }) {
  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{ background: "hsl(240 18% 6%)" }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Pulse ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: "hsl(var(--primary))", animationDuration: "2s" }} />
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "hsl(var(--primary) / 0.15)", border: "2px solid hsl(var(--primary) / 0.4)" }}>
          <Lock className="w-10 h-10" style={{ color: "hsl(var(--primary))" }} />
        </div>
      </div>

      <h1 className="text-white text-3xl font-bold tracking-tight mb-2">Screen Locked</h1>
      <p className="text-white/40 text-sm text-center max-w-xs">
        This screen has been locked by an administrator.
        <br />Contact the manager to unlock it.
      </p>

      <div className="mt-12 flex items-center gap-2 text-white/20 text-xs">
        <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
        Waiting for administrator…
      </div>
    </div>
  );
}
