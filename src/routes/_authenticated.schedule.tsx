import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Clock, BookOpen, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/schedule")({
  component: SchedulePage,
  head: () => ({ meta: [{ title: "Schedule — Arcane" }] }),
});

function SchedulePage() {
  const { data } = useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id, front, due_at, material_id, materials(title)")
        .order("due_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const now = Date.now();
  const due = (data ?? []).filter((c) => new Date(c.due_at).getTime() <= now);
  const upcoming = (data ?? []).filter((c) => new Date(c.due_at).getTime() > now);

  const byMaterial = new Map<string, { title: string; count: number }>();
  for (const c of due) {
    const t = (c as any).materials?.title ?? "Untitled";
    const existing = byMaterial.get(c.material_id);
    byMaterial.set(c.material_id, { title: t, count: (existing?.count ?? 0) + 1 });
  }

  const estimatedMin = Math.max(1, Math.round(due.length * 0.5));
  const firstMaterial = [...byMaterial.keys()][0];

  return (
    <div className="p-12 max-w-5xl">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-3">
          <Calendar className="size-3.5" /> Spaced repetition
        </div>
        <h1 className="font-serif text-4xl mb-2">Today's session</h1>
        <p className="text-ink/60">A focused block, picked for you.</p>
      </header>

      <section className={`rounded-3xl p-10 mb-12 shadow-sm ${due.length ? "bg-gradient-to-br from-moss to-sage text-cream" : "bg-sand/40 border border-ink/5"}`}>
        {due.length ? (
          <>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold mb-4 text-cream/70">
              <Flame className="size-4" /> Due today
            </div>
            <div className="flex items-end gap-8 mb-8 flex-wrap">
              <div>
                <div className="font-serif text-6xl leading-none mb-1">{due.length}</div>
                <p className="text-cream/70 text-sm">question{due.length === 1 ? "" : "s"} ready</p>
              </div>
              <div className="flex items-center gap-2 text-cream/80 text-sm">
                <Clock className="size-4" /> {estimatedMin} min estimated
              </div>
              <div className="flex items-center gap-2 text-cream/80 text-sm">
                <BookOpen className="size-4" /> {byMaterial.size} material{byMaterial.size === 1 ? "" : "s"}
              </div>
            </div>
            <Link
              to="/flashcards/$id"
              params={{ id: firstMaterial! }}
              className="inline-flex items-center gap-2 bg-cream text-moss px-6 py-3 rounded-full font-medium hover:bg-white transition-colors shadow-sm"
            >
              Start session →
            </Link>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="font-serif text-2xl text-ink mb-2">All caught up.</p>
            <p className="text-ink/60 text-sm">No reviews due — come back later or start something new.</p>
          </div>
        )}
      </section>

      {byMaterial.size > 1 && (
        <section className="mb-12">
          <h2 className="font-serif text-2xl mb-6">Breakdown by material</h2>
          <div className="grid grid-cols-2 gap-4">
            {[...byMaterial.entries()].map(([mid, info]) => (
              <Link
                key={mid}
                to="/flashcards/$id"
                params={{ id: mid }}
                className="bg-white border border-ink/5 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-moss/40 transition-all flex items-center gap-4"
              >
                <div className="size-10 rounded-full bg-moss/10 flex items-center justify-center">
                  <BookOpen className="size-4 text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg truncate">{info.title}</h3>
                  <p className="text-xs text-ink/50">{info.count} card{info.count === 1 ? "" : "s"} due</p>
                </div>
                <span className="text-moss text-sm font-medium">Review →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl mb-6">Coming up</h2>
          <div className="space-y-2">
            {upcoming.slice(0, 20).map((c) => (
              <div key={c.id} className="bg-sand/30 border border-ink/5 rounded-xl px-5 py-3 flex items-center gap-4">
                <span className="text-xs text-ink/50 w-28 shrink-0">
                  {new Date(c.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="text-sm text-ink/80 truncate flex-1">{c.front}</span>
                <span className="text-xs text-ink/40 truncate max-w-[180px]">{(c as any).materials?.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
