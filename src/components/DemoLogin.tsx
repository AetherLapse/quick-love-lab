import { useState, ReactNode } from "react";
import { LogIn } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";

const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  admin: { email: "admin@2nyt.com", password: "admin2nyt" },
  manager: { email: "manager@2nyt.com", password: "mgr2nyt" },
};

interface DemoLoginProps {
  role: "admin" | "manager";
  children: ReactNode;
}

export default function DemoLogin({ role, children }: DemoLoginProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const creds = DEMO_CREDENTIALS[role];
  const label = role === "admin" ? "Admin Dashboard" : "Manager View";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === creds.email && password === creds.password) {
      setAuthenticated(true);
    } else {
      setError("Invalid credentials");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm bg-card border border-border rounded-xl p-8 space-y-6 transition-transform ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      >
         <div className="text-center space-y-2">
          <img src={logo} alt="2NYT Entertainment" className="h-16 w-auto mx-auto" />
          <p className="text-muted-foreground text-sm">{label} Login</p>
        </div>

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
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium rounded-lg py-3 text-sm hover:brightness-110 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </form>

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground text-center mb-2">Demo Credentials</p>
          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1 font-mono">
            <p>Email: <span className="text-foreground">{creds.email}</span></p>
            <p>Pass: <span className="text-foreground">{creds.password}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
