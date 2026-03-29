import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";
import { supabase } from "@/integrations/supabase/client";

export default function Landing() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("demo_role");
    setLoggedIn(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 overflow-hidden relative">
      {loggedIn && (
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-all"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      )}
      {/* Subtle ambient pink glow behind logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-pink-400 opacity-[0.07] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Three-column layout */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">

          {/* LEFT — Dancer */}
          <div className="flex flex-col items-center gap-4 flex-1 w-full">
            <span className="text-xs font-bold tracking-[0.25em] text-gray-400 uppercase mb-1">Dancer</span>
            <button
              onClick={() => navigate("/login?type=dancer")}
              className="w-full max-w-[220px] py-4 px-6 bg-pink-500 hover:bg-pink-600 active:scale-[0.97] text-white font-bold text-lg rounded-2xl shadow-lg shadow-pink-200 transition-all duration-150"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/dancer/register")}
              className="w-full max-w-[220px] py-4 px-6 bg-white hover:bg-pink-50 active:scale-[0.97] text-pink-500 font-bold text-lg rounded-2xl border-2 border-pink-400 shadow-sm transition-all duration-150"
            >
              Create a Profile
            </button>
          </div>

          {/* CENTER — Animated Logo */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="relative flex items-center justify-center">
              {/* Pink glow ring — animated pulse */}
              <div className="absolute w-[220px] h-[220px] rounded-full bg-pink-400 opacity-[0.15] blur-2xl animate-[pulse_3s_ease-in-out_infinite]" />
              <img
                src={logo}
                alt="2NYT Entertainment"
                className="relative h-40 md:h-52 w-auto opacity-[0.85]"
                style={{
                  filter: "drop-shadow(0 0 28px rgba(236, 72, 153, 0.55)) drop-shadow(0 4px 12px rgba(0,0,0,0.12))",
                  animation: "float 6s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* RIGHT — Associate (Staff) */}
          <div className="flex flex-col items-center gap-4 flex-1 w-full">
            <span className="text-xs font-bold tracking-[0.25em] text-gray-400 uppercase mb-1">Associate</span>
            <button
              onClick={() => navigate("/login?type=staff")}
              className="w-full max-w-[220px] py-4 px-6 bg-gray-900 hover:bg-gray-800 active:scale-[0.97] text-white font-bold text-lg rounded-2xl shadow-lg shadow-gray-200 transition-all duration-150"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="w-full max-w-[220px] py-4 px-6 bg-white hover:bg-gray-50 active:scale-[0.97] text-gray-900 font-bold text-lg rounded-2xl border-2 border-gray-900 shadow-sm transition-all duration-150"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Dev nav — staff quick access below (hidden in production) */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3 opacity-40 hover:opacity-70 transition-opacity">
          {[
            { label: "Door Panel", path: "/door" },
            { label: "Rooms", path: "/rooms" },
            { label: "Dashboard", path: "/dashboard" },
            { label: "Floor View", path: "/floor" },
            { label: "Reports", path: "/reports" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
