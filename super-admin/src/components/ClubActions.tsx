import { useState } from "react";
import { adminClient } from "@/lib/supabase";
import {
  X, Pencil, Pause, Play, Trash2, KeyRound, Globe, Building2,
  Loader2, AlertTriangle, UserCog,
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

interface Props {
  club: Club;
  onClose: () => void;
  onUpdated: () => void;
}

export function ClubActions({ club, onClose, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(club.name);
  const [domain, setDomain] = useState(club.domain ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await adminClient.from("clubs").update({
      name: name.trim(),
      domain: domain.trim() || null,
    }).eq("id", club.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Club updated");
    onUpdated();
  };

  const handleSuspend = async () => {
    const newStatus = club.status === "suspended" ? "active" : "suspended";
    const { error } = await adminClient.from("clubs").update({ status: newStatus }).eq("id", club.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "suspended" ? "Club suspended" : "Club reactivated");
    onUpdated();
  };

  const handleDelete = async () => {
    const { error } = await adminClient.from("clubs").update({ status: "deleted", is_active: false }).eq("id", club.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Club soft-deleted");
    onUpdated();
  };

  const handleResetCredentials = async () => {
    if (!resetEmail.includes("@") || resetPassword.length < 6) {
      toast.error("Valid email and password (6+) required");
      return;
    }
    setResetting(true);

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("club_id", club.id);

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("user_id, role")
      .eq("club_id", club.id)
      .eq("role", "admin");

    const adminUserId = roles?.[0]?.user_id;

    if (adminUserId) {
      const { error } = await adminClient.auth.admin.updateUserById(adminUserId, {
        email: resetEmail.trim(),
        password: resetPassword,
      });
      if (error) { setResetting(false); toast.error(error.message); return; }
      await adminClient.from("clubs").update({ owner_email: resetEmail.trim() }).eq("id", club.id);
      toast.success("Admin credentials updated");
    } else {
      toast.error("No admin user found for this club");
    }
    setResetting(false);
    setShowReset(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            {club.logo_url ? (
              <img src={club.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-brand-500" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-white">{club.name}</h2>
              <p className="text-xs text-gray-500">{club.domain ?? club.slug}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Info */}
          <div className="space-y-2">
            {[
              ["Status", club.status],
              ["Owner", club.owner_email ?? "—"],
              ["Slug", club.slug],
              ["Domain", club.domain ?? "—"],
              ["Created", new Date(club.created_at).toLocaleDateString()],
              ["Club ID", club.id],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="text-white font-mono text-xs truncate max-w-[220px]">{v}</span>
              </div>
            ))}
          </div>

          {/* Edit Details */}
          {editing ? (
            <div className="space-y-3 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
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
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
                </button>
              </div>
            </div>
          ) : null}

          {/* Reset Credentials */}
          {showReset ? (
            <div className="space-y-3 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Reset Admin Credentials</p>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500">New Email</label>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500">New Password</label>
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowReset(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-all">Cancel</button>
                <button onClick={handleResetCredentials} disabled={resetting}
                  className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all">
                  {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Reset
                </button>
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="space-y-2">
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 text-left transition-all">
                <Pencil className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-white font-medium">Edit Details</span>
              </button>
            )}

            {!showReset && (
              <button onClick={() => { setShowReset(true); setResetEmail(club.owner_email ?? ""); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 text-left transition-all">
                <KeyRound className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-white font-medium">Reset Admin Credentials</span>
              </button>
            )}

            <button onClick={handleSuspend}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-amber-500/30 hover:bg-amber-500/5 text-left transition-all">
              {club.status === "suspended"
                ? <><Play className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400 font-medium">Reactivate Club</span></>
                : <><Pause className="w-4 h-4 text-amber-400" /><span className="text-sm text-amber-400 font-medium">Suspend Club</span></>
              }
            </button>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-red-500/30 hover:bg-red-500/5 text-left transition-all">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400 font-medium">Delete Club</span>
              </button>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">This will soft-delete the club. Data is preserved but the club will be deactivated.</p>
                </div>
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
      </div>
    </div>
  );
}
