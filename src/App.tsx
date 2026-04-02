import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StageProvider } from "@/contexts/StageContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DoorCheckIn from "./pages/DoorCheckIn";
import PrivateRooms from "./pages/PrivateRooms";
import FloorView from "./pages/FloorView";
import ClubSettings from "./pages/ClubSettings";
import NotFound from "./pages/NotFound";
import DemoLogin from "./components/DemoLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/door" element={<DemoLogin role="admin"><DoorCheckIn /></DemoLogin>} />
            <Route path="/rooms" element={<DemoLogin role="admin"><PrivateRooms /></DemoLogin>} />
            <Route path="/dashboard" element={<DemoLogin role="admin"><Dashboard /></DemoLogin>} />
            <Route path="/floor" element={<DemoLogin role="manager"><FloorView /></DemoLogin>} />
            <Route path="/settings" element={<DemoLogin role="admin"><ClubSettings /></DemoLogin>} />
            <Route path="/dancers" element={<DemoLogin role="admin"><Dashboard defaultTab="Performers" /></DemoLogin>} />
            <Route path="/reports" element={<DemoLogin role="admin"><Dashboard defaultTab="Reports" /></DemoLogin>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </StageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
