import { useState, useEffect, useCallback } from "react";
import { adminClient } from "@/lib/supabase";
import {
  X, Plus, Trash2, Save, Loader2, DollarSign, Clock, BedDouble, Settings2,
  GripVertical, Pencil,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  clubId: string;
  clubName: string;
  onClose: () => void;
}

// ── Dance Tiers ──────────────────────────────────────────────────────────────

interface Tier {
  id: string;
  name: string;
  price: number;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
}

function DanceTiersPanel({ clubId }: { clubId: string }) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", duration: "", is_active: true });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await adminClient.from("dance_tiers").select("*").eq("club_id", clubId).order("sort_order");
    setTiers((data ?? []) as Tier[]);
    setLoading(false);
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      duration_minutes: form.duration ? parseInt(form.duration) : null,
      is_active: form.is_active,
      club_id: clubId,
    };

    if (editId) {
      await adminClient.from("dance_tiers").update(payload).eq("id", editId);
      toast.success("Tier updated");
    } else {
      const maxOrder = tiers.reduce((m, t) => Math.max(m, t.sort_order), 0);
      await adminClient.from("dance_tiers").insert({ ...payload, sort_order: maxOrder + 1 });
      toast.success("Tier added");
    }
    setSaving(false);
    setEditId(null);
    setAdding(false);
    setForm({ name: "", price: "", duration: "", is_active: true });
    load();
  };

  const handleDelete = async (id: string) => {
    await adminClient.from("dance_tiers").delete().eq("id", id);
    toast.success("Tier deleted");
    load();
  };

  const startEdit = (t: Tier) => {
    setEditId(t.id);
    setAdding(true);
    setForm({ name: t.name, price: String(t.price), duration: t.duration_minutes ? String(t.duration_minutes) : "", is_active: t.is_active });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-brand-500" /> Dance Packages
        </h3>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null); setForm({ name: "", price: "", duration: "", is_active: true }); }}
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors">
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-1.5">
          {tiers.map(t => (
            <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${t.is_active ? "border-gray-700 bg-gray-800/50" : "border-gray-800 bg-gray-900/50 opacity-50"}`}>
              <span className="text-sm font-semibold text-white flex-1">{t.name}</span>
              <span className="text-sm text-brand-400 font-mono">${t.price}</span>
              {t.duration_minutes && <span className="text-xs text-gray-500">{t.duration_minutes}min</span>}
              <button onClick={() => startEdit(t)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(t.id)} className="p-1 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name"
              className="col-span-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
            <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price $" type="number"
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
            <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="Mins (opt)" type="number"
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setEditId(null); }}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 flex items-center justify-center gap-1 transition-all">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} {editId ? "Update" : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VIP Rooms ────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  name: string;
  floor: string;
  is_active: boolean;
}

function VIPRoomsPanel({ clubId }: { clubId: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", floor: "Floor 1" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await adminClient.from("club_rooms").select("*").eq("club_id", clubId).order("floor,name");
    setRooms((data ?? []) as Room[]);
    setLoading(false);
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Room name required"); return; }
    setSaving(true);
    await adminClient.from("club_rooms").insert({ club_id: clubId, name: form.name.trim(), floor: form.floor.trim() || "Floor 1", is_active: true });
    setSaving(false);
    toast.success("Room added");
    setForm({ name: "", floor: "Floor 1" });
    setAdding(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await adminClient.from("club_rooms").delete().eq("id", id);
    toast.success("Room deleted");
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await adminClient.from("club_rooms").update({ is_active: !current }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-pink-400" /> VIP Rooms
        </h3>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors">
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No rooms configured</p>
      ) : (
        <div className="space-y-1.5">
          {rooms.map(r => (
            <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${r.is_active ? "border-gray-700 bg-gray-800/50" : "border-gray-800 bg-gray-900/50 opacity-50"}`}>
              <BedDouble className="w-4 h-4 text-pink-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white">{r.name}</span>
                <span className="text-xs text-gray-500 ml-2">{r.floor}</span>
              </div>
              <button onClick={() => toggleActive(r.id, r.is_active)}
                className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-500/10 text-green-400" : "bg-gray-700 text-gray-500"}`}>
                {r.is_active ? "Active" : "Off"}
              </button>
              <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Room Name (e.g. VIP Room 3)"
              className="col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
            <input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="Floor"
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 flex items-center justify-center gap-1 transition-all">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Entry Tiers (Door Cover Packages) ────────────────────────────────────────

interface EntryTier {
  id: string;
  name: string;
  price: number;
  admits_count: number;
  is_active: boolean;
}

function EntryTiersPanel({ clubId }: { clubId: string }) {
  const [tiers, setTiers] = useState<EntryTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", guest_count: "1" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await adminClient.from("entry_tiers").select("*").eq("club_id", clubId).order("price");
    setTiers((data ?? []) as EntryTier[]);
    setLoading(false);
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      admits_count: parseInt(form.guest_count) || 1,
      club_id: clubId,
      is_active: true,
    };
    if (editId) {
      await adminClient.from("entry_tiers").update(payload).eq("id", editId);
      toast.success("Entry tier updated");
    } else {
      await adminClient.from("entry_tiers").insert(payload);
      toast.success("Entry tier added");
    }
    setSaving(false);
    setEditId(null);
    setAdding(false);
    setForm({ name: "", price: "", guest_count: "1" });
    load();
  };

  const handleDelete = async (id: string) => {
    await adminClient.from("entry_tiers").delete().eq("id", id);
    toast.success("Entry tier deleted");
    load();
  };

  const startEdit = (t: EntryTier) => {
    setEditId(t.id);
    setAdding(true);
    setForm({ name: t.name, price: String(t.price), guest_count: String(t.admits_count ?? 1) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" /> Door Entry Tiers
        </h3>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null); setForm({ name: "", price: "", guest_count: "1" }); }}
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors">
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : tiers.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No entry tiers configured</p>
      ) : (
        <div className="space-y-1.5">
          {tiers.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-700 bg-gray-800/50">
              <span className="text-sm font-semibold text-white flex-1">{t.name}</span>
              <span className="text-sm text-green-400 font-mono">{t.price > 0 ? `$${t.price}` : "Free"}</span>
              {(t.admits_count ?? 1) > 1 && <span className="text-xs text-gray-500">/{t.admits_count}</span>}
              <button onClick={() => startEdit(t)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(t.id)} className="p-1 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tier name (e.g. Full Cover)"
              className="col-span-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
            <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price $" type="number"
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
            <input value={form.guest_count} onChange={e => setForm({ ...form, guest_count: e.target.value })} placeholder="Guests" type="number"
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
          </div>
          <p className="text-[10px] text-gray-500">Guest count: how many guests per entry (e.g. 2 for "2-for-1")</p>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setEditId(null); }}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 flex items-center justify-center gap-1 transition-all">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} {editId ? "Update" : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Brand Color ──────────────────────────────────────────────────────────────

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexFromHsl(hsl: string): string {
  const parts = hsl.split(/\s+/);
  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2]) / 100;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const COLOR_PRESETS = [
  { label: "Pink",     hsl: "328 78% 47%" },
  { label: "Purple",   hsl: "270 70% 50%" },
  { label: "Blue",     hsl: "220 80% 50%" },
  { label: "Cyan",     hsl: "190 80% 45%" },
  { label: "Green",    hsl: "150 70% 40%" },
  { label: "Amber",    hsl: "38 90% 50%" },
  { label: "Red",      hsl: "0 75% 50%" },
  { label: "Indigo",   hsl: "240 60% 55%" },
];

