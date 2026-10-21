"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Bell, BookOpen, BriefcaseBusiness, CalendarCheck, CheckCircle2,
  ClipboardCheck, ClipboardList, FileText, FolderOpen, GraduationCap,
  LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X, Building2,
} from "lucide-react";
import { getSupabaseBrowserClient } from "../../../lib/supabase";
import "./nodal.css";

type Institution = { id: string; name: string; university_name: string | null; city: string | null; state: string | null };
type Student = { id: string; full_name: string | null; email: string | null; phone: string | null; college_id: string | null; institution_name: string | null; course: string | null; current_semester: string | null; created_at: string };
type Application = { id: string; student_id: string; status: string; applied_at: string; profiles?: { full_name: string | null; email: string | null } | null; internships?: { title: string } | null };
type Attendance = { id: string; student_id: string; institution_id: string; attendance_date: string; status: string; notes: string | null; updated_at: string; profiles?: { full_name: string | null; email: string | null } | null };

const sections = [
  { label: "Dashboard", icon: LayoutDashboard, detail: "Assigned students and overall progress" },
  { label: "My Institution", icon: Building2, detail: "Your assigned college or institution" },
  { label: "Student Management", icon: Users, detail: "View students assigned to your institution" },
  { label: "Internship Applications", icon: BriefcaseBusiness, detail: "Review applications and submitted documents" },
  { label: "Attendance & Activities", icon: CalendarCheck, detail: "Mark attendance and monitor student activity" },
  { label: "Assignments & Projects", icon: FileText, detail: "Track student submissions" },
  { label: "Assessments & Evaluation", icon: ClipboardList, detail: "View results and evaluations" },
  { label: "Documents & Reports", icon: FolderOpen, detail: "Access permitted records and reports" },
  { label: "Notifications", icon: Bell, detail: "Admin instructions and updates" },
];

