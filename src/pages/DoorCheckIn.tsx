import { useState, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { CreditCard, User } from "lucide-react";
import CameraIDScanner from "@/components/CameraIDScanner";
import CustomerEntryTab from "@/components/door/CustomerEntryTab";
import DancerCheckInTab from "@/components/door/DancerCheckInTab";

export default function DoorCheckIn() {
  const [activeTab, setActiveTab] = useState<"customer" | "dancer">("customer");
  const [guestCount, setGuestCount] = useState(47);
  const [dancerCount, setDancerCount] = useState(8);
  const [doorRevenue, setDoorRevenue] = useState(940);

  const handleNewGuest = useCallback(() => {
    setGuestCount((c) => c + 1);
    setDoorRevenue((r) => r + 20);
  }, []);

  const handleNewDancer = useCallback(() => {
    setDancerCount((c) => c + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar badge="Door Staff" centerLabel="Door Check-In" />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Persistent Top Strip */}
        <div className="flex items-center gap-3 mb-6 glass-card p-4">
          <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse-glow" />
          <span className="font-heading text-lg sm:text-2xl tracking-wide">
            TONIGHT: {guestCount} Guests
          </span>
          <span className="text-muted-foreground mx-1">|</span>
          <span className="font-heading text-lg sm:text-2xl tracking-wide">
            {dancerCount} Dancers
          </span>
          <span className="text-muted-foreground mx-1">|</span>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveTab("customer")}
            className={`rounded-xl font-heading text-xl sm:text-2xl tracking-wide py-4 px-4 transition-all border-2 flex items-center justify-center gap-2 ${
            activeTab === "customer" ?
            "bg-primary text-primary-foreground border-primary glow-gold" :
            "bg-card text-muted-foreground border-primary/40 hover:text-foreground hover:border-primary/70"}`
            }>
            <CreditCard className="w-5 h-5" />
            CUSTOMER ENTRY
          </button>
          <button
            onClick={() => setActiveTab("dancer")}
            className={`rounded-xl font-heading text-xl sm:text-2xl tracking-wide py-4 px-4 transition-all border-2 flex items-center justify-center gap-2 ${
            activeTab === "dancer" ?
            "bg-primary text-primary-foreground border-primary glow-gold" :
            "bg-card text-muted-foreground border-primary/40 hover:text-foreground hover:border-primary/70"}`
            }>
            <User className="w-5 h-5" />
            DANCER CHECK-IN
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === "customer" ?
          <CustomerEntryTab onNewGuest={handleNewGuest} /> :
          <DancerCheckInTab onNewDancer={handleNewDancer} />
          }
        </div>
      </div>
    </div>);
}
