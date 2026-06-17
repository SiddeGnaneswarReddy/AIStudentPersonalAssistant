import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Arcane" }] }),
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && session) {
    throw redirect({ to: "/" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-cream text-ink flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-sand/40 border-r border-ink/5">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-moss rounded-full" />
          <span className="font-serif italic text-xl font-semibold text-moss">Arcane</span>
        </div>
        <div className="max-w-md">
          <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-4">A quiet place to study</p>
          <h1 className="font-serif text-5xl leading-tight text-ink mb-6">Turn your notes into mastery.</h1>
          <p className="text-ink/60 leading-relaxed">
            Upload a PDF. Arcane drafts flashcards and a quiz, then schedules every review at the exact moment you're about to forget.
          </p>
        </div>
        <p className="text-xs text-ink/40">© Arcane Study</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="size-8 bg-moss rounded-full" />
            <span className="font-serif italic text-xl font-semibold text-moss">Arcane</span>
          </div>

          <h2 className="font-serif text-3xl mb-2">
            {mode === "signin" ? "Welcome back." : "Begin your library."}
          </h2>
          <p className="text-ink/60 text-sm mb-8">
            {mode === "signin" ? "Resume where you left off." : "A few seconds and you're studying."}
          </p>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-ink/10 bg-white hover:border-moss transition-colors text-sm font-medium disabled:opacity-50"
          >
            <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-ink/30">
            <div className="h-px flex-1 bg-ink/10" />
            or
            <div className="h-px flex-1 bg-ink/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-ink/50 font-bold mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink/10 focus:border-moss focus:outline-none text-sm"
                  placeholder="Elias Thorne"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink/50 font-bold mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink/10 focus:border-moss focus:outline-none text-sm"
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink/50 font-bold mb-2">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink/10 focus:border-moss focus:outline-none text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-full bg-moss text-cream font-medium hover:bg-sage transition-colors disabled:opacity-50"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink/60 text-center">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-moss font-medium hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
