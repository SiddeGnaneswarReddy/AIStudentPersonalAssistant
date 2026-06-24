import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — Arcane" }] }),
});

type Step = "email" | "otp" | "password";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      toast.success("We sent a 6-digit code to your email.");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      setStep("password");
    } catch (err: any) {
      toast.error(err.message ?? "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-12">
          <div className="size-8 bg-moss rounded-full" />
          <span className="font-serif italic text-xl font-semibold text-moss">Arcane</span>
        </div>

        <h2 className="font-serif text-3xl mb-2">
          {step === "email" && "Reset your password."}
          {step === "otp" && "Enter the code."}
          {step === "password" && "Choose a new password."}
        </h2>
        <p className="text-ink/60 text-sm mb-8">
          {step === "email" && "We'll email you a 6-digit code."}
          {step === "otp" && `Sent to ${email}. Check your inbox.`}
          {step === "password" && "Pick something you'll remember."}
        </p>

        {step === "email" && (
          <form onSubmit={sendCode} className="space-y-4">
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
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-full bg-moss text-cream font-medium hover:bg-sage transition-colors disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyCode} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink/50 font-bold mb-2">6-digit code</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink/10 focus:border-moss focus:outline-none text-sm tracking-[0.5em] text-center font-mono"
                placeholder="123456"
              />
            </div>
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="w-full py-3 rounded-full bg-moss text-cream font-medium hover:bg-sage transition-colors disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-ink/60 hover:text-moss"
            >
              Use a different email
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={setNewPassword} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink/50 font-bold mb-2">New password</label>
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
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink/50 font-bold mb-2">Confirm password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink/10 focus:border-moss focus:outline-none text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-full bg-moss text-cream font-medium hover:bg-sage transition-colors disabled:opacity-50"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-ink/60 text-center">
          <Link to="/auth" className="text-moss font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
