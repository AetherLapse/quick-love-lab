import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, Edit, X, Camera, ShieldCheck, User, Loader2,
  AlertTriangle, CheckCircle2, ChevronRight, RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type Dancer = Tables<"dancers">;

// ─── Face Enrollment Drawer ──────────────────────────────────────────────────

function FaceEnrollDrawer({
  dancer,
  onClose,
  onEnrolled,
}: {
  dancer: Dancer;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  type EnrollStep = "camera" | "processing" | "success" | "error";
  const [enrollStep, setEnrollStep] = useState<EnrollStep>("camera");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(() => setCameraError(true));

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [stopCamera]);

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

    stopCamera();
    setEnrollStep("processing");

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];

      const { data, error } = await supabase.functions.invoke("rekognition-index", {
        body: { dancer_id: dancer.id, image_base64: base64 },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setEnrollStep("success");
      onEnrolled();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      if (msg.toLowerCase().includes("no face")) {
        setErrorMsg("No face detected. Look directly at camera with good lighting.");
      } else {
        setErrorMsg(msg);
      }
      setEnrollStep("error");
    }
  }, [dancer.id, stopCamera, onEnrolled]);

  const retry = () => {
    setEnrollStep("camera");
    setErrorMsg(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(() => setCameraError(true));
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l border-border z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
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
          {/* CAMERA */}
          {enrollStep === "camera" && (
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
                    {/* Face oval guide */}
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
                className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:glow-gold disabled:opacity-50"
              >
                <Camera className="w-5 h-5" /> Capture & Enroll
              </button>
            </>
          )}

          {/* PROCESSING */}
          {enrollStep === "processing" && (
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

          {/* SUCCESS */}
          {enrollStep === "success" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-success" />
              <div className="text-center">
                <p className="text-success font-bold text-xl font-heading">Face Enrolled!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {dancer.stage_name} can now check in with face scan.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full touch-target border border-border rounded-xl font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              >
                Done
              </button>
            </div>
          )}

          {/* ERROR */}
          {enrollStep === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 text-center w-full">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-semibold">Enrollment Failed</p>
                <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={retry}
                className="w-full touch-target bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:glow-gold"
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

// ─── Dancer Profile Drawer ───────────────────────────────────────────────────

function DancerProfileDrawer({
  dancer,
  onClose,
  onEnroll,
}: {
  dancer: Dancer;
  onClose: () => void;
  onEnroll: () => void;
}) {
  const statusLabel: Record<string, string> = {
    inactive: "Not Checked In",
    on_floor: "On Floor",
    active_in_room: "In Private Room",
  };

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

          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${
            dancer.is_active ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground border border-border"
          }`}>
            <span className={`w-2 h-2 rounded-full ${dancer.is_active ? "bg-success" : "bg-muted-foreground"}`} />
            {dancer.is_active ? "Active" : "Inactive"}
          </div>

          {/* Face enrollment section */}
          <div className={`rounded-xl p-4 mb-6 flex items-center justify-between ${
            dancer.facial_hash
              ? "bg-success/10 border border-success/20"
              : "bg-warning/10 border border-warning/20"
          }`}>
            <div className="flex items-center gap-3">
              {dancer.facial_hash ? (
                <ShieldCheck className="w-5 h-5 text-success" />
              ) : (
                <Camera className="w-5 h-5 text-warning" />
              )}
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
              ["Dancer ID", dancer.enroll_id],
              ["PIN", "••••"],
              ["Payout %", `${dancer.payout_percentage}%`],
              ["Entrance Fee", `$${dancer.entrance_fee}`],
              ["Live Status", statusLabel[dancer.live_status as string] ?? dancer.live_status],
              ["Popularity Score", String(dancer.popularity_score ?? 0)],
              ["Full Name", (dancer as Record<string, unknown>).full_name as string || "—"],
              ["Email", (dancer as Record<string, unknown>).email as string || "—"],
              ["Phone", (dancer as Record<string, unknown>).phone as string || "—"],
              ["Onboarding", dancer.onboarding_complete ? "Complete" : "Incomplete"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-border/20">
                <span className="text-muted-foreground">{label}</span>
                <span className={`text-foreground font-medium ${
                  label === "Onboarding"
                    ? dancer.onboarding_complete ? "text-success" : "text-warning"
                    : label === "Live Status" && dancer.live_status !== "inactive"
                    ? "text-primary"
                    : ""
                }`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add / Edit Dialog form ──────────────────────────────────────────────────

const EMPTY_FORM = {
  stage_name: "",
  enroll_id: "",
  pin_code: "",
  payout_percentage: "30",
  entrance_fee: "50",
  full_name: "",
  email: "",
  phone: "",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DancerManagement() {
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [enrollDancer, setEnrollDancer] = useState<Dancer | null>(null);
  const [profileDancer, setProfileDancer] = useState<Dancer | null>(null);

  const loadDancers = async () => {
    const { data } = await supabase.from("dancers").select("*").order("stage_name");
    setDancers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadDancers(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (d: Dancer) => {
    setEditId(d.id);
    setForm({
      stage_name: d.stage_name,
      enroll_id: d.enroll_id,
      pin_code: d.pin_code,
      payout_percentage: String(d.payout_percentage),
      entrance_fee: String(d.entrance_fee),
      full_name: (d as Record<string, unknown>).full_name as string ?? "",
      email: (d as Record<string, unknown>).email as string ?? "",
      phone: (d as Record<string, unknown>).phone as string ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.stage_name || !form.enroll_id || !form.pin_code || !form.email || !form.phone) {
      toast.error("Stage name, dancer ID, PIN, email, and phone are required.");
      return;
    }
    setSaving(true);
    const payload = {
      stage_name: form.stage_name.trim(),
      enroll_id: form.enroll_id.trim(),
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
      loadDancers();
    }
  };

  const toggleActive = async (d: Dancer) => {
    await supabase.from("dancers").update({ is_active: !d.is_active }).eq("id", d.id);
    loadDancers();
  };

  const enrolled = dancers.filter((d) => d.facial_hash).length;
  const active = dancers.filter((d) => d.is_active).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl tracking-wide text-foreground">Performers</h1>
            <p className="text-muted-foreground text-sm">
              {active} active · {enrolled}/{dancers.length} faces enrolled
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditId(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="touch-target">
                <Plus className="w-4 h-4 mr-2" /> Add Performer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">
                  {editId ? "Edit Performer" : "Add New Performer"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-foreground">Stage Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.stage_name}
                      onChange={(e) => setForm({ ...form, stage_name: e.target.value })}
                      placeholder="e.g. Crystal"
                      className="bg-secondary mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Dancer ID <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.enroll_id}
                      onChange={(e) => setForm({ ...form, enroll_id: e.target.value })}
                      placeholder="e.g. 0042"
                      maxLength={6}
                      className="bg-secondary mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">PIN Code <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.pin_code}
                      onChange={(e) => setForm({ ...form, pin_code: e.target.value })}
                      type="password"
                      placeholder="4 digits"
                      maxLength={4}
                      className="bg-secondary mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Payout %</Label>
                    <Input
                      type="number"
                      value={form.payout_percentage}
                      onChange={(e) => setForm({ ...form, payout_percentage: e.target.value })}
                      min={0} max={100}
                      className="bg-secondary mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Entrance Fee $</Label>
                    <Input
                      type="number"
                      value={form.entrance_fee}
                      onChange={(e) => setForm({ ...form, entrance_fee: e.target.value })}
                      min={0}
                      className="bg-secondary mt-1"
                    />
                  </div>
                </div>

                <div className="border-t border-border/30 pt-4 space-y-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Optional Details</p>
                  <div>
                    <Label className="text-foreground">Full Legal Name</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="For internal records only"
                      className="bg-secondary mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground">Email <span className="text-destructive">*</span></Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="bg-secondary mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-foreground">Phone <span className="text-destructive">*</span></Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="bg-secondary mt-1"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full touch-target">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Performer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: dancers.length },
            { label: "Active", value: active },
            { label: "Faces Enrolled", value: enrolled },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card p-4 text-center">
              <p className="font-heading text-3xl text-primary">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Dancer list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : dancers.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No performers added yet.</p>
            <p className="text-muted-foreground text-sm mt-1">Click "Add Performer" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dancers.map((d) => (
              <div
                key={d.id}
                className={`glass-card p-4 flex items-center gap-4 ${!d.is_active ? "opacity-60" : ""}`}
              >
                {/* Avatar placeholder */}
                <div className="w-11 h-11 rounded-full bg-secondary/60 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{d.stage_name}</p>
                    {d.facial_hash ? (
                      <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Face
                      </span>
                    ) : (
                      <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        No Face
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID: {d.enroll_id} · {d.payout_percentage}% · ${d.entrance_fee} fee
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    title={d.facial_hash ? "Re-enroll face" : "Enroll face"}
                    onClick={() => setEnrollDancer(d)}
                    className={`p-2 rounded-lg transition-colors ${
                      d.facial_hash
                        ? "text-success hover:bg-success/10"
                        : "text-warning hover:bg-warning/10"
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    title="Edit"
                    onClick={() => openEdit(d)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    title={d.is_active ? "Deactivate" : "Activate"}
                    onClick={() => toggleActive(d)}
                    className={`p-2 rounded-lg transition-colors text-xs font-medium ${
                      d.is_active
                        ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        : "text-muted-foreground hover:text-success hover:bg-success/10"
                    }`}
                  >
                    {d.is_active ? "Off" : "On"}
                  </button>
                  <button
                    title="View profile"
                    onClick={() => setProfileDancer(d)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Face Enrollment Drawer */}
      {enrollDancer && (
        <FaceEnrollDrawer
          dancer={enrollDancer}
          onClose={() => setEnrollDancer(null)}
          onEnrolled={() => { loadDancers(); setEnrollDancer(null); toast.success(`${enrollDancer.stage_name}'s face enrolled.`); }}
        />
      )}

      {/* Profile Drawer */}
      {profileDancer && (
        <DancerProfileDrawer
          dancer={profileDancer}
          onClose={() => setProfileDancer(null)}
          onEnroll={() => { setEnrollDancer(profileDancer); setProfileDancer(null); }}
        />
      )}
    </AppLayout>
  );
}
