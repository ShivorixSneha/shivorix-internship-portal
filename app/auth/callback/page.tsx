"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [message, setMessage] = useState("Confirming your email address…");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    let active = true;
    async function confirmEmail() {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const otpType = url.searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && otpType) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType as EmailOtpType });
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session && !code && !(tokenHash && otpType)) {
          const detail = url.searchParams.get("error_description");
          throw new Error(detail ? decodeURIComponent(detail.replace(/\+/g, " ")) : "The verification link may have expired or already been used. Request a new verification email and open its latest link.");
        }

        if (active) {
          setStatus("success");
          setMessage("Your email has been verified successfully. You can now sign in to the SHIVORIX student portal.");
        }
      } catch (error) {
        if (active) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Email verification failed. Request a fresh verification email and try again.");
        }
      }
    }
    void confirmEmail();
    return () => { active = false; };
  }, []);

  async function resendVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResending(true);
    setResendMessage("");
    setResendError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setResendMessage("If this email has a pending registration, a fresh verification link has been sent. Check your inbox and spam folder, and open the newest email.");
    } catch (error) {
      setResendError(error instanceof Error ? error.message : "Could not resend the verification email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <section className="auth-card auth-options-card">
        <Link href="/" className="auth-brand">
          <img src="/shivorix-logo.svg" alt="SHIVORIX logo" className="auth-logo-image" />
          <span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span>
        </Link>
        <span className="auth-eyebrow">EMAIL VERIFICATION</span>
        <h1>{status === "checking" ? "Verifying your email" : status === "success" ? "Email verified" : "Verification link issue"}</h1>
        <p className="auth-subtitle" role="status">{message}</p>
        {status === "error" && <p className="auth-subtitle">If you opened an older email, use the newest verification email instead.</p>}
        <div className="auth-options-list">
          {status === "success" ? (
            <Link className="auth-option-link" href="/login">Continue to student login →</Link>
          ) : status === "error" ? (
            <>
              <form className="auth-form" onSubmit={resendVerification}>
                <label>Email address used during registration<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={254} /></label>
                <button className="auth-submit" type="submit" disabled={resending}>{resending ? "Sending verification email…" : "Resend verification email"} <span>→</span></button>
              </form>
              {resendMessage && <p className="auth-subtitle" role="status">{resendMessage}</p>}
              {resendError && <p className="auth-alert auth-error" role="alert">{resendError}</p>}
              <Link className="auth-option-link" href="/register">Return to registration →</Link>
            </>
          ) : (
            <p className="auth-subtitle">Please keep this page open for a moment.</p>
          )}
        </div>
      </section>
    </main>
  );
}
