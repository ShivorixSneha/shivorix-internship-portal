"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type SectorRelation = { id?: string; name: string } | { id?: string; name: string }[] | null;
type GuidelineSector = { id: string; name: string; category: string | null; description: string | null };
type Internship = {
  id: string;
  title: string;
  description: string | null;
  sector_id: string | null;
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

export default function InternshipsClient({ studentPanel = false }: { studentPanel?: boolean }) {
  const router = useRouter();
  const [registeredSectorNames, setRegisteredSectorNames] = useState<string[]>([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [activeSectors, setActiveSectors] = useState<GuidelineSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [applyingId, setApplyingId] = useState("");
  const [selectedForApply, setSelectedForApply] = useState<Internship | null>(null);
  const [notice, setNotice] = useState("");
  const [profileDefaults, setProfileDefaults] = useState<Record<string, string>>({});

  async function loadInternships() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/internships", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load internships.");
      setInternships(result.internships ?? []);
      setActiveSectors(result.sectors ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load internships.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentProfile() {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const metadataSectors = userData.user.user_metadata?.sector_names;
      const sectorNames = Array.isArray(metadataSectors) ? metadataSectors.filter((value: unknown): value is string => typeof value === "string") : [];
      setRegisteredSectorNames(sectorNames);
      const statusResponse = await fetch("/api/internships/apply", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (statusResponse.ok) { const statusResult = await statusResponse.json(); setAlreadyApplied(Boolean(statusResult.alreadyApplied)); }
      const { data } = await supabase.from("profiles")
        .select("full_name,phone,email,father_name,mother_name,date_of_birth,gender,address,city,state,pin_code,roll_number,registration_number,course,branch,academic_year,current_semester,institution_name,college_id,colleges(name,university_name)")
        .eq("id", userData.user.id).maybeSingle();
      const college = Array.isArray(data?.colleges) ? data?.colleges[0] : data?.colleges;
      setProfileDefaults({
        fullName: data?.full_name || "", phone: data?.phone || "", email: userData.user.email || data?.email || "",
        fatherName: data?.father_name || "", motherName: data?.mother_name || "", dateOfBirth: data?.date_of_birth || "",
        gender: data?.gender || "", address: data?.address || "", city: data?.city || "", state: data?.state || "",
        pinCode: data?.pin_code || "", rollNumber: data?.roll_number || "", registrationNumber: data?.registration_number || "",
        course: data?.course || "", department: data?.branch || "", academicYear: data?.academic_year || "",
        semester: data?.current_semester || "V", college: college?.name || data?.institution_name || "",
        university: college?.university_name || "",
      });
    } catch {
      // The application remains usable; the server still validates the authenticated student.
    }
  }

  useEffect(() => { void loadInternships(); void loadStudentProfile(); }, []);

  useEffect(() => {
    if (!studentPanel || !registeredSectorNames.length || !activeSectors.length || selectedForApply || alreadyApplied) return;
    const sector = activeSectors.find(item => registeredSectorNames.some(name => name.toLowerCase() === item.name.toLowerCase()));
    if (!sector) return;
    const match = internships.find(item => item.sector_id === sector.id);
    setSelectedForApply(match || { id: "", title: sector.name, description: sector.description, sector_id: sector.id, mode: "onsite", location: null, duration_weeks: null, published_at: null, sectors: { id: sector.id, name: sector.name } });
  }, [studentPanel, registeredSectorNames, activeSectors, internships, selectedForApply, alreadyApplied]);

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedForApply) return;
    const form = new FormData(event.currentTarget);
    const internshipId = selectedForApply.id;
    setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setApplyingId(internshipId);
      form.set("internshipId", internshipId);
      form.set("sectorId", selectedForApply.sector_id || "");
      form.set("requiredHours", "120");
      form.set("credits", "4");
      const response = await fetch("/api/internships/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) setAlreadyApplied(true); throw new Error(result.error || "Application could not be submitted."); }
      setNotice((result.message || "Application submitted successfully.") + (result.applicationNumber ? " Application number: " + result.applicationNumber + "." : ""));
      setAlreadyApplied(true);
      setSelectedForApply(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Application could not be submitted.");
    } finally {
      setApplyingId("");
    }
  }

  return (
    <main className="opportunities-page">
      {!studentPanel && <header className="opportunities-nav">
        <Link href="/" className="opportunities-brand"><span className="opportunities-mark">S</span><span><b>SHIVORIX</b><small>GROWTH · VISION · SUCCESS</small></span></Link>
        <nav><Link href="/">Home</Link><Link href="/login">Student Login</Link><Link href="/register" className="opportunities-register">Register ↗</Link></nav>
      </header>}
      {!studentPanel && <section className="opportunities-hero">
        <span className="opportunities-eyebrow">STUDENT OPPORTUNITIES</span>
        <h1>Find the right place<br /><em>to begin your career.</em></h1>
        <p>All active sectors are open for applications. Choose your sector and submit your application for Nodal Officer review.</p>
        <div className="opportunities-status"><span className="status-dot" /><div><b>{loading ? "Loading current opportunities…" : loadError ? "Listings could not be loaded" : internships.length ? `${internships.length} published opportunity${internships.length === 1 ? "" : "ies"}` : `${activeSectors.length} active internship sectors`}</b><small>{loadError || (internships.length ? "Open an opportunity to review its details and apply." : "Choose any active sector below and submit your application for Nodal Officer review.")}</small></div></div>
        <Link href="/register" className="opportunities-cta">Create student profile <span>→</span></Link>
      </section>}

      {!studentPanel && <section className="domain-section">
        <div className="domain-heading"><span>LIVE OPPORTUNITIES</span><h2>Published internships</h2><p>Published opportunities appear here when available. You can always apply through any active sector below.</p></div>
        {notice && <p role="status" className="auth-alert">{notice}</p>}
        {loading ? <p>Loading active sectors…</p> : loadError ? <button className="opportunities-cta" onClick={() => void loadInternships()}>Try again ↻</button> : internships.length === 0 ? null : (
          <div className="domain-grid">
            {internships.map((internship) => (
              <article className="domain-card" key={internship.id}>
                <span>{sectorName(internship.sectors)}</span>
                <h3>{internship.title}</h3>
                <p>{internship.description || "Description will be provided by the internship team."}</p>
                <p><b>Mode:</b> {internship.mode}{internship.location ? ` · ${internship.location}` : ""}</p>
                {internship.duration_weeks && <p><b>Duration:</b> {internship.duration_weeks} weeks</p>}
                <button className="opportunities-cta" disabled={applyingId === internship.id} onClick={() => setSelectedForApply(internship)}>{applyingId === internship.id ? "Submitting…" : "Apply now →"}</button>
              </article>
            ))}
          </div>
        )}
      </section>}

      {!studentPanel && <section className="domain-section">
        <div className="domain-heading"><span>ACTIVE GUIDELINE SECTORS</span><h2>Apply by internship sector</h2><p>Choose an active sector to submit your academic internship application. A published vacancy is not required to start a sector-based application.</p></div>
        {activeSectors.length ? <div className="domain-grid">{activeSectors.map(sector => <article className="domain-card" key={sector.id}><span>{sector.category || "GUIDELINE SECTOR"}</span><h3>{sector.name}</h3><p>{sector.description || "Submit your internship application for this active guideline sector."}</p><button className="opportunities-cta" onClick={() => { const match = internships.find(item => item.sector_id === sector.id); setSelectedForApply(match || { id: "", title: sector.name, description: sector.description, sector_id: sector.id, mode: "onsite", location: null, duration_weeks: null, published_at: null, sectors: { id: sector.id, name: sector.name } }); }}>Apply by sector →</button></article>)}</div> : <div className="opportunities-status"><div><b>No active guideline sectors configured</b><small>The portal administrator must activate the applicable sectors before applications can be submitted.</small></div></div>}
      </section>}

      {studentPanel && alreadyApplied && <section className="domain-section"><h2>Application already submitted</h2><p>You can submit only one internship application. Please track its status in My Application.</p></section>}
      {studentPanel && !selectedForApply && !alreadyApplied && !loading && <section className="domain-section"><h2>Application form unavailable</h2><p>{registeredSectorNames.length ? "Your registered sector does not match an active sector. Contact the portal administrator." : "Your registration does not contain a sector. Contact the portal administrator."}</p></section>}
      {selectedForApply && <div className={studentPanel ? "application-inline-wrap" : "application-modal-backdrop"} role="presentation"><section className={studentPanel ? "application-modal application-inline" : "application-modal"} role={studentPanel ? undefined : "dialog"} aria-modal={studentPanel ? undefined : true} aria-labelledby="application-form-title">{!studentPanel && <button type="button" className="application-modal-close" onClick={() => setSelectedForApply(null)} aria-label="Close application form">×</button>}<span className="opportunities-eyebrow">SEMESTER V · STUDENT APPLICATION</span><h2 id="application-form-title">Complete your application</h2><p>Complete all required details, upload five documents (maximum 10 MB each), and accept all three declarations.</p><form key={profileDefaults.email || "student-application"} className="application-details-form" onSubmit={apply} encType="multipart/form-data">
<label>Full name *<input name="fullName" required autoComplete="name" defaultValue={profileDefaults.fullName} /></label>
<label>Father's name *<input name="fatherName" required defaultValue={profileDefaults.fatherName} /></label>
<label>Mother's name *<input name="motherName" required defaultValue={profileDefaults.motherName} /></label>
<label>Date of birth *<input name="dateOfBirth" type="date" required defaultValue={profileDefaults.dateOfBirth} /></label>
<label>Gender *<select name="gender" required defaultValue={profileDefaults.gender}><option value="" disabled>Select gender</option><option>Male</option><option>Female</option><option>Other</option></select></label>
<label>Mobile number *<input name="phone" required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number" defaultValue={profileDefaults.phone} /></label>
<label>Email address *<input name="email" type="email" required readOnly value={profileDefaults.email || ""} /></label>
<label>University *<input name="university" required readOnly value={profileDefaults.university || ""} /></label>
<label>College / Institute *<input name="college" required readOnly value={profileDefaults.college || ""} /></label>
<label>Course / Programme *<input name="course" required defaultValue={profileDefaults.course} /></label>
<label>Department *<input name="department" required defaultValue={profileDefaults.department} /></label>
<label>Current Semester *<select name="semester" required defaultValue={profileDefaults.semester || "V"}><option value="IV">IV</option><option value="V">V</option><option value="VI">VI</option></select></label>
<label>Academic session *<input name="academicYear" required placeholder="2026-2027" defaultValue={profileDefaults.academicYear} /></label>
<label>University Registration Number *<input name="registrationNumber" required defaultValue={profileDefaults.registrationNumber} /></label>
<label>College Roll Number *<input name="rollNumber" required defaultValue={profileDefaults.rollNumber} /></label>
<label className="application-full-width">Internship Sector *{studentPanel ? <input name="sectorChoice" required readOnly value={selectedForApply.title || ""} /> : <select name="sectorChoice" required value={selectedForApply.sector_id || ""} onChange={(event) => { const sector = activeSectors.find(item => item.id === event.target.value); const match = internships.find(item => item.sector_id === event.target.value); if (match) setSelectedForApply(match); else if (sector) setSelectedForApply({ id: "", title: sector.name, description: sector.description, sector_id: sector.id, mode: "onsite", location: null, duration_weeks: null, published_at: null, sectors: { id: sector.id, name: sector.name } }); }}><option value="" disabled>Select active internship sector</option>{activeSectors.map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select>}</label>
<label>Internship Mode *<select name="mode" required defaultValue={selectedForApply.mode}><option value="onsite">Offline / On-site</option><option value="hybrid">Hybrid</option><option value="remote">Online / Virtual</option></select></label>
<label>Required Hours<input name="requiredHours" value="120" readOnly /></label><label>Credits<input name="credits" value="4" readOnly /></label>
<label>Preferred Start Date *<input name="preferredStartDate" type="date" required /></label><label>Preferred End Date *<input name="preferredEndDate" type="date" required /></label>
<label>State *<input name="state" required defaultValue={profileDefaults.state} /></label><label>City / District *<input name="city" required defaultValue={profileDefaults.city} /></label>
<label>PIN Code *<input name="pinCode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} defaultValue={profileDefaults.pinCode} /></label><label className="application-full-width">Full Address *<textarea name="address" required maxLength={1000} rows={2} defaultValue={profileDefaults.address} /></label>
<div className="application-full-width"><h3>Required application documents</h3><p>PDF, JPG/JPEG, PNG or WEBP; maximum 10 MB per file. Photograph must be an image.</p></div>
<label>4th Semester Admit Card *<input name="admitCard" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" /></label>
<label>APAAR / ABC ID Proof *<input name="apaarId" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" /></label>
<label>College ID Card *<input name="collegeIdCard" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" /></label>
<label>College Internship / Consent Letter *<input name="consentLetter" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" /></label>
<label>Passport-size Photograph *<input name="photograph" type="file" required accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /></label>
<label className="application-full-width">Additional note (optional)<textarea name="coverNote" maxLength={2000} rows={2} /></label>
<div className="application-full-width"><h3>Student Declaration *</h3>
<label><input type="checkbox" name="declaration1" required /> I confirm that all information provided by me is true and correct.</label>
<label><input type="checkbox" name="declaration2" required /> I understand that the application will be verified by my college Nodal Officer.</label>
<label><input type="checkbox" name="declaration3" required /> I agree to follow the internship guidelines and applicable college approval conditions.</label></div>
<div className="application-full-width application-modal-summary"><strong>{selectedForApply.title}</strong><span>{sectorName(selectedForApply.sectors)} · 120 hours · 4 credits</span></div>
<button className="opportunities-cta application-full-width" type="submit" disabled={Boolean(applyingId)}>{applyingId ? "Uploading documents & submitting…" : "Submit internship application →"}</button></form></section></div>}
    </main>
  );
}
