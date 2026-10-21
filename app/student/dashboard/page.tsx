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

type StudentRecord = { id: string; record_type: "assignment" | "evaluation" | "document" | "notification"; title: string; description: string | null; status: string; due_date: string | null; resource_url: string | null; created_at: string; student_id: string | null };
type StudentAttendance = { id: string; attendance_date: string; status: string; notes: string | null; updated_at: string };
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
          ) : activeSection === "My Profile" ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><UserRound size={22} /></span><div><div className="portal-eyebrow">YOUR INFORMATION</div><h1>My Profile</h1><p>Review your personal and academic details saved with SHIVORIX.</p></div></div><section className="portal-panel portal-details-panel"><div className="portal-panel-heading"><div><h3>Student details</h3><p>Information from your registration</p></div><span className="portal-profile-badge"><ShieldCheck size={14} /> Private profile</span></div><div className="portal-details-grid">{profileFields.map(({ label, key }) => <div className="portal-detail-field" key={key}><small>{label}</small><strong>{profile?.[key] || "Not provided"}</strong></div>)}</div><div className="portal-details-footer"><ShieldCheck size={16} /><span>Your details are shown only inside your signed-in student session.</span></div></section><section className="portal-panel portal-sectors-panel"><div className="portal-panel-heading"><div><h3>Selected internship sectors</h3><p>Your current areas of interest</p></div></div>{sectorNames.length ? <div className="portal-sector-list">{sectorNames.map((name) => <span key={name}><CheckCircle2 size={14} />{name}</span>)}</div> : <p className="portal-muted">No internship sectors are linked to your profile yet.</p>}</section></>
          ) : ["Assignments","Assessments","Evaluation","Documents","Notifications","Attendance","My Application","Internship Details"].includes(activeSection) ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><SelectedIcon size={22} /></span><div><div className="portal-eyebrow">YOUR LIVE RECORDS</div><h1>{activeSection}</h1><p>{selectedItem?.description || "Your student workspace."}</p></div></div>
              {recordsNotice && <div className="portal-info-note"><Bell size={18}/><div><strong>Institution setup</strong><p>{recordsNotice}</p></div></div>}
              {activeSection === "My Application" || activeSection === "Internship Details" ? <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><BriefcaseBusiness size={17}/></span><div><h3>{activeSection}</h3><p>Your submitted internship applications and current statuses</p></div></div><Link href="/internships" className="portal-record-link">Explore internships ↗</Link></div>{studentApplications.length ? <div className="portal-record-list">{studentApplications.map(item=>{const internship=Array.isArray(item.internships)?item.internships[0]:item.internships;return <article className="portal-record-item" key={item.id}><div><strong>{internship?.title || "Internship application"}</strong><p>{internship?.description || "No additional internship details provided."}</p><small>Applied: {new Date(item.applied_at).toLocaleDateString()}{internship?.mode ? " · "+internship.mode : ""}{internship?.location ? " · "+internship.location : ""}{internship?.duration_weeks ? " · "+internship.duration_weeks+" weeks" : ""}</small></div><span className={`portal-record-status ${item.status}`}>{item.status.replace("_"," ")}</span></article>})}</div> : <div className="portal-empty-inline"><span><BriefcaseBusiness size={20}/></span><div><strong>No applications yet</strong><p>Explore internships and submit an application to track it here.</p><Link href="/internships" className="portal-record-link">Browse internships ↗</Link></div></div>}</section> : activeSection === "Attendance" ? <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><CalendarCheck size={17}/></span><div><h3>Attendance history</h3><p>Attendance marked by your Nodal Officer</p></div></div></div>{studentAttendance.length ? <div className="portal-record-list">{studentAttendance.map(item=><article className="portal-record-item" key={item.id}><div><strong>{new Date(item.attendance_date+"T00:00:00").toLocaleDateString()}</strong><p>{item.notes || "No additional notes"}</p></div><span className={`portal-record-status ${item.status}`}>{item.status}</span></article>)}</div> : <div className="portal-empty-inline"><span><CalendarCheck size={20}/></span><div><strong>No attendance records yet</strong><p>Your institution's attendance entries will appear here.</p></div></div>}</section> : (() => {
                const recordType = activeSection === "Assignments" ? "assignment" : activeSection === "Documents" ? "document" : activeSection === "Notifications" ? "notification" : "evaluation";
                const visible = studentRecords.filter(item => item.record_type === recordType);
                return <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><SelectedIcon size={17}/></span><div><h3>{activeSection}</h3><p>Records shared by your assigned institution</p></div></div></div>{visible.length ? <div className="portal-record-list">{visible.map(item=><article className="portal-record-item" key={item.id}><div><strong>{item.title}</strong><p>{item.description || "No additional details provided."}</p><small>{item.due_date ? "Due: "+new Date(item.due_date+"T00:00:00").toLocaleDateString() : "Added: "+new Date(item.created_at).toLocaleDateString()}</small>{item.record_type==="document"&&item.resource_url&&<a className="portal-record-link" href={item.resource_url} target="_blank" rel="noreferrer">Open document ↗</a>}</div><span className={`portal-record-status ${item.status}`}>{item.status.replace("_"," ")}</span></article>)}</div> : <div className="portal-empty-inline"><span><SelectedIcon size={20}/></span><div><strong>No {activeSection.toLowerCase()} yet</strong><p>New records from your institution will appear here when available.</p></div></div>}</section>;
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