import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const collegeName = "DEMO ONLY — SHIVORIX TEST COLLEGE";
const nodalEmail = "demo.nodal@demo.shivorixai.com";
const studentEmail = "demo.student@demo.shivorixai.com";
function makePassword() { return randomBytes(18).toString("base64url") + "A9!"; }

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Server is missing its Supabase service-role configuration." }, { status: 503 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign in as an administrator first." }, { status: 401 });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Admin session expired. Sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") return NextResponse.json({ error: "Only an administrator can create demo accounts." }, { status: 403 });

    async function ensureUser(email: string, name: string, role: "student" | "nodal_officer", metadata: Record<string, string>) {
      const { data: listed, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      let user = listed.users.find((entry) => entry.email?.toLowerCase() === email);
      const password = makePassword();
      const userMetadata = { role, full_name: name, ...metadata, demo_account: true };
      if (!user) {
        const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: userMetadata });
        if (error) throw error;
        user = data.user;
      } else {
        const { data, error } = await client.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: userMetadata });
        if (error) throw error;
        user = data.user;
      }
      if (!user) throw new Error("Could not create demo account.");
      return { user, password };
    }

    const nodalResult = await ensureUser(nodalEmail, "Demo Nodal Officer", "nodal_officer", { phone: "9000000001" });
    const studentResult = await ensureUser(studentEmail, "Demo Student", "student", {
      phone: "9000000002", roll_number: "123456789012", registration_number: "123456789012345",
      institution_name: collegeName, course: "BCA", academic_year: "2026-2027", current_semester: "Semester V",
      father_name: "Demo Parent", mother_name: "Demo Parent", gender: "Prefer not to say", address: "Sample address only",
    });

    let { data: college, error: collegeError } = await client.from("colleges").select("id").eq("name", collegeName).maybeSingle();
    if (collegeError) throw collegeError;
    if (!college) {
      const result = await client.from("colleges").insert({ name: collegeName, university_name: "Demo University (not real)", city: "Muzaffarpur", state: "Bihar", nodal_officer_id: nodalResult.user.id }).select("id").single();
      if (result.error) throw result.error;
      college = result.data;
    } else {
      const result = await client.from("colleges").update({ nodal_officer_id: nodalResult.user.id, university_name: "Demo University (not real)", city: "Muzaffarpur", state: "Bihar" }).eq("id", college.id);
      if (result.error) throw result.error;
    }

    const profiles = [
      { id: nodalResult.user.id, role: "nodal_officer", full_name: "Demo Nodal Officer", email: nodalEmail, phone: "9000000001", college_id: college.id, institution_name: collegeName },
      { id: studentResult.user.id, role: "student", full_name: "Demo Student", email: studentEmail, phone: "9000000002", roll_number: "123456789012", registration_number: "123456789012345", college_id: college.id, institution_name: collegeName, course: "BCA", academic_year: "2026-2027", current_semester: "Semester V", father_name: "Demo Parent", mother_name: "Demo Parent", gender: "Prefer not to say", address: "Sample address only" },
    ];
    for (const item of profiles) {
      const result = await client.from("profiles").upsert(item, { onConflict: "id" });
      if (result.error) throw result.error;
    }

    let { data: internship, error: internshipError } = await client.from("internships").select("id").eq("title", "DEMO — SHIVORIX Semester V Internship").maybeSingle();
    if (internshipError) throw internshipError;
    if (!internship) {
      const result = await client.from("internships").insert({ title: "DEMO — SHIVORIX Semester V Internship", description: "Sample-only internship for portal testing; not a real placement.", mode: "remote", location: "Online demo", duration_weeks: 4, is_active: true, published_at: new Date().toISOString(), created_by: authData.user.id }).select("id").single();
      if (result.error) throw result.error;
      internship = result.data;
    }
    const { data: application, error: applicationLookupError } = await client.from("internship_applications").select("id").eq("student_id", studentResult.user.id).eq("internship_id", internship.id).maybeSingle();
    if (applicationLookupError) throw applicationLookupError;
    if (!application) {
      const result = await client.from("internship_applications").insert({ student_id: studentResult.user.id, internship_id: internship.id, status: "submitted", cover_note: "DEMO DATA ONLY — sample application" });
      if (result.error) throw result.error;
    }

    const { data: record, error: recordLookupError } = await client.from("nodal_portal_records").select("id").eq("institution_id", college.id).eq("title", "DEMO — Week 1 Reflection").maybeSingle();
    if (recordLookupError) throw recordLookupError;
    if (!record) {
      const result = await client.from("nodal_portal_records").insert({ institution_id: college.id, student_id: studentResult.user.id, created_by: nodalResult.user.id, record_type: "assignment", title: "DEMO — Week 1 Reflection", description: "Submit a short reflection on what you learned this week. Sample data only.", status: "open" });
      if (result.error) throw result.error;
    }

    return NextResponse.json({
      success: true,
      warning: "These are demo-only accounts. The generated passwords are shown once in this response. Do not use them for real information.",
      college: collegeName,
      nodal: { email: nodalEmail, password: nodalResult.password, loginUrl: "/staff/login", dashboardUrl: "/staff/nodal" },
      student: { email: studentEmail, password: studentResult.password, rollNumber: "123456789012", registrationNumber: "123456789012345", loginUrl: "/login", dashboardUrl: "/student/dashboard" },
    });
  } catch (error) {
    console.error("Demo account setup failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare demo accounts." }, { status: 500 });
  }
}
