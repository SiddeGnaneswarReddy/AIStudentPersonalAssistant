import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ArrowLeft, FileText, ScrollText, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/materials/$id/")({
  component: MaterialDetail,
  head: () => ({ meta: [{ title: "Material — Arcane" }] }),
});

function MaterialDetail() {
  const { id } = Route.useParams();

  const { data: material } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["material-stats", id],
    queryFn: async () => {
      const [{ count: fc }, { count: q }, { data: cards }, { data: attempts }] = await Promise.all([
        supabase.from("flashcards").select("*", { count: "exact", head: true }).eq("material_id", id),
        supabase.from("quiz_questions").select("*", { count: "exact", head: true }).eq("material_id", id),
        supabase.from("flashcards").select("reps").eq("material_id", id),
        supabase.from("quiz_attempts").select("is_correct, question_id").eq("material_id", id),
      ]);
      const reviewed = (cards ?? []).filter((c) => (c.reps ?? 0) > 0).length;
      const mastered = (cards ?? []).filter((c) => (c.reps ?? 0) >= 2).length;
      const fcTotal = fc ?? 0;
      const qTotal = q ?? 0;
      const best = new Map<string, boolean>();
      for (const a of attempts ?? []) {
        if (a.is_correct) best.set(a.question_id, true);
        else if (!best.has(a.question_id)) best.set(a.question_id, false);
      }
      const quizCorrect = [...best.values()].filter(Boolean).length;
      const quizAnswered = best.size;
      return {
        fcTotal, qTotal,
        recallPct: fcTotal ? Math.round((mastered / fcTotal) * 100) : 0,
        reviewedPct: fcTotal ? Math.round((reviewed / fcTotal) * 100) : 0,
        quizCorrect, quizAnswered,
        quizPct: qTotal ? Math.round((quizCorrect / qTotal) * 100) : 0,
      };
    },
  });

  if (!material) {
    return <div className="p-12 text-ink/40 text-sm">Loading…</div>;
  }

  const notesCount = material.notes?.length ?? 0;
  const notesPct = notesCount > 0 ? 100 : 0;

  return (
    <div className="p-12 max-w-5xl">
      <Link to="/materials" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-moss mb-8">
        <ArrowLeft className="size-4" /> All materials
      </Link>

      <header className="mb-12">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-3">
          <FileText className="size-3.5" /> Material
        </div>
        <h1 className="font-serif text-4xl mb-2">{material.title}</h1>
        <p className="text-ink/60 text-sm">
          {notesCount} revision notes • {stats?.fcTotal ?? 0} recall cards • {stats?.qTotal ?? 0} exam questions
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard
          to="/materials/$id/notes" id={id}
          icon={ScrollText} title="Revision Notes"
          desc="Every key point as quick-scan bullets."
          progressLabel={notesCount ? `${notesCount} bullets ready` : "Generating…"}
          pct={notesPct} cta="Read notes →"
        />
        <ActionCard
          to="/flashcards/$id" id={id}
          icon={Brain} title="Recall Challenge"
          desc="Active recall with spaced repetition."
          progressLabel={`${stats?.recallPct ?? 0}% mastered`}
          pct={stats?.recallPct ?? 0} cta="Begin recall →"
        />
        <ActionCard
          to="/quiz/$id" id={id}
          icon={ClipboardCheck} title="Exam Simulator"
          desc="MCQs with instant feedback and explanations."
          progressLabel={stats?.quizAnswered ? `${stats?.quizCorrect}/${stats?.qTotal} correct` : "Not started"}
          pct={stats?.quizPct ?? 0} cta="Start exam →"
          dark
        />
      </div>
    </div>
  );
}

function ActionCard({
  to, id, icon: Icon, title, desc, progressLabel, pct, cta, dark,
}: {
  to: any; id: string; icon: any; title: string; desc: string;
  progressLabel: string; pct: number; cta: string; dark?: boolean;
}) {
  const base = dark
    ? "bg-moss text-cream hover:bg-sage"
    : "bg-white border border-ink/5 text-ink hover:border-moss/40";
  const sub = dark ? "text-cream/70" : "text-ink/60";
  const meterTrack = dark ? "bg-cream/15" : "bg-sand";
  const meterFill = dark ? "bg-cream" : "bg-moss";
  const ctaCls = dark ? "text-cream" : "text-moss";
  return (
    <Link
      to={to}
      params={{ id }}
      className={`group rounded-3xl p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all ${base}`}
    >
      <Icon className={`size-6 mb-5 ${dark ? "text-cream/80" : "text-moss"}`} />
      <h2 className="font-serif text-2xl mb-2">{title}</h2>
      <p className={`text-sm mb-5 ${sub}`}>{desc}</p>
      <div className="mb-5">
        <div className={`flex items-center justify-between text-[11px] uppercase tracking-widest font-bold mb-2 ${sub}`}>
          <span>{progressLabel}</span>
          <span>{pct}%</span>
        </div>
        <div className={`h-1.5 w-full rounded-full overflow-hidden ${meterTrack}`}>
          <div className={`h-full ${meterFill} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className={`text-sm font-medium group-hover:gap-3 inline-flex items-center gap-2 transition-all ${ctaCls}`}>
        {cta}
      </span>
    </Link>
  );
}
