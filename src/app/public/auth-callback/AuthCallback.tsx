import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentAuthenticatedUser } from "@/app/shared/services/authService";

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const callbackError = params.get("error_description") || params.get("error");
      if (callbackError) {
        console.error("Email verification callback was rejected:", callbackError);
        if (active) setError("This verification link is invalid or has expired. Request a new verification email and try again.");
        return;
      }
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Email verification callback failed:", exchangeError);
          if (active) setError("This verification link is invalid or has expired. Request a new verification email and try again.");
          return;
        }
      }
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.email_confirmed_at) {
        if (userError) console.error("Unable to confirm verified user:", userError);
        if (active) setError("Email verification could not be confirmed. Request a new verification email and try again.");
        return;
      }
      try {
        const profile = await getCurrentAuthenticatedUser();
        if (!profile) throw new Error("The verified account profile is not available.");
        await supabase.auth.signOut();
        if (active) navigate("/login", { replace: true, state: { message: "Email verified successfully. You can now sign in." } });
      } catch (profileError) {
        console.error("Email was verified but profile recovery failed:", profileError);
        await supabase.auth.signOut();
        if (active) navigate("/login", { replace: true, state: { message: "Email verified. Sign in to finish loading your profile." } });
      }
    })();
    return () => { active = false; };
  }, [navigate]);
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center"><section className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{error ? <><h1 className="text-lg font-black text-slate-900">Verification unsuccessful</h1><p className="mt-2 text-sm text-slate-600">{error}</p><Link to="/login" className="mt-5 inline-block font-bold text-amber-700">Return to Sign In</Link></> : <><h1 className="text-lg font-black text-slate-900">Verifying your email</h1><p className="mt-2 text-sm text-slate-600">Please wait while RentIloilo confirms your email address.</p></>}</section></main>;
}
