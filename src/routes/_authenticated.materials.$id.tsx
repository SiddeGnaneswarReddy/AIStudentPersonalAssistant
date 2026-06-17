import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Brain, ArrowLeft, FileText, ScrollText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/materials/$id")({
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

  const { data: counts } = useQuery({
    queryKey: ["material-counts", id],
    queryFn: async () => {
      const [{ count: fc }, { count: q }] = await Promise.all([
        supabase.from("flashcards").select("*", { count: "exact", head: true }).eq("material_id", id),
        supabase.from("quiz_questions").select("*", { count: "exact", head: true }).eq("material_id", id),
      ]);
      return { fc: fc ?? 0, q: q ?? 0 };
    },
  });

  if (!material) {
    return <div className="p-12 text-ink/40 text-sm">Loading…</div>;
  }

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
          {counts?.fc ?? 0} flashcards • {counts?.q ?? 0} quiz questions
        </p>
      </header>

      <div className="grid grid-cols-2 gap-6">
        <Link
          to="/flashcards/$id"
          params={{ id }}
          className="group bg-white border border-ink/5 rounded-3xl p-8 hover:border-moss/40 hover:shadow-sm transition-all"
        >
          <BookOpen className="size-6 text-moss mb-6" />
          <h2 className="font-serif text-2xl mb-2">Study flashcards</h2>
          <p className="text-ink/60 text-sm mb-6">Flip through cards and rate your recall. Spaced repetition does the rest.</p>
          <span className="text-moss text-sm font-medium group-hover:gap-3 inline-flex items-center gap-2 transition-all">
            Begin session →
          </span>
        </Link>

        <Link
          to="/quiz/$id"
          params={{ id }}
          className="group bg-moss text-cream rounded-3xl p-8 hover:bg-sage transition-all"
        >
          <Brain className="size-6 text-cream/80 mb-6" />
          <h2 className="font-serif text-2xl mb-2">Take the quiz</h2>
          <p className="text-cream/70 text-sm mb-6">Answer one question at a time with instant feedback and explanations.</p>
          <span className="text-cream text-sm font-medium group-hover:gap-3 inline-flex items-center gap-2 transition-all">
            Start quiz →
          </span>
        </Link>
      </div>
    </div>
  );
}
