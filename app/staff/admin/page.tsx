"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowUpRight, Bell, BookOpen, Building2, CheckCircle2, ChevronRight,
  ClipboardCheck, FileText, GraduationCap, LayoutDashboard, LogOut, Menu,
  Plus, Search, ShieldCheck, Users, X, BriefcaseBusiness,
} from "lucide-react";
import { getSupabaseBrowserClient } from "../../../lib/supabase";
import "./admin.css";

type Profile = { id: string; role: string; full_name: string | null; email: string | null; college_id: string | null; institution_name?: string | null; course?: string | null; created_at?: string };
type College = { id: string; name: string; university_name: string | null; city: string | null; state: string | null; nodal_officer_id: string | null };
type Internship = { id: string; title: string; mode: string; is_active: boolean; created_at: string };
type Application = { id: string; status: string; applied_at: string; profiles?: { full_name: string | null; email: string | null } | null; internships?: { title: string } | null };

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Institutions", icon: Building2 },
  { label: "Nodal Officers", icon: ShieldCheck },
  { label: "Students", icon: GraduationCap },
  { label: "Internships", icon: BriefcaseBusiness },
  { label: "Applications", icon: ClipboardCheck },
  { label: "Documents & Reports", icon: FileText },
  { label: "Settings & Access", icon: Activity },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [name, setName] = useState("Admin");
  const [active, setActive] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [university, setUniversity] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [p, c, i, a] = await Promise.all([
      supabase.from("profiles").select("id,role,full_name,email,college_id,institution_name,course,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("colleges").select("id,name,university_name,city,state,nodal_officer_id").order("name"),
      supabase.from("internships").select("id,title,mode,is_active,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("internship_applications").select("id,status,applied_at,profiles(full_name,email),internships(title)").order("applied_at", { ascending: false }).limit(100),
    ]);
    const firstError = p.error || c.error || i.error || a.error;
    if (firstError) throw firstError;
    setProfiles((p.data ?? []) as Profile[]);
    setColleges((c.data ?? []) as College[]);
    setInternships((i.data ?? []) as Internship[]);
    setApplications((a.data ?? []) as unknown as Application[]);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/staff/login"); return; }
        const { data: profile, error: profileError } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).single();
        if (profileError || profile?.role !== "admin") { router.replace(profile?.role === "nodal_officer" ? "/staff/nodal" : "/staff/login"); return; }
        await loadData();
        if (alive) setName(profile.full_name || user.email || "Admin");
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unable to load Admin data. Check database permissions.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router, loadData]);

  async function createCollege(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: insertError } = await supabase.from("colleges").insert({ name: collegeName.trim(), university_name: university.trim() || null, city: city.trim() || null, state: state.trim() || null });
      if (insertError) throw insertError;
      setCollegeName(""); setUniversity(""); setCity(""); setState("");
      await loadData(); setNotice("Institution added successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add institution."); }
    finally { setBusy(false); }
  }

  async function assignOfficer(collegeId: string, officerId: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.from("colleges").update({ nodal_officer_id: officerId || null, updated_at: new Date().toISOString() }).eq("id", collegeId);
      if (updateError) throw updateError;
      await loadData(); setNotice("Nodal Officer assignment updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not assign Nodal Officer."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/staff/login");
  }

  const students = profiles.filter(p => p.role === "student");
  const officers = profiles.filter(p => p.role === "nodal_officer");
  const filteredColleges = colleges.filter(c => [c.name, c.university_name, c.city, c.state].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const filteredProfiles = profiles.filter(p => [p.full_name, p.email, p.institution_name, p.course].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const selectedNav = nav.find(n => n.label === active) || nav[0];
  const ActiveIcon = selectedNav.icon;

  return (
    <main className="admin-shell">
      {mobileOpen && <button className="admin-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="admin-brand"><img src="/shivorix-logo.svg" alt="SHIVORIX logo" /><span><strong>SHIVORIX</strong><small>INTERNSHIP PORTAL</small></span><button className="admin-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
        <div className="admin-nav-label">ADMIN CONSOLE</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {nav.map(({label, icon: Icon}) => <button key={label} className={`admin-nav-item ${active === label ? "active" : ""}`} onClick={() => {setActive(label);setMobileOpen(false);setSearch("");}}><Icon size={18}/><span>{label}</span>{label === "Applications" && applications.filter(a => a.status === "submitted").length > 0 && <i>{applications.filter(a => a.status === "submitted").length}</i>}</button>)}
        </nav>
        <div className="admin-side-bottom"><div className="admin-secure"><ShieldCheck size={16}/> Admin access enabled</div><button className="admin-logout" onClick={logout}><LogOut size={17}/> Sign out</button><small>© 2026 SHIVORIX</small></div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar"><button className="admin-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={21}/></button><div><div className="admin-breadcrumb">Admin Console <span>/</span> {active}</div><div className="admin-top-caption">Manage the SHIVORIX Internship Portal</div></div><div className="admin-user"><span>{name.trim().charAt(0).toUpperCase()}</span><div><strong>{name}</strong><small>Administrator</small></div><ShieldCheck size={17}/></div></header>
        <div className="admin-content">
          {loading ? <div className="admin-state">Verifying Admin access and loading portal data…</div> : <>
            <section className="admin-welcome"><div><span className="admin-kicker">CONTROL CENTER · 2026</span><h1>{active === "Overview" ? <>Welcome back, {name.split(" ")[0]}.</> : active}</h1><p>{active === "Overview" ? "A clear view of institutions, students, staff access, and internship activity across your portal." : selectedNav.label === "Settings & Access" ? "Manage staff roles and access boundaries for the portal." : `Manage ${active.toLowerCase()} across the SHIVORIX Internship Portal.`}</p></div><div className="admin-welcome-mark"><ShieldCheck size={34}/><span>Secure workspace</span></div></section>
            {error && <div className="admin-alert error" role="alert">{error}</div>}{notice && <div className="admin-alert success" role="status"><CheckCircle2 size={17}/>{notice}</div>}
            {active === "Overview" && <>
              <div className="admin-section-head"><div><span>PORTAL SNAPSHOT</span><h2>At a glance</h2></div><button className="admin-refresh" onClick={() => loadData().then(()=>setNotice("Portal data refreshed.")).catch(e=>setError(e.message))}>Refresh data ↻</button></div>
              <div className="admin-stats">
                <button onClick={()=>setActive("Institutions")}><span className="stat-icon indigo"><Building2 size={20}/></span><small>Institutions</small><strong>{colleges.length}</strong><em>Manage assignments <ChevronRight size={13}/></em></button>
                <button onClick={()=>setActive("Nodal Officers")}><span className="stat-icon violet"><ShieldCheck size={20}/></span><small>Nodal Officers</small><strong>{officers.length}</strong><em>{colleges.filter(c=>c.nodal_officer_id).length} institutions assigned</em></button>
                <button onClick={()=>setActive("Students")}><span className="stat-icon teal"><GraduationCap size={20}/></span><small>Student accounts</small><strong>{students.length}</strong><em>Registered portal profiles</em></button>
                <button onClick={()=>setActive("Internships")}><span className="stat-icon orange"><BriefcaseBusiness size={20}/></span><small>Active internships</small><strong>{internships.filter(i=>i.is_active).length}</strong><em>{internships.length} total listings</em></button>
              </div>
              <div className="admin-overview-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h3>Institution assignments</h3><p>Check which institutions have a Nodal Officer.</p></div><button onClick={()=>setActive("Institutions")}>View all <ArrowUpRight size={15}/></button></div>{colleges.length ? colleges.slice(0,5).map(c=><div className="admin-list-row" key={c.id}><span className="admin-row-icon"><Building2 size={17}/></span><div><strong>{c.name}</strong><small>{[c.city,c.state].filter(Boolean).join(", ") || "Location not added"}</small></div><span className={`admin-status ${c.nodal_officer_id ? "assigned" : "pending"}`}>{c.nodal_officer_id ? "Assigned" : "Unassigned"}</span></div>) : <div className="admin-empty">No institutions yet. Add one in Institutions.</div>}</section>
              <section className="admin-panel"><div className="admin-panel-head"><div><h3>Recent applications</h3><p>Latest student internship submissions.</p></div><button onClick={()=>setActive("Applications")}>View all <ArrowUpRight size={15}/></button></div>{applications.length ? applications.slice(0,5).map(a=><div className="admin-list-row" key={a.id}><span className="admin-row-icon purple"><ClipboardCheck size={17}/></span><div><strong>{a.profiles?.full_name || a.profiles?.email || "Student"}</strong><small>{a.internships?.title || "Internship"} · {new Date(a.applied_at).toLocaleDateString()}</small></div><span className={`admin-status ${a.status === "accepted" ? "assigned" : a.status === "rejected" ? "rejected" : "pending"}`}>{a.status.replace("_"," ")}</span></div>) : <div className="admin-empty">No applications found.</div>}</section></div>
              <section className="admin-panel admin-quick-panel"><div className="admin-panel-head"><div><h3>Admin shortcuts</h3><p>Common tasks for managing the portal.</p></div></div><div className="admin-shortcuts"><button onClick={()=>setActive("Institutions")}><Building2 size={20}/><span><strong>Add an institution</strong><small>Create a college record and assign its Nodal Officer.</small></span><ChevronRight size={17}/></button><button onClick={()=>setActive("Nodal Officers")}><Users size={20}/><span><strong>Manage Nodal Officers</strong><small>Assign officers to institutions.</small></span><ChevronRight size={17}/></button><a href="/staff/dashboard"><BookOpen size={20}/><span><strong>Publish internships</strong><small>Open the existing internship publishing workspace.</small></span><ArrowUpRight size={17}/></a></div></section>
            </>}
            {active === "Institutions" && <><div className="admin-section-head"><div><span>INSTITUTION DIRECTORY</span><h2>Institutions & assignments</h2></div><span className="admin-count">{colleges.length} total</span></div><div className="admin-panel"><h3 className="admin-form-title"><Plus size={18}/> Add institution</h3><form className="admin-form" onSubmit={createCollege}><label>Institution name *<input required value={collegeName} onChange={e=>setCollegeName(e.target.value)} placeholder="e.g. ABC College of Engineering"/></label><label>University (optional)<input value={university} onChange={e=>setUniversity(e.target.value)} placeholder="University name"/></label><label>City<input value={city} onChange={e=>setCity(e.target.value)} placeholder="City"/></label><label>State<input value={state} onChange={e=>setState(e.target.value)} placeholder="State"/></label><button disabled={busy} className="admin-primary">{busy ? "Saving…" : "Add institution"} <Plus size={16}/></button></form></div><div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search institutions…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Institution</th><th>Location</th><th>Nodal Officer</th><th>Assignment</th></tr></thead><tbody>{filteredColleges.map(c=>{const officer=officers.find(p=>p.id===c.nodal_officer_id);return <tr key={c.id}><td><strong>{c.name}</strong><small>{c.university_name || "University not set"}</small></td><td>{[c.city,c.state].filter(Boolean).join(", ") || "—"}</td><td><select aria-label={`Assign officer to ${c.name}`} disabled={busy} value={c.nodal_officer_id || ""} onChange={e=>assignOfficer(c.id,e.target.value)}><option value="">Unassigned</option>{officers.map(o=><option key={o.id} value={o.id}>{o.full_name || o.email || o.id.slice(0,8)}</option>)}</select></td><td><span className={`admin-status ${officer ? "assigned" : "pending"}`}>{officer ? "Assigned" : "Needs assignment"}</span></td></tr>})}</tbody></table>{filteredColleges.length===0&&<div className="admin-empty">No matching institutions.</div>}</div></>}
            {active === "Nodal Officers" && <><div className="admin-section-head"><div><span>STAFF ACCESS</span><h2>Nodal Officer directory</h2></div><span className="admin-count">{officers.length} officers</span></div><p className="admin-help">Nodal Officers are assigned to institutions from the Institutions section. An officer should only manage students linked to their assigned institution. Create/authenticate the staff account first, then assign it here.</p><div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search officers…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Officer</th><th>Email</th><th>Assigned institution</th><th>Access</th></tr></thead><tbody>{officers.filter(o=>[o.full_name,o.email].some(v=>v?.toLowerCase().includes(search.toLowerCase()))).map(o=>{const college=colleges.find(c=>c.nodal_officer_id===o.id);return <tr key={o.id}><td><strong>{o.full_name || "Name not provided"}</strong><small>Staff account</small></td><td>{o.email || "—"}</td><td>{college?.name || "Not assigned"}</td><td><span className={`admin-status ${college ? "assigned" : "pending"}`}>{college ? "Institution assigned" : "Awaiting assignment"}</span></td></tr>})}</tbody></table>{officers.length===0&&<div className="admin-empty">No Nodal Officer profiles found. Promote/create a staff profile through your approved account provisioning process.</div>}</div></>}
            {active === "Students" && <><div className="admin-section-head"><div><span>STUDENT DIRECTORY</span><h2>Registered students</h2></div><span className="admin-count">{students.length} students</span></div><div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email, course…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Course</th><th>Institution</th><th>Joined</th></tr></thead><tbody>{filteredProfiles.filter(p=>p.role==="student").map(p=><tr key={p.id}><td><strong>{p.full_name || "Name not provided"}</strong><small>{p.email || "Email unavailable"}</small></td><td>{p.course || "—"}</td><td>{colleges.find(c=>c.id===p.college_id)?.name || p.institution_name || "Not mapped"}</td><td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{students.length===0&&<div className="admin-empty">No student profiles found.</div>}</div></>}
            {active === "Internships" && <><div className="admin-section-head"><div><span>OPPORTUNITY MANAGEMENT</span><h2>Internship listings</h2></div><a className="admin-primary link" href="/staff/dashboard">Open publishing workspace <ArrowUpRight size={16}/></a></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Internship</th><th>Mode</th><th>Created</th><th>Status</th></tr></thead><tbody>{internships.map(i=><tr key={i.id}><td><strong>{i.title}</strong></td><td>{i.mode}</td><td>{new Date(i.created_at).toLocaleDateString()}</td><td><span className={`admin-status ${i.is_active ? "assigned" : "pending"}`}>{i.is_active ? "Active" : "Draft / inactive"}</span></td></tr>)}</tbody></table>{internships.length===0&&<div className="admin-empty">No internship listings found.</div>}</div></>}
            {active === "Applications" && <><div className="admin-section-head"><div><span>STUDENT PIPELINE</span><h2>Internship applications</h2></div><span className="admin-count">{applications.length} recent</span></div><div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student, internship, status…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Internship</th><th>Applied</th><th>Status</th></tr></thead><tbody>{applications.filter(a=>[a.profiles?.full_name,a.profiles?.email,a.internships?.title,a.status].some(v=>v?.toLowerCase().includes(search.toLowerCase()))).map(a=><tr key={a.id}><td><strong>{a.profiles?.full_name || "Student"}</strong><small>{a.profiles?.email || "—"}</small></td><td>{a.internships?.title || "—"}</td><td>{new Date(a.applied_at).toLocaleDateString()}</td><td><span className={`admin-status ${a.status==="accepted"?"assigned":a.status==="rejected"?"rejected":"pending"}`}>{a.status.replace("_"," ")}</span></td></tr>)}</tbody></table>{applications.length===0&&<div className="admin-empty">No applications found.</div>}</div></>}
            {active === "Documents & Reports" && <div className="admin-panel admin-feature"><span className="admin-feature-icon"><FileText size={24}/></span><h2>Documents & reports</h2><p>Document records exist in the portal database. A secure review, download, and reporting workflow needs its own permissions and signed-file access before documents can be exposed here.</p><div className="admin-info-strip">Current student profiles: <strong>{students.length}</strong> · Applications: <strong>{applications.length}</strong> · Institutions: <strong>{colleges.length}</strong></div></div>}
            {active === "Settings & Access" && <div className="admin-panel admin-feature"><span className="admin-feature-icon"><ShieldCheck size={24}/></span><h2>Settings & access control</h2><p>Admin routes are restricted by the authenticated Supabase profile role. Institution assignment is managed from the Institutions section. Role changes and fine-grained section permissions should be implemented with server-side authorization and audited database policies.</p><div className="admin-info-strip">Signed in as <strong>{name}</strong> · Role <strong>Admin</strong></div></div>}
          </>}
          <footer className="admin-footer">© 2026 SHIVORIX <span><ShieldCheck size={14}/> Admin workspace</span></footer>
        </div>
      </section>
    </main>
  );
}
