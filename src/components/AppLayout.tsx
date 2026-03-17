import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DoorOpen, LayoutDashboard, Music, LogOut, Users, Settings } from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { path: "/door", label: "Door", icon: DoorOpen, roles: ["admin", "manager", "door_staff"] },
  { path: "/rooms", label: "Rooms", icon: Music, roles: ["admin", "manager", "room_attendant"] },
  { path: "/dancers", label: "Dancers", icon: Users, roles: ["admin"] },
  { path: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNav = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold font-heading text-primary">NightLedger</h1>
          <p className="text-xs text-muted-foreground capitalize">{role?.replace("_", " ")} Panel</p>
        </div>
        <nav className="flex-1 space-y-1">
          {filteredNav.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <Button
          variant="ghost"
          className="mt-4 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around py-2 px-1">
        {filteredNav.slice(0, 4).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs ${
              location.pathname === item.path ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
