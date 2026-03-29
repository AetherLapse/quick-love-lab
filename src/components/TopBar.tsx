import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";
import { supabase } from "@/integrations/supabase/client";

export function TopBar({ badge, centerLabel }: { badge?: string; centerLabel?: string }) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("demo_role");
    window.location.href = "/";
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img src={logo} alt="2NYT Entertainment" className="h-10 w-auto" />
        </Link>
        {badge && (
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {badge}
          </span>
        )}
      </div>
      {centerLabel && (
        <span className="font-heading text-xl tracking-wide text-foreground hidden sm:block">{centerLabel}</span>
      )}
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        {loggedIn && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/50 transition-all"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        )}
      </div>
    </div>
  );
}
