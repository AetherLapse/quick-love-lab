import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function getSessionToken(): string {
  let token = localStorage.getItem("kiosk-session-token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("kiosk-session-token", token);
  }
  return token;
}

export function useKioskHeartbeat() {
  const { user, role } = useAuth();
  const location = useLocation();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!user) return;

    const token = getSessionToken();

    const ping = async () => {
      const { data } = await (supabase as any)
        .from("kiosk_sessions")
        .upsert(
          {
            session_token: token,
            user_id: user.id,
            role,
            path: location.pathname,
            user_agent: navigator.userAgent,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "session_token" }
        )
        .select("status")
        .single();

      if (data) setIsLocked(data.status === "locked");
    };

    ping();
    const id = setInterval(ping, 15_000);
    return () => clearInterval(id);
  }, [user, role, location.pathname]);

  return { isLocked };
}
