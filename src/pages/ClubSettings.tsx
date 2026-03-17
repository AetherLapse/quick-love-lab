import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

export default function ClubSettings() {
  const [songPrice, setSongPrice] = useState("50");
  const [doorFee, setDoorFee] = useState("20");
  const [dancerFee, setDancerFee] = useState("50");
  const [payoutPct, setPayoutPct] = useState("30");
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("club_settings").select("*").single();
    if (data) {
      setSettingsId(data.id);
      setSongPrice(String(data.song_price));
      setDoorFee(String(data.default_door_fee));
      setDancerFee(String(data.default_dancer_entrance_fee));
      setPayoutPct(String(data.default_dancer_payout_pct));
    }
  };

  const handleSave = async () => {
    if (!settingsId) return;
    const { error } = await supabase.from("club_settings").update({
      song_price: parseFloat(songPrice),
      default_door_fee: parseFloat(doorFee),
      default_dancer_entrance_fee: parseFloat(dancerFee),
      default_dancer_payout_pct: parseFloat(payoutPct),
    }).eq("id", settingsId);

    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> Club Settings
          </h1>
          <p className="text-muted-foreground">Configure pricing and payout percentages</p>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div>
            <Label className="text-foreground">Song Price ($)</Label>
            <Input type="number" value={songPrice} onChange={(e) => setSongPrice(e.target.value)} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-foreground">Customer Door Fee ($)</Label>
            <Input type="number" value={doorFee} onChange={(e) => setDoorFee(e.target.value)} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-foreground">Dancer Entrance Fee ($)</Label>
            <Input type="number" value={dancerFee} onChange={(e) => setDancerFee(e.target.value)} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-foreground">Default Dancer Payout (%)</Label>
            <Input type="number" value={payoutPct} onChange={(e) => setPayoutPct(e.target.value)} className="bg-secondary" />
          </div>
          <Button onClick={handleSave} className="w-full touch-target">
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
