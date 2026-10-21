import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEMO = {
  college: "DEMO ONLY — SHIVORIX TEST COLLEGE",
  nodal: { email: "demo.nodal@demo.shivorixai.com", password: "DemoNodal2026!", name: "Demo Nodal Officer", phone: "9000000001" },
  student: { email: "demo.student@demo.shivorixai.com", password: "DemoStudent2026!", name: "Demo Student", phone: "9000000002", roll: "123456789012", registration: "123456789012345" },
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Demo setup needs the server service-role key.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureUser(client: ReturnType<typeof serviceClient>, item: {email:string;password:string;name:string;phone:string}, role: "student" | "nodal_officer", extra: Record<string,string> = {}) {
  const { data: listed, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = listed.users.find((u) => u.email?.toLowerCase() === item.email);
  const userMetadata = { role, full_name: item.name, phone: item.phone, ...extra, demo_account: true };
  if (!user) {
    const { data, error } = await client.auth.admin.createUser({ email: item.email, password: item.password, email_confirm: true, user_metadata: userMetadata });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await client.auth.admin.updateUserById(user.id, { password: item.password, email_confirm: true, user_metadata: userMetadata });
    if (error) throw error;
    user = data.user;
  }
  if (!user) throw new Error("Unable to create demo account.");
  return user;
}

export async function POST() {
  try {
    const client = serviceClient();
    const nodal = await ensureUser(client, DEMO.nodal, "nodal_officer");
    const student = await ensureUser(client, DEMO.student, "student", {
      roll_number: DEMO.student.roll, registration_number: DEMO.student.registration,
      institution_name: DEMO.college, course: "BCA", academic_year: "2026–2027", current_semester: "Semester V",
      father_name: "Demo Parent", mother_name: "Demo Parent", gender: "Prefer not to say",
      address: "Demo address — sample data only",
    });

    let { data: college, error: collegeError } = await client.from("colleges").select("id").eq("name", DEMO.college).maybeSingle();
    if (collegeError) throw collegeError;
    if (!college) {
      const created = await client.from("colleges").insert({ name: DEMO.college, university_name: "Demo University (not real)", city: "Muzaffarpur", state: "Bihar", nodal_officer_id: nodal.id }).select("id").single();
      if (created.error) throw created.error;
      college = created.data;
    } else {
      const updated = await client.from("colleges").update({ nodal_officer_id: nodal.id, university_name: "Demo University (not real)", city: "Muzaffarpur", state: "Bihar" }).eq("id", college.id);
      if (updated.error) throw updated.error;
    }

    const profileRows = [
      { id: nodal.id, role: "nodal_officer", full_name: DEMO.nodal.name, email: DEMO.nodal.email, phone: DEMO.nodal.phone, college_id: college.id, institution_name: DEMO.college },
      { id: student.id, role: "student", full_name: DEMO.student.name, email: DEMO.student.email, phone: DEMO.student.phone, roll_number: DEMO.student.roll, registration_number: DEMO.student.registration, college_id: college.id, institution_name: DEMO.college, course: "BCA", academic_year: "2026–2027", current_semester: "Semester V", father_name: "Demo Parent", mother_name: "Demo Parent", gender: "Prefer not to say", address: "Demo address — sample data only" },
    ];
    for (const profile of profileRows) {
      const { error } = await client.from("profiles").upsert(profile, { onConflict: "id" });
      if (error) throw error;
    }

    const { data: internship, error: internshipError } = await client.from("internships").select("id").eq("title", "DEMO — SHIVORIX Semester V Internship").maybeSingle();
    if (internshipError) throw internshipError;
    let internshipId = internship?.id;
    if (!internshipId) {
      const created = await client.from("internships").insert({ title: "DEMO — SHIVORIX Semester V Internship", description: "Demo internship for testing the student application and progress workflow. Not a real placement.", mode: "remote", location: "Online demo", duration_weeks: 4, is_active: true, published_at: new Date().toISOString(), created_by: nodal.id }).select("id").single();
      if (created.error) throw created.error;
      internshipId = created.data.id;
    }
    const { error: applicationError } = await client.from("internship_applications").upsert({ student_id: student.id, internship_id: internshipId, status: "under_review", cover_note: "Demo application — sample data only" }, { onConflict: "student_id,internship_id" });
    if (applicationError && !String(applicationError.message).includes("no unique")) {
      // Avoid failing setup if this schema uses a non-composite unique constraint.
      const existing = await client.from("internship_applications").select("id").eq("student_id", student.id).eq("internship_id", internshipId).maybeSingle();
      if (!existing.data) {
        const inserted = await client.from("internship_applications").insert({ student_id: student.id, internship_id: internshipId, status: "under_review", cover_note: "Demo application — sample data only" });
        if (inserted.error) throw inserted.error;
      }
    }

    const { data: record, error: recordError } = await client.from("nodal_portal_records").select("id").eq("institution_id", college.id).eq("title", "DEMO — Week 1 Reflection").maybeSingle();
    if (recordError) throw recordError;
    if (!record) {
      const { error } = await client.from("nodal_portal_records").insert({ institution_id: college.id, student_id: student.id, created_by: nodal.id, record_type: "assignment", title: "DEMO — Week 1 Reflection", description: "Write a short reflection on what you learned this week. Demo data only.", status: "active" });
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      warning: "These are public demo credentials. Anyone can sign into and change the demo accounts. Never use them for real student data.",
      college: DEMO.college,
      nodal: { email: DEMO.nodal.email, password: DEMO.nodal.password, loginUrl: "/staff/login" },
      student: { email: DEMO.student.email, password: DEMO.student.password, rollNumber: DEMO.student.roll, registrationNumber: DEMO.student.registration, loginUrl: "/login" },
      nodalPanelUrl: "/staff/nodal", studentDashboardUrl: "/student/dashboard",
    });
  } catch (error) {
    console.error("Demo setup failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare demo accounts." }, { status: 500 });
  }
}