function BrandColorPanel({ clubId }: { clubId: string }) {
  const [color, setColor] = useState("328 78% 47%");
  const [customH, setCustomH] = useState("328");
  const [customS, setCustomS] = useState("78");
  const [customL, setCustomL] = useState("47");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminClient.from("clubs").select("brand_color").eq("id", clubId).single()
      .then(({ data }) => {
        const c = (data as any)?.brand_color ?? "328 78% 47%";
        setColor(c);
        const parts = c.split(/\s+/);
        if (parts.length >= 3) { setCustomH(parts[0]); setCustomS(parseInt(parts[1]).toString()); setCustomL(parseInt(parts[2]).toString()); }
        setLoading(false);
      });
  }, [clubId]);

  const handleSave = async (hsl: string) => {
    setSaving(true);
    await adminClient.from("clubs").update({ brand_color: hsl }).eq("id", clubId);
    setColor(hsl);
    const parts = hsl.split(/\s+/);
    if (parts.length >= 3) { setCustomH(parts[0]); setCustomS(parseInt(parts[1]).toString()); setCustomL(parseInt(parts[2]).toString()); }
    setSaving(false);
    toast.success("Brand color updated");
  };

  const customHsl = `${customH} ${customS}% ${customL}%`;

  if (loading) return <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <span className="w-4 h-4 rounded-full" style={{ background: `hsl(${color})` }} /> Brand Color
      </h3>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handleSave(p.hsl)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              color === p.hsl ? "border-white bg-white/10 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: `hsl(${p.hsl})` }} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom color picker */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Custom Color</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={hexFromHsl(color)}
            onChange={e => {
              const hsl = hexToHsl(e.target.value);
              setColor(hsl);
              setCustomH(hsl.split(/\s+/)[0]);
              setCustomS(parseInt(hsl.split(/\s+/)[1]).toString());
              setCustomL(parseInt(hsl.split(/\s+/)[2]).toString());
            }}
            className="w-12 h-12 rounded-lg border border-gray-600 cursor-pointer bg-transparent"
          />
          <div className="flex-1 min-w-0">
            <div className="h-8 rounded-lg" style={{ background: `hsl(${customHsl})` }} />
            <p className="text-[10px] text-gray-500 mt-1 font-mono">{customHsl}</p>
          </div>
          <button onClick={() => handleSave(customHsl)} disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 disabled:opacity-50 flex items-center gap-1 transition-all shrink-0">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Apply
          </button>
        </div>
      </div>

      <p className="text-[10px] text-gray-600">Current: <code className="text-gray-400">{color}</code></p>
    </div>
  );
}

