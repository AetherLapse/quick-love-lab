/**
 * Three Settings panels:
 *  1. Code Creation  — generate a named code → QR download
 *  2. Vendor Manager — CRUD for vendors + code assignment
 *  3. Usage Tracking — redemption table with vendor/tier/date
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  QrCode, Plus, Download, Trash2, ToggleLeft, ToggleRight,
  Loader2, ChevronDown, Users, BarChart3, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EntryTier { id: string; name: string; price: number; }
interface Vendor    { id: string; name: string; contact_name: string | null; phone: string | null; commission_rate: number; is_active: boolean; }
interface PromoCode {
  id: string; code: string; label: string | null;
  entry_tier_id: string | null; vendor_id: string | null;
  max_uses: number; use_count: number; is_active: boolean; created_at: string;
  entry_tiers?: { name: string; price: number } | null;
  vendors?: { name: string } | null;
}

// ── Section shell ─────────────────────────────────────────────────────────────
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

// ── QR Download helper ────────────────────────────────────────────────────────
async function downloadQR(code: string, label: string) {
  const dataUrl = await QRCode.toDataURL(code, { width: 400, margin: 2, color: { dark: "#1a0a14", light: "#ffffff" } });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${label || code}.png`;
  a.click();
}

// ─── Code Creation Panel ──────────────────────────────────────────────────────
export function CodeCreationPanel() {
  const [tiers, setTiers]       = useState<EntryTier[]>([]);
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [codes, setCodes]       = useState<PromoCode[]>([]);
  const [loading, setLoading]   = useState(true);

  // Form state
  const [code, setCode]         = useState("");
  const [label, setLabel]       = useState("");
  const [tierId, setTierId]     = useState("");
  const [vendorId, setVendorId] = useState("");
  const [maxUses, setMaxUses]   = useState("1");
  const [saving, setSaving]     = useState(false);

  // Preview QR
  const [preview, setPreview]   = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const sb = supabase as any;
    const [t, v, c] = await Promise.all([
      sb.from("entry_tiers").select("id, name, price").eq("is_active", true).order("price"),
      sb.from("vendors").select("id, name, contact_name, phone, commission_rate, is_active").eq("is_active", true),
      sb.from("promo_codes").select("*, entry_tiers(name, price), vendors(name)").order("created_at", { ascending: false }),
    ]);
    setTiers((t.data ?? []) as EntryTier[]);
    setVendors((v.data ?? []) as Vendor[]);
    setCodes((c.data ?? []) as PromoCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!code.trim()) { setPreview(""); return; }
    QRCode.toDataURL(code.trim(), { width: 160, margin: 1 }).then(setPreview).catch(() => {});
  }, [code]);

  const handleCreate = async () => {
    if (!code.trim()) { toast.error("Code string is required"); return; }
    if (!tierId)      { toast.error("Select an entry tier"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("promo_codes").insert({
      code: code.trim().toUpperCase(),
      label: label.trim() || null,
      entry_tier_id: tierId,
      vendor_id: vendorId || null,
      max_uses: parseInt(maxUses) || 1,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Code "${code.toUpperCase()}" created`);
    setCode(""); setLabel(""); setVendorId(""); setMaxUses("1");
    load();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await (supabase as any).from("promo_codes").update({ is_active: !current }).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("promo_codes").delete().eq("id", id);
    load();
  };

  return (
    <Section icon={<QrCode className="w-5 h-5" />} title="Code Creation" subtitle="Generate scannable QR codes linked to entry tiers">
      {/* Create form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Code String <span className="text-destructive">*</span></Label>
            <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CCCFREE" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Display Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. CCC Free Pass" />
          </div>
          <div className="space-y-1.5">
            <Label>Entry Tier <span className="text-destructive">*</span></Label>
            <div className="relative">
              <select value={tierId} onChange={e => setTierId(e.target.value)}
                className="w-full appearance-none border border-border rounded-lg px-3 py-2 pr-8 text-sm bg-secondary/50 focus:outline-none focus:border-primary">
                <option value="">— Select tier —</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.name} (${t.price})</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign to Vendor</Label>
            <div className="relative">
              <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                className="w-full appearance-none border border-border rounded-lg px-3 py-2 pr-8 text-sm bg-secondary/50 focus:outline-none focus:border-primary">
                <option value="">— None —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Max Uses <span className="text-xs text-muted-foreground font-normal">(0 = unlimited)</span></Label>
            <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} min={0} />
          </div>
          {/* QR preview */}
          <div className="flex items-center justify-center">
            {preview
              ? <img src={preview} alt="QR preview" className="w-20 h-20 rounded-lg border border-border" />
              : <div className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <QrCode className="w-7 h-7" />
                </div>}
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving} className="w-full gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Code & Generate QR
        </Button>
      </div>

      {/* Existing codes */}
      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">All Codes</p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No codes yet.</p>
        ) : codes.map(c => (
          <div key={c.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-colors
            ${c.is_active ? "border-border bg-white" : "border-border/40 bg-secondary/20 opacity-60"}`}>
            <span className="font-mono font-bold text-foreground text-xs bg-secondary px-2 py-1 rounded">{c.code}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{c.label || c.entry_tiers?.name || "—"}</p>
              <p className="text-[10px] text-muted-foreground">
                {c.entry_tiers?.name} · {c.vendors?.name ?? "No vendor"} · {c.use_count}/{c.max_uses === 0 ? "∞" : c.max_uses} uses
              </p>
            </div>
            <button onClick={() => downloadQR(c.code, c.label || c.code)}
              title="Download QR" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleToggle(c.id, c.is_active)} className="text-muted-foreground hover:text-primary transition-colors">
              {c.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button onClick={() => handleDelete(c.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Vendor Manager Panel ─────────────────────────────────────────────────────
export function VendorPanel() {
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<Vendor | null>(null);

  // Form
  const [name, setName]         = useState("");
  const [contact, setContact]   = useState("");
  const [phone, setPhone]       = useState("");
  const [commission, setCommission] = useState("0");
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("vendors").select("*").order("name");
    setVendors((data ?? []) as Vendor[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setName(""); setContact(""); setPhone(""); setCommission("0"); setModalOpen(true); };
  const openEdit = (v: Vendor) => { setEditing(v); setName(v.name); setContact(v.contact_name ?? ""); setPhone(v.phone ?? ""); setCommission(String(v.commission_rate)); setModalOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    const payload = { name: name.trim(), contact_name: contact.trim() || null, phone: phone.trim() || null, commission_rate: parseFloat(commission) || 0 };
    const { error } = editing
      ? await (supabase as any).from("vendors").update(payload).eq("id", editing.id)
      : await (supabase as any).from("vendors").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Vendor updated" : "Vendor added");
    setModalOpen(false); load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from("vendors").update({ is_active: !current }).eq("id", id);
    load();
  };

  return (
    <>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Vendor" : "Add Vendor"}>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5"><Label>Vendor Name <span className="text-destructive">*</span></Label><Input autoFocus value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Contact Person</Label><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="e.g. Mike Johnson" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-0100" /></div>
            <div className="space-y-1.5"><Label>Commission %</Label><Input type="number" value={commission} onChange={e => setCommission(e.target.value)} min={0} max={100} /></div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editing ? "Save Changes" : "Add Vendor"}
          </Button>
        </div>
      </Modal>

      <Section
        icon={<Users className="w-5 h-5" />}
        title="Vendor Management"
        subtitle="Track who distributes your promo cards"
        action={<Button size="sm" onClick={openAdd} className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Add Vendor</Button>}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No vendors yet.</p>
        ) : vendors.map(v => (
          <div key={v.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-2 transition-colors
            ${v.is_active ? "border-border bg-white" : "border-border/40 bg-secondary/20 opacity-60"}`}>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {v.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{v.name}</p>
              <p className="text-xs text-muted-foreground">{v.contact_name ?? ""}{v.phone ? ` · ${v.phone}` : ""} · {v.commission_rate}% commission</p>
            </div>
            <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors text-xs font-medium px-3 py-1.5 border border-border rounded-lg">Edit</button>
            <button onClick={() => toggleActive(v.id, v.is_active)} className="text-muted-foreground hover:text-primary transition-colors">
              {v.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
          </div>
        ))}
      </Section>
    </>
  );
}

