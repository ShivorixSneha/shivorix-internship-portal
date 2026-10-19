"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "verify" | "done">("details");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: crypto.randomUUID() + "Aa1!",
        options: { data: { full_name: fullName.trim(), roll_number: rollNumber.trim(), registration_number: registrationNumber.trim() } }
      });
      if (signUpError) throw signUpError;
      setStep("verify");
      setMessage("Verification code sent if email confirmation is enabled. Check your inbox and spam folder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start registration. Please try again.");
    } finally { setBusy(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: "signup" });
      if (verifyError) throw verifyError;
      setStep("done");
      setMessage("Email verified. Your student account has been created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code could not be verified. Check it and try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-page"><div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
    <section className="auth-card">
      <Link href="/" className="auth-brand"><span className="auth-logo">S</span><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link>
      <div className="auth-progress"><span className={step === "details" ? "active" : "complete"}>1</span><i/><span className={step !== "details" ? "active" : ""}>2</span></div>
      {step === "details" && <>
        <span className="auth-eyebrow">YOUR JOURNEY STARTS HERE</span><h1>Create your student account</h1><p className="auth-subtitle">Enter your details carefully. We'll ask you to verify your email.</p>
        <form className="auth-form" onSubmit={requestOtp}>
          <label>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name" placeholder="As per your college record" required maxLength={100}/></label>
          <div className="auth-form-row"><label>Roll number<input value={rollNumber} onChange={e=>setRollNumber(e.target.value)} placeholder="Your roll number" required maxLength={50}/></label><label>Registration number<input value={registrationNumber} onChange={e=>setRegistrationNumber(e.target.value)} placeholder="Registration no." required maxLength={60}/></label></div>
          <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required maxLength={254}/></label>
          <button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : "Continue to email verification"} <span>→</span></button>
        </form>
      </>}
      {step === "verify" && <>
        <span className="auth-eyebrow">CHECK YOUR INBOX</span><h1>Verify your email</h1><p className="auth-subtitle">Enter the verification code sent to <b>{email}</b>. If no code arrives, check your spam folder or contact the portal team.</p>
        <form className="auth-form" onSubmit={verifyOtp}><label>6-digit verification code<input className="auth-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" required/></label><button className="auth-submit" disabled={busy}>{busy ? "Verifying…" : "Verify email & create account"} <span>→</span></button><button type="button" className="auth-back" onClick={()=>{setStep("details");setOtp("");setError("");setMessage("");}}>← Edit student details</button></form>
      </>}
      {step === "done" && <div className="auth-success"><span>✓</span><h1>Email verified</h1><p>Your student account has been created. You can now continue to student login.</p><Link className="auth-submit auth-submit-link" href="/login">Go to student login →</Link></div>}
      {error && <p className="auth-alert auth-error" role="alert">{error}</p>}{message && <p className="auth-alert auth-message" role="status">{message}</p>}
      <div className="auth-switch">{step !== "done" ? <>Already registered? <Link href="/login">Sign in</Link></> : <>Need help? <a href="mailto:info.shivorix@gmail.com">Contact support</a></>}</div>
      <footer className="auth-footer">© 2026 SHIVORIX · All rights reserved</footer>
    </section>
  </main>;
}