// ── Club Settings ────────────────────────────────────────────────────────────

function ClubSettingsPanel({ clubId }: { clubId: string }) {
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminClient.from("club_settings").select("*").eq("club_id", clubId).maybeSingle()
      .then(({ data }) => { setSettings(data); setLoading(false); });
  }, [clubId]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, club_id, updated_at, ...payload } = settings;
    await adminClient.from("club_settings").update(payload).eq("club_id", clubId);
    setSaving(false);
    toast.success("Settings saved");
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  if (!settings) return <p className="text-sm text-gray-500">No settings row — create one first</p>;

  const fields = [
    { key: "song_price", label: "Song Price ($)", type: "number" },
    { key: "default_door_fee", label: "Default Door Fee ($)", type: "number" },
    { key: "default_dancer_entrance_fee", label: "Dancer Entrance Fee ($)", type: "number" },
    { key: "default_dancer_payout_pct", label: "Dancer Payout (%)", type: "number" },
    { key: "open_time", label: "Open Time", type: "time" },
    { key: "leave_cutoff_time", label: "Leave Cutoff", type: "time" },
    { key: "late_arrival_time", label: "Late Arrival Cutoff", type: "time" },
    { key: "day_reset_time", label: "Day Reset Time", type: "time" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-amber-400" /> Club Settings
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">{f.label}</label>
            <input
              type={f.type}
              value={settings[f.key] ?? ""}
              onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
      </button>
    </div>
  );
}

// ── Main Config Panel ────────────────────────────────────────────────────────

export function ClubConfig({ clubId, clubName, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div>
            <h2 className="text-base font-bold text-white">Developer Config</h2>
            <p className="text-xs text-gray-500">{clubName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <BrandColorPanel clubId={clubId} />
          <div className="border-t border-gray-800" />
          <DanceTiersPanel clubId={clubId} />
          <div className="border-t border-gray-800" />
          <EntryTiersPanel clubId={clubId} />
          <div className="border-t border-gray-800" />
          <VIPRoomsPanel clubId={clubId} />
          <div className="border-t border-gray-800" />
          <ClubSettingsPanel clubId={clubId} />
        </div>
      </div>
    </div>
  );
}
