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
  Ban, ShieldOff, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";
import { useBanDancer, useUnbanDancer, useDancerBanLog } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";

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

// ─── Ban / Unban Modal ────────────────────────────────────────────────────────

function BanDancerModal({
  dancer,
  onClose,
  onDone,
}: {
  dancer: Dancer;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const isBanned = (dancer as Record<string, unknown>).is_banned as boolean;
  const banDancer   = useBanDancer();
  const unbanDancer = useUnbanDancer();
  const { data: log = [], isLoading: logLoading } = useDancerBanLog(dancer.id);
  const [reason, setReason] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || !user) return;
    try {
      if (isBanned) {
        await unbanDancer.mutateAsync({ dancerId: dancer.id, reason: reason.trim(), actionedBy: user.id });
        toast.success(`${dancer.stage_name} ban lifted`);
      } else {
        await banDancer.mutateAsync({ dancerId: dancer.id, reason: reason.trim(), actionedBy: user.id });
        toast.success(`${dancer.stage_name} banned`);
      }
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    }
  };

  const isPending = banDancer.isPending || unbanDancer.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-sm rounded-3xl border-2 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        isBanned ? "bg-card border-green-500/50" : "bg-card border-red-500/50"
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b ${isBanned ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBanned ? "bg-green-500/20" : "bg-red-500/20"}`}>
                {isBanned ? <ShieldOff className="w-5 h-5 text-green-400" /> : <Ban className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${isBanned ? "text-green-500" : "text-red-500"}`}>
                  {isBanned ? "Lift Ban" : "Issue Ban"}
                </p>
                <p className="text-foreground font-bold">{dancer.stage_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">ID: {dancer.enroll_id}</p>
          {isBanned && (dancer as Record<string, unknown>).ban_reason && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-medium">Current ban reason:</p>
              <p className="text-xs text-red-300 mt-0.5">{(dancer as Record<string, unknown>).ban_reason as string}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isBanned ? "Reason for lifting ban" : "Ban reason"} <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={isBanned ? "e.g. Reviewed and cleared" : "e.g. Fraudulent ID, repeated violations"}
              rows={3}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none bg-background"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || isPending}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              isBanned
                ? "bg-green-500 hover:bg-green-400 text-white"
                : "bg-red-500 hover:bg-red-400 text-white"
            }`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isBanned ? <ShieldOff className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            {isBanned ? "Lift Ban" : "Ban Performer"}
          </button>

          {/* Ban history */}
          {log.length > 0 && (
            <div>
              <button
                onClick={() => setLogOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <Clock className="w-3 h-3" />
                Ban history ({log.length})
                {logOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {logOpen && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {logLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                  ) : log.map(entry => (
                    <div key={entry.id} className={`px-3 py-2 rounded-xl text-xs border ${
                      entry.action === "banned"
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-green-500/5 border-green-500/20"
                    }`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-semibold uppercase tracking-wider ${entry.action === "banned" ? "text-red-500" : "text-green-500"}`}>
                          {entry.action === "banned" ? "Banned" : "Unbanned"}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" })}
                        </span>
                      </div>
                      {entry.reason && <p className="text-muted-foreground">{entry.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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
  const [banDancer, setBanDancer]         = useState<Dancer | null>(null);

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
                className={`glass-card p-4 flex items-center gap-4 ${!d.is_active ? "opacity-60" : ""} ${(d as Record<string, unknown>).is_banned ? "border border-red-500/40 bg-red-500/5" : ""}`}
              >
                {/* Avatar placeholder */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${(d as Record<string, unknown>).is_banned ? "bg-red-500/20" : "bg-secondary/60"}`}>
                  {(d as Record<string, unknown>).is_banned
                    ? <Ban className="w-5 h-5 text-red-400" />
                    : <User className="w-5 h-5 text-muted-foreground" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{d.stage_name}</p>
                    {(d as Record<string, unknown>).is_banned && (
                      <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                        <Ban className="w-3 h-3" /> BANNED
                      </span>
                    )}
                    {!((d as Record<string, unknown>).is_banned) && (d.facial_hash ? (
                      <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Face
                      </span>
                    ) : (
                      <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        No Face
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID: {d.enroll_id} · {d.payout_percentage}% · ${d.entrance_fee} fee
                  </p>
                  {(d as Record<string, unknown>).is_banned && (d as Record<string, unknown>).ban_reason && (
                    <p className="text-xs text-red-400/80 mt-0.5 truncate">
                      Reason: {(d as Record<string, unknown>).ban_reason as string}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!(d as Record<string, unknown>).is_banned && (
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
                  )}
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
                    title={(d as Record<string, unknown>).is_banned ? "Lift ban" : "Ban performer"}
                    onClick={() => setBanDancer(d)}
                    className={`p-2 rounded-lg transition-colors ${
                      (d as Record<string, unknown>).is_banned
                        ? "text-green-500 hover:bg-green-500/10"
                        : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    }`}
                  >
                    {(d as Record<string, unknown>).is_banned ? <ShieldOff className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
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

      {/* Ban / Unban Modal */}
      {banDancer && (
        <BanDancerModal
          dancer={banDancer}
          onClose={() => setBanDancer(null)}
          onDone={loadDancers}
        />
      )}
    </AppLayout>
  );
}
