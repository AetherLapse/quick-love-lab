import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_MS   = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [role,    setRole]    = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const signOut = async () => {
    clearTimer();
    // Record clock-out for any open staff attendance record today
    if (user) {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (profile) {
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("staff_attendance")
          .update({ clock_out: new Date().toISOString() })
          .eq("profile_id", profile.id)
          .eq("shift_date", today)
          .is("clock_out", null);
      }
    }
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = setTimeout(signOut, INACTIVITY_MS);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // Inactivity listeners — attach/detach when login state changes
  useEffect(() => {
    if (!user) { clearTimer(); return; }
    startTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, startTimer, { passive: true }));
    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, startTimer));
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth state — init + subscribe
  useEffect(() => {
    // Restore existing session on mount — await role before clearing loading
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", session.user.id).maybeSingle();
        setRole(data?.role ?? null);
      }
      setLoading(false);
    });

    // React to future login / logout / token-refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        setLoading(false);
        return;
      }
      // Hold loading=true until the role is resolved so RequireRole never
      // sees a logged-in user with role=null and bounces them to /login.
      setLoading(true);
      supabase.from("user_roles").select("role")
        .eq("user_id", nextUser.id).maybeSingle()
        .then(({ data }) => {
          setRole(data?.role ?? null);
          setLoading(false);
        });
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
