import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { UserRound, ShieldCheck, LogIn, UserPlus } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";

const TAGLINES = [
  "Venue Intelligence Built from the Floor Up!",
  "A Stage for your Venue, Pole Intelligence!",
];

export default function Landing() {
  const navigate = useNavigate();
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex(i => (i + 1) % TAGLINES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(328 78% 90% / 0.45) 0%, hsl(0 0% 100%) 70%)",
      }}
    >
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 items-center gap-8 md:gap-4">

        {/* ── LEFT: Dancers ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 mb-1">
            <UserRound className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold text-foreground">Dancers</span>
          </div>

          <button
            onClick={() => navigate("/dancer-login")}
            className="w-full max-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-white hover:border-primary/60 text-foreground text-sm font-medium transition-all shadow-sm hover:shadow"
          >
            <LogIn className="w-4 h-4" />
            Login
          </button>

          <button
            onClick={() => navigate("/dancer-register")}
            className="w-full max-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-medium transition-all hover:opacity-90 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Create a Profile
          </button>
        </div>

        {/* ── CENTER: Logo ── */}
        <div className="flex flex-col items-center text-center order-first md:order-none">
          <img
            src={logo}
            alt="2NYT Entertainment"
            className="h-36 md:h-44 w-auto drop-shadow-md mb-5 animate-float"
          />
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight text-foreground">
            2NYT ENTERTAINMENT
          </h1>
          <div className="h-6 overflow-hidden mt-2">
            <p
              key={taglineIndex}
              className="text-sm font-medium text-primary tracking-wide animate-tagline-in"
            >
              {TAGLINES[taglineIndex]}
            </p>
          </div>
        </div>

        {/* ── RIGHT: Associates ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold text-foreground">Employee</span>
          </div>

          <button
            onClick={() => navigate("/login?role=staff")}
            className="w-full max-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-white hover:border-primary/60 text-foreground text-sm font-medium transition-all shadow-sm hover:shadow"
          >
            <LogIn className="w-4 h-4" />
            Login
          </button>

          <button
            onClick={() => navigate("/register")}
            className="w-full max-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-medium transition-all hover:opacity-90 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
        </div>

      </div>
    </div>
  );
}
