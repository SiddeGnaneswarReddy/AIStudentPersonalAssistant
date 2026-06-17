import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Play, Pause, RotateCcw, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/focus")({
  component: FocusPage,
  head: () => ({ meta: [{ title: "Focus — Arcane" }] }),
});

const PRESETS = [25, 45, 60, 90];

function FocusPage() {
  const { user } = useAuth();
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setRunning(false);
          // log session
          if (user && startTimeRef.current) {
            const dur = Math.round((Date.now() - startTimeRef.current) / 1000);
            supabase.from("focus_sessions").insert({ user_id: user.id, duration_seconds: dur }).then(() => {});
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, user]);

  function pick(min: number) {
    if (running) return;
    setDuration(min * 60);
    setRemaining(min * 60);
  }

  function start() {
    if (remaining === 0) setRemaining(duration);
    startTimeRef.current = Date.now();
    setRunning(true);
    setImmersive(true);
  }

  function pause() {
    setRunning(false);
    if (user && startTimeRef.current) {
      const dur = Math.round((Date.now() - startTimeRef.current) / 1000);
      supabase.from("focus_sessions").insert({ user_id: user.id, duration_seconds: dur }).then(() => {});
      startTimeRef.current = null;
    }
  }

  function reset() {
    setRunning(false);
    setRemaining(duration);
    startTimeRef.current = null;
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;

  if (immersive) {
    return (
      <div className="fixed inset-0 z-50 bg-moss text-cream flex flex-col items-center justify-center">
        <button onClick={() => setImmersive(false)} className="absolute top-6 right-6 text-cream/50 hover:text-cream transition-colors">
          <X className="size-5" />
        </button>

        <div className="relative">
          <svg className="size-80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(253,252,251,0.1)" strokeWidth="2" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="rgba(253,252,251,0.7)"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000 linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[10px] uppercase tracking-widest text-cream/40 font-bold mb-3">
              {running ? "Focusing" : "Paused"}
            </p>
            <div className="font-serif text-7xl tracking-tight tabular-nums">{mm}:{ss}</div>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-4">
          <button
            onClick={running ? pause : start}
            className="size-14 rounded-full bg-cream text-moss flex items-center justify-center hover:bg-sand transition-colors"
          >
            {running ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
          </button>
          <button
            onClick={reset}
            className="size-12 rounded-full border border-cream/20 text-cream/70 flex items-center justify-center hover:bg-cream/10 transition-colors"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <p className="mt-16 text-xs text-cream/40">Notifications silenced. Close this window when you're done.</p>
      </div>
    );
  }

  return (
    <div className="p-12 max-w-3xl">
      <header className="mb-12">
        <h1 className="font-serif text-4xl mb-2">Focus mode</h1>
        <p className="text-ink/60">Set a timer, then disappear into a single task.</p>
      </header>

      <div className="bg-sand/30 border border-ink/5 rounded-3xl p-12 text-center">
        <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-3">Duration</p>
        <div className="flex justify-center gap-2 mb-10">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => pick(m)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                duration === m * 60
                  ? "bg-moss text-cream border-moss"
                  : "bg-white border-ink/10 hover:border-moss"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <div className="font-serif text-7xl tracking-tight tabular-nums mb-10">{mm}:{ss}</div>

        <button
          onClick={start}
          className="px-8 py-3 bg-moss text-cream rounded-full font-medium hover:bg-sage transition-colors inline-flex items-center gap-2"
        >
          <Play className="size-4" /> Enter focus
        </button>
      </div>

      <p className="mt-8 text-xs text-ink/40 text-center">Completed sessions are saved to your library.</p>
    </div>
  );
}
