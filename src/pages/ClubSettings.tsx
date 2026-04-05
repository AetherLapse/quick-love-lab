import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Settings, Save, UserPlus, Users, ChevronDown,
  Loader2, X, Eye, EyeOff, Check, ShieldCheck, Mic2,
  ToggleLeft, ToggleRight, ArrowLeft, ArrowRight,
} from "lucide-react";

type AppRole = "owner" | "admin" | "manager" | "door_staff" | "room_attendant" | "house_mom";
const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner", admin: "Admin", manager: "Manager",
  door_staff: "Door Staff", room_attendant: "Room Attendant", house_mom: "House Mom",
};

interface Dancer {
  id: string; stage_name: string; employee_id: string;
  pin_code: string; payout_percentage: number; entrance_fee: number;
  is_active: boolean; dancer_number: number | null;
}
interface StaffMember {
  user_id: string; full_name: string; is_active: boolean; role: AppRole | null;
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 px-6 pt-5">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1 flex-1">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-colors
            ${i < current ? "bg-primary text-white" : i === current ? "bg-primary text-white ring-4 ring-primary/20" : "bg-secondary text-muted-foreground"}`}>
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span className={`text-xs hidden sm:inline truncate ${i === current ? "text-primary font-semibold" : "text-muted-foreground"}`}>{label}</span>
          {i < steps.length - 1 && <div className={`flex-1 h-px mx-1 ${i < current ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ icon, title, subtitle, action, children }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <span className="text-primary">{icon}</span>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Add Dancer modal (3 steps) ───────────────────────────────────────────────
function AddDancerModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep]             = useState(0);
  const [stageName, setStageName]   = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin]               = useState("");
  const [showPin, setShowPin]       = useState(false);
  const [payoutPct, setPayoutPct]   = useState("30");
  const [entranceFee, setEntranceFee] = useState("50");
  const [saving, setSaving]         = useState(false);

  const reset = () => {
    setStep(0); setStageName(""); setEmployeeId(""); setPin("");
    setPayoutPct("30"); setEntranceFee("50"); setShowPin(false);
  };

  const close = () => { reset(); onClose(); };

  const next = () => {
    if (step === 0) {
      if (!stageName.trim()) { toast.error("Stage name is required"); return; }
      if (!employeeId.trim()) { toast.error("Employee ID is required"); return; }
    }
    if (step === 1 && pin.length < 4) { toast.error("PIN must be 4–6 digits"); return; }
    setStep(s => s + 1);
  };

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("dancers").insert({
      stage_name: stageName.trim(), employee_id: employeeId.trim(),
      pin_code: pin, payout_percentage: parseFloat(payoutPct),
      entrance_fee: parseFloat(entranceFee), is_active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Dancer "${stageName}" added!`);
    reset(); onSuccess(); onClose();
  };

  const STEPS = ["Basic Info", "Security", "Financial"];

  return (
    <Modal open={open} onClose={close} title="Add New Dancer">
      <StepBar steps={STEPS} current={step} />

      <div className="px-6 py-5 space-y-4 min-h-[200px]">
        {step === 0 && (
          <>
            <div className="space-y-1.5">
              <Label>Stage Name <span className="text-destructive">*</span></Label>
              <Input autoFocus value={stageName} onChange={e => setStageName(e.target.value)}
                placeholder="e.g. Crystal" onKeyDown={e => e.key === "Enter" && next()} />
            </div>
            <div className="space-y-1.5">
              <Label>Employee ID <span className="text-destructive">*</span></Label>
              <Input value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-001" onKeyDown={e => e.key === "Enter" && next()} />
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-1.5">
            <Label>PIN Code <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground font-normal">(4–6 digits)</span></Label>
            <div className="relative">
              <Input autoFocus type={showPin ? "text" : "password"} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter PIN" className="pr-10 text-center text-xl tracking-[0.5em]"
                onKeyDown={e => e.key === "Enter" && next()} />
              <button type="button" onClick={() => setShowPin(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">This PIN is used for dancer check-in at the door.</p>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="space-y-1.5">
              <Label>Entrance Fee ($)</Label>
              <Input type="number" autoFocus value={entranceFee} onChange={e => setEntranceFee(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payout Percentage (%)</Label>
              <Input type="number" value={payoutPct} onChange={e => setPayoutPct(e.target.value)} min={0} max={100} />
            </div>
            {/* Review summary */}
            <div className="mt-2 rounded-xl bg-secondary/50 border border-border p-4 space-y-1.5 text-sm">
              <p className="font-semibold text-foreground mb-2">Review</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Stage Name</span><span className="font-medium">{stageName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Employee ID</span><span className="font-medium">{employeeId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">PIN</span><span className="font-medium">{"•".repeat(pin.length)}</span></div>
            </div>
          </>
        )}
      </div>

      <div className="px-6 pb-5 flex gap-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <div className="flex-1" />
        {step < 2 ? (
          <Button onClick={next} className="gap-1.5">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Add Dancer
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ─── Add Staff modal (3 steps) ────────────────────────────────────────────────
function AddStaffModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep]         = useState(0);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [role, setRole]         = useState<AppRole>("door_staff");
  const [saving, setSaving]     = useState(false);

  const reset = () => { setStep(0); setName(""); setEmail(""); setPassword(""); setRole("door_staff"); };
  const close = () => { reset(); onClose(); };

  const next = () => {
    if (step === 0) {
      if (!name.trim()) { toast.error("Name is required"); return; }
      if (!email.trim() || !email.includes("@")) { toast.error("Valid email is required"); return; }
    }
    if (step === 1 && password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setStep(s => s + 1);
  };

  const submit = async () => {
    setSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name.trim() } },
    });
    if (error || !data.user) {
      setSaving(false); toast.error(error?.message ?? "Account creation failed"); return;
    }
    const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: data.user.id, role });
    setSaving(false);
    if (roleErr) { toast.error(roleErr.message); return; }
    toast.success(`Staff account created for ${name}`);
    reset(); onSuccess(); onClose();
  };

  const STEPS = ["Identity", "Password", "Role"];

  return (
    <Modal open={open} onClose={close} title="Add Staff Account">
      <StepBar steps={STEPS} current={step} />

      <div className="px-6 py-5 space-y-4 min-h-[200px]">
        {step === 0 && (
          <>
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input autoFocus value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. John Smith" onKeyDown={e => e.key === "Enter" && next()} />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="staff@2nyt.com" onKeyDown={e => e.key === "Enter" && next()} />
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-1.5">
            <Label>Password <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input autoFocus type={showPwd ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
                className="pr-10" onKeyDown={e => e.key === "Enter" && next()} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Staff will use this to log in. Share it securely.</p>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>Assign Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ROLE_LABELS) as AppRole[]).map(r => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left
                      ${role === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-foreground"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
                      ${role === r ? "border-primary" : "border-muted-foreground"}`}>
                      {role === r && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-secondary/50 border border-border p-4 space-y-1.5 text-sm">
              <p className="font-semibold text-foreground mb-2">Review</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium text-primary">{ROLE_LABELS[role]}</span></div>
            </div>
          </>
        )}
      </div>

      <div className="px-6 pb-5 flex gap-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <div className="flex-1" />
        {step < 2 ? (
          <Button onClick={next} className="gap-1.5">Next <ArrowRight className="w-4 h-4" /></Button>
        ) : (
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Account
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ─── Dancers panel ────────────────────────────────────────────────────────────
function DancersPanel() {
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("dancers").select("*").order("stage_name");
    setDancers((data as unknown as Dancer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("dancers").update({ is_active: !current }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(current ? "Dancer deactivated" : "Dancer activated");
    load();
  };

  return (
    <>
      <AddDancerModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={load} />
      <Section
        icon={<Mic2 className="w-5 h-5" />}
        title="Dancers"
        subtitle={`${dancers.filter(d => d.is_active).length} active on roster`}
        action={
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 text-xs">
            <UserPlus className="w-3.5 h-3.5" /> Add Dancer
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading dancers…
          </div>
        ) : dancers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No dancers on roster yet.</p>
        ) : (
          <div className="space-y-2">
            {dancers.map(d => (
              <div key={d.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
                  ${d.is_active ? "border-border bg-white" : "border-border/40 bg-secondary/20 opacity-60"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                  ${d.is_active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {d.stage_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{d.stage_name}</p>
                    {d.dancer_number != null && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        D{String(d.dancer_number).padStart(3, "0")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.employee_id} · {d.payout_percentage}% payout · ${d.entrance_fee} fee</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${d.is_active ? "bg-green-50 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                  {d.is_active ? "Active" : "Off"}
                </span>
                <button onClick={() => toggleActive(d.id, d.is_active)}
                  title={d.is_active ? "Deactivate" : "Activate"}
                  className="text-muted-foreground hover:text-primary transition-colors">
                  {d.is_active
                    ? <ToggleRight className="w-5 h-5 text-primary" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

// ─── Staff panel ──────────────────────────────────────────────────────────────
function StaffPanel() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, is_active");
    const { data: roles }    = await supabase.from("user_roles").select("user_id, role");
    const merged: StaffMember[] = (profiles ?? []).map(p => ({
      user_id: p.user_id, full_name: p.full_name, is_active: p.is_active,
      role: (roles ?? []).find(r => r.user_id === p.user_id)?.role as AppRole | null ?? null,
    }));
    setStaff(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId: string, role: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    load();
  };

  const toggleActive = async (userId: string, current: boolean) => {
    // Optimistic update
    setStaff(prev => prev.map(s => s.user_id === userId ? { ...s, is_active: !current } : s));
    const { error, count } = await supabase
      .from("profiles")
      .update({ is_active: !current })
      .eq("user_id", userId)
      .select("*", { count: "exact", head: true });
    if (error || count === 0) {
      // Revert on failure
      setStaff(prev => prev.map(s => s.user_id === userId ? { ...s, is_active: current } : s));
      toast.error(error?.message ?? "Update failed — check permissions");
      return;
    }
    toast.success(current ? "Staff deactivated" : "Staff activated");
  };

  return (
    <>
      <AddStaffModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={load} />
      <Section
        icon={<Users className="w-5 h-5" />}
        title="Staff Management"
        subtitle={`${staff.filter(s => s.is_active).length} active staff`}
        action={
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 text-xs">
            <UserPlus className="w-3.5 h-3.5" /> Add Staff
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading staff…
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No staff accounts yet.</p>
        ) : (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.user_id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
                  ${s.is_active ? "border-border bg-white" : "border-border/40 bg-secondary/20 opacity-60"}`}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.is_active ? "Active" : "Inactive"}</p>
                </div>
                <div className="relative">
                  <select value={s.role ?? ""}
                    onChange={e => handleRoleChange(s.user_id, e.target.value as AppRole)}
                    className="appearance-none text-xs font-medium border border-border rounded-lg px-3 py-1.5 pr-6 bg-secondary/50 text-foreground focus:outline-none focus:border-primary cursor-pointer">
                    <option value="" disabled>No role</option>
                    {(Object.keys(ROLE_LABELS) as AppRole[]).map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
                <button onClick={() => toggleActive(s.user_id, s.is_active)}
                  title={s.is_active ? "Deactivate" : "Activate"}
                  className="text-muted-foreground hover:text-primary transition-colors">
                  {s.is_active
                    ? <ToggleRight className="w-5 h-5 text-primary" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

// ─── Club settings panel ──────────────────────────────────────────────────────
function ClubSettingsPanel() {
  const [songPrice, setSongPrice]     = useState("50");
  const [doorFee, setDoorFee]         = useState("20");
  const [dancerFee, setDancerFee]     = useState("50");
  const [payoutPct, setPayoutPct]     = useState("30");
  const [settingsId, setSettingsId]   = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    supabase.from("club_settings").select("*").single().then(({ data }) => {
      if (!data) return;
      setSettingsId(data.id);
      setSongPrice(String(data.song_price));
      setDoorFee(String(data.default_door_fee));
      setDancerFee(String(data.default_dancer_entrance_fee));
      setPayoutPct(String(data.default_dancer_payout_pct));
    });
  }, []);

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase.from("club_settings").update({
      song_price: parseFloat(songPrice), default_door_fee: parseFloat(doorFee),
      default_dancer_entrance_fee: parseFloat(dancerFee), default_dancer_payout_pct: parseFloat(payoutPct),
    }).eq("id", settingsId);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  return (
    <Section icon={<Settings className="w-5 h-5" />} title="Club Settings" subtitle="Configure pricing and payout percentages">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Song Price ($)",           val: songPrice,  set: setSongPrice },
          { label: "Customer Door Fee ($)",     val: doorFee,    set: setDoorFee },
          { label: "Dancer Entrance Fee ($)",   val: dancerFee,  set: setDancerFee },
          { label: "Default Dancer Payout (%)", val: payoutPct,  set: setPayoutPct },
        ].map(({ label, val, set }) => (
          <div key={label} className="space-y-1.5">
            <Label>{label}</Label>
            <Input type="number" value={val} onChange={e => set(e.target.value)} className="bg-secondary/50" />
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full mt-5">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClubSettings() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> Settings
          </h1>
          <p className="text-muted-foreground text-sm">Manage club configuration, dancers, and staff</p>
        </div>
        <ClubSettingsPanel />
        <DancersPanel />
        <StaffPanel />
      </div>
    </AppLayout>
  );
}
