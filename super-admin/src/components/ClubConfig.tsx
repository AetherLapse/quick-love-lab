import { useState, useEffect, useCallback, useRef } from "react";
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

// ── General Panel (club info + actions) ───────────────────────────────────────

function GeneralPanel({ clubId, onClose }: { clubId: string; onClose: () => void }) {
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    adminClient.from("clubs").select("*").eq("id", clubId).single()
      .then(({ data }) => {
        setClub(data);
        setName(data?.name ?? "");
        setDomain(data?.domain ?? "");
        setLogoPreview(data?.logo_url ?? null);
        setLoading(false);
      });
  }, [clubId]);

  const handleSave = async () => {
    setSaving(true);
    let logoUrl = club?.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() ?? "png";
      const path = `${club?.slug ?? clubId}/logo.${ext}`;
      await adminClient.storage.from("club-logos").upload(path, logoFile, { upsert: true });
      const { data: urlData } = adminClient.storage.from("club-logos").getPublicUrl(path);
      logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    }
    await adminClient.from("clubs").update({ name: name.trim(), domain: domain.trim() || null, logo_url: logoUrl }).eq("id", clubId);
    setSaving(false);
    setEditing(false);
    setLogoFile(null);
    toast.success("Club updated");
    // Reload
    const { data } = await adminClient.from("clubs").select("*").eq("id", clubId).single();
    setClub(data);
    setLogoPreview(data?.logo_url ?? null);
  };

  const handleSuspend = async () => {
    const newStatus = club?.status === "suspended" ? "active" : "suspended";
    await adminClient.from("clubs").update({ status: newStatus }).eq("id", clubId);
    toast.success(newStatus === "suspended" ? "Club suspended" : "Club reactivated");
    const { data } = await adminClient.from("clubs").select("*").eq("id", clubId).single();
    setClub(data);
  };

  const handleDelete = async () => {
    await adminClient.from("clubs").update({ status: "deleted", is_active: false }).eq("id", clubId);
    toast.success("Club soft-deleted");
    onClose();
  };

  const handleResetCredentials = async () => {
    if (!resetEmail.includes("@") || resetPassword.length < 6) {
      toast.error("Valid email and password (6+) required"); return;
    }
    setResetting(true);
    const { data: roles } = await adminClient.from("user_roles").select("user_id").eq("club_id", clubId).eq("role", "admin");
    const adminUserId = roles?.[0]?.user_id;
    if (adminUserId) {
      const { error } = await adminClient.auth.admin.updateUserById(adminUserId, { email: resetEmail.trim(), password: resetPassword });
      if (error) { setResetting(false); toast.error(error.message); return; }
      await adminClient.from("clubs").update({ owner_email: resetEmail.trim() }).eq("id", clubId);
      toast.success("Admin credentials updated");
    } else {
      toast.error("No admin user found");
    }
    setResetting(false);
    setShowReset(false);
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  if (!club) return <p className="text-gray-500">Club not found</p>;

  return (
    <div className="space-y-6">
      {/* Club info card */}
      <div className="flex items-start gap-4">
        {club.logo_url ? (
          <img src={club.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-700" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
            <span className="text-2xl">🏢</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white">{club.name}</h3>
          <p className="text-sm text-gray-400 truncate">{club.domain ?? club.slug}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${
              club.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20"
              : club.status === "suspended" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>{club.status}</span>
            <span className="text-xs text-gray-500">{club.owner_email}</span>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-800 p-4 space-y-2">
        {[
          ["Slug", club.slug],
          ["Domain", club.domain ?? "—"],
          ["Owner", club.owner_email ?? "—"],
          ["Created", new Date(club.created_at).toLocaleDateString()],
          ["Club ID", club.id],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-gray-500">{k}</span>
            <span className="text-white font-mono text-xs truncate max-w-[280px]">{v}</span>
          </div>
        ))}
      </div>

      {/* Edit section */}
      {editing ? (
        <div className="bg-gray-800/30 rounded-xl border border-gray-800 p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Edit Details</p>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Club Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Domain</label>
            <input value={domain} onChange={e => setDomain(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Logo</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }} />
            <div className="flex items-center gap-3">
              {logoPreview && <img src={logoPreview} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-600" />}
              <button onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-all">
                {logoPreview ? "Change" : "Upload"}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setEditing(false); setLogoFile(null); setLogoPreview(club.logo_url); }}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
            </button>
          </div>
        </div>
      ) : null}

      {/* Reset credentials */}
      {showReset && (
        <div className="bg-gray-800/30 rounded-xl border border-gray-800 p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Reset Admin Credentials</p>
          <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="New email"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500" />
          <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="New password (6+)"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500" />
          <div className="flex gap-2">
            <button onClick={() => setShowReset(false)}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
            <button onClick={handleResetCredentials} disabled={resetting}
              className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all">
              {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Reset
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 text-left transition-all">
            <Pencil className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-white font-medium">Edit Details & Logo</span>
          </button>
        )}
        {!showReset && (
          <button onClick={() => { setShowReset(true); setResetEmail(club.owner_email ?? ""); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 text-left transition-all">
            <span className="text-gray-400">🔑</span>
            <span className="text-sm text-white font-medium">Reset Admin Credentials</span>
          </button>
        )}
        <button onClick={handleSuspend}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-amber-500/30 hover:bg-amber-500/5 text-left transition-all">
          <span>{club.status === "suspended" ? "▶️" : "⏸️"}</span>
          <span className={`text-sm font-medium ${club.status === "suspended" ? "text-green-400" : "text-amber-400"}`}>
            {club.status === "suspended" ? "Reactivate Club" : "Suspend Club"}
          </span>
        </button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-red-500/30 hover:bg-red-500/5 text-left transition-all">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">Delete Club</span>
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-300">This will soft-delete the club. Data is preserved but deactivated.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all">Confirm Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Brand Color helpers ──────────────────────────────────────────────────────

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

// ── Main Config Panel (full-page, tabbed sidebar) ────────────────────────────

const CONFIG_TABS = [
  { id: "general",  label: "General",          icon: "🏠" },
  { id: "brand",    label: "Brand Color",     icon: "🎨" },
  { id: "packages", label: "Dance Packages",  icon: "💰" },
  { id: "entry",    label: "Door Entry Tiers", icon: "🚪" },
  { id: "rooms",    label: "VIP Rooms",       icon: "🛏️" },
  { id: "settings", label: "Club Settings",   icon: "⚙️" },
] as const;

type ConfigTab = typeof CONFIG_TABS[number]["id"];

export function ClubConfig({ clubId, clubName, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ConfigTab>("general");

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex w-full h-full max-w-5xl mx-auto my-4 md:my-8 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Left sidebar — tabs */}
        <div className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">
          {/* Header */}
          <div className="px-5 py-5 border-b border-gray-800">
            <h2 className="text-base font-bold text-white">Developer Config</h2>
            <p className="text-xs text-gray-500 mt-0.5">{clubName}</p>
          </div>

          {/* Tab list */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {CONFIG_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  activeTab === tab.id
                    ? "bg-brand-600/20 text-brand-400 border border-brand-600/30"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Close button */}
          <div className="px-3 py-4 border-t border-gray-800">
            <button onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-all">
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 bg-gray-900 overflow-y-auto p-6 md:p-8">
          {activeTab === "general"  && <GeneralPanel clubId={clubId} onClose={onClose} />}
          {activeTab === "brand"    && <BrandColorPanel clubId={clubId} />}
          {activeTab === "packages" && <DanceTiersPanel clubId={clubId} />}
          {activeTab === "entry"    && <EntryTiersPanel clubId={clubId} />}
          {activeTab === "rooms"    && <VIPRoomsPanel clubId={clubId} />}
          {activeTab === "settings" && <ClubSettingsPanel clubId={clubId} />}
        </div>
      </div>
    </div>
  );
}
