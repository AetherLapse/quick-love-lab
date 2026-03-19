import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home, Users, User, Settings, Lock, Loader2, Plus, Camera,
  ShieldCheck, ChevronRight, X, Edit, AlertTriangle, CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfiles, useDancers, useClubSettings } from "@/hooks/useDashboardData";
import type { Tables } from "@/integrations/supabase/types";

type Dancer = Tables<"dancers">;

const EMPTY_FORM = {
  stage_name: "",
  employee_id: "",
  pin_code: "",
  payout_percentage: "30",
  entrance_fee: "50",
  full_name: "",
  email: "",
  phone: "",
};

const STATUS_LABEL: Record<string, string> = {
  inactive: "Not Checked In",
  on_floor: "On Floor",
  active_in_room: "In Private Room",
};

// ─── Face Enrollment Drawer ───────────────────────────────────────────────────
function FaceEnrollDrawer({ dancer, onClose, onEnrolled }: {
  dancer: Dancer;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  type Step = "camera" | "processing" | "success" | "error";
  const [step, setStep] = useState<Step>("camera");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => setCameraError(true));
  }, []);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => setCameraError(true));
    return () => { mounted = false; stopCamera(); };
  }, [stopCamera]);

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    stopCamera();
    setStep("processing");
    try {
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      // anon key is public by design — hardcoded as reliable fallback
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";
      // Use fetch directly so Authorization header is never overridden by the SDK
      const res = await fetch(
        "https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/rekognition-index",
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ dancer_id: dancer.id, image_base64: base64 }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? `HTTP ${res.status}`);
      if (data?.error) throw new Error(data.error);
      setStep("success");
      onEnrolled();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      setErrorMsg(msg.toLowerCase().includes("no face")
        ? "No face detected. Look directly at camera with good lighting."
        : msg);
      setStep("error");
    }
  }, [dancer.id, stopCamera, onEnrolled]);

  return (
    <>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l border-border z-[70] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-heading text-xl tracking-wide">Enroll Face</h3>
            <p className="text-muted-foreground text-sm">{dancer.stage_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-5 flex flex-col gap-4">
          {step === "camera" && (
            <>
              <div className="relative aspect-video bg-secondary/80 rounded-xl overflow-hidden border border-border">
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <AlertTriangle className="w-8 h-8 text-warning mx-auto" />
                      <p className="text-muted-foreground text-sm">Camera unavailable</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-36 h-48 rounded-full border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                    </div>
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <p className="text-muted-foreground text-sm text-center">
                Have {dancer.stage_name} face the camera directly. Good lighting required.
              </p>
              <button
                onClick={handleCapture}
                disabled={cameraError}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
              >
                <Camera className="w-5 h-5" /> Capture & Enroll
              </button>
            </>
          )}

          {step === "processing" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/30" />
                <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-4 flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground text-sm">Indexing face with AWS Rekognition...</p>
            </div>
          )}

          {step === "success" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-success" />
              <div className="text-center">
                <p className="text-success font-bold text-xl font-heading">Face Enrolled!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {dancer.stage_name} can now check in with face scan.
                </p>
              </div>
              <button onClick={onClose} className="w-full py-3 border border-border rounded-xl font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 text-center w-full">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-semibold">Enrollment Failed</p>
                <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setStep("camera"); setErrorMsg(null); startCamera(); }}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Profile Drawer ───────────────────────────────────────────────────────────
