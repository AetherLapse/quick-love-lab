import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StageProvider } from "@/contexts/StageContext";
import RequireRole from "@/components/RequireRole";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DoorCheckIn from "./pages/DoorCheckIn";
import PrivateRooms from "./pages/PrivateRooms";
import FloorView from "./pages/FloorView";
import ClubSettings from "./pages/ClubSettings";
import DancerLogin from "./pages/DancerLogin";
import DancerPortal from "./pages/DancerPortal";
import BackroomTV from "./pages/BackroomTV";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           60_000,  // serve cache for 1 min before background-refetch
      gcTime:         5 * 60_000,  // keep unused cache for 5 min
      refetchOnWindowFocus: false,  // don't refetch just because user tabbed away
      retry: 1,
    },
  },
});

// Role shorthand groups
const OWNER          = ["admin", "owner"]                                            as const;
const OWNER_MANAGER  = ["admin", "owner", "manager"]                                 as const;
const LOGS_ROLES     = ["admin", "owner", "manager"]                                 as const;
const DASHBOARD_ROLES = ["admin", "owner", "manager", "house_mom"]                  as const;
const DOOR_ROLES     = ["admin", "owner", "manager", "door_staff"]                  as const;
const STAGE_ROLES    = ["admin", "owner", "manager", "house_mom", "room_attendant"] as const;
const REPORTS_ROLES  = ["admin", "owner", "manager", "door_staff"]                  as const;
const ROOMS_ROLES    = ["admin", "owner", "manager", "room_attendant"]              as const;
const BACKROOM_ROLES = ["admin", "owner", "manager", "backroom_tv", "bartender", "dj"] as const;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/"              element={<Landing />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/dancer-login"  element={<DancerLogin />} />
              <Route path="/dancer-portal" element={<DancerPortal />} />

              {/* Protected — role-gated */}
              <Route path="/dashboard" element={<RequireRole roles={[...DASHBOARD_ROLES]}><Dashboard /></RequireRole>} />
              <Route path="/door"      element={<RequireRole roles={[...DOOR_ROLES]}><DoorCheckIn /></RequireRole>} />
              <Route path="/stage"     element={<RequireRole roles={[...STAGE_ROLES]}><Dashboard defaultTab="Stage" /></RequireRole>} />
              <Route path="/dancers"   element={<RequireRole roles={[...DASHBOARD_ROLES]}><Dashboard defaultTab="Performers" /></RequireRole>} />
              <Route path="/reports"   element={<RequireRole roles={[...REPORTS_ROLES]}><Dashboard defaultTab="Reports" /></RequireRole>} />
              <Route path="/logs"     element={<RequireRole roles={[...LOGS_ROLES]}><Dashboard defaultTab="Logs" /></RequireRole>} />
              <Route path="/kiosks"    element={<RequireRole roles={[...OWNER]}><Dashboard defaultTab="Kiosks" /></RequireRole>} />
              <Route path="/settings"  element={<RequireRole roles={[...OWNER]}><ClubSettings /></RequireRole>} />
              <Route path="/floor"     element={<RequireRole roles={[...DASHBOARD_ROLES]}><FloorView /></RequireRole>} />
              <Route path="/rooms"     element={<RequireRole roles={[...ROOMS_ROLES]}><PrivateRooms /></RequireRole>} />
              <Route path="/backroom"  element={<RequireRole roles={[...BACKROOM_ROLES]}><BackroomTV /></RequireRole>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
