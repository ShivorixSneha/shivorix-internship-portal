"use client";

import Link from "next/link";

const domains = [
  { number: "01", title: "Technology & IT", detail: "Software, web development, data and IT support" },
  { number: "02", title: "Design & Creative", detail: "UI/UX, graphic design and digital content" },
  { number: "03", title: "Business & Marketing", detail: "Operations, research, marketing and communication" },
];

export default function InternshipsPage() {
  return (
    <main className="opportunities-page">
      <header className="opportunities-nav">
        <Link href="/" className="opportunities-brand"><span className="opportunities-mark">S</span><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link>
        <nav><Link href="/">Home</Link><Link href="/login">Student Login</Link><Link href="/register" className="opportunities-register">Register ↗</Link></nav>
      </header>
      <section className="opportunities-hero">
        <span className="opportunities-eyebrow">STUDENT OPPORTUNITIES</span>
        <h1>Find the right place<br /><em>to begin your career.</em></h1>
        <p>Explore published internship opportunities here. Read each listing carefully before applying.</p>
        <div className="opportunities-status"><span className="status-dot" /><div><b>No internship listings published yet</b><small>New opportunities will appear on this page when the portal team publishes them.</small></div></div>
        <Link href="/register" className="opportunities-cta">Create student profile <span>→</span></Link>
      </section>
      <section className="domain-section">
        <div className="domain-heading"><span>EXPLORE YOUR INTERESTS</span><h2>Which field interests you?</h2><p>These are example career areas—not active internship vacancies.</p></div>
        <div className="domain-grid">{domains.map((domain) => <article className="domain-card" key={domain.number}><span>{domain.number}</span><h3>{domain.title}</h3><p>{domain.detail}</p></article>)}</div>
      </section>
      <footer className="opportunities-footer"><span>SHIVORIX · GROWTH · VISION · SUCCESS</span><Link href="/">Back to homepage ↑</Link></footer>
    </main>
  );
}
