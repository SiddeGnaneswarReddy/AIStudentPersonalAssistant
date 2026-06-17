import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/flashcards/$id")({
  component: FlashcardsPage,
  head: () => ({ meta: [{ title: "Flashcards — Arcane" }] }),
});

type Card = { id: string; front: string; back: string; ease: number; interval_days: number; reps: number };

function FlashcardsPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: cards } = useQuery({
    queryKey: ["flashcards", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id, front, back, ease, interval_days, reps")
        .eq("material_id", id)
        .order("created_at");
      if (error) throw error;
      return data as Card[];
    },
  });

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  if (!cards) return <div className="p-12 text-ink/40 text-sm">Loading…</div>;
  if (cards.length === 0) return <div className="p-12 text-ink/60">No cards yet.</div>;

  const card = cards[idx];

  async function rate(quality: 0 | 1 | 2 | 3) {
    // SM-2-lite: Again, Hard, Good, Easy
    let { ease, interval_days, reps } = card;
    if (quality === 0) { reps = 0; interval_days = 0; ease = Math.max(1.3, ease - 0.2); }
    else {
      reps += 1;
      if (reps === 1) interval_days = quality === 1 ? 1 : quality === 2 ? 1 : 3;
      else if (reps === 2) interval_days = quality === 1 ? 2 : quality === 2 ? 3 : 7;
      else interval_days = Math.round(interval_days * (quality === 1 ? 1.2 : quality === 2 ? ease : ease * 1.3));
      ease = Math.min(2.8, ease + (quality === 1 ? -0.05 : quality === 3 ? 0.1 : 0));
    }
    const due = new Date(Date.now() + interval_days * 86400000);
    await supabase.from("flashcards").update({
      ease, interval_days, reps, due_at: due.toISOString(),
    }).eq("id", card.id);
    qc.invalidateQueries({ queryKey: ["due-count"] });

    if (idx + 1 < (cards?.length ?? 0)) {
      setIdx(idx + 1);
      setRevealed(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="p-12 max-w-xl mx-auto">
        <div className="bg-white rounded-3xl border border-ink/5 p-12 text-center shadow-xl shadow-ink/2">
          <div className="size-14 mx-auto rounded-full bg-moss/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="size-6 text-moss" />
          </div>
          <h1 className="font-serif text-3xl mb-3">Session complete.</h1>
          <p className="text-ink/60 mb-8">You reviewed {cards.length} cards. Arcane scheduled the next review for each.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/materials/$id" params={{ id }} className="px-5 py-2.5 rounded-full border border-ink/10 text-sm font-medium hover:border-moss transition-colors">
              Back to material
            </Link>
            <button onClick={() => { setIdx(0); setRevealed(false); setDone(false); }} className="px-5 py-2.5 rounded-full bg-moss text-cream text-sm font-medium hover:bg-sage transition-colors flex items-center gap-2">
              <RotateCcw className="size-4" /> Review again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 max-w-2xl mx-auto">
      <Link to="/materials/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-moss mb-6">
        <ArrowLeft className="size-4" /> Exit
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl">Flashcards</h2>
        <span className="px-3 py-1 bg-sand text-ink/60 text-xs rounded-full">{idx + 1} of {cards.length}</span>
      </div>

      <div className="w-full bg-ink/5 h-1 rounded-full overflow-hidden mb-8">
        <div className="bg-moss h-full transition-all" style={{ width: `${(idx / cards.length) * 100}%` }} />
      </div>

      <button
        onClick={() => setRevealed(true)}
        disabled={revealed}
        className="block w-full bg-white border border-ink/5 rounded-3xl p-12 min-h-[320px] text-left shadow-xl shadow-ink/2 hover:border-moss/30 transition-colors disabled:cursor-default"
      >
        <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-4">Front</p>
        <p className="font-serif text-2xl leading-relaxed">{card.front}</p>

        {revealed ? (
          <>
            <div className="border-t border-ink/10 mt-8 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-moss font-bold mb-3">Answer</p>
              <p className="text-ink/80 leading-relaxed">{card.back}</p>
            </div>
          </>
        ) : (
          <p className="mt-8 text-sm text-ink/40">Tap to reveal answer</p>
        )}
      </button>

      {revealed && (
        <div className="mt-6 grid grid-cols-4 gap-2">
          {[
            { label: "Again", q: 0, cls: "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200" },
            { label: "Hard", q: 1, cls: "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200" },
            { label: "Good", q: 2, cls: "bg-sand text-ink hover:bg-sand/80 border-ink/10" },
            { label: "Easy", q: 3, cls: "bg-moss text-cream hover:bg-sage border-moss" },
          ].map((b) => (
            <button
              key={b.label}
              onClick={() => rate(b.q as 0 | 1 | 2 | 3)}
              className={`py-3 rounded-xl border text-sm font-medium transition-colors ${b.cls}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
