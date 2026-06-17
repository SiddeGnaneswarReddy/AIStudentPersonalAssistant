import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, LayoutDashboard, Library, Calendar, Brain, Sparkles, Moon, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function NavLink({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-moss text-cream" : "text-ink/60 hover:text-moss hover:bg-sand/60"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

function AuthedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-ink/40 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    throw redirect({ to: "/auth" });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName = (user.user_metadata as any)?.display_name || user.email?.split("@")[0] || "Scholar";

  return (
    <div className="min-h-screen bg-cream text-ink">
      <nav className="fixed left-0 top-0 h-full w-64 border-r border-ink/5 bg-sand/30 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="size-8 bg-moss rounded-full" />
          <span className="font-serif italic text-xl font-semibold tracking-tight text-moss">Arcane</span>
        </div>

        <div className="space-y-6 flex-1">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-3 px-3">Library</p>
            <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/materials" icon={Library}>Materials</NavLink>
            <NavLink to="/schedule" icon={Calendar}>Schedule</NavLink>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-3 px-3">Practice</p>
            <NavLink to="/focus" icon={Moon}>Focus Mode</NavLink>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-ink/5 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="size-8 rounded-full bg-moss text-cream flex items-center justify-center font-serif text-sm">
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-ink/40 truncate">{user.email}</div>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-ink/50 hover:text-moss hover:bg-sand/60 transition-colors">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </nav>

      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
