import { useState, useEffect, ReactNode } from "react";
import { LogIn, Loader2, ShieldX, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-2nyt.png";
import { supabase } from "@/integrations/supabase/client";

export type DemoRole =
  | "owner"
  | "admin"
  | "manager"
  | "door_staff"
  | "room_attendant"
  | "house_mom";

const CREDENTIALS: Record<DemoRole, { email: string; password: string; label: string }> = {
  owner:          { email: "owner@2nyt.com",    password: "owner2nyt",  label: "Owner" },
  admin:          { email: "admin@2nyt.com",    password: "admin2nyt",  label: "Admin" },
  manager:        { email: "manager@2nyt.com",  password: "mgr2nyt",    label: "Manager" },
  door_staff:     { email: "door@2nyt.com",     password: "door2nyt",   label: "Door / Security" },
  room_attendant: { email: "room@2nyt.com",     password: "room2nyt",   label: "Room Attendant" },
  house_mom:      { email: "housemom@2nyt.com", password: "hmom2nyt",   label: "House Mom" },
};

// Fetch the user's role from user_roles table
async function fetchUserRole(userId: string): Promise<DemoRole | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as DemoRole) ?? null;
}

interface RoleGuardProps {
  allowedRoles: DemoRole[];
  children: ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "login" | "denied" | "ok">("checking");
  const [userRole, setUserRole] = useState<DemoRole | null>(null);

  // Which role to show demo creds for — picker in login form
  const [selectedRole, setSelectedRole] = useState<DemoRole>(allowedRoles[0]);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);
  const [loading, setLoading]   = useState(false);

  const checkAccess = async (session: { user: { id: string } } | null) => {
    if (!session) { setState("login"); return; }
    const role = await fetchUserRole(session.user.id);
    setUserRole(role);
    if (role && allowedRoles.includes(role)) {
      localStorage.setItem("demo_role", role);
      setState("ok");
    } else {
      setState("denied");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => checkAccess(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) checkAccess(session);
      else { setState("login"); setUserRole(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    // checkAccess fires via onAuthStateChange
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("demo_role");
    setState("login");
  };

  // ── Checking ──────────────────────────────────────────────────────────────
  if (state === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Access Denied ─────────────────────────────────────────────────────────
  if (state === "denied") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8 space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldX className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Access Denied</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Your role <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs">{userRole ?? "unknown"}</span> does not have permission to access this page.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Required: {allowedRoles.join(", ")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all"
            >
              Go to Home
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Log out &amp; switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Login Form ────────────────────────────────────────────────────────────
  if (state === "login") {
    const creds = CREDENTIALS[selectedRole];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className={`w-full max-w-sm bg-card border border-border rounded-xl p-8 space-y-6 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
          <div className="text-center space-y-2">
            <img src={logo} alt="2NYT" className="h-14 w-auto mx-auto" />
            <p className="text-muted-foreground text-sm">Sign in to continue</p>
          </div>

          {/* Role picker (if multiple roles allowed) */}
          {allowedRoles.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Role</label>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    const r = e.target.value as DemoRole;
                    setSelectedRole(r);
                    setEmail(CREDENTIALS[r].email);
                    setPassword(CREDENTIALS[r].password);
                    setError("");
                  }}
                  className="w-full appearance-none bg-secondary border border-border rounded-lg px-4 py-3 pr-10 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                >
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>{CREDENTIALS[r].label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder={creds.email}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-destructive text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium rounded-lg py-3 text-sm hover:brightness-110 transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground text-center mb-2">Demo Credentials</p>
            <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1 font-mono">
              <p>Email: <span className="text-foreground">{creds.email}</span></p>
              <p>Pass:&nbsp; <span className="text-foreground">{creds.password}</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Authorised ────────────────────────────────────────────────────────────
  return <>{children}</>;
}
