import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  DoorOpen,
  Users,
  MonitorSmartphone,
  FileText,
  Settings,
  LogOut,
  Menu,
  Mic2,
  Clock,
  BedDouble,
  Tv2,
  ScrollText,
} from "lucide-react";
import { useStage } from "@/contexts/StageContext";
import { useKioskHeartbeat } from "@/hooks/useKioskHeartbeat";
import { KioskLockScreen } from "@/components/KioskLockScreen";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

type AppRole = "admin" | "owner" | "manager" | "door_staff" | "room_attendant" | "house_mom" | "backroom_tv" | "bartender" | "dj";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    roles: ["admin", "owner", "manager", "house_mom"],
  },
  {
    path: "/door",
    label: "Door Panel",
    icon: DoorOpen,
    roles: ["admin", "owner", "manager", "door_staff"],
  },
  {
    path: "/stage",
    label: "Stage",
    icon: Mic2,
    roles: ["admin", "owner", "manager", "house_mom", "room_attendant"],
  },
  {
    path: "/backroom",
    label: "Backroom TV",
    icon: Tv2,
    roles: ["backroom_tv", "bartender", "dj"],
  },
  {
    path: "/rooms",
    label: "Rooms",
    icon: BedDouble,
    roles: ["admin", "owner", "manager", "room_attendant", "door_staff"],
  },
  {
    path: "/dancers",
    label: "Dancers",
    icon: Users,
    roles: ["admin", "owner", "manager", "house_mom"],
  },
  {
    path: "/reports",
    label: "Reports",
    icon: FileText,
    roles: ["admin", "owner", "manager"],
  },
  {
    path: "/logs",
    label: "Logs",
    icon: ScrollText,
    roles: ["admin", "owner", "manager"],
  },
  {
    path: "/kiosks",
    label: "Kiosks",
    icon: MonitorSmartphone,
    roles: ["admin", "owner"],
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin", "owner"],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin:          "Owner",
  owner:          "Owner",
  manager:        "Manager",
  door_staff:     "Door / Security",
  room_attendant: "Room Attendant",
  house_mom:      "House Mom",
  backroom_tv:    "Backroom TV",
  bartender:      "Bartender",
  dj:             "DJ",
};

import logo2nyt from "@/assets/logo-2nyt.png";

// ── Stage status pills ────────────────────────────────────────────────────────

function QueuePill({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/15 border border-yellow-500/30">
      <Clock className="w-3 h-3 text-yellow-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-yellow-400/80 leading-none">In Queue</p>
        <p className="text-xs font-semibold text-yellow-300 leading-none mt-0.5 truncate">{name}</p>
      </div>
    </div>
  );
}

function WaitingPill({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30">
      <Clock className="w-3 h-3 text-blue-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-blue-400/80 leading-none">Waiting</p>
        <p className="text-xs font-semibold text-blue-300 leading-none mt-0.5 truncate">{name}</p>
      </div>
    </div>
  );
}

function StagePills() {
  const { current, queue, waiting } = useStage();

  if (!current && queue.length === 0 && waiting.length === 0) return null;

  return (
    <div className="px-3 pb-3 space-y-2">
      {/* Current on stage */}
      {current && <CurrentPill entry={current} />}
      {/* Queue (show first 2) */}
      {queue.slice(0, 2).map(entry => (
        <QueuePill key={entry.dancerId} name={entry.dancerName} />
      ))}
      {queue.length > 2 && (
        <p className="text-[10px] text-white/30 text-center">+{queue.length - 2} more in queue</p>
      )}
      {/* Waiting dancers (show first 3) */}
      {waiting.slice(0, 3).map(entry => (
        <WaitingPill key={entry.dancerId} name={entry.dancerName} />
      ))}
      {waiting.length > 3 && (
        <p className="text-[10px] text-white/30 text-center">+{waiting.length - 3} more waiting</p>
      )}
    </div>
  );
}

function CurrentPill({ entry }: { entry: { dancerName: string; startTime: Date } }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/15 border border-green-500/40 animate-pulse">
      <Mic2 className="w-3 h-3 text-green-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-green-400/80 leading-none">On Stage</p>
        <p className="text-xs font-semibold text-green-300 leading-none mt-0.5 truncate">{entry.dancerName}</p>
      </div>
    </div>
  );
}

function Sidebar({
  filteredNav,
  role,
  userEmail,
  onNavigate,
  onSignOut,
  currentPath,
}: {
  filteredNav: NavItem[];
  role: string | null;
  userEmail: string | null | undefined;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  currentPath: string;
}) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "hsl(240 18% 10%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <img src={logo2nyt} alt="2NYT Logo" className="w-9 h-9 rounded-full object-cover shrink-0" />
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold leading-none">2NYT ENTERTAINMENT</p>
          <p className="text-white/40 text-xs mt-0.5">Venue Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const active =
            currentPath === item.path ||
            (item.path !== "/dashboard" && currentPath.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={
                active
                  ? {
                      background: "hsl(var(--sidebar-primary))",
                      color: "#fff",
                    }
                  : {
                      color: "hsl(var(--sidebar-foreground))",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "hsl(var(--sidebar-accent))";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "hsl(var(--sidebar-foreground))";
                }
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Stage status pills */}
      <StagePills />

      {/* User info + sign out */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        <div className="mb-3">
          <p className="text-white text-sm font-semibold capitalize leading-none">
            {userEmail?.split("@")[0] ?? "User"}
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            {role ? ROLE_LABELS[role] ?? role : ""}
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-white/40 hover:text-red-400 text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredNav = navItems.filter(
    (item) => role && item.roles.includes(role as AppRole)
  );

  useRealtimeSync();
  const { isLocked } = useKioskHeartbeat();

  const handleNavigate = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const sidebarProps = {
    filteredNav,
    role,
    userEmail: user?.email,
    onNavigate: handleNavigate,
    onSignOut: async () => { await signOut(); navigate("/login"); },
    currentPath: location.pathname,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <KioskLockScreen isLocked={isLocked} />

      {/* Backdrop — all screen sizes */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer — all screen sizes */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — always visible */}
        <header
          className="flex items-center gap-3 px-4 py-3 border-b border-border"
          style={{ background: "hsl(240 18% 10%)" }}
        >
          <button
            onClick={() => setDrawerOpen(o => !o)}
            className="text-white/60 hover:text-white p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white text-base font-semibold">2NYT Entertainment</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 xl:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
