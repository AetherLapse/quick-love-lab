import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-2nyt.png";

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

    // Fetch role and redirect
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
      {/* Left decorative panel */}
      <div
        className="hidden md:flex flex-col items-center justify-center w-80 px-10"
        style={{ background: "hsl(240 18% 10%)" }}
      >
        <img src={logo} alt="2NYT Entertainment" className="h-20 w-auto mb-6" />
        <p className="text-white/40 text-xs tracking-widest uppercase text-center">
          Venue Intelligence<br />Built for the Floor
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div
          className={`w-full max-w-sm ${shake ? "animate-shake" : ""}`}
        >
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-8">
            <img src={logo} alt="2NYT" className="h-14 w-auto" />
          </div>

          <h1
            className="text-3xl font-heading tracking-widest text-foreground mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {isDancer ? "DANCER LOGIN" : "STAFF LOGIN"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {isDancer ? "Sign in to your dancer account" : "Sign in to your associate account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-destructive text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium rounded-xl py-3 text-sm hover:opacity-90 transition-all disabled:opacity-60 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <button
            onClick={() => navigate("/")}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
