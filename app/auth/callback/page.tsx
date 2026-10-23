"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [message, setMessage] = useState("Confirming your email address…");

  useEffect(() => {
    let active = true;
    async function confirmEmail() {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session && !code) {
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
            <Link className="auth-option-link" href="/register">Return to registration →</Link>
          ) : (
            <p className="auth-subtitle">Please keep this page open for a moment.</p>
          )}
        </div>
      </section>
    </main>
  );
}
