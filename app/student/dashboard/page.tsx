"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowRight, Award, BookOpen, BriefcaseBusiness, CalendarCheck,
  CheckCircle2, ClipboardCheck, Clock3, FileText, FolderOpen, GraduationCap,
  LayoutDashboard, LogOut, Menu, MessageSquareText, ShieldCheck, Target,
  UserRound, X, Bell, ChevronRight, CircleHelp, ClipboardList, NotebookPen,
} from "lucide-react";
import { getSupabaseBrowserClient } from "../../../lib/supabase";
import "./dashboard.css";

type StudentRecord = { id: string; record_type: "assignment" | "evaluation" | "document" | "notification" | "training" | "activity" | "test" | "certificate"; title: string; description: string | null; status: string; due_date: string | null; resource_url: string | null; created_at: string; student_id: string | null };
type StudentAttendance = { id: string; attendance_date: string; status: string; notes: string | null; updated_at: string };
type StudentSubmission = { id: string; record_id: string; status: string; submission_url: string | null; submission_note: string | null; feedback: string | null; submitted_at: string };
type StudentApplication = { id: string; status: string; applied_at: string; updated_at: string | null; internships: { title: string; description: string | null; mode: string; location: string | null; duration_weeks: number | null } | { title: string; description: string | null; mode: string; location: string | null; duration_weeks: number | null }[] | null };
type Profile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  roll_number: string | null;
  registration_number: string | null;
  institution_name: string | null;
  course: string | null;
  academic_year: string | null;
  current_semester: string | null;
};

const navigation = [
  { label: "My Profile", icon: UserRound, description: "Your personal and academic information" },
  { label: "Guidelines", icon: BookOpen, description: "Official internship rules, timelines, evaluation and report requirements" },
  { label: "Apply for Internship", icon: BriefcaseBusiness, description: "Explore and apply for an internship" },
  { label: "My Application", icon: ClipboardCheck, description: "Track your application progress" },
  { label: "Internship Details", icon: NotebookPen, description: "Your internship plan and information" },
  { label: "Online Training", icon: BookOpen, description: "Learning modules and training resources" },
  { label: "Assessments", icon: Target, description: "Assessment instructions and progress" },
  { label: "My Tests", icon: ClipboardList, description: "Your assigned tests and results" },
  { label: "Attendance", icon: CalendarCheck, description: "Review your attendance record" },
  { label: "Activities", icon: Activity, description: "Your internship activities" },
  { label: "Assignments", icon: FileText, description: "View and submit assigned work" },
  { label: "Project & Report", icon: FolderOpen, description: "Manage your project and report" },
  { label: "Final Test", icon: GraduationCap, description: "Final assessment information" },
  { label: "Documents", icon: FolderOpen, description: "Your internship documents" },
  { label: "Evaluation", icon: CheckCircle2, description: "Review your evaluation" },
  { label: "Notifications", icon: Bell, description: "Important notices from your institution" },
  { label: "Certificate", icon: Award, description: "Access your completion certificate" },
];

