import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AppRole = "admin" | "owner" | "manager" | "door_staff" | "room_attendant" | "house_mom" | "backroom_tv" | "bartender" | "dj";

// Default landing page per role after login / when redirected from unauthorized route
export const ROLE_HOME: Record<string, string> = {
  admin:          "/dashboard",
  owner:          "/dashboard",
  manager:        "/dashboard",
  house_mom:      "/dashboard",
  door_staff:     "/door",
  room_attendant: "/rooms",
  backroom_tv:    "/backroom",
  bartender:      "/backroom",
  dj:             "/backroom",
};

interface RequireRoleProps {
  roles: AppRole[];
  children: ReactNode;
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but role not allowed → redirect to their home
  if (!role || !roles.includes(role as AppRole)) {
    const home = role ? (ROLE_HOME[role] ?? "/login") : "/login";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
