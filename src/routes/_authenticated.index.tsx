import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus, BookOpen, FileText, Calendar, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Arcane" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const displayName = (user?.user_metadata as any)?.display_name || user?.email?.split("@")[0] || "Scholar";

  const { data: materials } = useQuery({
    queryKey: ["materials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: dueCount } = useQuery({
    queryKey: ["due-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .lte("due_at", new Date().toISOString());
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", user?.id],
    queryFn: async () => {
      const [{ count: fcTotal }, { count: qTotal }] = await Promise.all([
        supabase.from("flashcards").select("*", { count: "exact", head: true }),
        supabase.from("quiz_questions").select("*", { count: "exact", head: true }),
      ]);
      return { fcTotal: fcTotal ?? 0, qTotal: qTotal ?? 0 };
    },
    enabled: !!user,
  });

  const recent = materials?.slice(0, 6) ?? [];

  return (
    <div className="p-12 max-w-6xl">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="font-serif text-4xl font-medium mb-2">Good day, {displayName}.</h1>
          <p className="text-ink/60">
            {dueCount ? `${dueCount} card${dueCount === 1 ? "" : "s"} ready for review.` : "Your library is calm — upload something new or start a session."}
          </p>
        </div>
        <Link to="/materials" className="px-6 py-2.5 bg-moss text-cream rounded-full text-sm font-medium hover:bg-sage transition-colors shadow-sm flex items-center gap-2">
          <Plus className="size-4" /> Upload Material
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-6 mb-14">
        <StatCard label="Materials" value={materials?.length ?? 0} icon={FileText} />
        <StatCard label="Flashcards" value={stats?.fcTotal ?? 0} icon={BookOpen} />
        <DueCard count={dueCount ?? 0} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl">Recent materials</h2>
          <Link to="/materials" className="text-sm text-moss hover:underline">View all →</Link>
        </div>

        {recent.length === 0 ? (
          <div className="bg-sand/30 border border-ink/5 rounded-3xl p-16 text-center">
            <p className="font-serif text-xl text-ink mb-2">Your library is empty.</p>
            <p className="text-ink/60 text-sm mb-6">Upload a PDF and Arcane will draft flashcards and a quiz in seconds.</p>
            <Link to="/materials" className="inline-flex items-center gap-2 px-5 py-2.5 bg-moss text-cream rounded-full text-sm font-medium hover:bg-sage transition-colors">
              <Plus className="size-4" /> Upload your first PDF
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recent.map((m) => (
              <Link
                key={m.id}
                to="/materials/$id"
                params={{ id: m.id }}
                className="block bg-white border border-ink/5 rounded-2xl p-6 hover:border-moss/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <FileText className="size-5 text-moss" />
                  <StatusPill status={m.status} />
                </div>
                <h3 className="font-serif text-lg mb-1 line-clamp-2">{m.title}</h3>
                <p className="text-xs text-ink/40 flex items-center gap-1.5">
                  <Clock className="size-3" /> {new Date(m.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-sand/40 p-6 rounded-2xl border border-ink/5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">{label}</span>
        <Icon className="size-4 text-moss" />
      </div>
      <div className="font-serif text-4xl">{value}</div>
    </div>
  );
}

function DueCard({ count }: { count: number }) {
  return (
    <Link to="/schedule" className="bg-moss text-cream p-6 rounded-2xl block hover:bg-sage transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-cream/50 font-bold">Due Today</span>
        <Calendar className="size-4 text-cream/70" />
      </div>
      <div className="font-serif text-4xl mb-1">{count}</div>
      <p className="text-xs text-cream/60">{count ? "Tap to review" : "All caught up"}</p>
    </Link>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles =
    status === "ready"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "failed"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-sand text-ink/60 border-ink/10";
  const label = status === "ready" ? "Ready" : status === "failed" ? "Failed" : "Generating…";
  return <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${styles}`}>{label}</span>;
}
