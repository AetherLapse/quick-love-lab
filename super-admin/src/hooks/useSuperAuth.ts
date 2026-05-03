import { useState, useEffect } from "react";
import { supabase, adminClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface SuperAuthState {
  user: User | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export function useSuperAuth(): SuperAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const verifySuperAdmin = async (email: string): Promise<boolean> => {
    const { data } = await adminClient
      .from("super_admins")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    return !!data;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const ok = await verifySuperAdmin(session.user.email!);
        setUser(ok ? session.user : null);
        setIsSuperAdmin(ok);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const ok = await verifySuperAdmin(session.user.email!);
        setUser(ok ? session.user : null);
        setIsSuperAdmin(ok);
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    const ok = await verifySuperAdmin(email);
    if (!ok) {
      await supabase.auth.signOut();
      return "Not a Super Admin";
    }

    await adminClient.from("super_admins").update({ last_login: new Date().toISOString() }).eq("email", email);
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsSuperAdmin(false);
  };

  return { user, isSuperAdmin, loading, signIn, signOut };
}