function ProfileDrawer({ dancer, onClose, onEdit, onEnroll, onToggleActive }: {
  dancer: Dancer;
  onClose: () => void;
  onEdit: () => void;
  onEnroll: () => void;
  onToggleActive: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 overflow-y-auto animate-slide-in-right">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading text-3xl tracking-wide">{dancer.stage_name}</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${
            dancer.is_active ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground border border-border"
          }`}>
            <span className={`w-2 h-2 rounded-full ${dancer.is_active ? "bg-success" : "bg-muted-foreground"}`} />
            {dancer.is_active ? "Active" : "Inactive"}
          </div>

          {/* Face enrollment banner */}
          <div className={`rounded-xl p-4 mb-6 flex items-center justify-between ${
            dancer.facial_hash ? "bg-success/10 border border-success/20" : "bg-warning/10 border border-warning/20"
          }`}>
            <div className="flex items-center gap-3">
              {dancer.facial_hash
                ? <ShieldCheck className="w-5 h-5 text-success" />
                : <Camera className="w-5 h-5 text-warning" />}
              <div>
                <p className={`font-medium text-sm ${dancer.facial_hash ? "text-success" : "text-warning"}`}>
                  {dancer.facial_hash ? "Face Enrolled" : "No Face on File"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dancer.facial_hash ? "AWS Rekognition ID stored" : "Required for face scan check-in"}
                </p>
              </div>
            </div>
            <button
              onClick={onEnroll}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              {dancer.facial_hash ? "Re-enroll" : "Enroll"}
            </button>
          </div>

          {/* Profile fields */}
          <div className="space-y-3 text-sm">
            {[
              ["Employee ID", dancer.employee_id],
              ["PIN", "••••"],
              ["Payout %", `${dancer.payout_percentage}%`],
              ["Entrance Fee", `$${dancer.entrance_fee}`],
              ["Live Status", STATUS_LABEL[dancer.live_status as string] ?? dancer.live_status],
              ["Popularity Score", String(dancer.popularity_score ?? 0)],
              ["Full Name", (dancer as Record<string, unknown>).full_name as string || "—"],
              ["Email", (dancer as Record<string, unknown>).email as string || "—"],
              ["Phone", (dancer as Record<string, unknown>).phone as string || "—"],
              ["Onboarding", dancer.onboarding_complete ? "Complete" : "Incomplete"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-border/20">
                <span className="text-muted-foreground">{label}</span>
                <span className={`text-foreground font-medium ${
                  label === "Onboarding" ? (dancer.onboarding_complete ? "text-success" : "text-warning") :
                  label === "Live Status" && dancer.live_status !== "inactive" ? "text-primary" : ""
                }`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={onEdit} className="flex-1">
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button
              variant="outline"
              onClick={onToggleActive}
              className={`flex-1 ${dancer.is_active ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-success/40 text-success hover:bg-success/10"}`}
            >
              {dancer.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SettingsTab() {
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: dancers, isLoading: dancersLoading, refetch: refetchDancers } = useDancers();
  const { data: settings, isLoading: settingsLoading } = useClubSettings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [profileDancer, setProfileDancer] = useState<Dancer | null>(null);
  const [enrollDancer, setEnrollDancer] = useState<Dancer | null>(null);

  const staffMembers = (profiles ?? []).flatMap((p) => {
    const roles = (p.user_roles as unknown as { role: string }[] | null) ?? [];
    return roles
      .filter((r) => r.role !== "admin")
      .map((r) => ({ name: p.full_name, role: r.role, active: p.is_active }));
  });

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (d: Dancer) => {
    setEditId(d.id);
    setForm({
      stage_name: d.stage_name,
      employee_id: d.employee_id,
      pin_code: d.pin_code,
      payout_percentage: String(d.payout_percentage),
      entrance_fee: String(d.entrance_fee),
      full_name: (d as Record<string, unknown>).full_name as string ?? "",
      email: (d as Record<string, unknown>).email as string ?? "",
      phone: (d as Record<string, unknown>).phone as string ?? "",
    });
    setProfileDancer(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.stage_name || !form.employee_id || !form.pin_code || !form.email || !form.phone) {
      toast.error("Stage name, employee ID, PIN, email, and phone are required.");
      return;
    }
    setSaving(true);
    const payload = {
      stage_name: form.stage_name.trim(),
      employee_id: form.employee_id.trim(),
      pin_code: form.pin_code.trim(),
      payout_percentage: parseFloat(form.payout_percentage),
      entrance_fee: parseFloat(form.entrance_fee),
      full_name: form.full_name.trim() || null,
      email: form.email.trim(),
      phone: form.phone.trim(),
    };

    const { error } = editId
      ? await supabase.from("dancers").update(payload).eq("id", editId)
      : await supabase.from("dancers").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? "Dancer updated." : "Dancer added.");
      setDialogOpen(false);
      refetchDancers();
    }
  };

  const toggleActive = async (d: Dancer) => {
    await supabase.from("dancers").update({ is_active: !d.is_active }).eq("id", d.id);
    setProfileDancer(null);
    refetchDancers();
  };

  return (
    <div className="relative">
      <h2 className="font-heading text-3xl tracking-wide mb-6">Club Settings</h2>

      {/* Fee settings locked notice */}
      <div className="glass-card p-5 mb-8 border border-primary/20 flex items-start gap-3">
        <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-foreground font-medium text-sm">Fee & Revenue Split Settings</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Revenue split percentages, house fees, and song pricing are managed by the platform administrator. Contact your administrator to request changes.
          </p>
        </div>
      </div>

      {/* Current fee schedule (read-only) */}
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
            <div className="space-y-1">
              {(dancers ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm font-medium truncate ${d.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                      {d.stage_name}
                    </span>
                    {d.facial_hash
                      ? <span className="text-xs text-success bg-success/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Face ✓</span>
                      : <span className="text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded-full flex-shrink-0">No Face</span>}
                  </div>
                  <button
                    onClick={() => setProfileDancer(d)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={openAdd}
            className="mt-4 w-full px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Performer
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

      {/* Add / Edit Performer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditId(null); }}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {editId ? "Edit Performer" : "Add New Performer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Stage Name <span className="text-destructive">*</span></Label>
                <Input value={form.stage_name} onChange={(e) => setForm({ ...form, stage_name: e.target.value })} placeholder="e.g. Crystal" className="bg-secondary mt-1" />
              </div>
              <div>
                <Label>Employee ID <span className="text-destructive">*</span></Label>
                <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="e.g. 0042" maxLength={6} className="bg-secondary mt-1" />
              </div>
              <div>
                <Label>PIN Code <span className="text-destructive">*</span></Label>
                <Input value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} type="password" placeholder="4 digits" maxLength={4} className="bg-secondary mt-1" />
              </div>
              <div>
                <Label>Payout %</Label>
                <Input type="number" value={form.payout_percentage} onChange={(e) => setForm({ ...form, payout_percentage: e.target.value })} min={0} max={100} className="bg-secondary mt-1" />
              </div>
              <div>
                <Label>Entrance Fee $</Label>
                <Input type="number" value={form.entrance_fee} onChange={(e) => setForm({ ...form, entrance_fee: e.target.value })} min={0} className="bg-secondary mt-1" />
              </div>
            </div>

            <div className="border-t border-border/30 pt-4 space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Contact Details</p>
              <div>
                <Label>Full Legal Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="For internal records only" className="bg-secondary mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-secondary mt-1" />
                </div>
                <div>
                  <Label>Phone <span className="text-destructive">*</span></Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-secondary mt-1" />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full py-3">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Performer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Drawer */}
      {profileDancer && (
        <ProfileDrawer
          dancer={profileDancer}
          onClose={() => setProfileDancer(null)}
          onEdit={() => openEdit(profileDancer)}
          onEnroll={() => { setEnrollDancer(profileDancer); setProfileDancer(null); }}
          onToggleActive={() => toggleActive(profileDancer)}
        />
      )}

      {/* Face Enrollment Drawer */}
      {enrollDancer && (
        <FaceEnrollDrawer
          dancer={enrollDancer}
          onClose={() => setEnrollDancer(null)}
          onEnrolled={() => {
            refetchDancers();
            toast.success(`${enrollDancer.stage_name}'s face enrolled.`);
            setEnrollDancer(null);
          }}
        />
      )}
    </div>
  );
}
