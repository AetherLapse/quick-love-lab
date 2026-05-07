import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setClubId as setCachedClubId } from "@/lib/clubId";

type ResolveMethod = "domain" | "fallback";

interface ClubContextType {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  brandColor: string | null;
  resolved: ResolveMethod;
  loading: boolean;
}

const ClubContext = createContext<ClubContextType>({
  clubId: null, clubName: null, clubLogo: null, brandColor: null, resolved: "fallback", loading: true,
});

function applyBrandColor(hsl: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hsl);
  // Derive lighter variant for sidebar
  const parts = hsl.split(/\s+/);
  if (parts.length === 3) {
    const h = parts[0];
    const s = parts[1];
    root.style.setProperty("--sidebar-primary", `${h} ${s} 60%`);
  }
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string | null>(null);
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
      .select("id, name, logo_url, brand_color")
      .eq("domain", hostname)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data: club }: any) => {
        if (club) {
          setClubId(club.id);
          setClubName(club.name ?? null);
          setClubLogo(club.logo_url ?? null);
          setBrandColor(club.brand_color ?? null);
          setResolved("domain");
          setCachedClubId(club.id);
          if (club.brand_color) applyBrandColor(club.brand_color);
        }
        setLoading(false);
      });
  }, []);

  return (
    <ClubContext.Provider value={{ clubId, clubName, clubLogo, brandColor, resolved, loading }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  return useContext(ClubContext);
}