const profileFields: { label: string; key: keyof Profile }[] = [
  { label: "Full name", key: "full_name" },
  { label: "Roll number", key: "roll_number" },
  { label: "Registration number", key: "registration_number" },
  { label: "Email address", key: "email" },
  { label: "Mobile number", key: "phone" },
  { label: "College / institution", key: "institution_name" },
  { label: "Course / programme", key: "course" },
  { label: "Academic year", key: "academic_year" },
  { label: "Current semester", key: "current_semester" },
];

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sectorNames, setSectorNames] = useState<string[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>([]);
  const [studentApplications, setStudentApplications] = useState<StudentApplication[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<StudentSubmission[]>([]);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState("");
  const [recordsNotice, setRecordsNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.replace("/login");
          return;
        }
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("full_name,email,phone,roll_number,registration_number,institution_name,course,academic_year,current_semester")
          .eq("id", user.id)
          .single();
        if (profileError) throw profileError;
        const { data: selections } = await supabase
          .from("student_sectors").select("sectors(name)").eq("student_id", user.id);
        const { data: { session } } = await supabase.auth.getSession();
        let recordData: any = { records: [], attendance: [] };
        if (session) {
          const response = await fetch("/api/student/records", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
          recordData = await response.json();
          if (!response.ok) throw new Error(recordData.error || "Could not load assignments and institution updates.");
        }
        if (active) {
          setProfile(data as Profile);
          setSectorNames((selections || []).map((item: any) => item.sectors?.name).filter(Boolean));
          setStudentRecords((recordData.records ?? []) as StudentRecord[]);
          setStudentAttendance((recordData.attendance ?? []) as StudentAttendance[]);
          setStudentApplications((recordData.applications ?? []) as StudentApplication[]);
          setStudentSubmissions((recordData.submissions ?? []) as StudentSubmission[]);
          setRecordsNotice(recordData.notice || "");
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load your student profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  const completion = useMemo(() => {
    if (!profile) return 0;
    const filled = profileFields.filter(({ key }) => Boolean(profile[key]?.toString().trim())).length;
    return Math.round((filled / profileFields.length) * 100);
  }, [profile]);

  async function submitStudentWork(event: React.FormEvent<HTMLFormElement>, recordId: string) {
    event.preventDefault(); setSubmissionBusy(true); setError(""); setSubmissionNotice("");
    try {
      const form = event.currentTarget;
      const values = new FormData(form);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const response = await fetch("/api/student/records", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ recordId, submissionUrl: values.get("submissionUrl"), submissionNote: values.get("submissionNote") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission could not be saved.");
      const refreshed = await fetch("/api/student/records", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const data = await refreshed.json();
      if (!refreshed.ok) throw new Error(data.error || "Submission saved, but records could not be refreshed.");
      setStudentRecords((data.records ?? []) as StudentRecord[]);
      setStudentAttendance((data.attendance ?? []) as StudentAttendance[]);
      setStudentApplications((data.applications ?? []) as StudentApplication[]);
      setStudentSubmissions((data.submissions ?? []) as StudentSubmission[]);
      form.reset();
      setSubmissionNotice("Your work was submitted successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Submission could not be saved."); }
    finally { setSubmissionBusy(false); }
  }

  function generateStudentDocument(kind: "application" | "acceptance" | "logbook" | "completion" | "marksheet") {
    if (!profile) return;
    const app = studentApplications[0];
    const internship = Array.isArray(app?.internships) ? app?.internships[0] : app?.internships;
    const certificateRecord = studentRecords.find(item => item.record_type === "certificate" && ["published", "completed"].includes(item.status));
    const evaluationRecord = studentRecords.find(item => item.record_type === "evaluation" && ["published", "completed", "reviewed", "accepted"].includes(item.status));
    const accepted = Boolean(app && ["approved", "accepted"].includes(app.status.toLowerCase()));
    const completed = Boolean(certificateRecord);
    const evaluated = Boolean(evaluationRecord);
    const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
    const value = (v: unknown) => esc(typeof v === "string" && v.trim() ? v : "Not recorded");
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const session = profile.academic_year || "Not recorded";
    const status = kind === "acceptance" ? (accepted ? "APPROVED APPLICATION" : "DRAFT — NOT ISSUED")
      : kind === "completion" ? (completed ? "COMPLETION RECORD FOUND" : "DRAFT — NOT ISSUED")
      : kind === "marksheet" ? (evaluated ? "EVALUATION RECORD FOUND" : "DRAFT — MARKS PENDING") : "STUDENT COPY";
    const details: [string, unknown][] = [
      ["Student Name", profile.full_name], ["Email", profile.email], ["Mobile", profile.phone],
      ["University Registration Number", profile.registration_number], ["College Roll Number", profile.roll_number],
      ["College / Institution", profile.institution_name], ["Programme / Department", profile.course],
      ["Semester / Session", "Semester V · " + session],
      ["Internship Sector", internship?.title || sectorNames.join(", ")], ["Mode", internship?.mode],
      ["Internship Duration", internship?.duration_weeks ? `${internship.duration_weeks} weeks` : "As approved by college"],
      ["Required Hours / Credits", "120 Hours / 4 Credits"],
    ];
    const rows = (items: [string, unknown][]) => items.map(([label, val]) => `<tr><th>${esc(label)}</th><td>${value(val)}</td></tr>`).join("");
    const title = ({ application: "INTERNSHIP APPLICATION COPY", acceptance: "INTERNSHIP ACCEPTANCE LETTER", logbook: "SHIVORIX — INTERNSHIP LOG BOOK", completion: "INTERNSHIP COMPLETION CERTIFICATE", marksheet: "INTERNSHIP PERFORMANCE MARKSHEET" } as const)[kind];
    let body = "";
    if (kind === "application") {
      body = `<h2>1. Personal Details</h2><table>${rows([["Full Name", profile.full_name], ["Father's Name", "Not recorded in portal profile"], ["Mother's Name", "Not recorded in portal profile"], ["Date of Birth", "Not recorded in portal profile"], ["Gender", "Not recorded in portal profile"], ["Mobile", profile.phone], ["Email", profile.email], ["Address", "Not recorded in portal profile"]])}</table><h2>2. Academic Details</h2><table>${rows([["University", "As recorded by college"], ["College / Institute", profile.institution_name], ["Course / Programme", profile.course], ["Department", profile.course], ["Semester", "V (Semester 5 portal)"], ["Academic Session", session], ["University Registration No.", profile.registration_number], ["College Roll No.", profile.roll_number]])}</table><h2>3. Internship Details</h2><table>${rows([["Internship Sector", internship?.title || sectorNames.join(", ")], ["Mode", internship?.mode], ["Internship Type", "Credit-based"], ["Required Hours", "120"], ["Credits", "4"], ["Preferred Start Date", "As recorded/approved by college"], ["Preferred End Date", "As recorded/approved by college"], ["Application Status", app?.status], ["Remarks", "As recorded in the portal"]])}</table><h2>4. Submitted Documents</h2><table><tr><th>Document / Record</th><th>Status</th></tr>${studentRecords.filter(item => item.record_type === "document").map(item => `<tr><td>${esc(item.title)}</td><td>${esc(item.status)}</td></tr>`).join("") || '<tr><td colspan="2">No document records available in portal.</td></tr>'}</table>`;
    } else if (kind === "acceptance") {
      body = `<p>To,</p><p><strong>${value(profile.full_name)}</strong><br/>${value(profile.institution_name)}</p><p>Dear Candidate,</p><p>We are pleased to provide this ${accepted ? "acceptance record" : "draft acceptance preview"} for the SHIVORIX internship programme. This document is not an official acceptance unless the application has been approved by the authorized institution/IPO.</p><table>${rows(details)}</table><p>The student is requested to follow the approved internship schedule, complete assigned learning activities, maintain required records, submit the internship report and complete the prescribed evaluation requirements.</p><p>Issued status: <strong>${esc(status)}</strong></p><div class="signature">Authorized Signatory<br/>SHIVORIX PRIVATE LIMITED</div>`;
    } else if (kind === "logbook") {
      body = `<p><strong>Student:</strong> ${value(profile.full_name)} &nbsp; <strong>College:</strong> ${value(profile.institution_name)}<br/><strong>Registration No.:</strong> ${value(profile.registration_number)} &nbsp; <strong>Roll No.:</strong> ${value(profile.roll_number)}<br/><strong>Internship:</strong> ${value(internship?.title || sectorNames.join(", "))} · Semester V</p><p class="notice">Total attendance entries: ${studentAttendance.length} · Hours are shown only when explicitly recorded; this portal does not infer hours from attendance days.</p><table class="log"><tr><th>S.No.</th><th>Date</th><th>Activity / Work Done</th><th>Description / Notes</th><th>Hours</th><th>Status</th></tr>${studentAttendance.map((entry,index)=>`<tr><td>${index+1}</td><td>${value(new Date(entry.attendance_date+"T00:00:00").toLocaleDateString("en-IN"))}</td><td>Internship attendance</td><td>${value(entry.notes)}</td><td>Not recorded</td><td>${value(entry.status)}</td></tr>`).join("") || '<tr><td colspan="6">No attendance or logbook entries recorded yet.</td></tr>'}</table>`;
    } else if (kind === "completion") {
      body = `<div class="certificate"><p>This is to certify that</p><h1>${value(profile.full_name)}</h1><p>of ${value(profile.institution_name)}, registration number ${value(profile.registration_number)}, has ${completed ? "a completion record on file for" : "not yet been verified as having completed"} the SHIVORIX internship programme.</p><table>${rows(details)}</table><p class="notice">${completed ? "This preview is based on a published completion record. Authorized signature and final verification remain required." : "DRAFT — NOT ISSUED. A completion certificate must not be treated as official until the authorized completion record is approved."}</p><div class="signature">Authorized Signatory<br/>SHIVORIX PRIVATE LIMITED</div></div>`;
    } else {
      const criteria = ["Technical Knowledge & Application", "Quality of Work & Task Completion", "Initiative & Problem-Solving Ability", "Communication & Interpersonal Skills", "Punctuality, Discipline & Professional Conduct"];
      body = `<table>${rows(details)}</table><h2>Performance Evaluation</h2><table><tr><th>S. No.</th><th>Assessment Criteria</th><th>Maximum Marks</th><th>Marks Obtained</th></tr>${criteria.map((label,index)=>`<tr><td>${index+1}</td><td>${esc(label)}</td><td>20</td><td>${evaluated ? "Awaiting structured marks entry" : "Pending"}</td></tr>`).join("")}<tr><th colspan="2">TOTAL</th><th>100</th><th>Pending</th></tr></table><h2>Performance Summary</h2><table>${rows([["Total Marks", "Pending official evaluation"], ["Percentage", "Pending official evaluation"], ["Grade", "Pending official evaluation"], ["Result", "Pending official evaluation"]])}</table><h2>Supervisor's Remarks</h2><p>${value(evaluationRecord?.description)}</p><p class="notice">Marks, grade and result are not invented by the portal. They must be entered and approved by the authorized evaluator before this marksheet is official.</p>`;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)} - ${esc(profile.full_name || "Student")}</title><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#27213d;font:12px/1.5 Arial,sans-serif;background:#fff}.sheet{border:3px double #f47a20;padding:24px;min-height:260mm;position:relative}.brand{text-align:center;border-bottom:2px solid #f47a20;padding-bottom:12px;margin-bottom:18px}.brand h1{margin:0;font-size:28px;letter-spacing:1px;color:#4c168c}.brand p{margin:2px 0;color:#514568}.brand img{width:74px;height:74px;object-fit:contain}.doc-title{text-align:center;color:#4c168c;font-size:22px;margin:18px 0 4px;font-weight:800}.meta{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #f3b55b;padding:8px 0;margin-bottom:16px;font-weight:700}.status{text-align:center;color:#9a4b00;background:#fff4e7;border:1px solid #f5bd7a;padding:7px;margin:10px 0 16px;font-weight:700}h2{font-size:14px;color:#fff;background:#4c168c;padding:7px 10px;margin:18px 0 8px;border-radius:3px}p{margin:10px 0}table{width:100%;border-collapse:collapse;margin:8px 0 14px;page-break-inside:auto}tr{page-break-inside:avoid}th,td{border:1px solid #d9d3e6;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f5f0fb;font-weight:700;width:36%}.log th{font-size:9px}.log td{font-size:10px}.notice{border:1px solid #efc17b;background:#fff9ed;padding:9px}.signature{margin:42px 0 12px auto;text-align:center;width:240px;border-top:1px solid #4c168c;padding-top:8px;font-weight:700}.certificate{text-align:center;padding:20px 0}.certificate h1{font-size:30px;color:#4c168c;border-bottom:1px solid #f47a20;padding:10px}.certificate table{text-align:left}.footer{border-top:2px solid #f47a20;text-align:center;padding-top:10px;margin-top:28px;color:#4c168c;font-weight:700;font-size:10px}.actions{position:sticky;top:0;padding:12px;background:#f4f0fa;text-align:center;z-index:2}.actions button{border:0;border-radius:7px;background:linear-gradient(90deg,#f47a20,#6c2eb9);color:#fff;padding:10px 18px;font-weight:700;cursor:pointer;margin:0 5px}@media print{.actions{display:none}.sheet{border:3px double #f47a20;min-height:260mm}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button><button onclick="window.close()">Close</button></div><main class="sheet"><header class="brand"><img src="${window.location.origin}/shivorix-logo.svg" alt="SHIVORIX"/><h1>SHIVORIX</h1><p>GROWTH · VISION · SUCCESS</p><p>Internship Programme · Muzaffarpur, Bihar · www.shivorixai.com</p></header><div class="doc-title">${esc(title)}</div><div class="meta"><span>Student: ${value(profile.full_name)}</span><span>Date: ${esc(today)}</span></div><div class="status">${esc(status)}</div>${body}<footer class="footer">SHIVORIX · www.shivorixai.com<br/>info.shivorix@gmail.com · +91 76540 86807<br/><span style="font-weight:400">Generated from SHIVORIX Internship Portal · ${esc(today)}</span></footer></main></body></html>`;
    const popup = window.open("", "_blank");
    if (!popup) { setError("Please allow pop-ups for this portal to open your document."); return; }
    popup.document.open(); popup.document.write(html); popup.document.close();
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  const selectedItem = navigation.find((item) => item.label === activeSection);
  const SelectedIcon = selectedItem?.icon || LayoutDashboard;

  return (
    <main className="portal-shell">
      {mobileMenuOpen && <button className="portal-mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`portal-sidebar ${mobileMenuOpen ? "portal-sidebar-open" : ""}`}>
        <div className="portal-brand">
          <div className="portal-logo-wrap"><img src="/shivorix-logo.svg" alt="SHIVORIX logo" /></div>
          <div className="portal-brand-copy"><strong>SHIVORIX</strong><span>INTERNSHIP PORTAL</span></div>
          <button className="portal-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="portal-nav-caption">STUDENT WORKSPACE</div>
        <nav className="portal-navigation" aria-label="Student portal">
          <button className={`portal-nav-item ${activeSection === "Overview" ? "active" : ""}`} onClick={() => { setActiveSection("Overview"); setMobileMenuOpen(false); }}>
            <LayoutDashboard size={18} /><span>Dashboard</span>
          </button>
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`portal-nav-item ${activeSection === label ? "active" : ""}`} onClick={() => { setActiveSection(label); setMobileMenuOpen(false); }}>
              <Icon size={18} /><span>{label}</span>{activeSection === label && <ChevronRight className="portal-nav-chevron" size={15} />}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <div className="portal-help-card"><span className="portal-help-icon"><CircleHelp size={17} /></span><div><strong>Need help?</strong><p>We’re here to support you.</p></div><ArrowRight size={15} /></div>
          <button className="portal-logout" onClick={logout}><LogOut size={18} /><span>Sign out</span></button>
          <div className="portal-sidebar-foot">© 2026 SHIVORIX</div>
        </div>
      </aside>

      <section className="portal-main">
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button className="portal-menu-toggle" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)}><Menu size={21} /></button>
            <div><div className="portal-breadcrumb">Student workspace <ChevronRight size={13} /> <span>{activeSection}</span></div><div className="portal-topbar-label">Internship journey, all in one place</div></div>
          </div>
          <div className="portal-topbar-right">
            <div className="portal-secure-tag"><ShieldCheck size={15} /><span>Student Portal</span></div>
            <div className="portal-avatar">{profile?.full_name?.trim()?.charAt(0)?.toUpperCase() || "S"}</div>
          </div>
        </header>

        <div className="portal-content">
          {loading ? <div className="portal-loading"><span className="portal-spinner" />Loading your student workspace…</div> : error ? (
            <div className="portal-error"><strong>We couldn’t load your profile</strong><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></div>
          ) : activeSection === "Overview" ? (
            <>
              <section className="portal-welcome">
                <div className="portal-welcome-copy"><div className="portal-eyebrow"><span /> YOUR NEXT CHAPTER STARTS HERE</div><h1>Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1><p>Keep your internship journey moving. Your learning, progress, and important updates live here.</p><div className="portal-welcome-actions"><button onClick={() => setActiveSection("My Profile")} className="portal-primary-btn">View my profile <ArrowRight size={16} /></button><button onClick={() => setActiveSection("My Application")} className="portal-secondary-btn">Track application</button></div></div>
                <div className="portal-welcome-art"><div className="portal-art-orbit orbit-one" /><div className="portal-art-orbit orbit-two" /><div className="portal-art-icon"><GraduationCap size={46} strokeWidth={1.4} /></div><div className="portal-art-chip chip-top"><CheckCircle2 size={15} /> Learn</div><div className="portal-art-chip chip-bottom"><Target size={15} /> Grow</div><div className="portal-art-dot dot-one" /><div className="portal-art-dot dot-two" /></div>
              </section>

              <div className="portal-section-heading"><div><span className="portal-section-kicker">YOUR SPACE</span><h2>Student overview</h2><p>A quick look at your portal and profile.</p></div><span className="portal-date-chip"><Clock3 size={15} /> Your progress, at a glance</span></div>

              <div className="portal-stat-grid">
                <button className="portal-stat-card" onClick={() => setActiveSection("My Profile")}><span className="portal-stat-icon blue"><UserRound size={20} /></span><span className="portal-stat-label">Profile completion</span><strong>{completion}%</strong><span className="portal-stat-foot"><span className="portal-progress"><i style={{ width: `${completion}%` }} /></span><small>{completion === 100 ? "Profile looks complete" : "Complete your details"} <ArrowRight size={13} /></small></span></button>
                <button className="portal-stat-card" onClick={() => setActiveSection("My Application")}><span className="portal-stat-icon violet"><BriefcaseBusiness size={20} /></span><span className="portal-stat-label">Internship application</span><strong className="portal-stat-word">Stay on track</strong><span className="portal-stat-note">Check your latest application status <ArrowRight size={13} /></span></button>
                <button className="portal-stat-card" onClick={() => setActiveSection("Online Training")}><span className="portal-stat-icon teal"><BookOpen size={20} /></span><span className="portal-stat-label">Learning hub</span><strong className="portal-stat-word">Keep learning</strong><span className="portal-stat-note">Explore your training section <ArrowRight size={13} /></span></button>
              </div>

              <div className="portal-lower-grid">
                <section className="portal-panel portal-profile-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><UserRound size={17} /></span><div><h3>Profile snapshot</h3><p>Your registered student details</p></div></div><button onClick={() => setActiveSection("My Profile")} className="portal-text-action">View profile <ArrowRight size={14} /></button></div><div className="portal-profile-summary"><div className="portal-large-avatar">{profile?.full_name?.trim()?.charAt(0)?.toUpperCase() || "S"}</div><div><strong>{profile?.full_name || "Student"}</strong><span>{profile?.course || "Course not added yet"}</span><small>{profile?.institution_name || "Institution not added yet"}</small></div><span className="portal-profile-badge"><ShieldCheck size={14} /> Student</span></div><div className="portal-summary-fields"><div><small>Roll number</small><strong>{profile?.roll_number || "Not added"}</strong></div><div><small>Registration no.</small><strong>{profile?.registration_number || "Not added"}</strong></div></div></section>
                <section className="portal-panel portal-sectors-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon purple"><Target size={17} /></span><div><h3>Interest areas</h3><p>Your selected internship sectors</p></div></div></div>{sectorNames.length ? <div className="portal-sector-list">{sectorNames.map((name) => <span key={name}><CheckCircle2 size={14} />{name}</span>)}</div> : <div className="portal-empty-inline"><span><BriefcaseBusiness size={20} /></span><div><strong>No sectors selected yet</strong><p>Visit your profile or application area to review your choices.</p></div></div>}<button className="portal-sector-link" onClick={() => setActiveSection("Apply for Internship")}>Explore internship options <ArrowRight size={15} /></button></section>
              </div>

              <section className="portal-journey-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon amber"><Activity size={17} /></span><div><h3>Your internship journey</h3><p>Jump straight to the section you need.</p></div></div></div><div className="portal-journey-grid">{[
                { label: "Online Training", desc: "Learning resources", icon: BookOpen },
                { label: "Assignments", desc: "Tasks and submissions", icon: FileText },
                { label: "Attendance", desc: "Attendance record", icon: CalendarCheck },
                { label: "Documents", desc: "Important files", icon: FolderOpen },
              ].map(({ label, desc, icon: Icon }) => <button key={label} className="portal-journey-item" onClick={() => setActiveSection(label)}><span><Icon size={19} /></span><div><strong>{label}</strong><small>{desc}</small></div><ArrowRight size={15} /></button>)}</div></section>
            </>
          ) : activeSection === "Guidelines" ? (
            <>
              <div className="portal-page-title"><span className="portal-page-icon"><BookOpen size={22} /></span><div><div className="portal-eyebrow">OFFICIAL INTERNSHIP FRAMEWORK</div><h1>Internship Guidelines</h1><p>These portal guidelines are specifically for Semester V undergraduate students, based on the Internship Guidelines for Undergraduate Programmes in Universities of Bihar (notification dated 5 June 2026). Follow the schedule and instructions formally issued by your college or university.</p></div></div>
              <div className="portal-stat-grid">
                <article className="portal-stat-card"><span className="portal-stat-label">Required duration</span><strong>120 hours</strong><span className="portal-stat-note">4 credits · normally 4–6 weeks</span></article>
                <article className="portal-stat-card"><span className="portal-stat-label">IPO work</span><strong>Minimum 90 hours</strong><span className="portal-stat-note">Remaining time includes report, assessment and evaluation</span></article>
                <article className="portal-stat-card"><span className="portal-stat-label">Evaluation</span><strong>70% + 30%</strong><span className="portal-stat-note">Report + Presentation/Viva-Voce</span></article>
              </div>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>1. Who these guidelines apply to</h3><p>Purpose and scope</p></div></div><p>On this SHIVORIX portal, the internship workflow is intended for Semester V students in eligible undergraduate programmes at Constituent and Affiliated Colleges under Universities of Bihar. The internship connects classroom learning with practical workplace experience and skill development.</p></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>2. Duration, credits and timing</h3><p>Mandatory requirements</p></div></div><ul className="portal-guideline-list"><li>Complete an internship of <strong>4 credits / 120 hours</strong> (30 hours per credit), normally over 4–6 weeks.</li><li>At least <strong>90 hours</strong> must be spent with the Internship Providing Organization (IPO); the remaining hours may cover report writing, assessment and evaluation.</li><li>Each student must complete the internship individually; group internships are not permitted.</li><li>This portal is for <strong>Semester V only</strong>. Complete the internship during the period and timeline approved by your college for Semester V.</li><li>Any extension or alternate schedule must be approved in advance by the Department/College/Centre; do not assume an extension automatically.</li></ul></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>3. Choosing an organization and mode</h3><p>IPO selection and approval</p></div></div><p>The guidelines give the following preference order for internship opportunities:</p><ol className="portal-guideline-list"><li>Central or State Government Departments</li><li>Government Public Sector Undertakings (PSUs)</li><li>Local bodies and Municipal Panchayats</li><li>Autonomous institutions funded by Government</li><li>Listed private undertakings</li><li>Eminent NGOs</li><li>Other MSMEs, private commercial organizations and other registered establishments</li></ol><p>Internships should relate to the student's area of study or interest and support learning new skills. Physical/on-site internships are the stated default. Online/virtual internships may be completed through Government organizations/platforms (such as SWAYAM Plus or another platform offered by government institutions), depending on the work and with College approval. If a student identifies an organization independently, the College Internship Nodal Officer must approve/facilitate it.</p></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>4. Unpaid internship and prohibited activities</h3><p>Important safeguards</p></div></div><ul className="portal-guideline-list"><li>The internship is mandatorily unpaid; the IPO must not charge a fee from students. A voluntary stipend offered by the organization is permitted.</li><li>Do not select network-level marketing roles that require personal contacts or social media promotion.</li><li>Internships involving consumption or promotion of alcohol or smoking are not permitted.</li><li>Internships promoting specific religious content, personalities or sects are not permitted.</li><li>Internships related to gambling or illegal/prohibited activities are not permitted.</li><li>Internships promoting political parties, election campaigns or political personalities are not permitted.</li></ul></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>5. Roles and responsibilities</h3><p>Who supports your internship</p></div></div><ul className="portal-guideline-list"><li><strong>College / Internship Nodal Officer:</strong> plans and monitors the programme, coordinates with IPOs, checks relevance and structure, supports agreements where required, and assigns faculty mentors.</li><li><strong>Faculty Mentor:</strong> explains expectations and reporting formats, guides internship selection, checks duration/mode/tasks, maintains regular contact, reviews progress fortnightly, and reviews logbooks, reports and project work.</li><li><strong>IPO:</strong> provides a real work environment, a clear work plan with objectives/tasks/timelines, a qualified supervisor, meaningful tasks, mentorship and a completion certificate.</li><li><strong>IPO Supervisor:</strong> monitors attendance and regularity, supports timely completion, and provides the completion certificate/report as required.</li><li><strong>Student:</strong> follows the approved work plan, attends regularly, maintains the attendance log/logbook, completes assigned work and submits reports/documents on time.</li></ul></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>6. Evaluation and passing criteria</h3><p>Marks and minimum score</p></div></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Component</th><th>Weightage</th><th>Marks</th><th>Minimum to pass</th></tr></thead><tbody><tr><td>Internship Report</td><td>70%</td><td>70</td><td>45% of component</td></tr><tr><td>Presentation / Viva-Voce</td><td>30%</td><td>30</td><td>45% of component</td></tr></tbody></table></div><p>You must score at least 45% in <strong>each</strong> component. The guidelines specify an Evaluation Committee with two faculty examiners: one internal member from the concerned college department and one external member from the same/allied discipline at another institution. The college Principal notifies the evaluation date and appointment of the external expert.</p></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>7. Submission deadlines</h3><p>Do not miss these deadlines</p></div></div><ul className="portal-guideline-list"><li><strong>Completion certificate from IPO:</strong> submit to the department within <strong>10 days</strong> after internship completion.</li><li><strong>Internship report:</strong> submit to the department within <strong>20 days</strong> after internship completion.</li><li><strong>Marks/award roll:</strong> submitted within <strong>7 days</strong> after evaluation/viva-voce; the guidelines state that the University uses the SAMARTH portal for marks submission.</li></ul></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>8. Internship report checklist</h3><p>Prepare these sections and supporting documents</p></div></div><ul className="portal-guideline-list"><li>Cover page in the prescribed format</li><li>Internship completion certificate issued by the IPO supervisor</li><li>Certificate from the College Mentor</li><li>Contents page with page numbers</li><li>Preface (optional) and a one- or two-page executive summary</li><li>About the department, agency, institute or NGO where the internship took place</li><li>Plan and execution, learning outcomes, knowledge acquired and skills learned</li><li>Observed attitude/behaviour gains and challenges faced</li><li>Conclusion and attendance sheet</li><li>As listed in the guideline's report-submission section: acceptance letter and consent letter copies</li></ul></section>
              <section className="portal-panel"><div className="portal-panel-heading"><div><h3>9. Suggested internship sectors</h3><p>Indicative, not exhaustive</p></div></div><p>Agriculture and trade; economy, banking, financial services and insurance; logistics, automotive and capital goods; FMCG and retail; IT/IT-enabled services and electronics; handicrafts, design and music; healthcare and life sciences; sports, wellness and physical education; tourism and hospitality; digitization and emerging technologies (AI, ML, AR/VR); humanitarian, public policy and legal services; education; sustainable development; environment; commerce, MSMEs; communication, journalism and social media; pharmaceuticals; community organizations; literary organizations; and plastics/petrochemicals.</p></section>
              <div className="portal-info-note"><ShieldCheck size={18}/><div><strong>College approval and official notices take priority</strong><p>This page is specifically for Semester V students and summarizes the uploaded university guideline. Confirm your approved IPO, submission format and evaluation schedule with your College Internship Nodal Officer. Where a requirement depends on programme-specific rules or later official notices, follow the applicable official instruction.</p></div></div>
            </>
          ) : activeSection === "My Profile" ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><UserRound size={22} /></span><div><div className="portal-eyebrow">YOUR INFORMATION</div><h1>My Profile</h1><p>Review your personal and academic details saved with SHIVORIX.</p></div></div><section className="portal-panel portal-details-panel"><div className="portal-panel-heading"><div><h3>Student details</h3><p>Information from your registration</p></div><span className="portal-profile-badge"><ShieldCheck size={14} /> Private profile</span></div><div className="portal-details-grid">{profileFields.map(({ label, key }) => <div className="portal-detail-field" key={key}><small>{label}</small><strong>{profile?.[key] || "Not provided"}</strong></div>)}</div><div className="portal-details-footer"><ShieldCheck size={16} /><span>Your details are shown only inside your signed-in student session.</span></div></section><section className="portal-panel portal-sectors-panel"><div className="portal-panel-heading"><div><h3>Selected internship sectors</h3><p>Your current areas of interest</p></div></div>{sectorNames.length ? <div className="portal-sector-list">{sectorNames.map((name) => <span key={name}><CheckCircle2 size={14} />{name}</span>)}</div> : <p className="portal-muted">No internship sectors are linked to your profile yet.</p>}</section></>
          ) : ["Assignments","Assessments","Evaluation","Documents","Notifications","Attendance","My Application","Internship Details","Online Training","Activities","My Tests","Project & Report","Final Test","Certificate"].includes(activeSection) ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><SelectedIcon size={22} /></span><div><div className="portal-eyebrow">YOUR LIVE RECORDS</div><h1>{activeSection}</h1><p>{selectedItem?.description || "Your student workspace."}</p></div></div>
              {submissionNotice && <div className="portal-info-note"><CheckCircle2 size={18}/><div><strong>Submission saved</strong><p>{submissionNotice}</p></div></div>}{error && <div className="portal-info-note"><CircleHelp size={18}/><div><strong>Action needs attention</strong><p>{error}</p></div></div>}{recordsNotice && <div className="portal-info-note"><Bell size={18}/><div><strong>Institution setup</strong><p>{recordsNotice}</p></div></div>}
              {activeSection === "My Application" || activeSection === "Internship Details" ? <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><BriefcaseBusiness size={17}/></span><div><h3>{activeSection}</h3><p>Your submitted internship applications and current statuses</p></div></div><Link href="/internships" className="portal-record-link">Explore internships ↗</Link></div>{studentApplications.length ? <div className="portal-record-list">{studentApplications.map(item=>{const internship=Array.isArray(item.internships)?item.internships[0]:item.internships;return <article className="portal-record-item" key={item.id}><div><strong>{internship?.title || "Internship application"}</strong><p>{internship?.description || "No additional internship details provided."}</p><small>Applied: {new Date(item.applied_at).toLocaleDateString()}{internship?.mode ? " · "+internship.mode : ""}{internship?.location ? " · "+internship.location : ""}{internship?.duration_weeks ? " · "+internship.duration_weeks+" weeks" : ""}</small></div><span className={`portal-record-status ${item.status}`}>{item.status.replace("_"," ")}</span></article>})}</div> : <div className="portal-empty-inline"><span><BriefcaseBusiness size={20}/></span><div><strong>No applications yet</strong><p>Explore internships and submit an application to track it here.</p><Link href="/internships" className="portal-record-link">Browse internships ↗</Link></div></div>}</section> : activeSection === "Attendance" ? <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><CalendarCheck size={17}/></span><div><h3>Attendance history</h3><p>Attendance marked by your Nodal Officer</p></div></div></div>{studentAttendance.length ? <div className="portal-record-list">{studentAttendance.map(item=><article className="portal-record-item" key={item.id}><div><strong>{new Date(item.attendance_date+"T00:00:00").toLocaleDateString()}</strong><p>{item.notes || "No additional notes"}</p></div><span className={`portal-record-status ${item.status}`}>{item.status}</span></article>)}</div> : <div className="portal-empty-inline"><span><CalendarCheck size={20}/></span><div><strong>No attendance records yet</strong><p>Your institution's attendance entries will appear here.</p></div></div>}</section> : (() => {
                const recordType = ["Assignments","Project & Report"].includes(activeSection) ? "assignment" : activeSection === "Documents" ? "document" : activeSection === "Notifications" ? "notification" : activeSection === "Online Training" ? "training" : activeSection === "Activities" ? "activity" : ["My Tests","Final Test"].includes(activeSection) ? "test" : activeSection === "Certificate" ? "certificate" : "evaluation";
                const visible = studentRecords.filter(item => item.record_type === recordType);
                return <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><SelectedIcon size={17}/></span><div><h3>{activeSection}</h3><p>Records shared by your assigned institution</p></div></div></div>{activeSection === "Documents" && <div className="portal-generated-docs"><div className="portal-generated-docs-intro"><strong>Your student-specific documents</strong><p>Generate a print-ready document using your saved profile, application, attendance and institution records. Open the document, then choose Print → Save as PDF.</p></div><div className="portal-generated-docs-grid">{[{kind:"application" as const,title:"Internship Application Copy",desc:"Personal, academic, internship and submitted-document summary.",label:"Generate application"},{kind:"acceptance" as const,title:"Internship Acceptance Letter",desc:"Acceptance preview based on your latest application status.",label:"Generate acceptance"},{kind:"logbook" as const,title:"Internship Log Book",desc:"Attendance dates and notes currently recorded by your institution.",label:"Generate log book"},{kind:"completion" as const,title:"Completion Certificate",desc:"Draft until an authorized completion record is published.",label:"Generate certificate"},{kind:"marksheet" as const,title:"Performance Marksheet",desc:"Evaluation layout; marks stay pending until entered by an authorized evaluator.",label:"Generate marksheet"}].map(doc=><article className="portal-generated-doc-card" key={doc.kind}><span className="portal-generated-doc-icon"><FileText size={20}/></span><div><strong>{doc.title}</strong><p>{doc.desc}</p></div><button type="button" onClick={()=>generateStudentDocument(doc.kind)}>{doc.label} ↗</button></article>)}</div><p className="portal-generated-docs-note">Important: this print-ready layout follows SHIVORIX purple/orange branding and the supplied document structure. Fields not stored in the portal show “Not recorded”; official acceptance, completion and marks must not be assumed.</p></div>}{visible.length ? <div className="portal-record-list">{visible.map(item=>{const submission=studentSubmissions.find(entry=>entry.record_id===item.id);const canSubmit=["assignment","activity","test","evaluation"].includes(item.record_type);return <article className="portal-record-item" key={item.id}><div><strong>{item.title}</strong><p>{item.description || "No additional details provided."}</p><small>{item.due_date ? "Due: "+new Date(item.due_date+"T00:00:00").toLocaleDateString() : "Added: "+new Date(item.created_at).toLocaleDateString()}</small>{["document","certificate","training","test"].includes(item.record_type)&&item.resource_url&&<a className="portal-record-link" href={item.resource_url} target="_blank" rel="noreferrer">Open resource ↗</a>}{canSubmit&&<><div className="portal-submission-current">{submission ? <>Your submission: <strong>{submission.status.replace("_"," ")}</strong>{submission.feedback&&<p>Feedback: {submission.feedback}</p>}</> : "Not submitted yet"}</div><form className="portal-submission-form" onSubmit={event=>submitStudentWork(event,item.id)}><label>Submission link (optional)<input name="submissionUrl" type="url" placeholder="https://…" /></label><label>Notes / answer<textarea name="submissionNote" rows={2} maxLength={5000} placeholder="Write your answer or submission notes" /></label><button type="submit" disabled={submissionBusy}>{submissionBusy?"Submitting…":submission?"Update submission":"Submit work"}</button></form></>}</div><span className={`portal-record-status ${submission?.status || item.status}`}>{(submission?.status || item.status).replace("_"," ")}</span></article>})}</div> : <div className="portal-empty-inline"><span><SelectedIcon size={20}/></span><div><strong>No {activeSection.toLowerCase()} yet</strong><p>New records from your institution will appear here when available.</p></div></div>}</section>;
              })()}</>
          ) : (
            <><div className="portal-page-title"><span className="portal-page-icon"><SelectedIcon size={22} /></span><div><div className="portal-eyebrow">SHIVORIX STUDENT WORKSPACE</div><h1>{activeSection}</h1><p>{selectedItem?.description || "Your student workspace."}</p></div></div><section className="portal-feature-card"><div className="portal-feature-visual"><div className="portal-feature-glow" /><SelectedIcon size={48} strokeWidth={1.35} /></div><div className="portal-feature-copy"><span className="portal-feature-label">YOUR NEXT STEP</span><h2>{activeSection === "Apply for Internship" ? "Find your opportunity." : activeSection === "My Application" ? "Your application, clearly tracked." : activeSection === "Certificate" ? "Your achievements belong here." : "Your progress, in one place."}</h2><p>{selectedItem?.description}. This section is part of your student portal navigation. Its live records and actions will appear here as the corresponding portal feature is connected.</p>{activeSection === "Apply for Internship" ? <Link href="/internships" className="portal-primary-btn">Explore internships <ArrowRight size={16} /></Link> : activeSection === "My Profile" ? <button className="portal-primary-btn" onClick={() => setActiveSection("My Profile")}>View profile <ArrowRight size={16} /></button> : <div className="portal-coming-soon"><Clock3 size={16} /><span>Section ready for feature integration</span></div>}</div></section><div className="portal-info-note"><MessageSquareText size={18} /><div><strong>Everything in its place</strong><p>Use the left navigation to move between your profile, application, learning, assessments, attendance, submissions, and documents.</p></div></div></>
          )}
          <footer className="portal-footer"><span>© 2026 SHIVORIX. Built for your next step.</span><span><ShieldCheck size={14} /> Student workspace</span></footer>
        </div>
      </section>
    </main>
  );
}