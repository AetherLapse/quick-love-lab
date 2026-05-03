import { useState, useEffect, useCallback } from "react";
import { useSuperAuth } from "@/hooks/useSuperAuth";
import { adminClient } from "@/lib/supabase";
import { CreateClubModal } from "@/components/CreateClubModal";
import { ClubActions } from "@/components/ClubActions";
import {
  Building2, Plus, LogOut, ShieldAlert, Globe, Users, Activity,
  Loader2, Search, CheckCircle2, XCircle, Pause,
} from "lucide-react";
import { toast } from "sonner";

interface Club {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  owner_email: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
}

interface ClubStats {
  clubId: string;
  dancerCount: number;
  staffCount: number;
}

export default function Dashboard() {
  const { user, signOut } = useSuperAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState<Record<string, ClubStats>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionClub, setActionClub] = useState<Club | null>(null);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    const { data } = await adminClient.from("clubs").select("*").order("created_at", { ascending: false });
    const clubList = (data ?? []) as Club[];
    setClubs(clubList);

    const statsMap: Record<string, ClubStats> = {};
    for (const c of clubList) {
      const [{ count: dancerCount }, { count: staffCount }] = await Promise.all([
        adminClient.from("dancers").select("id", { count: "exact", head: true }).eq("club_id", c.id),
        adminClient.from("profiles").select("user_id", { count: "exact", head: true }).eq("club_id", c.id),
      ]);
      statsMap[c.id] = { clubId: c.id, dancerCount: dancerCount ?? 0, staffCount: staffCount ?? 0 };
    }
    setStats(statsMap);
    setLoading(false);
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.domain ?? "").toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = (status: string) => {
    if (status === "active") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (status === "suspended") return <Pause className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const statusColor = (status: string) => {
    if (status === "active") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (status === "suspended") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">2NYT Super Admin</p>
            <p className="text-gray-500 text-xs">{user?.email}</p>
          </div>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Title + Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Club Management</h1>
            <p className="text-gray-400 text-sm mt-0.5">{clubs.length} club{clubs.length !== 1 ? "s" : ""} on platform</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Create Club
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clubs by name, domain, or slug…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 text-sm"
          />
        </div>

        {/* Club Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading clubs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">{search ? "No clubs match your search" : "No clubs yet — create one to get started"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(club => {
              const s = stats[club.id];
              return (
                <div
                  key={club.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all cursor-pointer"
                  onClick={() => setActionClub(club)}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-4">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-brand-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-base truncate">{club.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Globe className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-400 truncate">{club.domain ?? club.slug}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${statusColor(club.status)}`}>
                      {club.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{s?.staffCount ?? 0} staff</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{s?.dancerCount ?? 0} dancers</span>
                    </div>
                    <span className="ml-auto text-gray-600">
                      {new Date(club.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Club Modal */}
      {showCreate && (
        <CreateClubModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadClubs(); toast.success("Club created"); }}
        />
      )}

      {/* Club Actions Modal */}
      {actionClub && (
        <ClubActions
          club={actionClub}
          onClose={() => setActionClub(null)}
          onUpdated={() => { setActionClub(null); loadClubs(); }}
        />
      )}
    </div>
  );
}