// ─── Usage Tracking Panel ─────────────────────────────────────────────────────
export function UsageTrackingPanel() {
  const [rows, setRows] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "used" | "unused">("all");

  useEffect(() => {
    setLoading(true);
    (supabase as any).from("promo_codes")
      .select("*, entry_tiers(name, price), vendors(name)")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: PromoCode[] }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => {
    if (filter === "used")   return r.use_count > 0;
    if (filter === "unused") return r.use_count === 0;
    return true;
  });

  const totalRedemptions = rows.reduce((s, r) => s + r.use_count, 0);

  return (
    <Section icon={<BarChart3 className="w-5 h-5" />} title="Usage Tracking" subtitle={`${totalRedemptions} total redemptions across ${rows.length} codes`}>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {(["all", "used", "unused"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors
              ${filter === f ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
                <th className="pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier</th>
                <th className="pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</th>
                <th className="pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Uses</th>
                <th className="pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No codes match this filter.</td></tr>
              ) : filtered.map(r => {
                const exhausted = r.max_uses > 0 && r.use_count >= r.max_uses;
                return (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4">
                      <span className="font-mono font-bold text-xs bg-secondary px-2 py-0.5 rounded">{r.code}</span>
                      {r.label && <span className="ml-2 text-muted-foreground text-xs">{r.label}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">{r.entry_tiers?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">{r.vendors?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-center">
                      <span className={`text-xs font-semibold ${r.use_count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {r.use_count} / {r.max_uses === 0 ? "∞" : r.max_uses}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${exhausted ? "bg-red-50 text-red-600" : r.is_active ? "bg-green-50 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                        {exhausted ? "Exhausted" : r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
