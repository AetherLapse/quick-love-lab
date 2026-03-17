import { useState } from "react";
import { X, Home, Users, User, Settings, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useProfiles, useDancers, useClubSettings } from "@/hooks/useDashboardData";

export function SettingsTab() {
  const [drawerDancer, setDrawerDancer] = useState<string | null>(null);
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: dancers, isLoading: dancersLoading } = useDancers();
  const { data: settings, isLoading: settingsLoading } = useClubSettings();

  const staffMembers = (profiles ?? []).flatMap((p) => {
    const roles = (p.user_roles as { role: string }[] | null) ?? [];
    return roles
      .filter((r) => r.role !== "admin")
      .map((r) => ({ name: p.full_name, role: r.role, active: p.is_active }));
  });

  const selectedDancer = drawerDancer ? (dancers ?? []).find((d) => d.id === drawerDancer) : null;

  return (
    <div className="relative">
      <h2 className="font-heading text-3xl tracking-wide mb-6">Club Settings</h2>

      {/* Fee/Cost settings moved to /dev-dashboard notice */}
      <div className="glass-card p-5 mb-8 border border-primary/20 flex items-start gap-3">
        <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-foreground font-medium text-sm">Fee & Revenue Split Settings</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Revenue split percentages, house fees, and song pricing are managed by the platform administrator. Contact your administrator to request changes.
          </p>
        </div>
      </div>

      {/* Current Settings (read-only) */}
      {settingsLoading ? (
        <div className="glass-card p-6 mb-8 flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : settings && (
        <div className="glass-card p-6 mb-8">
          <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" /> Current Fee Schedule
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Song Price", value: `$${settings.song_price}` },
              { label: "Door Fee", value: `$${settings.default_door_fee}` },
              { label: "Dancer House Fee", value: `$${settings.default_dancer_entrance_fee}` },
              { label: "Dancer Payout %", value: `${settings.default_dancer_payout_pct}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-secondary/30 rounded-xl p-4 text-center">
                <p className="text-muted-foreground text-xs mb-1">{label}</p>
                <p className="font-heading text-2xl text-primary">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Staff Accounts */}
        <div className="glass-card p-6">
          <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Staff Accounts
          </h3>
          {profilesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : staffMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No staff members found.</p>
          ) : (
            <div className="space-y-3">
              {staffMembers.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30">
                  <div>
                    <span className="text-foreground text-sm font-medium">{s.name}</span>
                    <span className="text-muted-foreground text-xs ml-3 capitalize">{s.role.replace("_", " ")}</span>
                  </div>
                  <span className={`text-xs font-medium flex items-center gap-1 ${s.active ? "text-success" : "text-destructive"}`}>
                    <span className={`w-2 h-2 rounded-full ${s.active ? "bg-success" : "bg-destructive"}`} />
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => toast.info("Staff management coming in a future update.")}
            className="mt-4 w-full px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            + Add Staff Member
          </button>
        </div>

        {/* Performer Profiles */}
        <div className="glass-card p-6">
          <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Performer Profiles
          </h3>
          {dancersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (dancers ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No performers on file yet.</p>
          ) : (
            <div className="space-y-3">
              {(dancers ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium">{d.stage_name}</span>
                    <span className={`text-xs flex items-center gap-1 ${d.is_active ? "text-success" : "text-muted-foreground"}`}>
                      <span className={`w-2 h-2 rounded-full ${d.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    onClick={() => setDrawerDancer(d.id)}
                    className="px-3 py-1 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => toast.info("Performer onboarding coming in a future update.")}
            className="mt-4 w-full px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            + Add Performer
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> System
        </h3>
        <div className="space-y-2 text-sm">
          {[
            ["App Version", "2NYT v2.0"],
            ["Database", "Supabase (External)"],
            ["Face Recognition", "AWS Rekognition"],
            ["Encryption", "AES-256 + TLS 1.3"],
            ["Data Retention", "Hashed IDs only (customers)"],
            ["Last Backup", "Managed by Supabase"],
          ].map(([label, value], i) => (
            <div key={i} className="flex justify-between py-1 border-b border-border/20">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performer Detail Drawer */}
      {drawerDancer && selectedDancer && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => setDrawerDancer(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 overflow-y-auto animate-slide-in-right">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-3xl tracking-wide">{selectedDancer.stage_name}</h3>
                <button onClick={() => setDrawerDancer(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Employee ID</span><span className="text-foreground">{selectedDancer.employee_id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PIN</span><span className="text-foreground">••••</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payout %</span><span className="text-foreground">{selectedDancer.payout_percentage}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">House Fee</span><span className="text-foreground">${selectedDancer.entrance_fee}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facial Hash</span>
                  <span className={selectedDancer.facial_hash ? "text-success flex items-center gap-1" : "text-muted-foreground"}>
                    {selectedDancer.facial_hash ? (<><ShieldCheck className="w-3.5 h-3.5" /> Enrolled</>) : "Not enrolled"}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Live Status</span><span className="text-foreground capitalize">{(selectedDancer.live_status as string).replace("_", " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Popularity Score</span><span className="text-primary">{selectedDancer.popularity_score}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Onboarding</span><span className={selectedDancer.onboarding_complete ? "text-success" : "text-warning"}>{selectedDancer.onboarding_complete ? "Complete" : "Incomplete"}</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
