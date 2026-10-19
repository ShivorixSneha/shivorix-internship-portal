"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verify" | "done">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false }
      });
      if (otpError) throw otpError;
      setStep("verify");
      setMessage("If this email belongs to an account and email OTP is configured, a code will arrive shortly.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the sign-in code. Please try again.");
    } finally { setBusy(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: "email" });
      if (verifyError) throw verifyError;
      setStep("done");
      setMessage("You're signed in. Your authentication session is now active in this browser.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code could not be verified. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-page"><div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
    <section className="auth-card auth-card-login">
      <Link href="/" className="auth-brand"><span className="auth-logo">S</span><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link>
      <div className="auth-progress"><span className={step === "email" ? "active" : "complete"}>1</span><i/><span className={step !== "email" ? "active" : ""}>2</span></div>
      {step === "email" && <>
        <span className="auth-eyebrow">WELCOME BACK</span><h1>Sign in to your account</h1><p className="auth-subtitle">We'll send a one-time code to your registered email. No password needed.</p>
        <form className="auth-form" onSubmit={sendOtp}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required maxLength={254}/></label><button className="auth-submit" disabled={busy}>{busy ? "Sending code…" : "Send sign-in code"} <span>→</span></button></form>
      </>}
      {step === "verify" && <>
        <span className="auth-eyebrow">SECURE SIGN IN</span><h1>Check your email</h1><p className="auth-subtitle">Enter the one-time code sent to <b>{email}</b>.</p>
        <form className="auth-form" onSubmit={verifyOtp}><label>6-digit sign-in code<input className="auth-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" required/></label><button className="auth-submit" disabled={busy}>{busy ? "Signing in…" : "Verify & sign in"} <span>→</span></button><button type="button" className="auth-back" onClick={()=>{setStep("email");setOtp("");setError("");setMessage("");}}>← Use a different email</button></form>
      </>}
      {step === "done" && <div className="auth-success"><span>✓</span><h1>You're signed in</h1><p>Your session is active. The student dashboard still needs to be connected to your account.</p><Link className="auth-submit auth-submit-link" href="/">Return to homepage →</Link></div>}
      {error && <p className="auth-alert auth-error" role="alert">{error}</p>}{message && <p className="auth-alert auth-message" role="status">{message}</p>}
      <div className="auth-switch">New student? <Link href="/register">Create an account</Link></div>
      <footer className="auth-footer">© 2026 SHIVORIX · All rights reserved</footer>
    </section>
  </main>;
}
