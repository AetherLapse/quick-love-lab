import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { LayoutGrid, DoorOpen, FileText, Eye, Settings, Home } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";
import { supabase } from "@/integrations/supabase/client";

type DemoRole = "owner" | "admin" | "manager" | "door_staff" | "room_attendant" | "house_mom";

const ROLE_LABELS: Record<DemoRole, string> = {
  owner:          "Owner",
  admin:          "Admin",
  manager:        "Manager",
  door_staff:     "Door / Security",
  room_attendant: "Room Attendant",
  house_mom:      "House Mom",
};

const NAV_ITEMS: {
  path: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  roles: DemoRole[];
}[] = [
  {
    path: "/door",
    label: "Door Panel",
    description: "Entry tiers, dancer floor, dance sessions",
    icon: <DoorOpen className="w-7 h-7" />,
    color: "bg-green-600 hover:bg-green-500",
    roles: ["owner", "admin", "manager", "door_staff"],
  },
  {
    path: "/rooms",
    label: "Private Rooms",
    description: "Room sessions, assignments, status",
    icon: <Home className="w-7 h-7" />,
    color: "bg-purple-600 hover:bg-purple-500",
    roles: ["owner", "admin", "manager", "door_staff", "room_attendant", "house_mom"],
  },
  {
    path: "/reports",
    label: "Reports",
    description: "Dancer, door and full night reports",
    icon: <FileText className="w-7 h-7" />,
    color: "bg-blue-600 hover:bg-blue-500",
    roles: ["owner", "admin", "manager", "door_staff"],
  },
  {
    path: "/dashboard",
    label: "Dashboard",
    description: "Revenue, guests, performers overview",
    icon: <LayoutGrid className="w-7 h-7" />,
    color: "bg-amber-600 hover:bg-amber-500",
    roles: ["owner", "admin", "manager"],
  },
  {
    path: "/floor",
    label: "Floor View",
    description: "Live floor status and stage rotation",
    icon: <Eye className="w-7 h-7" />,
    color: "bg-pink-600 hover:bg-pink-500",
    roles: ["owner", "admin", "manager"],
  },
  {
    path: "/settings",
    label: "Settings",
    description: "Club configuration and preferences",
    icon: <Settings className="w-7 h-7" />,
    color: "bg-gray-700 hover:bg-gray-600",
    roles: ["owner", "admin"],
  },
];

export default function StaffHome() {
  const navigate = useNavigate();
  const role = (localStorage.getItem("demo_role") as DemoRole) ?? null;
  const roleLabel = role ? ROLE_LABELS[role] : "Staff";

  const visibleItems = NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("demo_role");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={logo} alt="2NYT" className="h-9 w-auto opacity-90" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Signed in as</p>
            <p className="font-bold text-sm">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-all"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>

      {/* Cards */}
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-gray-400 text-sm mb-5">Where would you like to go?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`${item.color} rounded-2xl p-5 text-left transition-all active:scale-[0.97] shadow-lg`}
            >
              <div className="mb-3 opacity-90">{item.icon}</div>
              <p className="font-bold text-lg leading-tight">{item.label}</p>
              <p className="text-white/70 text-sm mt-1">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
