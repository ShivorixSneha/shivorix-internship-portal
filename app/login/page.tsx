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
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function validIdentifiers() {
    if (!/^\d{12}$/.test(rollNumber.trim())) { setError("Roll number must contain exactly 12 digits."); return false; }
    if (!/^\d{15}$/.test(registrationNumber.trim())) { setError("Registration number must contain exactly 15 digits."); return false; }
    return true;
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validIdentifiers()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/student-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: rollNumber.trim(), registrationNumber: registrationNumber.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in. Check your details and try again.");
      const { error: sessionError } = await getSupabaseBrowserClient().auth.setSession({
        access_token: result.session.access_token, refresh_token: result.session.refresh_token,
      });
      if (sessionError) throw sessionError;
      router.push("/student/dashboard"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed. Please try again."); }
    finally { setBusy(false); }
  }

  async function requestOtp() {
    if (cooldown > 0 || !validIdentifiers()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/student-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: rollNumber.trim(), registrationNumber: registrationNumber.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "OTP could not be sent.");
      setOtpEmail(result.email); setMaskedEmail(result.maskedEmail || "your registered email");
      setCooldown(60); setNotice("OTP sent to " + (result.maskedEmail || "your registered email") + ". Check your inbox.");
    } catch (e) { setError(e instanceof Error ? e.message : "OTP could not be sent."); }
    finally { setBusy(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpEmail) { setError("Request an OTP first."); return; }
    if (!/^\d{6}$/.test(otp.trim())) { setError("Enter the 6-digit OTP from your email."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: verifyError } = await getSupabaseBrowserClient().auth.verifyOtp({
        email: otpEmail, token: otp.trim(), type: "email",
      });
      if (verifyError || !data.session || !data.user) throw verifyError || new Error("OTP verification did not create a session.");
      const { data: profile, error: profileError } = await getSupabaseBrowserClient().from("profiles")
        .select("role").eq("id", data.user.id).maybeSingle();
      if (profileError || profile?.role !== "student") {
        await getSupabaseBrowserClient().auth.signOut();
        throw new Error("Only student accounts can use student OTP login.");
      }
      router.push("/student/dashboard"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "OTP verification failed. Try again."); }
    finally { setBusy(false); }
  }

  async function requestPasswordReset() {
    if (!validIdentifiers()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/student-password-reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: rollNumber.trim(), registrationNumber: registrationNumber.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Password reset could not be started.");
      setNotice(result.message || "Check your registered email for a password reset link.");
    } catch (e) { setError(e instanceof Error ? e.message : "Password reset could not be started."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/><section className="auth-card auth-card-login">
    <aside className="auth-visual-panel"><Link href="/" className="auth-visual-logo"><img src="/shivorix-logo.svg" alt="SHIVORIX logo"/></Link><span className="auth-visual-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h2>Learn. Build.<br/><em>Become more.</em></h2><p>Discover opportunities, build real-world skills and take the next step in your career with SHIVORIX.</p><div className="auth-visual-list"><span><b>01</b> Explore internship opportunities</span><span><b>02</b> Build your professional profile</span><span><b>03</b> Grow with real experience</span></div><div className="auth-visual-decoration"/></aside>
    <div className="auth-main-content"><Link href="/auth" className="auth-brand"><img src="/shivorix-logo.svg" alt="SHIVORIX logo" className="auth-logo-image"/><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link>
      <div className="auth-progress"><span className="active">1</span><i/><span>2</span></div><span className="auth-eyebrow">STUDENT LOGIN</span><h1>Welcome back</h1>
      <p className="auth-subtitle">Sign in with your Roll Number and Registration Number using your password or registered email OTP.</p>
      <div className="auth-mode-switch"><button type="button" className={mode==="password"?"active":""} onClick={()=>{setMode("password");setError("");setNotice("");}}>Password</button><button type="button" className={mode==="otp"?"active":""} onClick={()=>{setMode("otp");setError("");setNotice("");}}>Email OTP</button></div>
      <div className="auth-form">
        <label>Roll number<input type="text" inputMode="numeric" value={rollNumber} onChange={e=>setRollNumber(e.target.value.replace(/\D/g,"").slice(0,12))} autoComplete="username" placeholder="12-digit roll number" pattern="[0-9]{12}" minLength={12} maxLength={12} title="Enter exactly 12 digits." required/></label>
        <label>Registration number<input type="text" inputMode="numeric" value={registrationNumber} onChange={e=>setRegistrationNumber(e.target.value.replace(/\D/g,"").slice(0,15))} placeholder="15-digit registration number" pattern="[0-9]{15}" minLength={15} maxLength={15} title="Enter exactly 15 digits." required/></label>
        {mode==="password" ? <form onSubmit={submitPassword}><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required maxLength={128}/></label><button className="auth-submit" disabled={busy}>{busy?"Signing in…":"Sign in to student portal"} <span>→</span></button><button type="button" className="auth-text-action" onClick={()=>void requestPasswordReset()} disabled={busy}>Forgot password? Send reset link</button></form> :
        <form onSubmit={verifyOtp}>{otpEmail ? <><p className="auth-subtitle">Enter the 6-digit OTP sent to {maskedEmail}.</p><label>Email OTP<input type="text" inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="6-digit OTP"/></label><button className="auth-submit" disabled={busy}>{busy?"Verifying…":"Verify OTP & sign in"} <span>→</span></button><button type="button" className="auth-text-action" disabled={busy||cooldown>0} onClick={()=>void requestOtp()}>{cooldown>0 ? "Resend OTP in " + cooldown + "s" : "Resend OTP"}</button></> : <button type="button" className="auth-submit" disabled={busy||cooldown>0} onClick={()=>void requestOtp()}>{busy?"Sending OTP…":cooldown>0 ? "Resend available in " + cooldown + "s" : "Send OTP to registered email"} <span>→</span></button>}</form>}
      </div>
      {error&&<p className="auth-alert auth-error" role="alert">{error}</p>}{notice&&<p className="auth-alert" role="status">{notice}</p>}
      <div className="auth-switch">New student? <Link href="/register">Create an account</Link><br/><Link href="/auth">← Back to login options</Link></div><footer className="auth-footer">© 2026 SHIVORIX · All rights reserved</footer>
    </div>
  </section></main>;
}
