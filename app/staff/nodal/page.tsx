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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/staff/login"); return; }
        const { data: profile, error: profileError } = await supabase
          .from("profiles").select("role,full_name").eq("id", user.id).single();
        if (profileError || profile?.role !== "nodal_officer") {
          router.replace(profile?.role === "admin" ? "/staff/dashboard" : "/staff/login");
          return;
        }
        if (alive) setName(profile.full_name || user.email || "Nodal Officer");
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not verify Nodal Officer access.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

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
                <button onClick={() => setActive("Student Management")}><span className="nodal-card-icon blue"><Users size={20} /></span><small>Assigned students</small><strong>View student list</strong><em>Institution-based access</em></button>
                <button onClick={() => setActive("Internship Applications")}><span className="nodal-card-icon purple"><ClipboardCheck size={20} /></span><small>Application review</small><strong>Review submissions</strong><em>Approve · Reject · Return for edit</em></button>
                <button onClick={() => setActive("Attendance & Activities")}><span className="nodal-card-icon teal"><CalendarCheck size={20} /></span><small>Attendance</small><strong>Mark attendance</strong><em>Present · Absent · Leave</em></button>
                <button onClick={() => setActive("Assignments & Projects")}><span className="nodal-card-icon orange"><BookOpen size={20} /></span><small>Student progress</small><strong>Track submissions</strong><em>Assignments and projects</em></button>
              </div>
              <section className="nodal-panel"><div className="nodal-panel-title"><span><Activity size={18} /></span><div><h3>Quick access</h3><p>Choose a section to continue your work.</p></div></div><div className="nodal-quick-links">{sections.slice(1).map(({label,icon:QuickIcon,detail})=><button key={label} onClick={()=>setActive(label)}><QuickIcon size={18}/><span><strong>{label}</strong><small>{detail}</small></span><b>→</b></button>)}</div></section>
            </> : <section className="nodal-panel nodal-feature-panel"><div className="nodal-panel-title"><span><Icon size={19} /></span><div><h2>{active}</h2><p>{selected.detail}</p></div></div>
              {active === "Attendance & Activities" ? <div className="nodal-info-box"><CalendarCheck size={22}/><div><strong>Attendance management</strong><p>Mark Present, Absent or Leave for students assigned to your institution. Student/date duplicate entries should be prevented, and changes should be auditable.</p></div></div>
              : active === "Internship Applications" ? <div className="nodal-info-box"><ClipboardCheck size={22}/><div><strong>Application review workflow</strong><p>Review application details and submitted documents, then Approve, Reject, or Return for Edit with a reason.</p></div></div>
              : active === "Student Management" ? <div className="nodal-info-box"><Users size={22}/><div><strong>Institution-scoped student list</strong><p>Only students belonging to the institution assigned by Admin should appear here.</p></div></div>
              : <div className="nodal-info-box"><ShieldCheck size={22}/><div><strong>Permission-controlled section</strong><p>This section must show only records and actions enabled for your account by Admin.</p></div></div>}
              <div className="nodal-setup-note"><strong>Data connection required</strong><p>The portal layout is in place, but live institution assignment, application review, attendance saving, and per-section permissions need their database/API integration before these actions can safely change real records.</p></div>
            </section>}
          </>}
          <footer className="nodal-footer">© 2026 SHIVORIX <span><ShieldCheck size={14}/> Nodal Officer workspace</span></footer>
        </div>
      </section>
    </main>
  );
}
