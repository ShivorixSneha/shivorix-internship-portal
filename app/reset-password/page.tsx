"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (active) {
        setReady(Boolean(data.session));
        if (!data.session) setError("This password reset link is invalid or expired. Request a new link from student login.");
      }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice("Password updated. You can now sign in with your new password.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (e) { setError(e instanceof Error ? e.message : "Password could not be updated. Request a new reset link."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/><section className="auth-card auth-card-login"><aside className="auth-visual-panel"><Link href="/" className="auth-visual-logo"><img src="/shivorix-logo.svg" alt="SHIVORIX logo"/></Link><span className="auth-visual-kicker">ACCOUNT SECURITY</span><h2>Choose a<br/><em>new password.</em></h2><p>Keep your student account secure with a password only you know.</p></aside><div className="auth-main-content"><Link href="/" className="auth-brand"><img src="/shivorix-logo.svg" alt="SHIVORIX logo" className="auth-logo-image"/><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link><span className="auth-eyebrow">PASSWORD RESET</span><h1>Set new password</h1><p className="auth-subtitle">Use at least 8 characters, then confirm your new password.</p>{ready && <form className="auth-form" onSubmit={submit}><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required/></label><label>Confirm new password<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required/></label><button className="auth-submit" type="submit" disabled={busy}>{busy?"Updating password…":"Update password"} <span>→</span></button></form>}{error&&<p className="auth-alert auth-error" role="alert">{error}</p>}{notice&&<p className="auth-alert" role="status">{notice}</p>}<div className="auth-switch"><Link href="/login">← Back to student login</Link></div></div></section></main>;
}
