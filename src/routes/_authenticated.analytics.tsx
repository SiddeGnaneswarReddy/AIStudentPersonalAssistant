import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BarChart3, Target, Clock, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics — Arcane" }] }),
});

function AnalyticsPage() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["analytics", user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [{ data: attempts }, { data: focus }] = await Promise.all([
        supabase.from("quiz_attempts").select("is_correct, created_at").gte("created_at", since),
        supabase.from("focus_sessions").select("duration_seconds, started_at").gte("started_at", since),
      ]);
      return { attempts: attempts ?? [], focus: focus ?? [] };
    },
    enabled: !!user,
  });

  const attempts = data?.attempts ?? [];
  const focus = data?.focus ?? [];

  const weekAttempts = attempts.filter((a) => new Date(a.created_at).getTime() > Date.now() - 7 * 86400_000);
  const weekSeconds = focus
    .filter((f) => new Date(f.started_at).getTime() > Date.now() - 7 * 86400_000)
    .reduce((s, f) => s + (f.duration_seconds ?? 0), 0);
  const weekAccuracy = weekAttempts.length
    ? Math.round((weekAttempts.filter((a) => a.is_correct).length / weekAttempts.length) * 100)
    : 0;

  // 30-day daily breakdown
  const days: { label: string; count: number; intensity: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    let count = 0;
    for (const a of attempts) if (new Date(a.created_at).toDateString() === key) count++;
    for (const f of focus) if (new Date(f.started_at).toDateString() === key) count += 2;
    const intensity = count === 0 ? 0 : count < 3 ? 1 : count < 8 ? 2 : count < 20 ? 3 : 4;
    days.push({ label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count, intensity });
  }

  return (
    <div className="p-12 max-w-5xl">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-3">
          <BarChart3 className="size-3.5" /> Analytics
        </div>
        <h1 className="font-serif text-4xl mb-2">This week</h1>
        <p className="text-ink/60">Your study habits at a glance.</p>
      </header>

      <section className="grid grid-cols-3 gap-5 mb-12">
        <Tile icon={Clock} label="Studied" value={formatTime(weekSeconds)} />
        <Tile icon={Target} label="Questions answered" value={String(weekAttempts.length)} />
        <Tile icon={Flame} label="Accuracy" value={`${weekAccuracy}%`} accent />
      </section>

      <section className="bg-white border border-ink/5 rounded-3xl p-7 shadow-sm">
        <h2 className="font-serif text-xl mb-1">Activity — last 30 days</h2>
        <p className="text-xs text-ink/50 mb-6">Each cell is a day. Darker means more activity.</p>
        <div className="grid grid-cols-15 gap-1.5" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
          {days.map((d, i) => (
            <div
              key={i}
              title={`${d.label}: ${d.count} activities`}
              className={`aspect-square rounded ${heat(d.intensity)}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-6 text-[11px] text-ink/40">
          <span>Less</span>
          {[0,1,2,3,4].map((l) => <div key={l} className={`size-3 rounded ${heat(l)}`} />)}
          <span>More</span>
        </div>
      </section>
    </div>
  );
}

function Tile({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl border shadow-sm ${accent ? "bg-moss text-cream border-moss" : "bg-white border-ink/5"}`}>
      <div className={`flex items-center justify-between mb-4 ${accent ? "text-cream/60" : "text-ink/40"}`}>
        <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
        <Icon className="size-4" />
      </div>
      <div className="font-serif text-4xl">{value}</div>
    </div>
  );
}

function heat(level: number) {
  return ["bg-sand/60", "bg-moss/20", "bg-moss/40", "bg-moss/70", "bg-moss"][level];
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (!h && !m) return "0m";
  return `${h ? `${h}h ` : ""}${m}m`;
}
