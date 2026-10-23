import Link from "next/link";

const steps = [
  { n: "01", title: "Create your student account", body: "Open Student Registration and enter your name, active college, email, mobile number, 12-digit roll number, 15-digit registration number, course, year, semester, and internship sector. Use details that match your college records.", href: "/register", cta: "Register as a student" },
  { n: "02", title: "Verify your email", body: "Open the latest verification email from SHIVORIX and click its verification link. If the link has expired, request a fresh email rather than using an older message." },
  { n: "03", title: "Sign in to the portal", body: "After verification, use the Student Login option and the credentials requested on the login screen. Keep your password private; never share an OTP or password with anyone." , href: "/login", cta: "Student login" },
  { n: "04", title: "Explore internships and sectors", body: "Review published opportunities for role, description, mode, location and duration. If there is no matching published vacancy, check the active internship-sector options and read their descriptions before applying.", href: "/internships", cta: "Explore opportunities" },
  { n: "05", title: "Complete the application carefully", body: "Choose the relevant sector or opportunity, complete every required academic and contact field, and select your preferred start and end dates. Check spelling and numbers before submitting." },
  { n: "06", title: "Upload the required documents", body: "Prepare clear, readable copies of your 4th Semester Admit Card, APAAR / ABC ID proof, College ID Card, College Internship / Consent Letter, and passport-size photograph. The portal accepts PDF, JPG/JPEG, PNG or WEBP for documents (maximum 10 MB each); the photograph must be an image." },
  { n: "07", title: "Review declarations and submit", body: "Read all three student declarations. Submit only if your information is accurate, you understand the college Nodal Officer verification step, and you agree to the applicable internship and college approval conditions." },
  { n: "08", title: "Track your application", body: "Save your application number if one is shown. Return to your student account and My Application area to check the status or follow any instructions from the portal or your college. Submission alone does not mean approval." },
];

const rules = [
  "Use your own active email address and accurate college details.",
  "Enter roll and registration numbers exactly as shown in official college records.",
  "Upload genuine, readable, current documents; do not upload someone else's documents.",
  "Check internship mode, duration, sector and dates before submitting.",
  "Keep your login details private and sign out on shared devices.",
  "Respond to requests for clarification from your college Nodal Officer or authorized portal staff.",
];

export default function GuidelinesPage() {
  return (
    <main style={{ minHeight: "70vh", background: "var(--background, #f7f8fc)", color: "var(--foreground, #172033)", padding: "clamp(24px, 5vw, 64px) 20px 72px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-block", marginBottom: 22, color: "#5264d9", fontWeight: 700, textDecoration: "none" }}>← Back to SHIVORIX home</Link>
        <header style={{ padding: "clamp(24px, 5vw, 48px)", borderRadius: 24, background: "linear-gradient(130deg, #111b3a, #293b75)", color: "white", marginBottom: 28 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: "#b9c7ff" }}>STUDENT HELP CENTER</span>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08, margin: "14px 0" }}>Portal & Internship Guidelines</h1>
          <p style={{ maxWidth: 720, lineHeight: 1.75, color: "#e0e7ff", margin: 0 }}>A step-by-step guide to registration, email verification, finding an internship, preparing documents and submitting your application through SHIVORIX.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
            <Link href="/register" style={{ padding: "12px 18px", background: "#fff", color: "#1a2550", borderRadius: 10, fontWeight: 800, textDecoration: "none" }}>Create account ↗</Link>
            <Link href="/internships" style={{ padding: "12px 18px", border: "1px solid #9caeea", color: "#fff", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}>Browse internships ↗</Link>
          </div>
        </header>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>How to use the portal</h2>
          <p style={{ lineHeight: 1.7, color: "#626b7f", marginTop: 0 }}>Follow these steps in order. The labels and requirements below reflect the current student portal application flow.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
            {steps.map((step) => <article key={step.n} style={{ background: "#fff", border: "1px solid #e5e8f1", borderRadius: 16, padding: 22, boxShadow: "0 6px 22px rgba(23,32,51,0.04)" }}>
              <span style={{ display: "inline-flex", width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "#edf0ff", color: "#4054c6", fontWeight: 900 }}>{step.n}</span>
              <h3 style={{ fontSize: 18, margin: "16px 0 8px" }}>{step.title}</h3>
              <p style={{ color: "#626b7f", lineHeight: 1.7, margin: 0 }}>{step.body}</p>
              {step.href && <Link href={step.href} style={{ display: "inline-block", marginTop: 14, color: "#4054c6", fontWeight: 800, textDecoration: "none" }}>{step.cta} →</Link>}
            </article>)}
          </div>
        </section>

        <section style={{ background: "#fff", border: "1px solid #e5e8f1", borderRadius: 18, padding: "clamp(20px, 4vw, 32px)", marginBottom: 24 }}>
          <h2 style={{ fontSize: 25, marginTop: 0 }}>Application checklist</h2>
          <p style={{ color: "#626b7f", lineHeight: 1.7 }}>Keep these ready before you begin your application:</p>
          <ul style={{ lineHeight: 2, paddingLeft: 22 }}>
            <li>Accurate personal, contact and academic details</li>
            <li>4th Semester Admit Card</li>
            <li>APAAR / ABC ID proof</li>
            <li>College ID Card</li>
            <li>College Internship / Consent Letter</li>
            <li>Passport-size photograph</li>
            <li>Preferred internship start and end dates</li>
          </ul>
          <p style={{ color: "#626b7f", lineHeight: 1.7, marginBottom: 0 }}><strong>File limit:</strong> maximum 10 MB per document. Use PDF, JPG/JPEG, PNG or WEBP for documents; photograph uploads must be JPG/JPEG, PNG or WEBP.</p>
        </section>

        <section style={{ background: "#fff", border: "1px solid #e5e8f1", borderRadius: 18, padding: "clamp(20px, 4vw, 32px)", marginBottom: 24 }}>
          <h2 style={{ fontSize: 25, marginTop: 0 }}>Student rules & good practice</h2>
          <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>{rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
        </section>

        <section style={{ background: "#fff7e8", border: "1px solid #f3d7a3", borderRadius: 18, padding: "clamp(20px, 4vw, 28px)", marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, marginTop: 0, color: "#744813" }}>Important to know</h2>
          <p style={{ lineHeight: 1.75, color: "#744813", marginBottom: 0 }}>Your application may need verification by your college Nodal Officer and may be subject to college approval. Submitting an application does not guarantee selection or approval. Follow any additional instructions shown by the portal or issued by your college.</p>
        </section>

        <section style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 18, padding: 24, borderRadius: 18, background: "#eef1ff" }}>
          <div><h2 style={{ margin: "0 0 6px", fontSize: 22 }}>Need help?</h2><p style={{ margin: 0, color: "#535f80", lineHeight: 1.6 }}>Contact SHIVORIX if you have trouble using the portal.</p></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a href="mailto:info.shivorix@gmail.com" style={{ padding: "11px 15px", borderRadius: 10, background: "#fff", color: "#3548b4", fontWeight: 800, textDecoration: "none" }}>Email support</a>
            <a href="https://wa.me/917654086807" target="_blank" rel="noreferrer" style={{ padding: "11px 15px", borderRadius: 10, background: "#3548b4", color: "#fff", fontWeight: 800, textDecoration: "none" }}>WhatsApp support ↗</a>
          </div>
        </section>
      </div>
    </main>
  );
}
