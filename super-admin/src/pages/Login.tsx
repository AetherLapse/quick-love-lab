import { useState } from "react";
import { useSuperAuth } from "@/hooks/useSuperAuth";
import { ShieldAlert, Loader2, LogIn } from "lucide-react";

export default function Login() {
  const { signIn } = useSuperAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const err = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-sm text-gray-400 mt-1">2NYT Platform Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="admin@yourplatform.com"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center">Restricted access — Super Admins only</p>
      </div>
    </div>
  );
}
