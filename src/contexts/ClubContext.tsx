import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClubContextType {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  loading: boolean;
}

const ClubContext = createContext<ClubContextType>({
  clubId: null, clubName: null, clubLogo: null, loading: true,
});

export function ClubProvider({ children }: { children: ReactNode }) {
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      // 1. Try domain-based resolution (works before login)
      const hostname = window.location.hostname;
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
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
          setLoading(false);
          return;
        }
      }

      // 2. Fall back to JWT (post-login)
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user?.app_metadata?.club_id as string | undefined;
      if (id) {
        setClubId(id);
        const { data: club } = await (supabase as any)
          .from("clubs")
          .select("id, name, logo_url")
          .eq("id", id)
          .maybeSingle();
        if (club) {
          setClubName(club.name ?? null);
          setClubLogo(club.logo_url ?? null);
        }
      }
      setLoading(false);
    };

    resolve();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user?.app_metadata?.club_id as string | undefined;
      if (id && !clubId) {
        setClubId(id);
        const { data: club } = await (supabase as any)
          .from("clubs")
          .select("id, name, logo_url")
          .eq("id", id)
          .maybeSingle();
        if (club) {
          setClubName(club.name ?? null);
          setClubLogo(club.logo_url ?? null);
        }
      } else if (!id) {
        setClubId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ClubContext.Provider value={{ clubId, clubName, clubLogo, loading }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  return useContext(ClubContext);
}
