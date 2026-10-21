import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Nodal portal server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireNodal(request: Request, client: ReturnType<typeof serviceClient>) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("id,role,full_name,email,college_id,institution_name,course,created_at")
    .eq("id", data.user.id).maybeSingle();
  if (profileError || profile?.role !== "nodal_officer") return null;
  return { user: data.user, profile };
}

export async function GET(request: Request) {
  try {
    const client = serviceClient();
    const auth = await requireNodal(request, client);
    if (!auth) return NextResponse.json({ error: "Nodal Officer access required." }, { status: 403 });

    const { data: institutions, error: institutionError } = await client.from("colleges")
      .select("id,name,university_name,city,state,nodal_officer_id")
      .eq("nodal_officer_id", auth.user.id).order("name");
    if (institutionError) throw institutionError;

    const institutionIds = (institutions ?? []).map((college) => college.id);
    const { data: students, error: studentsError } = institutionIds.length
      ? await client.from("profiles")
          .select("id,role,full_name,email,phone,college_id,institution_name,course,current_semester,created_at")
          .eq("role", "student").in("college_id", institutionIds).order("created_at", { ascending: false }).limit(500)
      : { data: [], error: null };
    if (studentsError) throw studentsError;

    const studentIds = (students ?? []).map((student) => student.id);
    const { data: applications, error: applicationsError } = studentIds.length
      ? await client.from("internship_applications")
          .select("id,student_id,internship_id,status,applied_at,updated_at,profiles(full_name,email),internships(title)")
          .in("student_id", studentIds).order("applied_at", { ascending: false }).limit(500)
      : { data: [], error: null };
    if (applicationsError) throw applicationsError;

    const { data: attendance, error: attendanceError } = institutionIds.length
      ? await client.from("internship_attendance")
          .select("id,student_id,institution_id,attendance_date,status,notes,updated_at,profiles(full_name,email)")
          .in("institution_id", institutionIds).order("attendance_date", { ascending: false }).limit(500)
      : { data: [], error: null };
    if (attendanceError) throw attendanceError;

    return NextResponse.json({
      profile: { full_name: auth.profile.full_name, email: auth.profile.email },
      institutions: institutions ?? [],
      students: students ?? [],
      applications: applications ?? [],
      attendance: attendance ?? [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Nodal portal GET failed:", error);
    return NextResponse.json({ error: "Nodal portal data is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const client = serviceClient();
    const auth = await requireNodal(request, client);
    if (!auth) return NextResponse.json({ error: "Nodal Officer access required." }, { status: 403 });
    const body = await request.json();
    if (body.action !== "mark_attendance") {
      return NextResponse.json({ error: "Unsupported Nodal Officer action." }, { status: 400 });
    }
    const studentId = typeof body.studentId === "string" ? body.studentId : "";
    const attendanceDate = typeof body.date === "string" ? body.date : "";
    const status = typeof body.status === "string" ? body.status : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
    if (!studentId || !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate) || !["present", "absent", "leave"].includes(status)) {
      return NextResponse.json({ error: "Choose a student, valid date, and attendance status." }, { status: 400 });
    }

    const { data: institutions, error: institutionError } = await client.from("colleges")
      .select("id").eq("nodal_officer_id", auth.user.id);
    if (institutionError) throw institutionError;
    const institutionIds = (institutions ?? []).map((college) => college.id);
    if (!institutionIds.length) return NextResponse.json({ error: "No institution is assigned to this account." }, { status: 403 });

    const { data: student, error: studentError } = await client.from("profiles")
      .select("id,college_id").eq("id", studentId).eq("role", "student").in("college_id", institutionIds).maybeSingle();
    if (studentError || !student?.college_id) {
      return NextResponse.json({ error: "Student is not part of your assigned institution." }, { status: 403 });
    }

    const { data: previous, error: previousError } = await client.from("internship_attendance")
      .select("id,status").eq("student_id", studentId).eq("attendance_date", attendanceDate).maybeSingle();
    if (previousError) throw previousError;

    const { data: saved, error: saveError } = await client.from("internship_attendance").upsert({
      student_id: studentId, institution_id: student.college_id, attendance_date: attendanceDate,
      status, notes: notes || null, marked_by: auth.user.id, updated_at: new Date().toISOString(),
    }, { onConflict: "student_id,attendance_date" }).select("id").single();
    if (saveError) {
      console.error("Attendance save failed:", saveError.message);
      return NextResponse.json({ error: "Attendance could not be saved." }, { status: 400 });
    }

    const { error: auditError } = await client.from("internship_attendance_audit").insert({
      attendance_id: saved.id, student_id: studentId, institution_id: student.college_id,
      attendance_date: attendanceDate, previous_status: previous?.status ?? null, new_status: status,
      action_by: auth.user.id, notes: notes || null,
    });
    if (auditError) {
      console.error("Attendance audit insert failed:", auditError.message);
      return NextResponse.json({ error: "Attendance was saved, but its audit record could not be written. Contact the administrator." }, { status: 500 });
    }
    return NextResponse.json({ success: true, attendanceId: saved.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Nodal portal POST failed:", error);
    return NextResponse.json({ error: "Attendance could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const client = serviceClient();
    const auth = await requireNodal(request, client);
    if (!auth) return NextResponse.json({ error: "Nodal Officer access required." }, { status: 403 });
    const body = await request.json();
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
    const status = typeof body.status === "string" ? body.status : "";
    if (!applicationId || !["under_review", "accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Application or status is invalid." }, { status: 400 });
    }

    const { data: institutions, error: institutionError } = await client.from("colleges")
      .select("id").eq("nodal_officer_id", auth.user.id);
    if (institutionError) throw institutionError;
    const institutionIds = (institutions ?? []).map((college) => college.id);
    if (!institutionIds.length) return NextResponse.json({ error: "No institution is assigned to this account." }, { status: 403 });

    const { data: scopedStudents, error: studentsError } = await client.from("profiles")
      .select("id").eq("role", "student").in("college_id", institutionIds);
    if (studentsError) throw studentsError;
    const studentIds = (scopedStudents ?? []).map((student) => student.id);
    if (!studentIds.length) return NextResponse.json({ error: "No students are assigned to your institution." }, { status: 403 });

    const { data: application, error: updateError } = await client.from("internship_applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", applicationId).in("student_id", studentIds).select("id,status").maybeSingle();
    if (updateError || !application) {
      return NextResponse.json({ error: "Application not found in your assigned institution." }, { status: 404 });
    }
    return NextResponse.json({ success: true, application }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Nodal portal PATCH failed:", error);
    return NextResponse.json({ error: "Application review could not be completed." }, { status: 500 });
  }
}
