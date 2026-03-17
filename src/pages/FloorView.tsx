import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";
import FloorOverviewTab from "@/components/floor/FloorOverviewTab";
import DoorActivityTab from "@/components/floor/DoorActivityTab";
import RoomsTab from "@/components/floor/RoomsTab";
import StaffDancersTab from "@/components/floor/StaffDancersTab";
import ShiftLogTab from "@/components/floor/ShiftLogTab";

const tabs = [
  { key: "overview", label: "Floor Overview" },
  { key: "door", label: "Door Activity" },
  { key: "rooms", label: "Rooms" },
  { key: "staff", label: "Staff & Dancers" },
  { key: "log", label: "Shift Log" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function FloorView() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [clock, setClock] = useState(new Date());

  // Live ticking clock
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Persistent live counts
  const [guestCount, setGuestCount] = useState(53);
  const [dancersActive] = useState(8);
  const [roomsOccupied] = useState(2);
  const [roomsOvertime] = useState(1);

  // Simulate guest count ticking
  useEffect(() => {
    const iv = setInterval(() => setGuestCount((c) => c + 1), 45000);
    return () => clearInterval(iv);
  }, []);

  const clockStr = clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img src={logo} alt="2NYT Entertainment" className="h-10 w-auto" />
        </Link>

        {/* Sub-nav tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                activeTab === t.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-secondary text-foreground border border-border">
            Manager
          </span>
          <span className="text-sm font-mono text-muted-foreground hidden sm:block">{clockStr}</span>
          <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </header>

      {/* Mobile tab selector */}
      <div className="md:hidden flex overflow-x-auto border-b border-border px-2 bg-background">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-20">
        {activeTab === "overview" && <FloorOverviewTab guestCount={guestCount} />}
        {activeTab === "door" && <DoorActivityTab />}
        {activeTab === "rooms" && <RoomsTab />}
        {activeTab === "staff" && <StaffDancersTab />}
        {activeTab === "log" && <ShiftLogTab />}
      </main>

      {/* Persistent bottom strip */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-6 py-2.5 flex items-center justify-center gap-6 md:gap-10 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
          <strong>{guestCount}</strong> <span className="text-muted-foreground">Guests On Floor</span>
        </span>
        <span className="text-border">|</span>
        <span><strong>{dancersActive}</strong> <span className="text-muted-foreground">Dancers Active</span></span>
        <span className="text-border hidden sm:inline">|</span>
        <span className="hidden sm:inline"><strong>{roomsOccupied}</strong> <span className="text-muted-foreground">Rooms Occupied</span></span>
        <span className="text-border hidden sm:inline">|</span>
        <span className="hidden sm:flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-glow" />
          <strong>{roomsOvertime}</strong> <span className="text-muted-foreground">Room Overtime</span>
        </span>
      </footer>
    </div>
  );
}
