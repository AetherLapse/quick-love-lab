import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, Loader2, DoorOpen, GlassWater, User, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-2nyt.png";

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
};

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isDancer = params.get("role") === "dancer";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [shake, setShake]       = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex(i => (i + 1) % TAGLINES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const dest = data?.role ? (ROLE_REDIRECTS[data.role] ?? "/dashboard") : "/dashboard";
      navigate(dest);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center w-80 px-10 shrink-0"
        style={{ background: "hsl(240 18% 10%)" }}
      >
        <img
          src={logo}
          alt="2NYT Entertainment"
          className="h-36 w-auto drop-shadow-lg mb-5 animate-float"
        />
        <h2 className="text-white text-lg font-extrabold tracking-tight text-center mb-2">
          2NYT ENTERTAINMENT
        </h2>
        <p
          key={taglineIndex}
          className="text-primary text-sm font-medium tracking-wide text-center animate-tagline-in"
        >
          {TAGLINES[taglineIndex]}
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-12"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(328 78% 90% / 0.35) 0%, hsl(0 0% 100%) 70%)",
        }}
      >
        <div className={`w-full max-w-sm ${shake ? "animate-shake" : ""}`}>
          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <img src={logo} alt="2NYT" className="h-20 w-auto animate-float mb-3" />
            <p className="text-sm font-bold text-foreground">2NYT ENTERTAINMENT</p>
          </div>

          <h1 className="text-3xl font-heading tracking-widest text-foreground mb-2">
            {isDancer ? "DANCER LOGIN" : "STAFF LOGIN"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {isDancer ? "Sign in to your dancer account" : "Sign in to your associate account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full border border-border rounded-xl px-4 py-3.5 text-sm text-foreground bg-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                placeholder="you@example.com"
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
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-xl py-3.5 text-base hover:opacity-90 transition-all disabled:opacity-60 shadow-md hover:shadow-lg mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-border/60 pt-5 space-y-2.5">
            {[
              { label: "Login as Doorman",   icon: DoorOpen,   role: "door_staff" },
              { label: "Login as Bartender", icon: GlassWater, role: "bartender" },
              { label: "Login as Dancer",    icon: User,       role: "dancer" },
              { label: "Login as DJ",        icon: Music2,     role: "dj" },
            ].map(({ label, icon: Icon, role }) => (
              <button
                key={role}
                onClick={() => navigate(`/login?role=${role}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:border-primary/50 hover:bg-primary/5 text-foreground text-sm font-medium transition-all shadow-sm"
              >
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-transparent text-muted-foreground hover:text-foreground text-sm font-semibold transition-all"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
