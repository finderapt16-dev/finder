import { AppLogo } from "@/app/shared/components/common/AppLogo";
import { Alert, AlertDescription } from "@/app/shared/components/ui/alert";
import { Button } from "@/app/shared/components/ui/button";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function ResetPassword() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const callbackError = params.get("error_description") || params.get("error");
      if (callbackError) {
        console.error("Password recovery link was rejected:", callbackError);
        if (active) setError("This password reset link is invalid or has expired. Request a new one.");
        if (active) setCheckingSession(false);
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) console.error("Unable to exchange password recovery code:", exchangeError);
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error("Unable to read password recovery session:", sessionError);
      if (!active) return;
      setHasRecoverySession(Boolean(data.session));
      if (!data.session) setError("This password reset link is invalid or has expired. Request a new one.");
      setCheckingSession(false);
    })();
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error("Password update failed:", updateError);
      setError(/same password/i.test(updateError.message) ? "Choose a password you have not used before." : "Unable to change your password. Request a new reset link and try again.");
      setSaving(false);
      return;
    }
    await supabase.auth.signOut();
    navigate("/login", { replace: true, state: { message: "Your password has been changed successfully." } });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link to="/" className="mb-6 flex items-center gap-3">
          <AppLogo className="h-10 w-10 rounded-xl" iconClassName="h-5 w-5" />
          <span className="font-black text-amber-600">RentIloilo</span>
        </Link>
        <KeyRound className="mb-3 h-8 w-8 text-amber-600" />
        <h1 className="text-2xl font-black text-slate-900">Choose a new password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter and confirm the new password for your account.</p>

        {checkingSession ? (
          <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Validating reset link...</div>
        ) : hasRecoverySession ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2"><Label htmlFor="new-password">New Password</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">Confirm New Password</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
            <Button type="submit" disabled={saving} className="w-full bg-amber-600 text-white hover:bg-amber-700">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Changing password...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Change Password</>}</Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert><Link to="/forgot-password" className="inline-block font-bold text-amber-700">Request a new reset link</Link></div>
        )}
      </section>
    </main>
  );
}
