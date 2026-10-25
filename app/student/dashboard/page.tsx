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

type StudentRecord = { id: string; record_type: "assignment" | "project" | "evaluation" | "document" | "notification" | "training" | "activity" | "test" | "certificate"; title: string; description: string | null; status: string; due_date: string | null; resource_url: string | null; resource_file_url?: string | null; created_at: string; student_id: string | null };
type StudentAttendance = { id: string; attendance_date: string; status: string; notes: string | null; hours: number | null; check_in_at?: string | null; check_out_at?: string | null; application_id?: string | null; updated_at: string };
type StudentSubmission = { id: string; record_id: string; status: string; submission_url: string | null; submission_note: string | null; feedback: string | null; submitted_at: string };
type StudentApplication = { id: string; application_number?: string | null; status: string; nodal_review_status?: string | null; review_remarks?: string | null; mode?: string | null; requested_hours?: number | null; requested_credits?: number | null; preferred_start_date?: string | null; preferred_end_date?: string | null; city?: string | null; state?: string | null; pin_code?: string | null; full_address?: string | null; applied_at: string; updated_at: string | null; sectors?: { name: string } | null; portal_documents?: { id: string; document_type: string; status: string; metadata?: Record<string, unknown> }[] | null; internships: { title: string; description: string | null; mode: string; location: string | null; duration_weeks: number | null; fee_amount: number | null } | { title: string; description: string | null; mode: string; location: string | null; duration_weeks: number | null; fee_amount: number | null }[] | null; internship_payments?: { status: string; amount: number; verified_at: string | null }[] | null; approved_at?: string | null; activated_at?: string | null };
type Profile = {
  full_name: string | null; father_name: string | null; mother_name: string | null; date_of_birth: string | null;
  gender: string | null; address: string | null; city: string | null; state: string | null; pin_code: string | null;
  email: string | null; phone: string | null; roll_number: string | null; registration_number: string | null;
  institution_name: string | null; college_name: string | null; university_name: string | null; college_id: string | null;
  course: string | null; branch: string | null; academic_year: string | null; current_semester: string | null;
};

