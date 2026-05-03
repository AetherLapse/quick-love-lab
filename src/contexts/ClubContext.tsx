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
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user?.app_metadata?.club_id as string | undefined;
      if (id) {
        setClubId(id);
        const { data: club } = await supabase
          .from("clubs")
          .select("name, logo_url")
          .eq("id", id)
          .single();
        if (club) {
          setClubName((club as any).name ?? null);
          setClubLogo((club as any).logo_url ?? null);
        }
      }
      setLoading(false);
    };

    resolve();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.app_metadata?.club_id as string | undefined;
      setClubId(id ?? null);
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
