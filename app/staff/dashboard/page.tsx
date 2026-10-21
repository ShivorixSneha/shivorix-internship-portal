"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type Sector = { id: string; name: string };
type Internship = {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  location: string | null;
  duration_weeks: number | null;
  sectors: { name: string } | { name: string }[] | null;
};

function sectorName(value: Internship["sectors"]) {
  if (Array.isArray(value)) return value[0]?.name ?? "General";
  return value?.name ?? "General";
}

export default function StaffDashboard() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [mode, setMode] = useState("remote");
  const [location, setLocation] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadInternships() {
    const response = await fetch("/api/internships", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load internships.");
    setInternships(result.internships ?? []);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/staff/login"); return; }
        const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profileError || !profile || !["admin", "nodal_officer"].includes(profile.role)) {
          await supabase.auth.signOut();
          router.replace("/staff/login");
          return;
        }
        const { data: sectorData, error: sectorError } = await supabase.from("sectors").select("id,name").eq("is_active", true).order("name");
        if (sectorError) throw sectorError;
        await loadInternships();
        if (active) {
          if (profile.role === "nodal_officer") { router.replace("/staff/nodal"); return; }
          setRole(profile.role);
          setSectors(sectorData ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load the staff portal.");
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [router]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/staff/login"); return; }
      const response = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ title, description, sectorId, mode, location, durationWeeks }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not publish the internship.");
      setTitle("");
      setDescription("");
      setSectorId("");
      setMode("remote");
      setLocation("");
      setDurationWeeks("");
      setNotice("Internship published. It is now visible on the student opportunities page.");
      await loadInternships();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish the internship.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/staff/login");
  }

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ maxWidth: 900, width: "100%" }}>
        <span className="auth-eyebrow">RESTRICTED STAFF AREA</span>
        <h1>Staff portal</h1>
        {loading ? <p>Verifying staff access…</p> : <>
          <p className="auth-subtitle">Signed in with authorized role: <b>{role === "admin" ? "Admin" : "Nodal Officer"}</b>.</p>
          <h2>Publish an internship</h2>
          <p className="auth-subtitle">Published listings appear on the student opportunities page. Only authorized staff can publish.</p>
          <form className="auth-form" onSubmit={publish}>
            <label>Internship title<input value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={160} placeholder="e.g. Frontend Development Intern" /></label>
            <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} required minLength={10} maxLength={5000} rows={4} placeholder="Responsibilities, learning outcomes, and requirements" /></label>
            <div className="auth-form-row">
              <label>Sector<select value={sectorId} onChange={e => setSectorId(e.target.value)}><option value="">General / not specified</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label>Mode<select value={mode} onChange={e => setMode(e.target.value)}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label>
            </div>
            <div className="auth-form-row">
              <label>Location (optional)<input value={location} onChange={e => setLocation(e.target.value)} maxLength={160} placeholder="City or Remote" /></label>
              <label>Duration in weeks (optional)<input type="number" min={1} max={104} value={durationWeeks} onChange={e => setDurationWeeks(e.target.value)} placeholder="e.g. 8" /></label>
            </div>
            <button className="auth-submit" disabled={busy}>{busy ? "Publishing…" : "Publish internship"} <span>→</span></button>
          </form>
          {error && <p className="auth-alert auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-alert" role="status">{notice}</p>}
          <h2 style={{ marginTop: 32 }}>Published internships ({internships.length})</h2>
          {internships.length === 0 ? <p>No published internships yet. Use the form above to publish the first listing.</p> : <div style={{ display: "grid", gap: 12 }}>{internships.map(item => <article key={item.id} className="domain-card"><span>{sectorName(item.sectors)}</span><h3>{item.title}</h3><p>{item.description}</p><p><b>Mode:</b> {item.mode}{item.location ? ` · ${item.location}` : ""}{item.duration_weeks ? ` · ${item.duration_weeks} weeks` : ""}</p></article>)}</div>}
          <button className="auth-submit" style={{ marginTop: 24 }} onClick={logout}>Sign out <span>↗</span></button>
        </>}
        <footer className="auth-footer">SHIVORIX · Authorized staff</footer>
      </section>
    </main>
  );
}
