import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ShieldCheck, LogIn } from "lucide-react";
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
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 items-center gap-12 md:gap-16">

        {/* ── LEFT: Logo + Branding ── */}
        <div className="flex flex-col items-center text-center">
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

        {/* ── RIGHT: Staff Login ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold text-foreground">Staff</span>
          </div>

          <button
            onClick={() => navigate("/login?role=staff")}
            className="w-full max-w-[240px] flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-white text-lg font-bold transition-all hover:opacity-90 shadow-md hover:shadow-lg"
          >
            <LogIn className="w-5 h-5" />
            Login
          </button>

        </div>

      </div>
    </div>
  );
}
