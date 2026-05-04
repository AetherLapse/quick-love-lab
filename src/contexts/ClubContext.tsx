import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setClubId as setCachedClubId } from "@/lib/clubId";

type ResolveMethod = "domain" | "fallback";

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

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      setLoading(false);
      return;
    }

    (supabase as any)
      .from("clubs")
      .select("id, name, logo_url")
      .eq("domain", hostname)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data: club }: any) => {
        if (club) {
          setClubId(club.id);
          setClubName(club.name ?? null);
          setClubLogo(club.logo_url ?? null);
          setResolved("domain");
          setCachedClubId(club.id);
        }
        setLoading(false);
      });
  }, []);

  return (
    <ClubContext.Provider value={{ clubId, clubName, clubLogo, resolved, loading }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  return useContext(ClubContext);
}
