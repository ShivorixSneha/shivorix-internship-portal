"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type SectorRelation = { name: string } | { name: string }[] | null;
type Internship = {
  id: string;
  title: string;
  description: string | null;
  mode: "remote" | "onsite" | "hybrid";
  location: string | null;
  duration_weeks: number | null;
  published_at: string | null;
  sectors: SectorRelation;
};

const domains = [
  { number: "01", title: "Technology & IT", detail: "Software, web development, data and IT support" },
  { number: "02", title: "Design & Creative", detail: "UI/UX, graphic design and digital content" },
  { number: "03", title: "Business & Marketing", detail: "Operations, research, marketing and communication" },
];

function sectorName(value: SectorRelation) {
  if (Array.isArray(value)) return value[0]?.name ?? "General";
  return value?.name ?? "General";
}

export default function InternshipsPage() {
  const router = useRouter();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [applyingId, setApplyingId] = useState("");
  const [notice, setNotice] = useState("");

  async function loadInternships() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/internships", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load internships.");
      setInternships(result.internships ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load internships.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadInternships(); }, []);

  async function apply(internshipId: string) {
    setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setApplyingId(internshipId);
      const response = await fetch("/api/internships/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ internshipId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Application could not be submitted.");
      setNotice(result.message || "Application submitted successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Application could not be submitted.");
    } finally {
      setApplyingId("");
    }
  }

  return (
    <main className="opportunities-page">
      <header className="opportunities-nav">
        <Link href="/" className="opportunities-brand"><span className="opportunities-mark">S</span><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link>
        <nav><Link href="/">Home</Link><Link href="/login">Student Login</Link><Link href="/register" className="opportunities-register">Register ↗</Link></nav>
      </header>
      <section className="opportunities-hero">
        <span className="opportunities-eyebrow">STUDENT OPPORTUNITIES</span>
        <h1>Find the right place<br /><em>to begin your career.</em></h1>
        <p>Explore published internship opportunities here. Read each listing carefully before you choose.</p>
        <div className="opportunities-status"><span className="status-dot" /><div><b>{loading ? "Loading current opportunities…" : loadError ? "Listings could not be loaded" : internships.length ? `${internships.length} published opportunity${internships.length === 1 ? "" : "ies"}` : "No internship listings published yet"}</b><small>{loadError || (internships.length ? "Open an opportunity to review its details and apply." : "New opportunities will appear here when authorized portal staff publish them.")}</small></div></div>
        <Link href="/register" className="opportunities-cta">Create student profile <span>→</span></Link>
      </section>

      <section className="domain-section">
        <div className="domain-heading"><span>LIVE OPPORTUNITIES</span><h2>Published internships</h2><p>Only active opportunities published by the portal team appear below.</p></div>
        {notice && <p role="status" className="auth-alert">{notice}</p>}
        {loading ? <p>Checking published opportunities…</p> : loadError ? <button className="opportunities-cta" onClick={() => void loadInternships()}>Try again ↻</button> : internships.length === 0 ? <div className="opportunities-status"><div><b>No live vacancies yet</b><small>Career areas below are examples, not active vacancies.</small></div></div> : (
          <div className="domain-grid">
            {internships.map((internship) => (
              <article className="domain-card" key={internship.id}>
                <span>{sectorName(internship.sectors)}</span>
                <h3>{internship.title}</h3>
                <p>{internship.description || "Description will be provided by the internship team."}</p>
                <p><b>Mode:</b> {internship.mode}{internship.location ? ` · ${internship.location}` : ""}</p>
                {internship.duration_weeks && <p><b>Duration:</b> {internship.duration_weeks} weeks</p>}
                <button className="opportunities-cta" disabled={applyingId === internship.id} onClick={() => void apply(internship.id)}>{applyingId === internship.id ? "Submitting…" : "Apply now →"}</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="domain-section">
        <div className="domain-heading"><span>EXPLORE YOUR INTERESTS</span><h2>Which field interests you?</h2><p>These are example career areas—not active internship vacancies.</p></div>
        <div className="domain-grid">{domains.map((domain) => <article className="domain-card" key={domain.number}><span>{domain.number}</span><h3>{domain.title}</h3><p>{domain.detail}</p></article>)}</div>
      </section>

    </main>
  );
}
