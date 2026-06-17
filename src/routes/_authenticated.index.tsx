import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus, BookOpen, FileText, Clock, Flame, Sparkles, TrendingUp, Target } from "lucide-react";

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

  const { data: attempts } = useQuery({
    queryKey: ["attempts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("is_correct, created_at, material_id")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: dueByMaterial } = useQuery({
    queryKey: ["due-by-mat", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("material_id")
        .lte("due_at", new Date().toISOString());
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of data ?? []) map.set(r.material_id, (map.get(r.material_id) ?? 0) + 1);
      return map;
    },
    enabled: !!user,
  });

  const { data: focus } = useQuery({
    queryKey: ["focus", user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("duration_seconds, started_at")
        .gte("started_at", since);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalSolved = attempts?.length ?? 0;
  const correctCount = attempts?.filter((a) => a.is_correct).length ?? 0;
  const accuracy = totalSolved ? Math.round((correctCount / totalSolved) * 100) : 0;
  const streak = computeStreak(attempts ?? [], focus ?? []);
  const heatmap = buildHeatmap(attempts ?? [], focus ?? []);
  const weekSeconds = (focus ?? []).reduce((s, f) => s + (f.duration_seconds ?? 0), 0);
  const weekAttempts = (attempts ?? []).filter(
    (a) => new Date(a.created_at).getTime() > Date.now() - 7 * 86400_000,
  ).length;

  const recommended = pickRecommendation(materials ?? [], dueByMaterial ?? new Map());

  return (
    <div className="p-12 max-w-6xl">
      <header className="mb-10 flex justify-between items-start gap-6">
        <div>
          <h1 className="font-serif text-4xl font-medium mb-2">Good day, {displayName}.</h1>
          <p className="text-ink/60">
            {streak > 0 ? `You're on a ${streak}-day streak — keep the flame alive.` : "Start a session today to begin your streak."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-amber-200/60 rounded-full px-4 py-2 shadow-sm">
            <Flame className="size-4 text-amber-500" />
            <span className="font-serif text-lg leading-none">{streak}</span>
            <span className="text-xs text-ink/50">day{streak === 1 ? "" : "s"}</span>
          </div>
          <Link to="/materials" className="px-5 py-2.5 bg-moss text-cream rounded-full text-sm font-medium hover:bg-sage transition-colors shadow-sm flex items-center gap-2">
            <Plus className="size-4" /> Upload
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-5 mb-10">
        <StatCard label="Materials" value={materials?.length ?? 0} icon={FileText} />
        <StatCard label="Questions Solved" value={totalSolved} icon={Target} />
        <StatCard label="Mastery" value={`${accuracy}%`} icon={TrendingUp} accent />
      </section>

      <section className="grid grid-cols-3 gap-5 mb-12">
        <div className="col-span-2 bg-white border border-ink/5 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-1">Mastery heatmap</p>
              <h3 className="font-serif text-xl">Last 7 days</h3>
            </div>
            <span className="text-xs text-ink/40">{weekAttempts} questions • {formatTime(weekSeconds)}</span>
          </div>
          <div className="flex gap-2 justify-between">
            {heatmap.map((d) => (
              <div key={d.key} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`h-14 w-full rounded-lg ${heatColor(d.intensity)} transition-all`}
                  title={`${d.label}: ${d.count} activities`}
                />
                <span className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          to={recommended ? "/materials/$id" : "/materials"}
          params={recommended ? { id: recommended.id } : undefined as any}
          className="bg-gradient-to-br from-moss to-sage text-cream rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block"
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-cream/60 font-bold mb-4">
            <Sparkles className="size-3.5" /> Recommended today
          </div>
          {recommended ? (
            <>
              <h3 className="font-serif text-xl mb-2 line-clamp-2">{recommended.title}</h3>
              <p className="text-cream/70 text-xs mb-6">
                Estimated 8 mins • {(dueByMaterial?.get(recommended.id) ?? 0)} cards due
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-medium border-b border-cream/40 pb-0.5">
                Start session →
              </span>
            </>
          ) : (
            <>
              <h3 className="font-serif text-xl mb-2">Upload your first PDF</h3>
              <p className="text-cream/70 text-xs mb-6">Arcane will draft notes, recall cards and an exam in seconds.</p>
              <span className="inline-flex items-center gap-2 text-sm font-medium border-b border-cream/40 pb-0.5">
                Get started →
              </span>
            </>
          )}
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl">Recent materials</h2>
          <Link to="/materials" className="text-sm text-moss hover:underline">View all →</Link>
        </div>

        {(materials ?? []).length === 0 ? (
          <div className="bg-sand/30 border border-ink/5 rounded-3xl p-16 text-center">
            <p className="font-serif text-xl text-ink mb-2">Your library is empty.</p>
            <p className="text-ink/60 text-sm mb-6">Upload a PDF and Arcane will draft notes, recall cards and an exam.</p>
            <Link to="/materials" className="inline-flex items-center gap-2 px-5 py-2.5 bg-moss text-cream rounded-full text-sm font-medium hover:bg-sage transition-colors">
              <Plus className="size-4" /> Upload your first PDF
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {materials!.slice(0, 6).map((m) => (
              <Link
                key={m.id}
                to="/materials/$id"
                params={{ id: m.id }}
                className="block bg-white border border-ink/5 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-moss/30 transition-all"
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

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: any; accent?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${accent ? "bg-moss text-cream border-moss" : "bg-white border-ink/5"}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[10px] uppercase tracking-widest font-bold ${accent ? "text-cream/60" : "text-ink/40"}`}>{label}</span>
        <Icon className={`size-4 ${accent ? "text-cream/70" : "text-moss"}`} />
      </div>
      <div className="font-serif text-4xl">{value}</div>
    </div>
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

function computeStreak(attempts: { created_at: string }[], focus: { started_at: string }[]) {
  const days = new Set<string>();
  for (const a of attempts) days.add(new Date(a.created_at).toDateString());
  for (const f of focus) days.add(new Date(f.started_at).toDateString());
  let streak = 0;
  const cur = new Date();
  // Allow today not yet active — start from today, then walk back
  if (!days.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toDateString())) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function buildHeatmap(attempts: { created_at: string }[], focus: { started_at: string; duration_seconds: number }[]) {
  const days: { key: string; day: string; label: string; count: number; intensity: number }[] = [];
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    let count = 0;
    for (const a of attempts) if (new Date(a.created_at).toDateString() === key) count++;
    for (const f of focus) if (new Date(f.started_at).toDateString() === key) count += 2;
    const intensity = count === 0 ? 0 : count < 3 ? 1 : count < 8 ? 2 : count < 20 ? 3 : 4;
    days.push({ key, day: dayLabels[d.getDay()], label: d.toLocaleDateString(), count, intensity });
  }
  return days;
}

function heatColor(level: number) {
  return [
    "bg-sand/60",
    "bg-moss/20",
    "bg-moss/40",
    "bg-moss/70",
    "bg-moss",
  ][level];
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (!h && !m) return "0m";
  return `${h ? `${h}h ` : ""}${m}m`;
}

function pickRecommendation(materials: { id: string; title: string; status: string }[], dueMap: Map<string, number>) {
  const ready = materials.filter((m) => m.status === "ready");
  if (ready.length === 0) return null;
  let best = ready[0];
  let bestDue = dueMap.get(best.id) ?? 0;
  for (const m of ready) {
    const d = dueMap.get(m.id) ?? 0;
    if (d > bestDue) { best = m; bestDue = d; }
  }
  return best;
}
