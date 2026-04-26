import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Loader2, DoorOpen, GlassWater, Music2, ArrowLeft, Delete, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-2nyt.png";

const SUPABASE_URL  = "https://fwinnniiugjfmpkgybyu.supabase.co";
const ANON_KEY      = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";

const TAGLINES = [
  "Venue Intelligence Built from the Floor Up!",
  "A Stage for your Venue, Pole Intelligence!",
];

const ROLE_REDIRECTS: Record<string, string> = {
  admin:          "/dashboard",
  owner:          "/dashboard",
  manager:        "/dashboard",
  door_staff:     "/door",
  room_attendant: "/rooms",
  house_mom:      "/dashboard",
  bartender:      "/backroom",
  dj:             "/backroom",
};

const STAFF_ROLES = [
  { label: "Login as Doorman",   icon: DoorOpen,   role: "door_staff" },
  { label: "Login as Bartender", icon: GlassWater, role: "bartender"  },
  { label: "Login as DJ",        icon: Music2,     role: "dj"         },
];

const ROLE_LABELS: Record<string, string> = {
  door_staff: "Doorman",
  bartender:  "Bartender",
  dj:         "DJ",
};

// ── PIN pad ───────────────────────────────────────────────────────────────────
function PinPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const MAX = 8;
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="space-y-4">
      {/* Dots */}
      <div className="flex justify-center gap-3 py-2">
        {Array.from({ length: MAX }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
              i < value.length
                ? "bg-primary border-primary scale-110"
                : "border-border"
            }`}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "⌫") {
            return (
              <button
                key={i}
                onClick={() => onChange(value.slice(0, -1))}
                className="aspect-square flex items-center justify-center rounded-2xl border border-border bg-white hover:bg-secondary text-muted-foreground transition-all text-lg font-semibold shadow-sm"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => value.length < MAX && onChange(value + k)}
              className="aspect-square flex items-center justify-center rounded-2xl border border-border bg-white hover:border-primary hover:bg-primary/5 text-foreground text-xl font-bold transition-all shadow-sm active:scale-95"
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [shake, setShake]       = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [ownerMode, setOwnerMode] = useState(false);

  // PIN login state
  const [pinMode,    setPinMode]    = useState<string | null>(null); // role string or null
  const [pin,        setPin]        = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError,   setPinError]   = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex(i => (i + 1) % TAGLINES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  // ── Email / password login ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      triggerShake();
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).maybeSingle();
      navigate(data?.role ? (ROLE_REDIRECTS[data.role] ?? "/dashboard") : "/dashboard");
    }
    setLoading(false);
  };

  // ── PIN login ─────────────────────────────────────────────────────────────
  const handlePinLogin = async () => {
    if (!pinMode || pin.length < 4) return;
    setPinLoading(true);
    setPinError("");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/staff-pin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ role: pinMode, pin }),
      });

      const data = await res.json();

      if (!data.success) {
        const msgs: Record<string, string> = {
          wrong_pin:    "Incorrect PIN — try again",
          no_role:      "No role assigned to this account — contact admin",
          inactive:     "This account is inactive",
          user_not_found: "Staff account not found",
          link_error:   "Login service error — contact admin",
        };
        setPinError(msgs[data.reason] ?? "Login failed");
        setPin("");
        triggerShake();
        return;
      }

      // Exchange the token hash for a real Supabase session
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "email",
      });

      if (verifyErr) {
        setPinError("Session error — try again");
        setPin("");
        triggerShake();
        return;
      }

      // Wait for the session to be fully established, then fetch role
      // before navigating — same pattern as email/password login.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roleData } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", session.user.id).maybeSingle();
        navigate(roleData?.role ? (ROLE_REDIRECTS[roleData.role] ?? "/dashboard") : (ROLE_REDIRECTS[pinMode] ?? "/dashboard"));
      } else {
        navigate(ROLE_REDIRECTS[pinMode] ?? "/dashboard");
      }
    } catch {
      setPinError("Network error — try again");
      setPin("");
    } finally {
      setPinLoading(false);
    }
  };

  // Auto-submit once PIN reaches 4+ digits and user presses a digit (can also manually submit)
  // No auto-submit — let the user press Sign In

  const openPinMode = (role: string) => {
    if (role === "dancer") { navigate("/dancer-login"); return; }
    setPinMode(role);
    setPin("");
    setPinError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center w-80 px-10 shrink-0"
        style={{ background: "hsl(240 18% 10%)" }}
      >
        <img src={logo} alt="2NYT Entertainment" className="h-36 w-auto drop-shadow-lg mb-5 animate-float" />
        <h2 className="text-white text-lg font-extrabold tracking-tight text-center mb-2">
          2NYT ENTERTAINMENT
        </h2>
        <p key={taglineIndex} className="text-primary text-sm font-medium tracking-wide text-center animate-tagline-in">
          {TAGLINES[taglineIndex]}
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-12"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(328 78% 90% / 0.35) 0%, hsl(0 0% 100%) 70%)",
        }}
      >
        <div className={`w-full max-w-sm ${shake ? "animate-shake" : ""}`}>
          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <img src={logo} alt="2NYT" className="h-20 w-auto animate-float mb-3" />
            <p className="text-sm font-bold text-foreground">2NYT ENTERTAINMENT</p>
          </div>

          {/* ── PIN mode ── */}
          {pinMode ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => { setPinMode(null); setPin(""); setPinError(""); }}
                  className="p-2 rounded-xl border border-border hover:bg-secondary text-muted-foreground transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-2xl font-heading tracking-widest text-foreground">
                    {ROLE_LABELS[pinMode] ?? pinMode.replace("_", " ").toUpperCase()} LOGIN
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter your PIN to check in</p>
                </div>
              </div>

              <PinPad value={pin} onChange={v => { setPin(v); setPinError(""); }} />

              {pinError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                  <p className="text-destructive text-sm text-center">{pinError}</p>
                </div>
              )}

              <button
                onClick={handlePinLogin}
                disabled={pin.length < 4 || pinLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-xl py-3.5 text-base hover:opacity-90 transition-all disabled:opacity-60 shadow-md"
              >
                {pinLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                {pinLoading ? "Signing in…" : "Sign In"}
              </button>
            </div>

          ) : ownerMode ? (
            /* ── Owner / email-password mode ── */
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => { setOwnerMode(false); setEmail(""); setPassword(""); setError(""); }}
                  className="p-2 rounded-xl border border-border hover:bg-secondary text-muted-foreground transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-2xl font-heading tracking-widest text-foreground">OWNER LOGIN</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">Sign in with your account credentials</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="w-full border border-border rounded-xl px-4 py-3.5 text-sm text-foreground bg-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    placeholder="you@example.com"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="w-full border border-border rounded-xl px-4 py-3.5 text-sm text-foreground bg-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-xl py-3.5 text-base hover:opacity-90 transition-all disabled:opacity-60 shadow-md hover:shadow-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </div>

          ) : (
            /* ── Default: PIN role selection ── */
            <>
              <h1 className="text-3xl font-heading tracking-widest text-foreground mb-2">STAFF LOGIN</h1>
              <p className="text-sm text-muted-foreground mb-8">Sign in to your associate account</p>

              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground text-center uppercase tracking-wider mb-3">Login with PIN</p>
                {STAFF_ROLES.map(({ label, icon: Icon, role }) => (
                  <button
                    key={role}
                    onClick={() => openPinMode(role)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:border-primary/50 hover:bg-primary/5 text-foreground text-sm font-medium transition-all shadow-sm"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    {label}
                  </button>
                ))}

                {/* Owner login — visually separated */}
                <div className="pt-2">
                  <button
                    onClick={() => setOwnerMode(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 text-primary text-sm font-semibold transition-all shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Login as Owner
                  </button>
                </div>
              </div>

              <button
                onClick={() => navigate("/")}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-transparent text-muted-foreground hover:text-foreground text-sm font-semibold transition-all"
              >
                ← Back to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
