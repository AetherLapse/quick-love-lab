import { useState } from "react";
import { adminClient } from "@/lib/supabase";
import { X, Loader2, Building2, Globe, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateClubModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [clubName, setClubName] = useState("");
  const [domain, setDomain] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [saving, setSaving] = useState(false);

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNext = () => {
    if (step === 0) {
      if (!clubName.trim()) { toast.error("Club name required"); return; }
      if (!slug.trim()) setSlug(autoSlug(clubName));
    }
    if (step === 1) {
      if (!adminEmail.includes("@")) { toast.error("Valid email required"); return; }
      if (adminPassword.length < 6) { toast.error("Password must be 6+ characters"); return; }
    }
    setStep(s => s + 1);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      // 1. Insert club
      const { data: club, error: clubErr } = await adminClient
        .from("clubs")
        .insert({
          name: clubName.trim(),
          slug: slug.trim() || autoSlug(clubName),
          domain: domain.trim() || null,
          owner_email: adminEmail.trim(),
          status: "active",
        })
        .select("id")
        .single();

      if (clubErr) throw new Error(clubErr.message);

      // 2. Create admin user
      const { data: userData, error: userErr } = await adminClient.auth.admin.createUser({
        email: adminEmail.trim(),
        password: adminPassword,
        email_confirm: true,
        app_metadata: { club_id: club.id },
        user_metadata: { full_name: adminName.trim() || adminEmail.split("@")[0] },
      });

      if (userErr) throw new Error(userErr.message);

      // 3. Create profile
      await adminClient.from("profiles").insert({
        user_id: userData.user.id,
        full_name: adminName.trim() || adminEmail.split("@")[0],
        is_active: true,
        club_id: club.id,
      });

      // 4. Create user_role
      await adminClient.from("user_roles").insert({
        user_id: userData.user.id,
        role: "admin",
        club_id: club.id,
      });

      // 5. Create club_settings row
      await adminClient.from("club_settings").insert({
        club_id: club.id,
      });

      // 6. Copy default dance_tiers
      const defaultTiers = [
        { name: "1 Lap",  price: 30,  sort_order: 1 },
        { name: "3 Laps", price: 90,  sort_order: 2 },
        { name: "15 Min", price: 140, sort_order: 3 },
        { name: "30 Min", price: 250, sort_order: 4 },
        { name: "Stage",  price: 20,  sort_order: 5 },
        { name: "Custom", price: 0,   sort_order: 6 },
      ];
      await adminClient.from("dance_tiers").insert(
        defaultTiers.map(t => ({ ...t, club_id: club.id, is_active: true }))
      );

      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create club");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Create Club</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {["Club Info", "Admin Account", "Review"].map((label, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= step ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-500"
              }`}>{i + 1}</div>
              <span className="text-xs text-gray-500 hidden sm:inline">{label}</span>
              {i < 2 && <div className={`flex-1 h-px mx-1 ${i < step ? "bg-brand-600" : "bg-gray-800"}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 min-h-[200px]">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Club Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={clubName}
                    onChange={e => { setClubName(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
                    placeholder="e.g. Velvet Lounge"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Domain</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="e.g. velvetlounge.com (optional)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Slug</label>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="auto-generated"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 text-sm font-mono"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Admin Name</label>
                <input
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="Club owner name"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Admin Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="admin@velvetlounge.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Admin Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white mb-3">Review & Create</p>
              {[
                ["Club", clubName],
                ["Domain", domain || "(none)"],
                ["Slug", slug || autoSlug(clubName)],
                ["Admin", adminName || adminEmail.split("@")[0]],
                ["Email", adminEmail],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
              <div className="bg-brand-600/10 border border-brand-600/20 rounded-xl p-3 mt-2">
                <p className="text-xs text-brand-500">This will create: club record, admin user account, default settings, and dance tier packages.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-all">
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <button onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all">
              Next
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Creating…" : "Create Club"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
