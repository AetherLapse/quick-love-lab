import { useState } from "react";
import { X, DollarSign, Home, Users, User, Settings, ShieldCheck, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { periodData, staffMembers, dancerSessions } from "./mockData";
import { Slider } from "@/components/ui/slider";

const dancers = periodData.today.dancers!;

function EditableField({ label, value, prefix = "" }: { label: string; value: string | number; prefix?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));

  const handleSave = () => {
    setEditing(false);
    toast.success(`${label} updated to ${prefix}${val}`);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="text"
              value={val}
              onChange={e => setVal(e.target.value)}
              className="w-20 px-2 py-1 text-sm rounded-lg bg-background border border-border text-foreground text-right"
              autoFocus
            />
            <button onClick={handleSave} className="px-2 py-1 rounded-lg text-xs bg-primary text-primary-foreground">Save</button>
            <button onClick={() => { setEditing(false); setVal(String(value)); }} className="px-2 py-1 rounded-lg text-xs border border-border text-muted-foreground">Cancel</button>
          </>
        ) : (
          <>
            <span className="text-foreground font-medium text-sm">{prefix}{val}</span>
            <button onClick={() => setEditing(true)} className="px-2 py-1 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">Edit</button>
          </>
        )}
      </div>
    </div>
  );
}

export function SettingsTab() {
  const [housePct, setHousePct] = useState(70);
  const [drawerDancer, setDrawerDancer] = useState<string | null>(null);

  const selectedDancer = drawerDancer ? dancers.find(d => d.name === drawerDancer) : null;

  return (
    <div className="relative">
      <h2 className="font-heading text-3xl tracking-wide mb-6">Club Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Section 1 — Split Config */}
        <div className="glass-card p-6">
          <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Revenue Split Settings
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">House Cut</span>
              <span className="text-primary font-heading text-lg">{housePct}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dancer Cut</span>
              <span className="text-foreground font-heading text-lg">{100 - housePct}%</span>
            </div>
            <Slider
              value={[housePct]}
              onValueChange={([v]) => setHousePct(v)}
              min={50}
              max={90}
              step={5}
              className="my-4"
            />
            <div className="flex rounded-lg overflow-hidden h-4">
              <div className="bg-primary transition-all" style={{ width: `${housePct}%` }} />
              <div className="bg-muted-foreground/30 transition-all" style={{ width: `${100 - housePct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Changes apply to all future sessions. Past sessions unaffected.
            </p>
          </div>
        </div>

        {/* Section 2 — Fee Config */}
        <div className="glass-card p-6">
          <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" /> House Fee Settings
          </h3>
          <div className="space-y-1">
            <EditableField label="Dancer Daily House Fee" value={50} prefix="$" />
            <EditableField label="Customer Door Fee" value={20} prefix="$" />
            <div className="border-t border-border/50 mt-3 pt-3">
              <p className="text-muted-foreground text-xs mb-2">Package Pricing</p>
              <EditableField label="1 Song" value={50} prefix="$" />
              <EditableField label="2 Songs" value={100} prefix="$" />
              <EditableField label="3 Songs" value={150} prefix="$" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Section 3 — Role Management */}
        <div className="glass-card p-6">
          <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Staff Accounts
          </h3>
          <div className="space-y-3">
            {staffMembers.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30">
                <div>
                  <span className="text-foreground text-sm font-medium">{s.name}</span>
                  <span className="text-muted-foreground text-xs ml-3">{s.role}</span>
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${s.active ? "text-success" : "text-destructive"}`}>
                  <span className={`w-2 h-2 rounded-full ${s.active ? "bg-success" : "bg-destructive"}`} />
                  {s.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => toast.success("Demo mode — staff management coming soon")} className="mt-4 w-full px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
            + Add Staff Member
          </button>
        </div>

        {/* Section 4 — Performer Roster */}
        <div className="glass-card p-6">
          <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Performer Profiles
          </h3>
          <div className="space-y-3">
            {dancers.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-medium">{d.name}</span>
                  <span className={`text-xs flex items-center gap-1 ${d.active ? "text-success" : "text-muted-foreground"}`}>
                    <span className={`w-2 h-2 rounded-full ${d.active ? "bg-success" : "bg-muted-foreground"}`} />
                    {d.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <button
                  onClick={() => setDrawerDancer(d.name)}
                  className="px-3 py-1 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                >
                  View
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => toast.success("Demo mode — performer management coming soon")} className="mt-4 w-full px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
            + Add Performer
          </button>
        </div>
      </div>

      {/* Section 5 — System Info */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-heading text-xl tracking-wide mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> System
        </h3>
        <div className="space-y-2 text-sm">
          {[
            ["App Version", "2nyt v1.0 MVP"],
            ["Database", "Lovable Cloud"],
            ["Face Recognition", "AWS Rekognition"],
            ["Encryption", "AES-256 + TLS 1.3"],
            ["Data Retention", "Hashed IDs only"],
            ["Last Backup", "Today, 6:00 PM"],
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
                <h3 className="font-heading text-3xl tracking-wide">{selectedDancer.name}</h3>
                <button onClick={() => setDrawerDancer(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Dancer ID</span><span className="text-foreground">{selectedDancer.name.split(" ")[1]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PIN</span><span className="text-foreground">••••</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payout %</span><span className="text-foreground">30%</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facial Hash</span>
                  <span className="text-success flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Face Enrolled
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Sessions (All-Time)</span><span className="text-foreground">{selectedDancer.sessions * 12}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Earned (All-Time)</span><span className="text-primary">${(selectedDancer.gross * 12).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
