import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy, BarChart3, Calendar, LogOut, Sparkles, Menu } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/", icon: CalendarDays, label: "Week" },
  { to: "/monthly", icon: BarChart3, label: "Progress" },
  { to: "/goals", icon: Trophy, label: "Goals" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); nav("/login"); };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border bg-card/40 p-5">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-serif text-xl">Momentum</span>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to} end={to === "/"}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-accent"
                }`
              }
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-2 truncate" data-testid="user-email">{user?.email}</p>
          <Button variant="ghost" size="sm" onClick={doLogout} className="w-full justify-start" data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-serif text-lg">Momentum</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} data-testid="mobile-menu-btn">
          <Menu className="w-5 h-5" />
        </Button>
      </header>
      {open && (
        <div className="md:hidden border-b border-border bg-card p-3 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to} end={to === "/"}
              onClick={() => setOpen(false)}
              data-testid={`mnav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? "bg-primary/10 text-primary" : "text-foreground/70"}`
              }
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
          <Button variant="ghost" size="sm" onClick={doLogout} className="w-full justify-start">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