export default function NodalOfficerDashboard() {
  const router = useRouter();
  const [name, setName] = useState("Nodal Officer");
  const [active, setActive] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<Attendance[]>([]);
  const [attendanceStudent, setAttendanceStudent] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("present");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/staff/login"); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace("/staff/login"); return; }
        const response = await fetch("/api/nodal/portal", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) {
          if (result.error === "Admin access required.") router.replace("/staff/admin");
          else if (response.status === 403) router.replace("/staff/login");
          throw new Error(result.error || "Could not load institution data.");
        }
        if (alive) {
          setName(result.profile?.full_name || result.profile?.email || user.email || "Nodal Officer");
          setInstitutions((result.institutions ?? []) as Institution[]);
          setStudents((result.students ?? []) as Student[]);
          setApplications((result.applications ?? []) as Application[]);
          setAttendanceRows((result.attendance ?? []) as Attendance[]);
          setAttendanceStudent((result.students?.[0]?.id) || "");
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not verify Nodal Officer access.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  async function updateApplicationStatus(applicationId: string, status: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/nodal/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ applicationId, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Application review failed.");
      const refreshed = await fetch("/api/nodal/portal", {
        headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store",
      });
      const data = await refreshed.json();
      if (!refreshed.ok) throw new Error(data.error || "Could not refresh application list.");
      setInstitutions((data.institutions ?? []) as Institution[]);
      setStudents((data.students ?? []) as Student[]);
      setApplications((data.applications ?? []) as Application[]);
      setAttendanceRows((data.attendance ?? []) as Attendance[]);
      setNotice("Application status updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Application review failed."); }
    finally { setBusy(false); }
  }

  async function saveAttendance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/nodal/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "mark_attendance", studentId: attendanceStudent, date: attendanceDate, status: attendanceStatus, notes: attendanceNotes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Attendance could not be saved.");
      const refreshed = await fetch("/api/nodal/portal", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const data = await refreshed.json();
      if (!refreshed.ok) throw new Error(data.error || "Could not refresh attendance.");
      setInstitutions((data.institutions ?? []) as Institution[]);
      setStudents((data.students ?? []) as Student[]);
      setApplications((data.applications ?? []) as Application[]);
      setAttendanceRows((data.attendance ?? []) as Attendance[]);
      setAttendanceNotes("");
      setNotice("Attendance saved and audit record added.");
    } catch (e) { setError(e instanceof Error ? e.message : "Attendance could not be saved."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/staff/login");
  }

  const selected = sections.find((item) => item.label === active) || sections[0];
  const Icon = selected.icon;

  return (
    <main className="nodal-shell">
      {mobileOpen && <button className="nodal-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`nodal-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="nodal-brand">
          <img src="/shivorix-logo.svg" alt="SHIVORIX logo" />
          <span><strong>SHIVORIX</strong><small>INTERNSHIP PORTAL</small></span>
          <button className="nodal-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="nodal-nav-label">NODAL WORKSPACE</div>
        <nav className="nodal-nav" aria-label="Nodal Officer navigation">
          {sections.map(({ label, icon: ItemIcon }) => (
            <button key={label} className={`nodal-nav-item ${active === label ? "active" : ""}`} onClick={() => { setActive(label); setMobileOpen(false); }}>
              <ItemIcon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="nodal-side-bottom">
          <div className="nodal-security"><ShieldCheck size={17} /><span>Access controlled by Admin</span></div>
          <button className="nodal-logout" onClick={logout}><LogOut size={17} /> Sign out</button>
          <small>© 2026 SHIVORIX</small>
        </div>
      </aside>
      <section className="nodal-main">
        <header className="nodal-topbar">
          <button className="nodal-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div><div className="nodal-breadcrumb">Staff workspace <span>/</span> {active}</div><div className="nodal-top-caption">Student support, review and progress</div></div>
          <div className="nodal-user"><span className="nodal-avatar">{name.trim().charAt(0).toUpperCase()}</span><div><strong>{name}</strong><small>Nodal Officer</small></div></div>
        </header>
        <div className="nodal-content">
          {loading ? <div className="nodal-state">Verifying secure access…</div> : error ? <div className="nodal-alert">{error}</div> : <>
            <section className="nodal-welcome">
              <div><span className="nodal-kicker">YOUR INSTITUTION WORKSPACE</span><h1>{active === "Dashboard" ? <>Welcome back, {name.split(" ")[0]}.</> : active}</h1><p>{active === "Dashboard" ? "Manage your assigned students, review applications, and keep attendance and progress records moving." : selected.detail}</p></div>
              <div className="nodal-welcome-art"><GraduationCap size={48} /><span><CheckCircle2 size={14} /> Student success</span></div>
            </section>
            {active === "Dashboard" ? <>
              <div className="nodal-section-head"><div><span>OVERVIEW</span><h2>Your workspace</h2></div><span className="nodal-live-chip"><ShieldCheck size={14} /> Restricted access</span></div>
              <div className="nodal-cards">
                <button onClick={() => setActive("Student Management")}><span className="nodal-card-icon blue"><Users size={20} /></span><small>Assigned students</small><strong>{students.length} students</strong><em>Institution-based access</em></button>
                <button onClick={() => setActive("Internship Applications")}><span className="nodal-card-icon purple"><ClipboardCheck size={20} /></span><small>Application review</small><strong>{applications.length} applications</strong><em>{applications.filter(a=>["submitted","under_review"].includes(a.status)).length} awaiting review</em></button>
                <button onClick={() => setActive("My Institution")}><span className="nodal-card-icon teal"><Building2 size={20} /></span><small>My Institution</small><strong>{institutions.length} assigned</strong><em>Institution-scoped records</em></button>
                <button onClick={() => setActive("Attendance & Activities")}><span className="nodal-card-icon orange"><CalendarCheck size={20} /></span><small>Attendance</small><strong>{attendanceRows.length} records</strong><em>Saved attendance entries</em></button>
              </div>
              <section className="nodal-panel"><div className="nodal-panel-title"><span><Activity size={18} /></span><div><h3>Quick access</h3><p>Choose a section to continue your work.</p></div></div><div className="nodal-quick-links">{sections.slice(1).map(({label,icon:QuickIcon,detail})=><button key={label} onClick={()=>setActive(label)}><QuickIcon size={18}/><span><strong>{label}</strong><small>{detail}</small></span><b>→</b></button>)}</div></section>
            </> : <section className="nodal-panel nodal-feature-panel"><div className="nodal-panel-title"><span><Icon size={19} /></span><div><h2>{active}</h2><p>{selected.detail}</p></div></div>
              {error && <div className="nodal-alert" role="alert">{error}</div>}
              {notice && <div className="nodal-notice" role="status">{notice}</div>}
              {active === "My Institution" ? <div className="nodal-data-list">{institutions.length ? institutions.map(college=><article className="nodal-data-card" key={college.id}><h3>{college.name}</h3><p>{college.university_name || "University not set"}</p><small>{[college.city,college.state].filter(Boolean).join(", ") || "Location not added"}</small><span>{students.filter(student=>student.college_id===college.id).length} assigned students</span></article>) : <div className="nodal-empty">No institution is assigned to your account yet. Ask the Admin to assign one.</div>}</div>
              : active === "Student Management" ? <div className="nodal-table-wrap"><table className="nodal-table"><thead><tr><th>Student</th><th>Email</th><th>Course / semester</th><th>Institution</th><th>Registered</th></tr></thead><tbody>{students.map(student=><tr key={student.id}><td><strong>{student.full_name || "Name not provided"}</strong><small>{student.phone || "Phone not provided"}</small></td><td>{student.email || "—"}</td><td>{[student.course,student.current_semester].filter(Boolean).join(" · ") || "—"}</td><td>{institutions.find(c=>c.id===student.college_id)?.name || student.institution_name || "—"}</td><td>{student.created_at ? new Date(student.created_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{students.length===0&&<div className="nodal-empty">No students are currently linked to your assigned institution.</div>}</div>
              : active === "Internship Applications" ? <div className="nodal-table-wrap"><table className="nodal-table"><thead><tr><th>Student</th><th>Internship</th><th>Applied</th><th>Current status</th><th>Review action</th></tr></thead><tbody>{applications.map(application=><tr key={application.id}><td><strong>{application.profiles?.full_name || "Student"}</strong><small>{application.profiles?.email || "—"}</small></td><td>{application.internships?.title || "—"}</td><td>{new Date(application.applied_at).toLocaleDateString()}</td><td><span className={`nodal-status ${application.status==="accepted"?"accepted":application.status==="rejected"?"rejected":"pending"}`}>{application.status.replace("_"," ")}</span></td><td><select aria-label={`Review application ${application.id}`} disabled={busy} value={application.status} onChange={e=>updateApplicationStatus(application.id,e.target.value)}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option></select></td></tr>)}</tbody></table>{applications.length===0&&<div className="nodal-empty">No applications from students linked to your institution.</div>}</div>
              : active === "Attendance & Activities" ? <><form className="nodal-attendance-form" onSubmit={saveAttendance}><label>Student<select required value={attendanceStudent} onChange={e=>setAttendanceStudent(e.target.value)}><option value="">Choose student</option>{students.map(student=><option key={student.id} value={student.id}>{student.full_name || student.email || student.id}</option>)}</select></label><label>Date<input type="date" required value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)} max={new Date().toISOString().slice(0,10)} /></label><label>Status<select value={attendanceStatus} onChange={e=>setAttendanceStatus(e.target.value)}><option value="present">Present</option><option value="absent">Absent</option><option value="leave">Leave</option></select></label><label>Notes (optional)<input value={attendanceNotes} onChange={e=>setAttendanceNotes(e.target.value)} maxLength={500} placeholder="Reason or session note" /></label><button className="nodal-save-button" type="submit" disabled={busy || students.length===0}>{busy ? "Saving…" : "Save attendance"}</button></form><div className="nodal-table-wrap"><table className="nodal-table"><thead><tr><th>Date</th><th>Student</th><th>Status</th><th>Notes</th><th>Last updated</th></tr></thead><tbody>{attendanceRows.map(row=><tr key={row.id}><td>{row.attendance_date}</td><td><strong>{row.profiles?.full_name || "Student"}</strong><small>{row.profiles?.email || "—"}</small></td><td><span className={`nodal-status ${row.status==="present"?"accepted":row.status==="absent"?"rejected":"pending"}`}>{row.status}</span></td><td>{row.notes || "—"}</td><td>{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{attendanceRows.length===0&&<div className="nodal-empty">No attendance records yet. Choose a student and date to record attendance.</div>}</div></>
              : <><div className="nodal-info-box"><ShieldCheck size={22}/><div><strong>{active} is not connected yet</strong><p>This section will only be enabled once its database structure and permission checks are implemented.</p></div></div><div className="nodal-setup-note"><strong>Not marked as complete</strong><p>Assignments, evaluations, documents, and notifications still need their own verified data workflows.</p></div></>}
            </section>}
          </>}
          <footer className="nodal-footer">© 2026 SHIVORIX <span><ShieldCheck size={14}/> Nodal Officer workspace</span></footer>
        </div>
      </section>
    </main>
  );
}
