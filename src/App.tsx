import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DoorCheckIn from "./pages/DoorCheckIn";
import PrivateRooms from "./pages/PrivateRooms";
import FloorView from "./pages/FloorView";
import ClubSettings from "./pages/ClubSettings";
import Reports from "./pages/Reports";
import StaffHome from "./pages/StaffHome";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import RoleGuard from "./components/DemoLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/"      element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Door / Security — owner, admin, manager, door_staff */}
            <Route path="/door" element={
              <RoleGuard allowedRoles={["owner", "admin", "manager", "door_staff"]}>
                <DoorCheckIn />
              </RoleGuard>
            } />

            {/* Private Rooms — all staff roles including room_attendant & house_mom */}
            <Route path="/rooms" element={
              <RoleGuard allowedRoles={["owner", "admin", "manager", "door_staff", "room_attendant", "house_mom"]}>
                <PrivateRooms />
              </RoleGuard>
            } />

            {/* Reports — door_staff+ (Full Report gated within the page to owner only) */}
            <Route path="/reports" element={
              <RoleGuard allowedRoles={["owner", "admin", "manager", "door_staff"]}>
                <Reports />
              </RoleGuard>
            } />

            {/* Admin Dashboard — owner, admin, manager */}
            <Route path="/dashboard" element={
              <RoleGuard allowedRoles={["owner", "admin", "manager"]}>
                <Dashboard />
              </RoleGuard>
            } />

            {/* Floor View — owner, admin, manager */}
            <Route path="/floor" element={
              <RoleGuard allowedRoles={["owner", "admin", "manager"]}>
                <FloorView />
              </RoleGuard>
            } />

            {/* Settings — owner, admin only */}
            <Route path="/settings" element={
              <RoleGuard allowedRoles={["owner", "admin"]}>
                <ClubSettings />
              </RoleGuard>
            } />

            {/* Staff Home — all staff roles */}
            <Route path="/staff-home" element={
              <RoleGuard allowedRoles={["owner", "admin", "manager", "door_staff", "room_attendant", "house_mom"]}>
                <StaffHome />
              </RoleGuard>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