const navigation = [
  { label: "My Profile", icon: UserRound, description: "Your personal and academic information" },
  { label: "Guidelines", icon: BookOpen, description: "Official internship rules, timelines, evaluation and report requirements" },
  { label: "Portal Help", icon: CircleHelp, description: "Step-by-step help for registration, applying and tracking your internship" },
  { label: "Apply for Internship", icon: BriefcaseBusiness, description: "Explore and apply for an internship" },
  { label: "My Application", icon: ClipboardCheck, description: "Track your application progress" },
  { label: "Internship Details", icon: NotebookPen, description: "Your internship plan and information" },
  { label: "IPO", icon: FileText, description: "SHIVORIX IPO profile and organization information" },
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
  { label: "Full name", key: "full_name" }, { label: "Father's name", key: "father_name" },
  { label: "Mother's name", key: "mother_name" }, { label: "Gender", key: "gender" },
  { label: "Mobile number", key: "phone" }, { label: "Email address", key: "email" },
  { label: "Permanent address", key: "address" }, { label: "City / District", key: "city" },
  { label: "State", key: "state" }, { label: "PIN code", key: "pin_code" },
  { label: "College / Institute", key: "college_name" }, { label: "University", key: "university_name" },
  { label: "Course / Programme", key: "course" }, { label: "Department", key: "branch" },
  { label: "Current semester", key: "current_semester" }, { label: "Academic session", key: "academic_year" },
  { label: "College Roll Number", key: "roll_number" }, { label: "University Registration Number", key: "registration_number" },
  { label: "College ID", key: "college_id" },
];

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sectorNames, setSectorNames] = useState<string[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>([]);
  const [attendanceNotice, setAttendanceNotice] = useState("");
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [studentApplications, setStudentApplications] = useState<StudentApplication[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<StudentSubmission[]>([]);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentBusyId, setPaymentBusyId] = useState("");
  const [recordsNotice, setRecordsNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dobDraft, setDobDraft] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");

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
          .select("full_name,father_name,mother_name,date_of_birth,gender,address,city,state,pin_code,email,phone,roll_number,registration_number,institution_name,college_id,course,branch,academic_year,current_semester,colleges(name,university_name)")
          .eq("id", user.id)
          .single();
        if (profileError) throw profileError;
        const { data: selections } = await supabase
          .from("student_sectors").select("sectors(name)").eq("student_id", user.id);
        const { data: { session } } = await supabase.auth.getSession();
        let recordData: any = { records: [], attendance: [] };
        let attendanceMessage = "";
        if (session) {
          const attendanceResponse = await fetch("/api/student/attendance", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ action: "auto_checkin" }), cache: "no-store",
          });
          const attendanceResult = await attendanceResponse.json();
          if (attendanceResponse.ok) attendanceMessage = attendanceResult.message || "";
          const response = await fetch("/api/student/records", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
          recordData = await response.json();
          if (!response.ok) throw new Error(recordData.error || "Could not load assignments and institution updates.");
          // Keep My Application reliable even if the combined student-record endpoint returns no application rows.
          if (!(recordData.applications ?? []).length) {
            const { data: fallbackApplications } = await supabase.from("internship_applications")
              .select("id,application_number,status,nodal_review_status,review_remarks,mode,requested_hours,requested_credits,preferred_start_date,preferred_end_date,city,state,pin_code,full_address,applied_at,updated_at,approved_at,activated_at,internships(title,description,mode,location,duration_weeks,fee_amount),sectors(name),portal_documents(id,document_type,status,metadata),internship_payments(status,amount,verified_at)")
              .eq("student_id", user.id).order("applied_at", { ascending: false }).limit(100);
            if (fallbackApplications?.length) recordData.applications = fallbackApplications;
          }
        }
        if (active) {
          const rawProfile = data as any;
          const college = Array.isArray(rawProfile.colleges) ? rawProfile.colleges[0] : rawProfile.colleges;
          setProfile({ ...rawProfile, college_name: college?.name || rawProfile.institution_name || null, university_name: college?.university_name || null } as Profile);
          setDobDraft(rawProfile.date_of_birth || "");
          setSectorNames((selections || []).map((item: any) => item.sectors?.name).filter(Boolean));
          setStudentRecords((recordData.records ?? []) as StudentRecord[]);
          setStudentAttendance((recordData.attendance ?? []) as StudentAttendance[]);
          setAttendanceNotice(attendanceMessage);
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

  async function checkOutAttendance() {
    setAttendanceBusy(true); setError("");
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/student/attendance", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "check_out" }), cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Attendance check-out failed.");
      setStudentAttendance(current => current.map(item => item.id === result.attendance.id ? { ...item, ...result.attendance } : item));
      setAttendanceNotice(result.message || "Attendance check-out saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Attendance check-out failed."); }
    finally { setAttendanceBusy(false); }
  }

  async function saveDateOfBirth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setProfileBusy(true); setProfileNotice(""); setError("");
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dateOfBirth: dobDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Date of birth could not be saved.");
      setProfile(current => current ? { ...current, date_of_birth: result.dateOfBirth } : current);
      setProfileNotice("Date of birth saved.");
    } catch (e) {
      setProfileNotice(e instanceof Error ? e.message : "Date of birth could not be saved.");
    } finally { setProfileBusy(false); }
  }

  async function openApplicationDocument(documentId: string) {
    const tab = window.open("about:blank", "_blank");
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session) throw new Error("Sign in again to open your document.");
      const response = await fetch("/api/documents/open?id=" + encodeURIComponent(documentId), { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Document could not be opened.");
      if (tab) tab.location.href = result.url;
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Document could not be opened.");
    }
  }

  async function submitStudentWork(event: React.FormEvent<HTMLFormElement>, recordId: string) {
    event.preventDefault(); setSubmissionBusy(true); setError(""); setSubmissionNotice("");
    try {
      const form = event.currentTarget;
      const values = new FormData(form);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      let submissionUrl = String(values.get("submissionUrl") || "").trim();
      const file = values.get("submissionFile");
      if (file instanceof File && file.size > 0) {
        const uploadForm = new FormData();
        uploadForm.set("file", file);
        uploadForm.set("recordId", recordId);
        const uploadResponse = await fetch("/api/student/records/upload", {
          method: "POST",
          headers: { Authorization: "Bearer " + session.access_token },
          body: uploadForm,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.path) throw new Error(uploadResult.error || "File upload failed.");
        submissionUrl = uploadResult.path;
      }
      const response = await fetch("/api/student/records", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ recordId, submissionUrl, submissionNote: values.get("submissionNote") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission could not be saved.");
      const refreshed = await fetch("/api/student/records", { headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store" });
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

  async function startPayment(applicationId: string) {
    setPaymentBusyId(applicationId);
    setPaymentNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const response = await fetch("/api/student/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ applicationId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment could not be started.");
      setPaymentNotice("Payment session created.");
    } catch (e) {
      setPaymentNotice(e instanceof Error ? e.message : "Payment could not be started.");
    } finally { setPaymentBusyId(""); }
  }

  function generateStudentDocument(kind: "application" | "acceptance" | "logbook" | "completion" | "marksheet" | "ipo") {
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
      : kind === "marksheet" ? (evaluated ? "EVALUATION RECORD FOUND" : "DRAFT — MARKS PENDING") : kind === "ipo" ? "SHIVORIX ORGANIZATION PROFILE" : "STUDENT COPY";
    const details: [string, unknown][] = [
      ["Student Name", profile.full_name], ["Email", profile.email], ["Mobile", profile.phone],
      ["University Registration Number", profile.registration_number], ["College Roll Number", profile.roll_number],
      ["College / Institution", profile.institution_name], ["Programme / Department", profile.course],
      ["Semester / Session", "Semester V · " + session],
      ["Internship Sector", internship?.title || sectorNames.join(", ")], ["Mode", internship?.mode],
      ["Internship Duration", internship?.duration_weeks ? `${internship.duration_weeks} weeks` : "As approved by college"],
      ["Required Hours / Credits", "120 Hours / 4 Credits"],
    ];
    const rows = (items: unknown[][]) => items.map(([label, val]) => `<tr><th>${esc(label)}</th><td>${value(val)}</td></tr>`).join("");
    const title = ({ application: "INTERNSHIP APPLICATION COPY", acceptance: "INTERNSHIP ACCEPTANCE LETTER", logbook: "SHIVORIX — INTERNSHIP LOG BOOK", completion: "INTERNSHIP COMPLETION CERTIFICATE", marksheet: "INTERNSHIP PERFORMANCE MARKSHEET", ipo: "INTERNSHIP PROVIDING ORGANIZATION (IPO)" } as const)[kind];
    let body = "";
    if (kind === "ipo") {
      body = `<h2>Organization Overview</h2><p>Founded in Muzaffarpur in 2025, SHIVORIX is a technology and AI-driven software development organization focused on creating innovative, reliable and scalable digital solutions for businesses and institutions. Its work spans custom AI applications, web portals, mobile software, enterprise platforms and digital growth services.</p><h2>Mission</h2><p>To help businesses and institutions solve practical challenges through thoughtful software, automation and digital solutions, while helping emerging talent build relevant skills through guided, industry-oriented learning.</p><h2>Vision</h2><p>To contribute to a digitally capable ecosystem where accessible technology, practical learning and innovation help organizations grow and students prepare for evolving career opportunities.</p><h2>Technology & Software Solutions</h2><p>Custom AI applications and automation tools; business ERP solutions; e-commerce systems; college and institute management systems; learning management systems (LMS); admission and HR portals; performance marketing engines; and tailored digital transformation platforms.</p><h2>Digital Marketing & Brand Growth</h2><p>Search Engine Optimization (SEO), performance campaigns, social media management, brand identity design and conversion-focused growth funnels that support clients’ digital presence.</p><h2>Student Mentorship & Career Development</h2><p>Career guidance, practical skill development, technical training, professional skill workshops and placement support are part of SHIVORIX’s stated commitment to preparing students for technical careers.</p><h2>Internship Learning Approach</h2><p>Industry-oriented internship drives and hands-on software development exposure are intended to connect academic learning with real-world technology needs. Internship activities, deliverables and supervision should follow the student’s approved internship plan and assigned mentor.</p><h2>What SHIVORIX Aims to Deliver</h2><p>Solutions tailored to client and institutional needs, with an emphasis on usability, reliability, scalability and practical outcomes.</p><h2>Official Organization Details</h2><table>${rows([["Founding Location","Muzaffarpur, Bihar, India"],["Website","www.shivorixai.com"],["Email","info.shivorix@gmail.com"],["Phone","+91 76540 86807"],["Udyam Registration No.","UDYAM-BR-23-0125256"]])}</table>`;
    } else if (kind === "application") {
      body = `<h2>1. Personal Details</h2><table>${rows([["Full Name", profile.full_name], ["Father's Name", profile.father_name], ["Mother's Name", profile.mother_name], ["Date of Birth", profile.date_of_birth], ["Gender", profile.gender], ["Mobile", profile.phone], ["Email", profile.email], ["Address", profile.address]])}</table><h2>2. Academic Details</h2><table>${rows([["University", "As recorded by college"], ["College / Institute", profile.institution_name], ["Course / Programme", profile.course], ["Department", profile.course], ["Semester", "V (Semester 5 portal)"], ["Academic Session", session], ["University Registration No.", profile.registration_number], ["College Roll No.", profile.roll_number]])}</table><h2>3. Internship Details</h2><table>${rows([["Internship Sector", internship?.title || sectorNames.join(", ")], ["Mode", internship?.mode], ["Internship Type", "Credit-based"], ["Required Hours", "120"], ["Credits", "4"], ["Preferred Start Date", "As recorded/approved by college"], ["Preferred End Date", "As recorded/approved by college"], ["Application Status", app?.status], ["Remarks", "As recorded in the portal"]])}</table><h2>4. Submitted Documents</h2><table><tr><th>Document / Record</th><th>Status</th></tr>${studentRecords.filter(item => item.record_type === "document").map(item => `<tr><td>${esc(item.title)}</td><td>${esc(item.status)}</td></tr>`).join("") || '<tr><td colspan="2">No document records available in portal.</td></tr>'}</table>`;
    } else if (kind === "acceptance") {
      body = `<p>To,</p><p><strong>${value(profile.full_name)}</strong><br/>${value(profile.institution_name)}</p><p>Dear Candidate,</p><p>We are pleased to provide this ${accepted ? "acceptance record" : "draft acceptance preview"} for the SHIVORIX internship programme. This document is not an official acceptance unless the application has been approved by the authorized institution/IPO.</p><table>${rows(details)}</table><p>The student is requested to follow the approved internship schedule, complete assigned learning activities, maintain required records, submit the internship report and complete the prescribed evaluation requirements.</p><p>Issued status: <strong>${esc(status)}</strong></p><div class="signature">Authorized Signatory<br/>SHIVORIX PRIVATE LIMITED</div>`;
    } else if (kind === "logbook") {
      body = `<p><strong>Student:</strong> ${value(profile.full_name)} &nbsp; <strong>College:</strong> ${value(profile.institution_name)}<br/><strong>Registration No.:</strong> ${value(profile.registration_number)} &nbsp; <strong>Roll No.:</strong> ${value(profile.roll_number)}<br/><strong>Internship:</strong> ${value(internship?.title || sectorNames.join(", "))} · Semester V</p><p class="notice">Total attendance entries: ${studentAttendance.length} · Total recorded hours: ${studentAttendance.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0)}.</p><table class="log"><tr><th>S.No.</th><th>Date</th><th>Activity / Work Done</th><th>Description / Notes</th><th>Hours</th><th>Status</th></tr>${studentAttendance.map((entry,index)=>`<tr><td>${index+1}</td><td>${value(new Date(entry.attendance_date+"T00:00:00").toLocaleDateString("en-IN"))}</td><td>Internship attendance</td><td>${value(entry.notes)}</td><td>${entry.hours ?? "Not recorded"}</td><td>${value(entry.status)}</td></tr>`).join("") || '<tr><td colspan="6">No attendance or logbook entries recorded yet.</td></tr>'}</table>`;
    } else if (kind === "completion") {
      body = `<div class="certificate"><p>This is to certify that</p><h1>${value(profile.full_name)}</h1><p>S/o ${value(profile.father_name)}, bearing University Registration No. ${value(profile.registration_number)}, is a student of ${value(profile.institution_name)}, enrolled in ${value(profile.course)} for Academic Session ${value(session)}, and ${completed ? "has a published completion record for" : "has not yet been verified as having completed"} the internship with Shivorix Private Limited.</p><table>${rows([["Internship Duration", internship?.duration_weeks ? `${internship.duration_weeks} weeks` : "As approved by college"], ["Total Hours Completed", completed ? "As recorded in completion approval" : "Pending verification"], ["Internship Domain", internship?.title || sectorNames.join(", ")], ["Mode of Internship", internship?.mode], ["College / Institution", profile.institution_name], ["University", "As recorded by college"]])}</table><p>During the internship, the student is expected to demonstrate sincere participation, good learning attitude, discipline and a willingness to learn through assigned tasks and practical exposure.</p><p class="notice">${completed ? "This preview is based on a published completion record. Authorized signature and final verification remain required." : "DRAFT — NOT ISSUED. A completion certificate must not be treated as official until the authorized completion record is approved."}</p><div class="signature">Authorized Signatory<br/>SHIVORIX PRIVATE LIMITED</div></div>`;
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
           ) : activeSection === "Portal Help" ? (
             <>
               <div className="portal-page-title"><span className="portal-page-icon"><CircleHelp size={22} /></span><div><div className="portal-eyebrow">STUDENT QUICK START</div><h1>How to Use the Portal</h1><p>Follow this checklist to complete your SHIVORIX internship journey. Use the official Internship Guidelines section for university rules, duration, evaluation and report requirements.</p></div></div>
               <div className="portal-stat-grid">
                 <article className="portal-stat-card"><span className="portal-stat-label">Step 1</span><strong>Review profile</strong><span className="portal-stat-note">Confirm your personal and college details</span><button className="portal-sector-link" onClick={() => setActiveSection("My Profile")}>Open profile <ArrowRight size={15} /></button></article>
                 <article className="portal-stat-card"><span className="portal-stat-label">Step 2</span><strong>Read guidelines</strong><span className="portal-stat-note">Check eligibility, hours, rules and deadlines</span><button className="portal-sector-link" onClick={() => setActiveSection("Guidelines")}>Read guidelines <ArrowRight size={15} /></button></article>
                 <article className="portal-stat-card"><span className="portal-stat-label">Step 3</span><strong>Find an internship</strong><span className="portal-stat-note">Review opportunities before applying</span><Link href="/internships" className="portal-sector-link">Browse internships <ArrowRight size={15} /></Link></article>
               </div>
               <section className="portal-panel"><div className="portal-panel-heading"><div><h3>Application steps</h3><p>Complete these in order</p></div></div><ol className="portal-guideline-list"><li><strong>Verify your email and sign in.</strong> Use your own active email and keep your login details private.</li><li><strong>Check your profile.</strong> Make sure your name, course, semester, college, roll number and registration number are correct.</li><li><strong>Explore available internships.</strong> Read the role, sector, mode, location and duration details before choosing an opportunity.</li><li><strong>Apply carefully.</strong> Complete every required field, choose realistic preferred dates and upload the required genuine, readable documents in the file formats and size limits shown on the application form.</li><li><strong>Read declarations before submitting.</strong> Submit only after checking the information and understanding the applicable college approval process.</li><li><strong>Track the result.</strong> Open My Application to check application status, Nodal Officer review, remarks and any next action. Submission does not itself mean approval.</li></ol></section>
               <section className="portal-panel"><div className="portal-panel-heading"><div><h3>After your internship is approved and activated</h3><p>Use the student panel throughout the internship</p></div></div><ul className="portal-guideline-list"><li><strong>Online Training:</strong> open assigned learning resources and complete any required modules.</li><li><strong>Assignments / Activities / Tests:</strong> check tasks and due dates, then submit work using the available submission controls.</li><li><strong>Attendance:</strong> review your attendance records and use check-in/check-out controls only when enabled for your active internship.</li><li><strong>Project & Report:</strong> follow your faculty mentor's instructions, maintain your logbook and prepare the report in the required format.</li><li><strong>Documents / Certificate:</strong> review available records; official approval, marks and completion status must come from authorized staff.</li><li><strong>Notifications:</strong> check regularly for updates from your institution or portal team.</li></ul></section>
               <div className="portal-info-note"><ShieldCheck size={18}/><div><strong>Keep your information safe</strong><p>Never share your password or OTP. Upload only your own genuine documents. Follow your college's instructions on any payment; do not pay a provider based only on an unsolicited message.</p></div></div>
             </>
) : activeSection === "My Profile" ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><UserRound size={22} /></span><div><div className="portal-eyebrow">YOUR INFORMATION</div><h1>My Profile</h1><p>Review your personal and academic details saved with SHIVORIX.</p></div></div><section className="portal-panel portal-details-panel"><div className="portal-panel-heading"><div><h3>Student details</h3><p>Information from your registration</p></div><span className="portal-profile-badge"><ShieldCheck size={14} /> Private profile</span></div>{profileNotice && <div className="portal-info-note" role="status"><CheckCircle2 size={18}/><div><strong>Profile update</strong><p>{profileNotice}</p></div></div>}<form className="portal-submission-form" onSubmit={saveDateOfBirth}><label>Date of Birth (editable)<input name="dateOfBirth" type="date" required value={dobDraft} onChange={event=>setDobDraft(event.target.value)} /></label><button type="submit" disabled={profileBusy}>{profileBusy ? "Saving…" : "Save date of birth"}</button></form><div className="portal-details-grid">{profileFields.map(({ label, key }) => <div className="portal-detail-field" key={key}><small>{label}</small><strong>{profile?.[key] || "Not provided"}</strong></div>)}</div><div className="portal-details-footer"><ShieldCheck size={16} /><span>Your details are shown only inside your signed-in student session.</span></div></section><section className="portal-panel portal-sectors-panel"><div className="portal-panel-heading"><div><h3>Selected internship sectors</h3><p>Your current areas of interest</p></div></div>{sectorNames.length ? <div className="portal-sector-list">{sectorNames.map((name) => <span key={name}><CheckCircle2 size={14} />{name}</span>)}</div> : <p className="portal-muted">No internship sectors are linked to your profile yet.</p>}</section></>
          ) : ["Assignments","Assessments","Evaluation","Documents","Notifications","Attendance","My Application","Internship Details","Online Training","Activities","My Tests","Project & Report","Final Test","Certificate"].includes(activeSection) ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><SelectedIcon size={22} /></span><div><div className="portal-eyebrow">YOUR LIVE RECORDS</div><h1>{activeSection}</h1><p>{selectedItem?.description || "Your student workspace."}</p></div></div>
              {submissionNotice && <div className="portal-info-note"><CheckCircle2 size={18}/><div><strong>Submission saved</strong><p>{submissionNotice}</p></div></div>}{error && <div className="portal-info-note"><CircleHelp size={18}/><div><strong>Action needs attention</strong><p>{error}</p></div></div>}{recordsNotice && <div className="portal-info-note"><Bell size={18}/><div><strong>Institution setup</strong><p>{recordsNotice}</p></div></div>}
              {activeSection === "My Application" || activeSection === "Internship Details" ? <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><BriefcaseBusiness size={17}/></span><div><h3>{activeSection}</h3><p>Your submitted internship applications and current statuses</p></div></div><Link href="/internships" className="portal-record-link">Explore internships ↗</Link></div>{paymentNotice && <div className="portal-info-note" role="status"><Bell size={18}/><div><strong>Payment update</strong><p>{paymentNotice}</p></div></div>}{studentApplications.length ? <div className="portal-record-list">{studentApplications.map(item=>{const internship=Array.isArray(item.internships)?item.internships[0]:item.internships;const payment=Array.isArray(item.internship_payments)?item.internship_payments[0]:null;const applicationStatus=(item.status||"submitted").toLowerCase();const nodalApproved=["approved","accepted","active","completed"].includes(applicationStatus)||["approved","accepted"].includes((item.nodal_review_status||"").toLowerCase());const paymentDone=payment?.status==="paid";const flowIndex=applicationStatus==="completed"?4:applicationStatus==="active"?3:paymentDone&&nodalApproved?2:nodalApproved?1:0;const flowSteps=["Submitted","Nodal Approved","Payment","Internship Start","Completed"];return <article className="portal-record-item" key={item.id}><div><strong>{internship?.title || `${item.sectors?.name || "Internship"} application`}</strong><p>{internship?.description || "No additional internship details provided."}</p><small>Application No.: {item.application_number || item.id} · Applied: {new Date(item.applied_at).toLocaleDateString()}</small><small>{item.sectors?.name || "Sector not set"} · {item.mode || internship?.mode || "Mode not set"} · {item.requested_hours ?? 120} hours · {item.requested_credits ?? 4} credits</small><small>Preferred dates: {item.preferred_start_date || "Not set"} → {item.preferred_end_date || "Not set"}</small><small>Nodal review: {item.nodal_review_status || "pending"}{item.review_remarks ? " · Remarks: "+item.review_remarks : ""}</small><section aria-label="Internship application progress" style={{marginTop:16,padding:"16px 14px",border:"1px solid #e7e1f5",borderRadius:14,background:"linear-gradient(135deg,#fbf9ff,#fffaf5)",width:"100%",boxSizing:"border-box"}}><strong style={{display:"block",fontSize:14,marginBottom:14,color:"#30234b"}}>Your internship journey</strong><div style={{display:"flex",alignItems:"flex-start",gap:0,overflowX:"auto",paddingBottom:6}}>{flowSteps.map((step,index)=><div key={step} style={{display:"flex",alignItems:"flex-start",flex:"1 0 112px",minWidth:112}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:7,width:"100%"}}><span style={{display:"grid",placeItems:"center",width:30,height:30,borderRadius:"50%",fontWeight:700,fontSize:13,color:index<=flowIndex?"#fff":"#746b83",background:index<flowIndex?"#26845b":index===flowIndex?"#6d42c1":"#eeeaf4",border:index===flowIndex?"3px solid #e4d7ff":"2px solid transparent",boxSizing:"border-box"}}>{index<flowIndex?"✓":index+1}</span><span style={{fontSize:12,fontWeight:index===flowIndex?700:600,textAlign:"center",color:index<=flowIndex?"#34204f":"#81788f",lineHeight:1.3}}>{step}</span><span style={{fontSize:10,color:index<flowIndex?"#26845b":index===flowIndex?"#6d42c1":"#938a9e"}}>{index<flowIndex?"Done":index===flowIndex?"Current step":"Upcoming"}</span></div>{index<flowSteps.length-1&&<span aria-hidden="true" style={{height:2,flex:"0 0 10px",marginTop:14,background:index<flowIndex?"#26845b":"#ddd5e9"}}/>}</div>)}</div><p style={{fontSize:12,color:"#675d75",margin:"8px 0 0",lineHeight:1.5}}>The next step updates when your Nodal Officer approves the application and payment or internship status is recorded.</p></section><div className="portal-application-documents"><small>Application documents:</small>{item.portal_documents?.length ? item.portal_documents.map(doc=><button type="button" className="portal-record-link" key={doc.id} onClick={()=>void openApplicationDocument(doc.id)}>{doc.document_type} · {doc.status} ↗</button>) : <small>No documents linked</small>}</div>{internship?.location ? <small>Location: {internship.location}</small> : null}{internship?.duration_weeks ? <small>Duration: {internship.duration_weeks} weeks</small> : null}{internship?.fee_amount != null ? <small>Fee: ₹{Number(internship.fee_amount).toLocaleString("en-IN")}</small> : null}{item.status === "accepted" && <p>{payment?.status === "paid" ? "Payment verified; waiting for internship activation." : "Approved by the Nodal Officer. Payment is the next step."}</p>}{item.status === "active" && <p>Payment verified. Your internship is active.</p>}{item.status === "accepted" && payment?.status !== "paid" && <button type="button" className="portal-record-link" disabled={paymentBusyId===item.id} onClick={()=>void startPayment(item.id)}>{paymentBusyId===item.id ? "Checking payment setup…" : "Continue to payment →"}</button>}</div><span className={`portal-record-status ${item.status}`}>{item.status.replace("_"," ")}</span></article>})}</div> : <div className="portal-empty-inline"><span><BriefcaseBusiness size={20}/></span><div><strong>No applications yet</strong><p>Explore internships and submit an application to track it here.</p><Link href="/internships" className="portal-record-link">Browse internships ↗</Link></div></div>}</section> : activeSection === "Attendance" ? <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><CalendarCheck size={17}/></span><div><h3>Attendance history</h3><p>Attendance is automatically recorded on eligible portal access, with check-out closing the day.</p></div></div></div>{attendanceNotice && <div className="portal-info-note" role="status"><CalendarCheck size={18}/><div><strong>Attendance update</strong><p>{attendanceNotice}</p></div></div>}{studentAttendance.length ? <div className="portal-record-list">{studentAttendance.map(item=><article className="portal-record-item" key={item.id}><div><strong>{new Date(item.attendance_date+"T00:00:00").toLocaleDateString()}</strong><p>{item.notes || "No additional notes"}</p><small>Check-in: {item.check_in_at ? new Date(item.check_in_at).toLocaleTimeString() : "Not recorded"} · Check-out: {item.check_out_at ? new Date(item.check_out_at).toLocaleTimeString() : "Open"} · Credited hours: {item.hours ?? 0}</small>{item.check_in_at && !item.check_out_at && <button type="button" className="portal-record-link" onClick={()=>void checkOutAttendance()} disabled={attendanceBusy}>{attendanceBusy ? "Checking out…" : "Check Out"}</button>}</div><span className={"portal-record-status " + item.status}>{item.status}</span></article>)}</div> : <div className="portal-empty-inline"><span><CalendarCheck size={20}/></span><div><strong>No attendance records yet</strong><p>Attendance is available after your internship is activated and during the permitted attendance window.</p></div></div>}</section> : (() => {
                const recordType = activeSection === "Assignments" ? "assignment" : activeSection === "Project & Report" ? "project" : activeSection === "Documents" ? "document" : activeSection === "Notifications" ? "notification" : activeSection === "Online Training" ? "training" : activeSection === "Activities" ? "activity" : ["My Tests","Final Test"].includes(activeSection) ? "test" : activeSection === "Certificate" ? "certificate" : "evaluation";
                const adminPublishedTypes = ["training", "evaluation", "document", "activity", "test", "certificate"];
  const visible = studentRecords.filter(item => item.record_type === recordType && (!adminPublishedTypes.includes(recordType) || item.status === "published"));
                return <section className="portal-panel"><div className="portal-panel-heading"><div><span className="portal-panel-icon"><SelectedIcon size={17}/></span><div><h3>{activeSection}</h3><p>Records shared by your assigned institution</p></div></div></div>{activeSection === "Documents" && <div className="portal-generated-docs"><div className="portal-generated-docs-intro"><strong>Your student-specific documents</strong><p>Generate a print-ready document using your saved profile, application, attendance and institution records. Open the document, then choose Print → Save as PDF.</p></div><div className="portal-generated-docs-grid">{[{kind:"application" as const,title:"Internship Application Copy",desc:"Personal, academic, internship and submitted-document summary.",label:"Generate application"},{kind:"acceptance" as const,title:"Internship Acceptance Letter",desc:"Acceptance preview based on your latest application status.",label:"Generate acceptance"},{kind:"logbook" as const,title:"Internship Log Book",desc:"Attendance dates and notes currently recorded by your institution.",label:"Generate log book"},{kind:"completion" as const,title:"Completion Certificate",desc:"Draft until an authorized completion record is published.",label:"Generate certificate"},{kind:"marksheet" as const,title:"Performance Marksheet",desc:"Evaluation layout; marks stay pending until entered by an authorized evaluator.",label:"Generate marksheet"}, {kind:"ipo" as const,title:"SHIVORIX IPO Profile",desc:"Organization profile text from your supplied document, kept the same for every student.",label:"Generate IPO profile"}].map(doc=><article className="portal-generated-doc-card" key={doc.kind}><span className="portal-generated-doc-icon"><FileText size={20}/></span><div><strong>{doc.title}</strong><p>{doc.desc}</p></div><button type="button" onClick={()=>generateStudentDocument(doc.kind)}>{doc.label} ↗</button></article>)}</div><p className="portal-generated-docs-note">Important: this print-ready layout follows SHIVORIX purple/orange branding and the supplied document structure. Fields not stored in the portal show “Not recorded”; official acceptance, completion and marks must not be assumed.</p></div>}{visible.length ? <div className="portal-record-list">{visible.map(item=>{const submission=studentSubmissions.find(entry=>entry.record_id===item.id);const canSubmit=["assignment","project","activity","test","evaluation"].includes(item.record_type);return <article className="portal-record-item" key={item.id}><div><strong>{item.title}</strong><p>{item.description || "No additional details provided."}</p><small>{item.due_date ? "Due: "+new Date(item.due_date+"T00:00:00").toLocaleDateString() : "Added: "+new Date(item.created_at).toLocaleDateString()}</small>{["document","certificate","training","test","assignment","project","activity","evaluation"].includes(item.record_type)&&(item.resource_file_url || item.resource_url?.startsWith("http"))&&<a className="portal-record-link" href={item.resource_file_url || item.resource_url || "#"} target="_blank" rel="noreferrer">{item.resource_file_url ? "Open attachment ↗" : "Open resource ↗"}</a>}{canSubmit&&<><div className="portal-submission-current">{submission ? <>Your submission: <strong>{submission.status.replace("_"," ")}</strong>{submission.feedback&&<p>Feedback: {submission.feedback}</p>}</> : "Not submitted yet"}</div><form className="portal-submission-form" onSubmit={event=>submitStudentWork(event,item.id)}><label>Attach work (PDF, JPG, PNG, WEBP — max 10 MB)<input name="submissionFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={item.record_type === "assignment" && Boolean(submission)} /></label><label>External link (optional)<input name="submissionUrl" type="url" disabled={item.record_type === "assignment" && Boolean(submission)} placeholder="Paste a link only if your work is hosted online" /></label><label>Notes / answer<textarea name="submissionNote" rows={2} maxLength={5000} disabled={item.record_type === "assignment" && Boolean(submission)} placeholder="Write your answer or explain the attached work" /></label><button type="submit" disabled={submissionBusy || (item.record_type === "assignment" && Boolean(submission))}>{submissionBusy ? "Submitting…" : submission && item.record_type === "assignment" ? "Already submitted" : submission ? "Update submission" : "Submit work"}</button></form></>}</div><span className={`portal-record-status ${submission?.status || item.status}`}>{(submission?.status || item.status).replace("_"," ")}</span></article>})}</div> : <div className="portal-empty-inline"><span><SelectedIcon size={20}/></span><div><strong>No {activeSection.toLowerCase()} yet</strong><p>New records from your institution will appear here when available.</p></div></div>}</section>;
              })()}</>
          ) : activeSection === "IPO" ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><FileText size={22} /></span><div><div className="portal-eyebrow">SHIVORIX ORGANIZATION PROFILE</div><h1>IPO — Internship Providing Organization</h1><p>Official SHIVORIX organization profile.</p></div></div><section className="portal-panel"><div className="portal-generated-docs"><div className="portal-generated-docs-intro"><strong>SHIVORIX</strong><p>Growth · Vision · Success</p><p>Founded in Muzaffarpur in 2025, SHIVORIX is a technology and AI-driven software development organization focused on creating innovative, reliable and scalable digital solutions for businesses and institutions. Its work spans custom AI applications, web portals, mobile software, enterprise platforms and digital growth services.</p></div><div className="portal-record-list"><article className="portal-record-item"><div><strong>Mission</strong><p>To help businesses and institutions solve practical challenges through thoughtful software, automation and digital solutions, while helping emerging talent build relevant skills through guided, industry-oriented learning.</p></div></article><article className="portal-record-item"><div><strong>Vision</strong><p>To contribute to a digitally capable ecosystem where accessible technology, practical learning and innovation help organizations grow and students prepare for evolving career opportunities.</p></div></article><article className="portal-record-item"><div><strong>Technology & Software Solutions</strong><p>Custom AI applications and automation tools; business ERP solutions; e-commerce systems; college and institute management systems; learning management systems (LMS); admission and HR portals; and tailored digital transformation platforms.</p></div></article><article className="portal-record-item"><div><strong>Digital Marketing & Brand Growth</strong><p>Search Engine Optimization (SEO), performance campaigns, social media management, brand identity design and conversion-focused growth funnels that support clients’ digital presence.</p></div></article><article className="portal-record-item"><div><strong>Student Mentorship & Career Development</strong><p>Career guidance, practical skill development, technical training, professional skill workshops and placement support are part of SHIVORIX’s stated commitment to preparing students for technical careers.</p></div></article><article className="portal-record-item"><div><strong>Internship Learning Approach</strong><p>Industry-oriented internship drives and hands-on software development exposure are intended to connect academic learning with real-world technology needs. Internship activities, deliverables and supervision should follow the student’s approved internship plan and assigned mentor.</p></div></article><article className="portal-record-item"><div><strong>What SHIVORIX Aims to Deliver</strong><p>Solutions tailored to client and institutional needs, with an emphasis on usability, reliability, scalability and practical outcomes.</p></div></article></div><div className="portal-generated-docs-intro"><strong>Official Organization Details</strong><p>Location of founding: Muzaffarpur, Bihar, India</p><p>Website: www.shivorixai.com</p><p>Email: info.shivorix@gmail.com</p><p>Phone: +91 76540 86807</p><p>Udyam Registration No.: UDYAM-BR-23-0125256</p></div><div className="portal-generated-docs-grid"><article className="portal-generated-doc-card"><span className="portal-generated-doc-icon"><FileText size={20}/></span><div><strong>Print-ready IPO profile</strong><p>Open the profile document, then choose Print → Save as PDF.</p></div><button type="button" onClick={() => generateStudentDocument("ipo")}>Open printable profile ↗</button></article></div></div></section></>
          ) : activeSection === "Apply for Internship" ? (
            <><div className="portal-page-title"><span className="portal-page-icon"><BriefcaseBusiness size={22} /></span><div><div className="portal-eyebrow">STUDENT APPLICATION</div><h1>Apply for Internship</h1><p>Choose an active internship sector, complete the application form, upload the required documents, and submit it for college Nodal Officer review.</p></div></div><section className="portal-panel portal-apply-embed"><div className="portal-panel-heading"><div><h3>Internship application form</h3><p>Fill in your personal, academic and internship details below.</p></div><span className="portal-profile-badge"><ShieldCheck size={14} /> Secure student session</span></div><iframe title="Internship application form" src="/internships?panel=student" style={{ width: "100%", height: "2300px", border: 0, borderRadius: "12px", background: "#fff" }} /></section></>
          ) : (
            <><div className="portal-page-title"><span className="portal-page-icon"><SelectedIcon size={22} /></span><div><div className="portal-eyebrow">SHIVORIX STUDENT WORKSPACE</div><h1>{activeSection}</h1><p>{selectedItem?.description || "Your student workspace."}</p></div></div><section className="portal-feature-card"><div className="portal-feature-visual"><div className="portal-feature-glow" /><SelectedIcon size={48} strokeWidth={1.35} /></div><div className="portal-feature-copy"><span className="portal-feature-label">YOUR NEXT STEP</span><h2>{activeSection === "Apply for Internship" ? "Find your opportunity." : activeSection === "My Application" ? "Your application, clearly tracked." : activeSection === "Certificate" ? "Your achievements belong here." : "Your progress, in one place."}</h2><p>{selectedItem?.description}. This section is part of your student portal navigation. Its live records and actions will appear here as the corresponding portal feature is connected.</p>{activeSection === "Apply for Internship" ? <Link href="/internships" className="portal-primary-btn">Explore internships <ArrowRight size={16} /></Link> : activeSection === "My Profile" ? <button className="portal-primary-btn" onClick={() => setActiveSection("My Profile")}>View profile <ArrowRight size={16} /></button> : <div className="portal-coming-soon"><Clock3 size={16} /><span>Section ready for feature integration</span></div>}</div></section><div className="portal-info-note"><MessageSquareText size={18} /><div><strong>Everything in its place</strong><p>Use the left navigation to move between your profile, application, learning, assessments, attendance, submissions, and documents.</p></div></div></>
          )}
          <footer className="portal-footer"><span>© 2026 SHIVORIX. Built for your next step.</span><span><ShieldCheck size={14} /> Student workspace</span></footer>
        </div>
      </section>
    </main>
  );
}