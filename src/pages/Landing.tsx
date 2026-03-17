import { useNavigate } from "react-router-dom";
import { ArrowRight, DoorOpen, Sofa, BarChart3, Eye } from "lucide-react";
import logo from "@/assets/logo-2nyt.png";

const roles = [
  {
    icon: DoorOpen,
    title: "CHECK-IN",
    description: "Entrance check-in & ID scanning",
    path: "/door",
    RoleIcon: DoorOpen,
  },
  {
    icon: Sofa,
    title: "VIP ROOM",
    description: "Private room session tracking",
    path: "/rooms",
    RoleIcon: Sofa,
  },
  {
    icon: BarChart3,
    title: "Admin",
    description: "Full financials & reporting",
    path: "/dashboard",
    RoleIcon: BarChart3,
  },
  {
    icon: Eye,
    title: "Manager",
    description: "Live floor & headcount view",
    path: "/floor",
    RoleIcon: Eye,
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-dark flex flex-col items-center justify-center px-4 py-12">
      {/* Background animated gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_120s_linear_infinite] opacity-[0.03]"
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, hsl(46 92% 53%) 10%, transparent 20%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full">
        <img src={logo} alt="2NYT Entertainment" className="h-32 md:h-48 w-auto mb-4 animate-fade-in drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]" />

        <p className="text-lg md:text-xl text-muted-foreground mb-16 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          Venue Intelligence. Built for the Floor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {roles.map((role, i) => (
            <button
              key={role.path}
              onClick={() => navigate(role.path)}
              className="group relative glass-card p-6 text-left transition-all duration-300 hover:border-primary/50 hover:glow-gold animate-slide-up"
              style={{ animationDelay: `${0.2 + i * 0.1}s`, opacity: 0 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <role.RoleIcon className="w-7 h-7 text-primary mb-2" />
                  <h3 className="font-heading text-2xl text-foreground tracking-wide mb-1">
                    {role.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 group-hover:translate-x-1 duration-200" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
