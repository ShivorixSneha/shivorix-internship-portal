"use client";

import "../auth-extras.css";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [rollNumber, setRollNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [password, setPassword] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResendVerification, setShowResendVerification] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (otpExpiresIn <= 0) return;
    const timer = window.setTimeout(() => setOtpExpiresIn(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpExpiresIn]);

  function validIdentifiers() {
    if (!/^\d{12}$/.test(rollNumber.trim())) { setError("Roll number must contain exactly 12 digits."); return false; }
    if (!/^\d{15}$/.test(registrationNumber.trim())) { setError("Registration number must contain exactly 15 digits."); return false; }
    return true;
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!validIdentifiers()) return;
    if (!registeredEmail.trim()) { setError("Enter the email address you used during registration."); return; }
    setBusy(true); setError(""); setNotice(""); setShowResendVerification(false);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: registeredEmail.trim().toLowerCase(), password });
      if (authError || !data.user || !data.session) { if (authError?.message.toLowerCase().includes("email not confirmed")) setShowResendVerification(true); throw authError || new Error("Unable to sign in."); }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role,roll_number,registration_number").eq("id", data.user.id).maybeSingle();
      const meta = data.user.user_metadata || {};
      if (profileError || (profile?.role || meta.role) !== "student" || String(profile?.roll_number || meta.roll_number || "").trim() !== rollNumber.trim() || String(profile?.registration_number || meta.registration_number || "").trim() !== registrationNumber.trim()) { await supabase.auth.signOut(); throw new Error("These Roll Number and Registration Number do not match this email account."); }
      router.push("/student/dashboard"); router.refresh();
    } catch (e) { const message = e instanceof Error ? e.message : "Sign-in failed. Please try again."; setError(message); if (/verify your registered email|email not confirmed/i.test(message)) setShowResendVerification(true); } finally { setBusy(false); }
  }

  async function requestOtp() {
    if (cooldown > 0 || !validIdentifiers()) return;
    if (!registeredEmail.trim()) { setError("Enter the email address you used during registration."); return; }
    setBusy(true); setError(""); setNotice(""); setShowResendVerification(false);
    try {
      const response = await fetch("/api/auth/student-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: rollNumber.trim(), registrationNumber: registrationNumber.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "OTP could not be sent.");
      const email = registeredEmail.trim().toLowerCase();
      if (result.email && result.email.toLowerCase() !== email) {
        throw new Error("The email address does not match the email registered to these student numbers.");
      }
      setOtp("");
      setOtpEmail(email);
      setMaskedEmail(result.maskedEmail || email.replace(/^(.{2}).*(@.*)$/, "$1***$2"));
      setCooldown(60);
      setOtpExpiresIn(180);
      setNotice("A new 6-digit OTP was sent. It expires in 3 minutes; use only the latest code.");
    } catch (e) { setError(e instanceof Error ? e.message : "OTP could not be sent."); setShowResendVerification(true); } finally { setBusy(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!otpEmail) { setError("Request an OTP first."); return; }
    if (otpExpiresIn <= 0) { setOtp(""); setError("This OTP has expired. Request a new OTP; codes are valid for 3 minutes."); return; }
    if (!/^\d{6}$/.test(otp.trim())) { setError("Enter the 6-digit OTP from your email."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      // Existing confirmed users receive an email OTP; unconfirmed users receive a signup confirmation token.
      let result = await supabase.auth.verifyOtp({ email: otpEmail, token: otp.trim(), type: "email" });
      if (result.error) {
        result = await supabase.auth.verifyOtp({ email: otpEmail, token: otp.trim(), type: "signup" });
      }
      const { data, error: verifyError } = result;
      if (verifyError || !data.session || !data.user) throw verifyError || new Error("OTP verification did not create a session.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role,roll_number,registration_number").eq("id", data.user.id).maybeSingle();
      const meta = data.user.user_metadata || {};
      if (profileError || (profile?.role || meta.role) !== "student" || String(profile?.roll_number || meta.roll_number || "").trim() !== rollNumber.trim() || String(profile?.registration_number || meta.registration_number || "").trim() !== registrationNumber.trim()) { await supabase.auth.signOut(); throw new Error("These Roll Number and Registration Number do not match this email account."); }
      router.push("/student/dashboard"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "OTP verification failed. Request a fresh code and try again."); } finally { setBusy(false); }
  }

  async function requestVerificationEmail() {
    if (!registeredEmail.trim() || !/^\S+@\S+\.\S+$/.test(registeredEmail.trim())) { setError("Enter the email address you used during registration."); return; }
    setBusy(true); setError(""); setNotice(""); setShowResendVerification(false);
    try {
      const { error: resendError } = await getSupabaseBrowserClient().auth.resend({ type: "signup", email: registeredEmail.trim().toLowerCase(), options: { emailRedirectTo: window.location.origin + "/auth/callback" } });
      if (resendError) throw resendError;
      setNotice("A fresh verification email was requested if this account is awaiting confirmation. Use the newest email only.");
    } catch (e) { setError(e instanceof Error ? e.message : "Verification email could not be requested."); } finally { setBusy(false); }
  }

  async function requestPasswordReset() {
    if (!registeredEmail.trim() || !/^\S+@\S+\.\S+$/.test(registeredEmail.trim())) { setError("Enter the email address you used during registration."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resetError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(registeredEmail.trim().toLowerCase(), { redirectTo: window.location.origin + "/auth/callback?next=%2Freset-password" });
      if (resetError) throw resetError;
      setNotice("If an account exists for this email, a password reset link has been requested. Check Inbox and Spam.");
    } catch (e) { setError(e instanceof Error ? e.message : "Password reset could not be started."); } finally { setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/><section className="auth-card auth-card-login">
    <aside className="auth-visual-panel"><Link href="/" className="auth-visual-logo"><img src="/shivorix-logo.svg" alt="SHIVORIX logo"/></Link><span className="auth-visual-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h2>Learn. Build.<br/><em>Become more.</em></h2><p>Discover opportunities, build real-world skills and take the next step in your career with SHIVORIX.</p><div className="auth-visual-list"><span><b>01</b> Explore internship opportunities</span><span><b>02</b> Build your professional profile</span><span><b>03</b> Grow with real experience</span></div><div className="auth-visual-decoration"/></aside>
    <div className="auth-main-content"><Link href="/auth" className="auth-brand"><img src="/shivorix-logo.svg" alt="SHIVORIX logo" className="auth-logo-image"/><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link>
      <div className="auth-progress"><span className="active">1</span><i/><span>2</span></div><span className="auth-eyebrow">STUDENT LOGIN</span><h1>Welcome back</h1>
      <p className="auth-subtitle">Sign in with your Roll Number and Registration Number using your password or registered email OTP.</p>
      <div className="auth-mode-switch"><button type="button" className={mode==="password"?"active":""} onClick={()=>{setMode("password");setError("");setNotice("");}}>Password</button><button type="button" className={mode==="otp"?"active":""} onClick={()=>{setMode("otp");setError("");setNotice("");}}>Email OTP</button></div>
      <div className="auth-form">
        <label>Registered email address<input type="email" value={registeredEmail} onChange={e=>setRegisteredEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" maxLength={254} required/></label>
        <label>Roll number<input type="text" inputMode="numeric" value={rollNumber} onChange={e=>setRollNumber(e.target.value.replace(/\D/g,"").slice(0,12))} autoComplete="username" placeholder="12-digit roll number" pattern="[0-9]{12}" minLength={12} maxLength={12} title="Enter exactly 12 digits." required/></label>
        <label>Registration number<input type="text" inputMode="numeric" value={registrationNumber} onChange={e=>setRegistrationNumber(e.target.value.replace(/\D/g,"").slice(0,15))} placeholder="15-digit registration number" pattern="[0-9]{15}" minLength={15} maxLength={15} title="Enter exactly 15 digits." required/></label>
        {mode==="password" ? <form onSubmit={submitPassword}><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required maxLength={128}/></label><button className="auth-submit" disabled={busy}>{busy?"Signing in…":"Sign in to student portal"} <span>→</span></button><button type="button" className="auth-text-action" onClick={()=>void requestPasswordReset()} disabled={busy}>Forgot password? Send reset link</button></form> :
        <form onSubmit={verifyOtp}>{otpEmail ? <><p className="auth-subtitle">Enter the 6-digit OTP sent to {maskedEmail}. Valid for 3 minutes ({Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, "0")} remaining).</p><label>Email OTP<input type="text" inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="6-digit OTP"/></label><button className="auth-submit" disabled={busy || otpExpiresIn <= 0}>{busy?"Verifying…":otpExpiresIn <= 0 ? "OTP expired — request a new one" : "Verify OTP & sign in"} <span>→</span></button><button type="button" className="auth-text-action" disabled={busy||cooldown>0} onClick={()=>void requestOtp()}>{cooldown>0 ? "Resend OTP in " + cooldown + "s" : "Resend OTP"}</button></> : <button type="button" className="auth-submit" disabled={busy||cooldown>0} onClick={()=>void requestOtp()}>{busy?"Sending OTP…":cooldown>0 ? "Resend available in " + cooldown + "s" : "Send OTP to registered email"} <span>→</span></button>}</form>}
      </div>
      {error&&<p className="auth-alert auth-error" role="alert">{error}</p>}{notice&&<p className="auth-alert" role="status">{notice}</p>}{showResendVerification&&<button type="button" className="auth-text-action" onClick={()=>void requestVerificationEmail()} disabled={busy}>Resend email verification</button>}
      <div className="auth-switch">New student? <Link href="/register">Create an account</Link><br/><Link href="/auth">← Back to login options</Link></div><footer className="auth-footer">© 2026 SHIVORIX · All rights reserved</footer>
    </div>
  </section></main>;
}
