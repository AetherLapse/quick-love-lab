import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DoorCheckIn from "./pages/DoorCheckIn";
import PrivateRooms from "./pages/PrivateRooms";
import FloorView from "./pages/FloorView";
import NotFound from "./pages/NotFound";
import DemoLogin from "./components/DemoLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/door" element={<DoorCheckIn />} />
          <Route path="/rooms" element={<PrivateRooms />} />
          <Route path="/dashboard" element={<DemoLogin role="admin"><Dashboard /></DemoLogin>} />
          <Route path="/floor" element={<DemoLogin role="manager"><FloorView /></DemoLogin>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
