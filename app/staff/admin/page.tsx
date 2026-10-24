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

type Profile = { id: string; role: string; full_name: string | null; email: string | null; mobile_number?: string | null; college_id: string | null; institution_name?: string | null; course?: string | null; designation?: string | null; employee_id?: string | null; department?: string | null; nodal_status?: string | null; created_at?: string };
type College = { id: string; name: string; college_code?: string | null; college_type?: string | null; university_name: string | null; affiliation_code?: string | null; website?: string | null; official_email?: string | null; official_phone?: string | null; address_line?: string | null; city: string | null; district?: string | null; state: string | null; pin_code?: string | null; status?: string; nodal_officer_id: string | null };
type Internship = { id: string; title: string; description?: string | null; mode: string; location?: string | null; duration_weeks?: number | null; fee_amount?: number | null; is_active: boolean; created_at: string; published_at?: string | null };
type Application = { id: string; application_number?: string | null; status: string; nodal_review_status?: string | null; review_remarks?: string | null; mode?: string | null; requested_hours?: number | null; requested_credits?: number | null; preferred_start_date?: string | null; preferred_end_date?: string | null; state?: string | null; city?: string | null; pin_code?: string | null; full_address?: string | null; applied_at: string; profiles?: { full_name: string | null; email: string | null } | null; internships?: { title: string } | null; sectors?: { name: string } | null; portal_documents?: { id: string; document_type: string; status: string; metadata?: Record<string, unknown> }[] | null };
type PortalRecord = { id: string; record_type: string; title: string; description: string | null; due_date: string | null; resource_url: string | null; institution_id: string | null; student_id: string | null; status: string; created_at: string };
type AuditLog = { id: string; actor_id: string | null; target_profile_id: string | null; action: string; old_value: unknown; new_value: unknown; details: unknown; created_at: string };

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "SHIVORIX IPO", icon: BriefcaseBusiness },
  { label: "Guidelines", icon: BookOpen },
  { label: "Students", icon: GraduationCap },
  { label: "Applications", icon: ClipboardCheck },
  { label: "Activities / Log Book", icon: Activity },
  { label: "Colleges", icon: Building2 },
  { label: "Nodal Officers", icon: ShieldCheck },
  { label: "Internships", icon: BriefcaseBusiness },
  { label: "Payments", icon: FileText },
  { label: "Training", icon: BookOpen },
  { label: "Assessments", icon: ClipboardCheck },
  { label: "Final Test", icon: CheckCircle2 },
  { label: "Assignments", icon: FileText },
  { label: "Evaluations", icon: ClipboardCheck },
  { label: "Certificate", icon: CheckCircle2 },
  { label: "Documents", icon: FileText },
  { label: "Reports", icon: Activity },
  { label: "Settings", icon: ShieldCheck },
  { label: "Audit Logs", icon: Activity },
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
  const [records, setRecords] = useState<PortalRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [recordTitle, setRecordTitle] = useState("");
  const [recordDescription, setRecordDescription] = useState("");
  const [recordDueDate, setRecordDueDate] = useState("");
  const [recordResourceUrl, setRecordResourceUrl] = useState("");
  const [recordInstitutionId, setRecordInstitutionId] = useState("");
  const [editingRecord, setEditingRecord] = useState<PortalRecord | null>(null);
  const [portalStats, setPortalStats] = useState({ profiles: 0, students: 0, colleges: 0, internships: 0, activeInternships: 0, applications: 0, pendingApplications: 0, acceptedApplications: 0, rejectedApplications: 0 });
  const [collegeName, setCollegeName] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const [collegeType, setCollegeType] = useState("Government");
  const [affiliationCode, setAffiliationCode] = useState("");
  const [collegeWebsite, setCollegeWebsite] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [collegePhone, setCollegePhone] = useState("");
  const [collegeAddress, setCollegeAddress] = useState("");
  const [collegePin, setCollegePin] = useState("");
  const [university, setUniversity] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerMobile, setOfficerMobile] = useState("");
  const [officerPassword, setOfficerPassword] = useState("");
  const [officerCollegeId, setOfficerCollegeId] = useState("");
  const [officerDesignation, setOfficerDesignation] = useState("Nodal Officer");
  const [officerEmployeeId, setOfficerEmployeeId] = useState("");
  const [officerDepartment, setOfficerDepartment] = useState("");
  const [officerStatus, setOfficerStatus] = useState("active");
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [editCollegeName, setEditCollegeName] = useState("");
  const [editUniversity, setEditUniversity] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCollegeCode, setEditCollegeCode] = useState("");
  const [editCollegeType, setEditCollegeType] = useState("Government");
  const [editAffiliationCode, setEditAffiliationCode] = useState("");
  const [editCollegeWebsite, setEditCollegeWebsite] = useState("");
  const [editCollegeEmail, setEditCollegeEmail] = useState("");
  const [editCollegePhone, setEditCollegePhone] = useState("");
  const [editCollegeAddress, setEditCollegeAddress] = useState("");
  const [editCollegePin, setEditCollegePin] = useState("");
  const [editingStudent, setEditingStudent] = useState<Profile | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentCourse, setEditStudentCourse] = useState("");
  const [editStudentCollege, setEditStudentCollege] = useState("");
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  const [editInternshipTitle, setEditInternshipTitle] = useState("");
  const [editInternshipDescription, setEditInternshipDescription] = useState("");
  const [editInternshipMode, setEditInternshipMode] = useState("remote");
  const [editInternshipLocation, setEditInternshipLocation] = useState("");
  const [editInternshipDuration, setEditInternshipDuration] = useState("");
  const [editInternshipFee, setEditInternshipFee] = useState("");

  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Your session expired. Please sign in again.");
    const response = await fetch("/api/admin/portal", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load admin portal data.");
    setProfiles((result.profiles ?? []) as Profile[]);
    setColleges((result.colleges ?? []) as College[]);
    setInternships((result.internships ?? []) as Internship[]);
    setApplications((result.applications ?? []) as Application[]);
    setRecords((result.records ?? []) as PortalRecord[]);
    setAuditLogs((result.auditLogs ?? []) as AuditLog[]);
    if (result.stats) setPortalStats(result.stats);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "create_college", name: collegeName, collegeCode, collegeType, university, affiliationCode, website: collegeWebsite, officialEmail: collegeEmail, officialPhone: collegePhone, addressLine: collegeAddress, city, state, pinCode: collegePin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add institution.");
      setCollegeName(""); setCollegeCode(""); setCollegeType("Government"); setUniversity(""); setAffiliationCode(""); setCollegeWebsite(""); setCollegeEmail(""); setCollegePhone(""); setCollegeAddress(""); setCity(""); setState(""); setCollegePin("");
      await loadData(); setNotice("Institution added successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add institution."); }
    finally { setBusy(false); }
  }

  async function saveCollege(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editingCollege) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ action: "update_college", collegeId: editingCollege.id, name: editCollegeName, collegeCode: editCollegeCode, collegeType: editCollegeType, university: editUniversity, affiliationCode: editAffiliationCode, website: editCollegeWebsite, officialEmail: editCollegeEmail, officialPhone: editCollegePhone, addressLine: editCollegeAddress, city: editCity, state: editState, pinCode: editCollegePin }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not update institution.");
      setEditingCollege(null); await loadData(); setNotice("Institution details updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update institution."); }
    finally { setBusy(false); }
  }

  async function saveInternship(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editingInternship) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ action: "update_internship", internshipId: editingInternship.id, title: editInternshipTitle, description: editInternshipDescription, mode: editInternshipMode, location: editInternshipLocation, durationWeeks: editInternshipDuration, feeAmount: editInternshipFee }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not update internship.");
      setEditingInternship(null); await loadData(); setNotice("Internship details updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update internship."); }
    finally { setBusy(false); }
  }

  async function toggleInternship(item: Internship) {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ action: "toggle_internship", internshipId: item.id, isActive: !item.is_active }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not change internship status.");
      await loadData(); setNotice(item.is_active ? "Internship unpublished." : "Internship published.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not change internship status."); }
    finally { setBusy(false); }
  }

  async function saveStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editingStudent) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ action: "update_student_profile", profileId: editingStudent.id, fullName: editStudentName, course: editStudentCourse, collegeId: editStudentCollege }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not update student profile.");
      setEditingStudent(null); await loadData(); setNotice("Student profile updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update student profile."); }
    finally { setBusy(false); }
  }

  async function assignOfficer(collegeId: string, officerId: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "assign_officer", collegeId, officerId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not assign Nodal Officer.");
      await loadData(); setNotice("Nodal Officer assignment updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not assign Nodal Officer."); }
    finally { setBusy(false); }
  }

  async function createNodalOfficer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "create_nodal_officer", fullName: officerName, email: officerEmail, mobileNumber: officerMobile, password: officerPassword, collegeId: officerCollegeId, designation: officerDesignation, employeeId: officerEmployeeId, department: officerDepartment, status: officerStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create Nodal Officer account.");
      setOfficerName(""); setOfficerEmail(""); setOfficerMobile(""); setOfficerPassword(""); setOfficerCollegeId(""); setOfficerDesignation("Nodal Officer"); setOfficerEmployeeId(""); setOfficerDepartment(""); setOfficerStatus("active");
      await loadData();
      setNotice("Nodal Officer account created and assigned to the selected college.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create Nodal Officer account."); }
    finally { setBusy(false); }
  }

  async function setProfileRole(profileId: string, role: "student" | "nodal_officer") {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "set_profile_role", profileId, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update account role.");
      await loadData();
      setNotice(result.unchanged ? "This account already has that role." : "Account role updated and audit entry recorded.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update account role."); }
    finally { setBusy(false); }
  }

  async function openApplicationDocument(documentId: string) {
    const tab = window.open("about:blank", "_blank");
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session) throw new Error("Sign in again to open documents.");
      const response = await fetch("/api/documents/open?id=" + encodeURIComponent(documentId), { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Document could not be opened.");
      if (tab) tab.location.href = result.url;
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Document could not be opened.");
    }
  }

  async function updateApplicationStatus(applicationId: string, status: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "application_status", id: applicationId, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update application status.");
      await loadData();
      setNotice("Application status updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update application status.");
    } finally { setBusy(false); }
  }

  function exportCsv(filename: string, rows: Array<Record<string, string | number | boolean | null | undefined>>) {
    if (!rows.length) { setNotice("There is no data to export yet."); return; }
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    const escapeCell = (value: unknown) => {
      const text = value == null ? "" : String(value);
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const csv = [headers.map(escapeCell).join(","), ...rows.map(row => headers.map(key => escapeCell(row[key])).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
    setNotice(filename + " export prepared.");
  }

  const moduleTypeByLabel: Record<string, string> = {
    "SHIVORIX IPO": "notification",
    "Guidelines": "document",
    "Activities / Log Book": "activity",
    "Training": "training",
    "Assessments": "evaluation",
    "Final Test": "test",
    "Assignments": "assignment",
    "Evaluations": "evaluation",
    "Certificate": "certificate",
    "Documents": "document",
  };

  async function savePortalRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const type = moduleTypeByLabel[active];
    if (!type) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const editing = editingRecord;
      const response = await fetch("/api/admin/portal", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify(editing
          ? { action: "update_portal_record", recordId: editing.id, title: recordTitle, description: recordDescription, dueDate: recordDueDate, resourceUrl: recordResourceUrl, status: editing.status }
          : { action: "create_portal_record", recordType: type, title: recordTitle, description: recordDescription, dueDate: recordDueDate, resourceUrl: recordResourceUrl, institutionId: recordInstitutionId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save module item.");
      setRecordTitle(""); setRecordDescription(""); setRecordDueDate(""); setRecordResourceUrl(""); setRecordInstitutionId(""); setEditingRecord(null);
      await loadData(); setNotice(editing ? "Module item updated." : "Module item created and saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save module item."); }
    finally { setBusy(false); }
  }

  async function changeRecordStatus(item: PortalRecord, status: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/portal", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ action: "update_portal_record", recordId: item.id, title: item.title, description: item.description || "", dueDate: item.due_date || "", resourceUrl: item.resource_url || "", status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update module status.");
      await loadData(); setNotice("Module item status updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update module status."); }
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
            <section className="admin-welcome"><div><span className="admin-kicker">CONTROL CENTER · 2026</span><h1>{active === "Overview" ? <>Welcome back, {name.split(" ")[0]}.</> : active}</h1><p>{active === "Overview" ? "A clear view of institutions, students, staff access, and internship activity across your portal." : selectedNav.label === "Settings" ? "Manage staff roles and access boundaries for the portal." : `Manage ${active.toLowerCase()} across the SHIVORIX Internship Portal.`}</p></div><div className="admin-welcome-mark"><ShieldCheck size={34}/><span>Secure workspace</span></div></section>
            {error && <div className="admin-alert error" role="alert">{error}</div>}{notice && <div className="admin-alert success" role="status"><CheckCircle2 size={17}/>{notice}</div>}
            {active === "Overview" && <>
              <div className="admin-section-head"><div><span>PORTAL SNAPSHOT</span><h2>At a glance</h2></div><button className="admin-refresh" onClick={() => loadData().then(()=>setNotice("Portal data refreshed.")).catch(e=>setError(e.message))}>Refresh data ↻</button></div>
              <div className="admin-stats">
                <button onClick={()=>setActive("Colleges")}><span className="stat-icon indigo"><Building2 size={20}/></span><small>Institutions</small><strong>{portalStats.colleges}</strong><em>Manage assignments <ChevronRight size={13}/></em></button>
                <button onClick={()=>setActive("Nodal Officers")}><span className="stat-icon violet"><ShieldCheck size={20}/></span><small>Nodal Officers</small><strong>{officers.length}</strong><em>{colleges.filter(c=>c.nodal_officer_id).length} institutions assigned</em></button>
                <button onClick={()=>setActive("Students")}><span className="stat-icon teal"><GraduationCap size={20}/></span><small>Registered students</small><strong>{portalStats.students}</strong><em>Student profiles</em></button>
                <button onClick={()=>setActive("Internships")}><span className="stat-icon orange"><BriefcaseBusiness size={20}/></span><small>Active internships</small><strong>{portalStats.activeInternships}</strong><em>{portalStats.internships} total listings</em></button>
                <button onClick={()=>setActive("Applications")}><span className="stat-icon violet"><ClipboardCheck size={20}/></span><small>Total applications</small><strong>{portalStats.applications}</strong><em>{applications.length} latest records loaded</em></button>
                <button onClick={()=>setActive("Applications")}><span className="stat-icon orange"><Activity size={20}/></span><small>Pending review</small><strong>{portalStats.pendingApplications}</strong><em>Submitted or under review</em></button>
                <button onClick={()=>setActive("Applications")}><span className="stat-icon teal"><CheckCircle2 size={20}/></span><small>Accepted</small><strong>{portalStats.acceptedApplications}</strong><em>Accepted applications</em></button>
                <button onClick={()=>setActive("Applications")}><span className="stat-icon indigo"><X size={20}/></span><small>Rejected</small><strong>{portalStats.rejectedApplications}</strong><em>Rejected applications</em></button>
              </div>
              <div className="admin-overview-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h3>Institution assignments</h3><p>Check which institutions have a Nodal Officer.</p></div><button onClick={()=>setActive("Colleges")}>View all <ArrowUpRight size={15}/></button></div>{colleges.length ? colleges.slice(0,5).map(c=><div className="admin-list-row" key={c.id}><span className="admin-row-icon"><Building2 size={17}/></span><div><strong>{c.name}</strong><small>{[c.city,c.state].filter(Boolean).join(", ") || "Location not added"}</small></div><span className={`admin-status ${c.nodal_officer_id ? "assigned" : "pending"}`}>{c.nodal_officer_id ? "Assigned" : "Unassigned"}</span></div>) : <div className="admin-empty">No institutions yet. Add one in Institutions.</div>}</section>
              <section className="admin-panel"><div className="admin-panel-head"><div><h3>Recent applications</h3><p>Latest student internship submissions.</p></div><button onClick={()=>setActive("Applications")}>View all <ArrowUpRight size={15}/></button></div>{applications.length ? applications.slice(0,5).map(a=><div className="admin-list-row" key={a.id}><span className="admin-row-icon purple"><ClipboardCheck size={17}/></span><div><strong>{a.profiles?.full_name || a.profiles?.email || "Student"}</strong><small>{a.internships?.title || "Internship"} · {new Date(a.applied_at).toLocaleDateString()}</small></div><span className={`admin-status ${a.status === "accepted" ? "assigned" : a.status === "rejected" ? "rejected" : "pending"}`}>{a.status.replace("_"," ")}</span></div>) : <div className="admin-empty">No applications found.</div>}</section></div>
              <section className="admin-panel admin-quick-panel"><div className="admin-panel-head"><div><h3>Admin shortcuts</h3><p>Common tasks for managing the portal.</p></div></div><div className="admin-shortcuts"><button onClick={()=>setActive("Colleges")}><Building2 size={20}/><span><strong>Add an institution</strong><small>Create a college record and assign its Nodal Officer.</small></span><ChevronRight size={17}/></button><button onClick={()=>setActive("Nodal Officers")}><Users size={20}/><span><strong>Manage Nodal Officers</strong><small>Assign officers to institutions.</small></span><ChevronRight size={17}/></button><a href="/staff/dashboard"><BookOpen size={20}/><span><strong>Publish internships</strong><small>Open the existing internship publishing workspace.</small></span><ArrowUpRight size={17}/></a></div></section>
            </>}
            {active === "Colleges" && <><div className="admin-section-head"><div><span>INSTITUTION DIRECTORY</span><h2>Institutions & assignments</h2></div><span className="admin-count">{colleges.length} total</span></div><div className="admin-panel"><h3 className="admin-form-title"><Plus size={18}/> Add institution</h3><form className="admin-form" onSubmit={createCollege}><label>Institution name *<input required value={collegeName} onChange={e=>setCollegeName(e.target.value)} placeholder="e.g. ABC College of Engineering"/></label><label>University (optional)<input value={university} onChange={e=>setUniversity(e.target.value)} placeholder="University name"/></label><label>City<input value={city} onChange={e=>setCity(e.target.value)} placeholder="City"/></label><label>State<input value={state} onChange={e=>setState(e.target.value)} placeholder="State"/></label><button disabled={busy} className="admin-primary">{busy ? "Saving…" : "Add institution"} <Plus size={16}/></button></form></div>{editingCollege && <div className="admin-panel"><h3 className="admin-form-title">Edit institution</h3><form className="admin-form" onSubmit={saveCollege}><label>Institution name *<input required minLength={2} maxLength={200} value={editCollegeName} onChange={e=>setEditCollegeName(e.target.value)}/></label><label>University<input value={editUniversity} onChange={e=>setEditUniversity(e.target.value)}/></label><label>City<input value={editCity} onChange={e=>setEditCity(e.target.value)}/></label><label>State<input value={editState} onChange={e=>setEditState(e.target.value)}/></label><div className="admin-action-group"><button disabled={busy} className="admin-primary">{busy ? "Saving…" : "Save institution"}</button><button type="button" className="admin-refresh" onClick={()=>setEditingCollege(null)}>Cancel</button></div></form></div>}<div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search institutions…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Institution</th><th>Location</th><th>Nodal Officer</th><th>Assignment</th><th>Actions</th></tr></thead><tbody>{filteredColleges.map(c=>{const officer=officers.find(p=>p.id===c.nodal_officer_id);return <tr key={c.id}><td><strong>{c.name}</strong><small>{c.university_name || "University not set"}</small></td><td>{[c.city,c.state].filter(Boolean).join(", ") || "—"}</td><td><div className="admin-review-cell"><select aria-label={`Assign officer to ${c.name}`} disabled={busy} value={c.nodal_officer_id || ""} onChange={e=>assignOfficer(c.id,e.target.value)}><option value="">Unassigned</option>{officers.map(o=><option key={o.id} value={o.id}>{o.full_name || o.email || o.id.slice(0,8)}</option>)}</select>{c.nodal_officer_id && <button type="button" className="admin-refresh" disabled={busy} onClick={()=>assignOfficer(c.id,"")}>Remove assignment</button>}</div></td><td><span className={`admin-status ${officer ? "assigned" : "pending"}`}>{officer ? "Assigned" : "Needs assignment"}</span></td><td><button type="button" className="admin-refresh" onClick={()=>{setEditingCollege(c);setEditCollegeName(c.name);setEditUniversity(c.university_name || "");setEditCity(c.city || "");setEditState(c.state || "");}}>Edit details</button></td></tr>})}</tbody></table>{filteredColleges.length===0&&<div className="admin-empty">No matching institutions.</div>}</div></>}
            {active === "Nodal Officers" && <><div className="admin-section-head"><div><span>STAFF ACCESS</span><h2>Nodal Officer directory</h2></div><span className="admin-count">{officers.length} officers</span></div><p className="admin-help">Each officer is linked to one existing active college. Creating the account below also assigns the selected college; no second assignment step is needed.</p><div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search officers…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Officer</th><th>Designation / Department</th><th>Email</th><th>Mobile</th><th>Assigned institution</th><th>Access</th></tr></thead><tbody>{officers.filter(o=>[o.full_name,o.email].some(v=>v?.toLowerCase().includes(search.toLowerCase()))).map(o=>{const college=colleges.find(c=>c.nodal_officer_id===o.id);return <tr key={o.id}><td><strong>{o.full_name || "Name not provided"}</strong><small>{o.employee_id ? "Employee ID: "+o.employee_id : "Staff account"}</small></td><td>{o.designation || "Nodal Officer"}<small>{o.department || "Department not set"}</small></td><td>{o.email || "—"}</td><td>{o.mobile_number || "—"}</td><td>{college?.name || "Not assigned"}</td><td><span className={`admin-status ${o.nodal_status === "inactive" ? "pending" : college ? "assigned" : "pending"}`}>{o.nodal_status === "inactive" ? "Inactive" : college ? "Assigned" : "Not assigned"}</span></td></tr>})}</tbody></table>{officers.length===0&&<div className="admin-empty">No Nodal Officer profiles found yet. Use the section below to grant Nodal Officer access to an existing account.</div>}</div><div className="admin-section-head"><div><span>STAFF PROVISIONING</span><h2>Add & assign Nodal Officer</h2></div><span className="admin-count">Admin controlled</span></div><p className="admin-help">Choose an active college already added in College Management. Account creation and assignment happen together. A college can have only one assigned Nodal Officer.</p><div className="admin-panel"><form className="admin-form" onSubmit={createNodalOfficer}><label>Assigned college *<select required value={officerCollegeId} onChange={e=>setOfficerCollegeId(e.target.value)}><option value="">Choose existing active college</option>{colleges.filter(c=>c.status!=="inactive"&&!c.nodal_officer_id).map(c=><option key={c.id} value={c.id}>{c.name}{c.college_code ? " · "+c.college_code : ""}</option>)}</select></label><label>Officer full name *<input required minLength={2} maxLength={100} value={officerName} onChange={e=>setOfficerName(e.target.value)} placeholder="Full name"/></label><label>Designation *<select required value={officerDesignation} onChange={e=>setOfficerDesignation(e.target.value)}><option>Nodal Officer</option><option>Principal</option><option>Training & Placement Officer</option><option>Other</option></select></label><label>Official staff email *<input required type="email" maxLength={254} value={officerEmail} onChange={e=>setOfficerEmail(e.target.value)} placeholder="officer@college.edu" autoComplete="off"/></label><label>Mobile number *<input required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" minLength={10} maxLength={10} value={officerMobile} onChange={e=>setOfficerMobile(e.target.value.replace(/\D/g, "").slice(0,10))} placeholder="10-digit mobile number" autoComplete="tel"/></label><label>Employee ID (optional)<input maxLength={100} value={officerEmployeeId} onChange={e=>setOfficerEmployeeId(e.target.value)} placeholder="College employee ID"/></label><label>Department (optional)<input maxLength={160} value={officerDepartment} onChange={e=>setOfficerDepartment(e.target.value)} placeholder="e.g. Training & Placement"/></label><label>Account status *<select required value={officerStatus} onChange={e=>setOfficerStatus(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label>Temporary password *<input required type="password" minLength={8} maxLength={72} value={officerPassword} onChange={e=>setOfficerPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/></label><button disabled={busy || colleges.filter(c=>c.status!=="inactive"&&!c.nodal_officer_id).length===0} className="admin-primary">{busy ? "Creating & assigning…" : "Create account & assign college"} <Plus size={16}/></button>{colleges.filter(c=>c.status!=="inactive"&&!c.nodal_officer_id).length===0 && <p className="admin-help">No unassigned active colleges available. Add or activate a college, or remove an existing assignment first.</p>}</form></div></>}
            {active === "Students" && <><div className="admin-section-head"><div><span>STUDENT DIRECTORY</span><h2>Registered students</h2></div><span className="admin-count">{students.length} students</span></div>{editingStudent && <div className="admin-panel"><h3 className="admin-form-title">Edit student profile</h3><form className="admin-form" onSubmit={saveStudent}><label>Full name *<input required minLength={2} maxLength={100} value={editStudentName} onChange={e=>setEditStudentName(e.target.value)}/></label><label>Course<input maxLength={160} value={editStudentCourse} onChange={e=>setEditStudentCourse(e.target.value)}/></label><label>Institution<select value={editStudentCollege} onChange={e=>setEditStudentCollege(e.target.value)}><option value="">Not mapped</option>{colleges.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="admin-action-group"><button disabled={busy} className="admin-primary">{busy ? "Saving…" : "Save student"}</button><button type="button" className="admin-refresh" onClick={()=>setEditingStudent(null)}>Cancel</button></div></form></div>}<div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email, course…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Course</th><th>Institution</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{filteredProfiles.filter(p=>p.role==="student").map(p=><tr key={p.id}><td><strong>{p.full_name || "Name not provided"}</strong><small>{p.email || "Email unavailable"}</small></td><td>{p.course || "—"}</td><td>{colleges.find(c=>c.id===p.college_id)?.name || p.institution_name || "Not mapped"}</td><td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td><td><button type="button" className="admin-refresh" onClick={()=>{setEditingStudent(p);setEditStudentName(p.full_name || "");setEditStudentCourse(p.course || "");setEditStudentCollege(p.college_id || "");}}>Edit profile</button></td></tr>)}</tbody></table>{students.length===0&&<div className="admin-empty">No student profiles found.</div>}</div></>}
            {active === "Internships" && <><div className="admin-section-head"><div><span>OPPORTUNITY MANAGEMENT</span><h2>Internship listings</h2></div><a className="admin-primary link" href="/staff/dashboard">Create internship <ArrowUpRight size={16}/></a></div>{editingInternship && <div className="admin-panel"><h3 className="admin-form-title">Edit internship</h3><form className="admin-form" onSubmit={saveInternship}><label>Title *<input required minLength={3} maxLength={160} value={editInternshipTitle} onChange={e=>setEditInternshipTitle(e.target.value)}/></label><label>Description *<textarea required minLength={10} maxLength={5000} rows={4} value={editInternshipDescription} onChange={e=>setEditInternshipDescription(e.target.value)}/></label><label>Mode<select value={editInternshipMode} onChange={e=>setEditInternshipMode(e.target.value)}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label><label>Location<input maxLength={160} value={editInternshipLocation} onChange={e=>setEditInternshipLocation(e.target.value)}/></label><label>Duration in weeks<input type="number" min={1} max={104} value={editInternshipDuration} onChange={e=>setEditInternshipDuration(e.target.value)}/></label><label>Internship fee (INR)<input type="number" min={0} max={1000000} step="0.01" value={editInternshipFee} onChange={e=>setEditInternshipFee(e.target.value)} placeholder="Set fee in rupees"/></label><div className="admin-action-group"><button disabled={busy} className="admin-primary">{busy ? "Saving…" : "Save changes"}</button><button type="button" className="admin-refresh" onClick={()=>setEditingInternship(null)}>Cancel</button></div></form></div>}<div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Internship</th><th>Mode</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>{internships.map(i=><tr key={i.id}><td><strong>{i.title}</strong><small>{i.description || "No description"}</small></td><td>{i.mode}</td><td>{new Date(i.created_at).toLocaleDateString()}</td><td><span className={`admin-status ${i.is_active ? "assigned" : "pending"}`}>{i.is_active ? "Published" : "Unpublished"}</span></td><td><div className="admin-review-cell"><button type="button" className="admin-refresh" onClick={()=>{setEditingInternship(i);setEditInternshipTitle(i.title);setEditInternshipDescription(i.description || "");setEditInternshipMode(i.mode);setEditInternshipLocation(i.location || "");setEditInternshipDuration(i.duration_weeks ? String(i.duration_weeks) : "");setEditInternshipFee(i.fee_amount != null ? String(i.fee_amount) : "");}}>Edit</button><button type="button" className="admin-refresh" disabled={busy} onClick={()=>toggleInternship(i)}>{i.is_active ? "Unpublish" : "Publish"}</button></div></td></tr>)}</tbody></table>{internships.length===0&&<div className="admin-empty">No internship listings found.</div>}</div></>}
            {active === "Applications" && <><div className="admin-section-head"><div><span>STUDENT PIPELINE</span><h2>Internship applications</h2></div><div className="admin-action-group"><button className="admin-refresh" onClick={()=>exportCsv("shivorix-applications.csv", applications.map(a=>({application_id:a.id,student:a.profiles?.full_name || "",email:a.profiles?.email || "",internship:a.internships?.title || "",applied_at:a.applied_at,status:a.status})))}>Export CSV ↓</button><span className="admin-count">{applications.length} recent</span></div></div><div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student, internship, status…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Student / Application No.</th><th>Internship details</th><th>Documents</th><th>Applied</th><th>Status / review action</th></tr></thead><tbody>{applications.filter(a=>[a.profiles?.full_name,a.profiles?.email,a.internships?.title,a.status].some(v=>v?.toLowerCase().includes(search.toLowerCase()))).map(a=><tr key={a.id}><td><strong>{a.profiles?.full_name || "Student"}</strong><small>{a.profiles?.email || "—"}</small><small>{a.application_number || a.id}</small></td><td><strong>{a.internships?.title || "—"}</strong><small>{a.sectors?.name || "Sector not set"} · {a.mode || "Mode not set"}</small><small>{a.requested_hours ?? 120} hours · {a.requested_credits ?? 4} credits</small><small>{a.preferred_start_date || "Start date not set"} → {a.preferred_end_date || "End date not set"}</small><small>{[a.city,a.state,a.pin_code].filter(Boolean).join(", ")}</small><small>Review remarks: {a.review_remarks || "Not provided"}</small></td><td>{a.portal_documents?.length ? a.portal_documents.map(doc=><button type="button" className="admin-document-link" key={doc.id} onClick={()=>void openApplicationDocument(doc.id)}>{doc.document_type} · {doc.status} ↗</button>) : "No documents linked"}</td><td>{new Date(a.applied_at).toLocaleDateString()}</td><td><div className="admin-review-cell"><span className={`admin-status ${a.status==="accepted"?"assigned":a.status==="rejected"?"rejected":"pending"}`}>{a.status.replace("_"," ")}</span><select aria-label={`Update status for application ${a.id}`} disabled={busy} value={a.status} onChange={e=>updateApplicationStatus(a.id,e.target.value)}>{a.status === "draft" && <option value="draft">Draft (current)</option>}<option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option></select></div></td></tr>)}</tbody></table>{applications.length===0&&<div className="admin-empty">No applications found.</div>}</div></>}
            {active === "Documents & Reports" && <div className="admin-panel admin-feature"><span className="admin-feature-icon"><FileText size={24}/></span><h2>Documents & reports</h2><p>Export current portal lists for operational reporting. These exports contain records currently loaded in this console; the applications list is limited to the latest 100 records. Student document files are not exposed here until private storage permissions and verification workflow are implemented.</p><div className="admin-info-strip">Current student profiles: <strong>{students.length}</strong> · Applications loaded: <strong>{applications.length}</strong> · Institutions: <strong>{colleges.length}</strong></div><div className="admin-report-actions"><button className="admin-primary" onClick={()=>exportCsv("shivorix-students.csv",students.map(p=>({student_id:p.id,name:p.full_name || "",email:p.email || "",college:colleges.find(c=>c.id===p.college_id)?.name || p.institution_name || "",course:p.course || "",registered_at:p.created_at || ""})))}>Export students CSV</button><button className="admin-primary" onClick={()=>exportCsv("shivorix-applications.csv",applications.map(a=>({application_id:a.id,student:a.profiles?.full_name || "",email:a.profiles?.email || "",internship:a.internships?.title || "",applied_at:a.applied_at,status:a.status})))}>Export applications CSV</button><button className="admin-primary" onClick={()=>exportCsv("shivorix-institutions.csv",colleges.map(c=>({institution_id:c.id,name:c.name,university:c.university_name || "",city:c.city || "",state:c.state || "",nodal_officer_assigned:Boolean(c.nodal_officer_id)})))}>Export institutions CSV</button></div></div>}
            {moduleTypeByLabel[active] && <><div className="admin-section-head"><div><span>LEARNING & CONTENT MANAGEMENT</span><h2>{active} workspace</h2></div><span className="admin-count">{records.filter(r => r.record_type === moduleTypeByLabel[active]).length} items</span></div><p className="admin-help">Create, edit, publish, or archive this module's records. Items saved here persist in the database and appear in the corresponding student/Nodal workspace according to institution assignment.</p>{active === "Guidelines" && <div className="admin-panel admin-guidelines-reference"><span className="admin-section-kicker">OFFICIAL BASELINE · SEMESTER V · UPLOADED BIHAR UG INTERNSHIP GUIDELINES</span><h3>Rules for Semester V internships</h3><p className="admin-help">This portal workflow is for Semester V undergraduate students only. Apply the duration, approval, assessment and submission requirements below to Semester V; do not route other semesters through this internship workflow.</p><div className="admin-guideline-stats"><div><strong>120 hours</strong><small>4 credits · normally 4–6 weeks</small></div><div><strong>90+ hours</strong><small>With Internship Providing Organization</small></div><div><strong>70% / 30%</strong><small>Report / Presentation & Viva-Voce</small></div></div><ul><li>Individual internships only; group internships are not permitted.</li><li>On-site is the stated default. Online/virtual mode requires an eligible Government organization/platform and College approval.</li><li>Internships must be unpaid; the IPO cannot charge students, though a voluntary stipend is allowed.</li><li>Prohibited areas include network-level marketing requiring personal-contact promotion, alcohol/smoking promotion, sectarian religious promotion, gambling/illegal activity, and political campaigning/promotion.</li><li>Evaluation requires at least 45% in each component: report (70 marks) and presentation/viva-voce (30 marks).</li><li>IPO completion certificate: within 10 days; report: within 20 days after completion; marks/award roll: within 7 days after evaluation.</li><li>The platform's additional tools (attendance, assignments, training, assessments, certificates and reports) should support—not replace—college approval, mentorship and official evaluation procedures.</li></ul><p className="admin-help">Detailed student-facing summary is available in Student Portal → Guidelines. This baseline is derived from the uploaded guideline document; college/university instructions and later official notices must also be followed.</p></div>}<div className="admin-panel"><h3 className="admin-form-title">{editingRecord ? "Edit module item" : "Add new item"}</h3><form className="admin-form" onSubmit={savePortalRecord}><label>Title *<input required minLength={3} maxLength={180} value={recordTitle} onChange={e=>setRecordTitle(e.target.value)} placeholder={active + " title"}/></label><label>Due date (optional)<input type="date" value={recordDueDate} onChange={e=>setRecordDueDate(e.target.value)}/></label><label>Resource URL (optional)<input type="url" value={recordResourceUrl} onChange={e=>setRecordResourceUrl(e.target.value)} placeholder="https://…"/></label>{!editingRecord && <label>College scope *<select required value={recordInstitutionId} onChange={e=>setRecordInstitutionId(e.target.value)}><option value="">Select a college</option>{colleges.map(college=><option key={college.id} value={college.id}>{college.name}</option>)}</select></label>}<label className="admin-full-field">Description<textarea rows={4} maxLength={5000} value={recordDescription} onChange={e=>setRecordDescription(e.target.value)} placeholder="Instructions, details, or guidance…"/></label><div className="admin-action-group"><button disabled={busy} className="admin-primary">{busy ? "Saving…" : editingRecord ? "Save changes" : "Create item"} <Plus size={15}/></button>{editingRecord && <button type="button" className="admin-refresh" onClick={()=>{setEditingRecord(null);setRecordTitle("");setRecordDescription("");setRecordDueDate("");setRecordResourceUrl("");}}>Cancel edit</button>}</div></form></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Item</th><th>College</th><th>Due date</th><th>Link</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.filter(r=>r.record_type===moduleTypeByLabel[active]).map(item=><tr key={item.id}><td><strong>{item.title}</strong><small>{item.description || "No description"}</small></td><td>{colleges.find(college=>college.id===item.institution_id)?.name || "All colleges"}</td><td>{item.due_date || "—"}</td><td>{item.resource_url ? <a href={item.resource_url} target="_blank" rel="noreferrer">Open link ↗</a> : "—"}</td><td><select aria-label={"Status for " + item.title} disabled={busy} value={["open","in_progress","submitted","completed","published"].includes(item.status) ? item.status : "published"} onChange={e=>changeRecordStatus(item,e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="submitted">Submitted</option><option value="completed">Completed</option><option value="published">Published</option></select></td><td><button type="button" className="admin-refresh" onClick={()=>{setEditingRecord(item);setRecordTitle(item.title);setRecordDescription(item.description || "");setRecordDueDate(item.due_date || "");setRecordResourceUrl(item.resource_url || "");}}>Edit</button></td></tr>)}</tbody></table>{records.filter(r=>r.record_type===moduleTypeByLabel[active]).length===0&&<div className="admin-empty">No items yet. Add the first item using the form above.</div>}</div></>}
            {active === "Audit Logs" && <><div className="admin-section-head"><div><span>SECURITY & ACCOUNTABILITY</span><h2>Audit Logs</h2></div><div className="admin-action-group"><button className="admin-refresh" onClick={()=>exportCsv("shivorix-audit-logs.csv",auditLogs.map(log=>({id:log.id,actor_id:log.actor_id || "",target_profile_id:log.target_profile_id || "",action:log.action,created_at:log.created_at,old_value:JSON.stringify(log.old_value ?? ""),new_value:JSON.stringify(log.new_value ?? ""),details:JSON.stringify(log.details ?? "")})))}>Export audit CSV ↓</button><span className="admin-count">{auditLogs.length} recent</span></div></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th><th>Details</th></tr></thead><tbody>{auditLogs.map(log=><tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td><strong>{log.action}</strong></td><td>{log.actor_id || "—"}</td><td>{log.target_profile_id || "—"}</td><td>{JSON.stringify(log.details ?? {})}</td></tr>)}</tbody></table>{auditLogs.length===0&&<div className="admin-empty">No audit entries returned. Check whether audit logging is enabled in the database.</div>}</div></>}
            {active === "Payments" && <div className="admin-panel admin-feature"><span className="admin-feature-icon"><FileText size={24}/></span><h2>Payments</h2><p>No payment ledger or payment transaction table is currently connected to this portal's Admin API, so this screen does not invent payment totals or mark anything as paid. You can export current application records while a verified payment workflow is connected.</p><div className="admin-info-strip">Applications loaded: <strong>{applications.length}</strong></div><div className="admin-report-actions"><button className="admin-primary" onClick={()=>exportCsv("shivorix-payment-reconciliation.csv",applications.map(a=>({application_id:a.id,student:a.profiles?.full_name || "",email:a.profiles?.email || "",internship:a.internships?.title || "",status:a.status,applied_at:a.applied_at})))}>Export reconciliation CSV</button></div></div>}
            {active === "Reports" && <div className="admin-panel admin-feature"><span className="admin-feature-icon"><FileText size={24}/></span><h2>Reports & exports</h2><p>Export the live data currently loaded by the Admin Portal. CSV exports can be opened in Google Sheets or Excel.</p><div className="admin-info-strip">Students: <strong>{students.length}</strong> · Colleges: <strong>{colleges.length}</strong> · Applications: <strong>{applications.length}</strong> · Module items: <strong>{records.length}</strong></div><div className="admin-report-actions"><button className="admin-primary" onClick={()=>exportCsv("shivorix-students.csv",students.map(p=>({id:p.id,name:p.full_name || "",email:p.email || "",course:p.course || "",college:colleges.find(c=>c.id===p.college_id)?.name || ""})))}>Export students</button><button className="admin-primary" onClick={()=>exportCsv("shivorix-colleges.csv",colleges.map(college=>({id:college.id,name:college.name,city:college.city || "",state:college.state || "",nodal_officer_id:college.nodal_officer_id || ""})))}>Export colleges</button><button className="admin-primary" onClick={()=>exportCsv("shivorix-module-records.csv",records.map(item=>({id:item.id,type:item.record_type,title:item.title,status:item.status,due_date:item.due_date || "",institution_id:item.institution_id || ""})))}>Export module records</button></div></div>}
            {active === "Colleges" && <><div className="admin-section-head"><div><span>INSTITUTION DIRECTORY</span><h2>College management</h2></div><span className="admin-count">{colleges.length} colleges</span></div><p className="admin-help">Only active colleges added by Admin appear in student registration. Deactivation preserves existing records.</p>{editingCollege && <div className="admin-panel"><h3 className="admin-form-title">Edit college</h3><form className="admin-form" onSubmit={saveCollege}><label>College name *<input required value={editCollegeName} onChange={e=>setEditCollegeName(e.target.value)}/></label><label>College Code *<input required value={editCollegeCode} onChange={e=>setEditCollegeCode(e.target.value.toUpperCase())}/></label><label>College type *<select value={editCollegeType} onChange={e=>setEditCollegeType(e.target.value)}><option>Government</option><option>Private</option><option>Autonomous</option><option>Other</option></select></label><label>University *<input required value={editUniversity} onChange={e=>setEditUniversity(e.target.value)}/></label><label>Affiliation / AISHE code<input value={editAffiliationCode} onChange={e=>setEditAffiliationCode(e.target.value)}/></label><label>Website<input type="url" value={editCollegeWebsite} onChange={e=>setEditCollegeWebsite(e.target.value)}/></label><label>Official email (optional)<input value={editCollegeEmail} onChange={e=>setEditCollegeEmail(e.target.value)}/></label><label>Official phone *<input required value={editCollegePhone} onChange={e=>setEditCollegePhone(e.target.value)} pattern="[0-9+() -]{10,18}"/></label><label className="admin-full-field">Address line *<input required value={editCollegeAddress} onChange={e=>setEditCollegeAddress(e.target.value)}/></label><label>District / City *<input required value={editCity} onChange={e=>setEditCity(e.target.value)}/></label><label>State *<input required value={editState} onChange={e=>setEditState(e.target.value)}/></label><label>PIN code *<input required value={editCollegePin} onChange={e=>setEditCollegePin(e.target.value.replace(/\D/g,"").slice(0,6))} pattern="[0-9]{6}" maxLength={6}/></label><div className="admin-action-group"><button disabled={busy} className="admin-primary">{busy?"Saving…":"Save changes"}</button><button type="button" className="admin-refresh" onClick={()=>setEditingCollege(null)}>Cancel</button></div></form></div>}<div className="admin-panel"><h3 className="admin-form-title">Add a college</h3><form className="admin-form" onSubmit={createCollege}><label>College name *<input required minLength={2} maxLength={200} value={collegeName} onChange={e=>setCollegeName(e.target.value)}/></label><label>College Code *<input required maxLength={40} value={collegeCode} onChange={e=>setCollegeCode(e.target.value.toUpperCase())} placeholder="Unique code e.g. COL-001"/></label><label>College type *<select value={collegeType} onChange={e=>setCollegeType(e.target.value)}><option>Government</option><option>Private</option><option>Autonomous</option><option>Other</option></select></label><label>University name *<input required value={university} onChange={e=>setUniversity(e.target.value)}/></label><label>Affiliation / AISHE code<input value={affiliationCode} onChange={e=>setAffiliationCode(e.target.value)}/></label><label>Website<input type="url" value={collegeWebsite} onChange={e=>setCollegeWebsite(e.target.value)} placeholder="https://…"/></label><label>Official college email (optional)<input value={collegeEmail} onChange={e=>setCollegeEmail(e.target.value)}/></label><label>Official phone *<input required value={collegePhone} onChange={e=>setCollegePhone(e.target.value)} pattern="[0-9+() -]{10,18}"/></label><label className="admin-full-field">Address line *<input required value={collegeAddress} onChange={e=>setCollegeAddress(e.target.value)}/></label><label>District / City *<input required value={city} onChange={e=>setCity(e.target.value)}/></label><label>State *<input required value={state} onChange={e=>setState(e.target.value)}/></label><label>PIN code *<input required value={collegePin} onChange={e=>setCollegePin(e.target.value.replace(/\D/g,"").slice(0,6))} pattern="[0-9]{6}" maxLength={6}/></label><div className="admin-action-group"><button disabled={busy} className="admin-primary">{busy?"Saving…":"Add college"} <Plus size={15}/></button></div></form></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>College</th><th>Location</th><th>Nodal Officer</th><th>Status</th></tr></thead><tbody>{colleges.map(college=><tr key={college.id}><td><strong>{college.name}</strong><small>{college.college_code || "No code"} · {college.college_type || "Type not set"}<br/>{college.official_email || "No official email"}</small></td><td>{[college.city,college.state,college.pin_code].filter(Boolean).join(", ")}<small>{college.university_name || "University not set"}</small></td><td><select aria-label={"Assign Nodal Officer to "+college.name} disabled={busy} value={college.nodal_officer_id || ""} onChange={e=>assignOfficer(college.id,e.target.value)}><option value="">Not assigned</option>{profiles.filter(p=>p.role==="nodal_officer").map(p=><option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>)}</select></td><td><span className={"admin-status "+(college.status!=="inactive"?"assigned":"pending")}>{college.status==="inactive"?"Inactive":"Active"}</span><div className="admin-review-cell"><button type="button" className="admin-refresh" onClick={()=>{setEditingCollege(college);setEditCollegeName(college.name);setEditCollegeCode(college.college_code||"");setEditCollegeType(college.college_type||"Government");setEditUniversity(college.university_name||"");setEditAffiliationCode(college.affiliation_code||"");setEditCollegeWebsite(college.website||"");setEditCollegeEmail(college.official_email||"");setEditCollegePhone(college.official_phone||"");setEditCollegeAddress(college.address_line||"");setEditCity(college.city||"");setEditState(college.state||"");setEditCollegePin(college.pin_code||"");}}>Edit</button><button type="button" className="admin-refresh" disabled={busy} onClick={async()=>{setBusy(true);setError("");setNotice("");try{const supabase=getSupabaseBrowserClient();const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Your session expired. Please sign in again.");const nextStatus=college.status==="inactive"?"active":"inactive";const response=await fetch("/api/admin/portal",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({action:"toggle_college_status",collegeId:college.id,status:nextStatus})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not change college status.");await loadData();setNotice("College status updated.");}catch(e){setError(e instanceof Error?e.message:"Could not change college status.");}finally{setBusy(false);}}}>{college.status==="inactive"?"Activate":"Deactivate"}</button></div></td></tr>)}</tbody></table>{colleges.length===0&&<div className="admin-empty">No colleges yet. Add the first college above.</div>}</div></>}
            {active === "Settings" && <div className="admin-panel admin-feature"><span className="admin-feature-icon"><ShieldCheck size={24}/></span><h2>Settings</h2><p>Manage user roles and access using the role-management section below.</p></div>}
            {active === "Settings" && <><div className="admin-section-head"><div><span>ROLE-BASED ACCESS</span><h2>Users & account roles</h2></div><span className="admin-count">{profiles.length} profiles loaded</span></div><p className="admin-help">Change an existing profile between Student and Nodal Officer. Admin roles cannot be granted or changed from this screen. Role changes are recorded in the protected audit log. Create/authenticate a user account first; this screen does not create login credentials.</p><div className="admin-table-tools"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search user name or email…"/></label></div><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Institution</th><th>Current role</th><th>Change role</th></tr></thead><tbody>{filteredProfiles.map(profile=><tr key={profile.id}><td><strong>{profile.full_name || "Name not provided"}</strong><small>{profile.email || profile.id}</small></td><td>{colleges.find(c=>c.id===profile.college_id)?.name || profile.institution_name || "Not mapped"}</td><td><span className={`admin-status ${profile.role==="admin"?"assigned":profile.role==="nodal_officer"?"pending":"pending"}`}>{profile.role.replace("_"," ")}</span></td><td>{profile.role==="admin" ? <span>Protected admin account</span> : <select aria-label={`Change role for ${profile.full_name || profile.email || profile.id}`} disabled={busy} value={profile.role==="nodal_officer"?"nodal_officer":"student"} onChange={e=>setProfileRole(profile.id,e.target.value as "student" | "nodal_officer")}><option value="student">Student</option><option value="nodal_officer">Nodal Officer</option></select>}</td></tr>)}</tbody></table>{filteredProfiles.length===0&&<div className="admin-empty">No matching profiles.</div>}</div><div className="admin-info-strip">Signed in as <strong>{name}</strong> · Role <strong>Admin</strong></div></>}
          </>}
          <footer className="admin-footer">© 2026 SHIVORIX <span><ShieldCheck size={14}/> Admin workspace</span></footer>
        </div>
      </section>
    </main>
  );
}
