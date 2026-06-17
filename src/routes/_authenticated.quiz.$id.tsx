import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Check, X, RotateCcw, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quiz/$id")({
  component: QuizPage,
  head: () => ({ meta: [{ title: "Quiz — Arcane" }] }),
});

type Option = { text: string; is_correct: boolean; explanation: string };
type Question = { id: string; question: string; options: Option[]; position: number };

function QuizPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data: material } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("title").eq("id", id).single();
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz-questions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, question, options, position")
        .eq("material_id", id)
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as Question[];
    },
  });

  if (isLoading) return <div className="p-12 text-ink/40 text-sm">Loading…</div>;
  if (!questions?.length) return <div className="p-12 text-ink/60">No questions yet.</div>;

  return <QuizRunner materialId={id} userId={user!.id} title={material?.title ?? "Quiz"} questions={questions} />;
}

function QuizRunner({
  materialId, userId, title, questions,
}: { materialId: string; userId: string; title: string; questions: Question[] }) {
  // Phase 1: original order. Phase 2: rectify wrong ones.
  const [phase, setPhase] = useState<1 | 2>(1);
  const [round1Wrong, setRound1Wrong] = useState<Question[]>([]);
  const [queue, setQueue] = useState<Question[]>(questions);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [round1Score, setRound1Score] = useState(0);
  const [done, setDone] = useState(false);

  const current = queue[idx];
  const total = questions.length;

  function pickAnswer(i: number) {
    if (selected !== null) return;
    setSelected(i);
    const correct = current.options[i]?.is_correct;
    // record attempt
    supabase.from("quiz_attempts").insert({
      user_id: userId,
      material_id: materialId,
      question_id: current.id,
      selected_index: i,
      is_correct: !!correct,
      attempt_round: phase,
    }).then(() => {});
    if (phase === 1) {
      if (correct) setRound1Score((s) => s + 1);
      else setRound1Wrong((w) => [...w, current]);
    }
  }

  function next() {
    setSelected(null);
    const wasCorrect = selected !== null && current.options[selected].is_correct;

    if (phase === 2 && !wasCorrect) {
      // keep in queue — move to end
      setQueue((q) => {
        const copy = [...q];
        const [cur] = copy.splice(idx, 1);
        copy.push(cur);
        return copy;
      });
      return;
    }

    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      return;
    }

    // End of current phase
    if (phase === 1 && round1Wrong.length > 0) {
      setPhase(2);
      setQueue(round1Wrong);
      setIdx(0);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="p-12 max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border border-ink/5 p-12 text-center shadow-xl shadow-ink/2">
          <div className="size-14 mx-auto rounded-full bg-moss/10 flex items-center justify-center mb-6">
            <Trophy className="size-6 text-moss" />
          </div>
          <h1 className="font-serif text-3xl mb-3">Session complete.</h1>
          <p className="text-ink/60 mb-2">
            You scored <span className="font-semibold text-moss">{round1Score} of {total}</span> on the first pass.
          </p>
          {round1Wrong.length > 0 && (
            <p className="text-ink/60 mb-8">You rectified every missed question.</p>
          )}
          <div className="flex gap-3 justify-center mt-8">
            <Link to="/materials/$id" params={{ id: materialId }} className="px-5 py-2.5 rounded-full border border-ink/10 text-sm font-medium hover:border-moss transition-colors">
              Back to material
            </Link>
            <button
              onClick={() => { setPhase(1); setQueue(questions); setIdx(0); setSelected(null); setRound1Score(0); setRound1Wrong([]); setDone(false); }}
              className="px-5 py-2.5 rounded-full bg-moss text-cream text-sm font-medium hover:bg-sage transition-colors flex items-center gap-2"
            >
              <RotateCcw className="size-4" /> Retake
            </button>
          </div>
        </div>
      </div>
    );
  }

  const positionLabel =
    phase === 1
      ? `Question ${idx + 1} of ${total}`
      : `Rectifying ${idx + 1} of ${queue.length}`;

  return (
    <div className="p-12 max-w-3xl mx-auto">
      <Link to="/materials/$id" params={{ id: materialId }} className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-moss mb-6">
        <ArrowLeft className="size-4" /> Exit quiz
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-2xl truncate">{title}</h2>
        <div className="flex items-center gap-3">
          {phase === 2 && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] uppercase tracking-widest font-bold rounded-full">Rectify round</span>
          )}
          <span className="px-3 py-1 bg-sand text-ink/60 text-xs rounded-full">{positionLabel}</span>
        </div>
      </div>

      {/* progress bar */}
      <div className="w-full bg-ink/5 h-1 rounded-full overflow-hidden mb-10">
        <div
          className="bg-moss h-full transition-all"
          style={{ width: `${phase === 1 ? ((idx + (selected !== null ? 1 : 0)) / total) * 100 : 100}%` }}
        />
      </div>

      <div className="bg-white rounded-3xl border border-ink/5 p-10 md:p-12 shadow-xl shadow-ink/2">
        <p className="text-xl md:text-2xl font-serif text-center mb-10 max-w-2xl mx-auto leading-relaxed">
          {current.question}
        </p>

        <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
          {current.options.map((opt, i) => {
            const showFeedback = selected !== null;
            const isSelected = selected === i;
            const isCorrect = opt.is_correct;
            let cls = "border-ink/10 hover:border-moss";
            if (showFeedback) {
              if (isCorrect) cls = "border-emerald-600 bg-emerald-50/50";
              else if (isSelected) cls = "border-rose-500 bg-rose-50/50";
              else cls = "border-ink/10 opacity-60";
            }
            return (
              <button
                key={i}
                onClick={() => pickAnswer(i)}
                disabled={showFeedback}
                className={`text-left w-full p-5 rounded-xl border-2 transition-all ${cls} ${!showFeedback ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex justify-between items-start gap-3">
                  <span className={`font-medium ${showFeedback && !isCorrect && !isSelected ? "text-ink/60" : ""}`}>
                    {String.fromCharCode(65 + i)}. {opt.text}
                  </span>
                  <span className={`size-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                    showFeedback && isCorrect ? "bg-emerald-600" :
                    showFeedback && isSelected ? "bg-rose-500" :
                    "border border-ink/15"
                  }`}>
                    {showFeedback && isCorrect && <Check className="size-3 text-white" />}
                    {showFeedback && isSelected && !isCorrect && <X className="size-3 text-white" />}
                  </span>
                </div>
                {showFeedback && (
                  <div className={`mt-3 pt-3 border-t text-sm leading-snug ${
                    isCorrect ? "border-emerald-200 text-emerald-800" :
                    isSelected ? "border-rose-200 text-rose-800" :
                    "border-ink/10 text-ink/50"
                  }`}>
                    <span className="font-semibold">
                      {isCorrect ? "Correct. " : isSelected ? "Not quite. " : "Why not: "}
                    </span>
                    {opt.explanation}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={next}
              className="px-8 py-3 bg-ink text-cream rounded-full font-medium hover:bg-moss transition-all"
            >
              {phase === 1 && idx + 1 === total && round1Wrong.length > 0
                ? "Continue to rectify"
                : phase === 2 && !current.options[selected].is_correct
                ? "Try again"
                : "Next question"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
