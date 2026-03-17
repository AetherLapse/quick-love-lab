import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Users, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type Dancer = Tables<"dancers">;

export default function DancerManagement() {
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ stage_name: "", employee_id: "", pin_code: "", payout_percentage: "30", entrance_fee: "50" });

  useEffect(() => {
    loadDancers();
  }, []);

  const loadDancers = async () => {
    const { data } = await supabase.from("dancers").select("*").order("stage_name");
    setDancers(data ?? []);
  };

  const handleSave = async () => {
    const payload = {
      stage_name: form.stage_name,
      employee_id: form.employee_id,
      pin_code: form.pin_code,
      payout_percentage: parseFloat(form.payout_percentage),
      entrance_fee: parseFloat(form.entrance_fee),
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("dancers").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("dancers").insert(payload));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? "Dancer updated" : "Dancer added");
      setOpen(false);
      setEditId(null);
      setForm({ stage_name: "", employee_id: "", pin_code: "", payout_percentage: "30", entrance_fee: "50" });
      loadDancers();
    }
  };

  const openEdit = (d: Dancer) => {
    setEditId(d.id);
    setForm({
      stage_name: d.stage_name,
      employee_id: d.employee_id,
      pin_code: d.pin_code,
      payout_percentage: String(d.payout_percentage),
      entrance_fee: String(d.entrance_fee),
    });
    setOpen(true);
  };

  const toggleActive = async (d: Dancer) => {
    await supabase.from("dancers").update({ is_active: !d.is_active }).eq("id", d.id);
    loadDancers();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Dancers</h1>
            <p className="text-muted-foreground">Manage contractor profiles</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm({ stage_name: "", employee_id: "", pin_code: "", payout_percentage: "30", entrance_fee: "50" }); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Dancer</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading">{editId ? "Edit" : "Add"} Dancer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground">Stage Name</Label>
                  <Input value={form.stage_name} onChange={(e) => setForm({ ...form, stage_name: e.target.value })} className="bg-secondary" />
                </div>
                <div>
                  <Label className="text-foreground">Employee ID (4 digits)</Label>
                  <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} maxLength={4} className="bg-secondary" />
                </div>
                <div>
                  <Label className="text-foreground">PIN Code (4 digits)</Label>
                  <Input value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} maxLength={4} type="password" className="bg-secondary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Payout %</Label>
                    <Input type="number" value={form.payout_percentage} onChange={(e) => setForm({ ...form, payout_percentage: e.target.value })} className="bg-secondary" />
                  </div>
                  <div>
                    <Label className="text-foreground">Entrance Fee $</Label>
                    <Input type="number" value={form.entrance_fee} onChange={(e) => setForm({ ...form, entrance_fee: e.target.value })} className="bg-secondary" />
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {dancers.map((d) => (
            <div key={d.id} className={`glass-card p-4 flex items-center justify-between ${!d.is_active ? "opacity-50" : ""}`}>
              <div>
                <p className="font-semibold text-foreground">{d.stage_name}</p>
                <p className="text-xs text-muted-foreground">ID: {d.employee_id} • {d.payout_percentage}% cut • ${d.entrance_fee} fee</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(d)} className={d.is_active ? "text-destructive" : "text-success"}>
                  {d.is_active ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
          {dancers.length === 0 && <p className="text-muted-foreground text-center py-8">No dancers added yet</p>}
        </div>
      </div>
    </AppLayout>
  );
}
