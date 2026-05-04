import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type ResolveMethod = "domain" | "jwt" | "fallback";

interface ClubContextType {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  resolved: ResolveMethod;
  loading: boolean;
}

const ClubContext = createContext<ClubContextType>({
  clubId: null, clubName: null, clubLogo: null, resolved: "fallback", loading: true,
});

export function ClubProvider({ children }: { children: ReactNode }) {
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolveMethod>("fallback");
  const [loading, setLoading] = useState(true);

  // Domain-based resolution (runs once on mount, no auth needed)
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      setLoading(false);
      return;
    }

    (async () => {
      const { data: club } = await (supabase as any)
        .from("clubs")
        .select("id, name, logo_url")
        .eq("domain", hostname)
        .eq("status", "active")
        .maybeSingle();

      if (club) {
        setClubId(club.id);
        setClubName(club.name ?? null);
        setClubLogo(club.logo_url ?? null);
        setResolved("domain");
      }
      setLoading(false);
    })();
  }, []);

  // JWT-based resolution (fires when user logs in/out — no getSession() race)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user?.app_metadata?.club_id as string | undefined;
      if (id && !clubId) {
        setClubId(id);
        setResolved("jwt");
        const { data: club } = await (supabase as any)
          .from("clubs")
          .select("id, name, logo_url")
          .eq("id", id)
          .maybeSingle();
        if (club) {
          setClubName(club.name ?? null);
          setClubLogo(club.logo_url ?? null);
        }
      } else if (!session) {
        if (resolved !== "domain") {
          setClubId(null);
          setClubName(null);
          setClubLogo(null);
          setResolved("fallback");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [clubId, resolved]);

  return (
    <ClubContext.Provider value={{ clubId, clubName, clubLogo, resolved, loading }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  return useContext(ClubContext);
}
