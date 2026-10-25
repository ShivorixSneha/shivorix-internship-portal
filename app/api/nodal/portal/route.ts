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
          .select("id,application_number,student_id,internship_id,college_id,sector_id,mode,requested_hours,requested_credits,preferred_start_date,preferred_end_date,state,city,pin_code,full_address,nodal_review_status,review_remarks,status,applied_at,updated_at,profiles!internship_applications_student_id_fkey(full_name,email),internships(title),sectors(name),portal_documents(id,document_type,status,metadata)")
          .in("student_id", studentIds).order("applied_at", { ascending: false }).limit(500)
      : { data: [], error: null };
    if (applicationsError) throw applicationsError;

    const { data: attendance, error: attendanceError } = institutionIds.length
      ? await client.from("internship_attendance")
          .select("id,student_id,institution_id,attendance_date,status,notes,hours,check_in_at,check_out_at,updated_at,profiles(full_name,email)")
          .in("institution_id", institutionIds).order("attendance_date", { ascending: false }).limit(500)
      : { data: [], error: null };
    if (attendanceError) throw attendanceError;

    const { data: records, error: recordsError } = institutionIds.length
      ? await client.from("nodal_portal_records")
          .select("id,institution_id,student_id,record_type,title,description,status,due_date,resource_url,created_at,updated_at")
          .in("institution_id", institutionIds).order("created_at", { ascending: false }).limit(500)
      : { data: [], error: null };
    if (recordsError) throw recordsError;

    const recordIds = (records ?? []).map((record) => record.id);
    const { data: submissions, error: submissionsError } = recordIds.length
      ? await client.from("nodal_record_submissions")
          .select("id,record_id,student_id,submission_url,submission_note,status,feedback,submitted_at,updated_at,profiles(full_name,email),nodal_portal_records(title,record_type)")
          .in("record_id", recordIds).order("submitted_at", { ascending: false }).limit(1000)
      : { data: [], error: null };
    if (submissionsError) throw submissionsError;

    const signedSubmissions = await Promise.all((submissions ?? []).map(async (submission) => {
      if (typeof submission.submission_url !== "string" || !submission.submission_url.startsWith("submissions/")) return submission;
      const { data } = await client.storage.from("student-documents").createSignedUrl(submission.submission_url, 3600);
      return { ...submission, submission_url: data?.signedUrl ?? null };
    }));

    return NextResponse.json({
      profile: { full_name: auth.profile.full_name, email: auth.profile.email },
      institutions: institutions ?? [],
      students: students ?? [],
      applications: applications ?? [],
      attendance: attendance ?? [],
      records: records ?? [],
      submissions: signedSubmissions,
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
    if (body.action === "create_record") {
      const recordType = typeof body.recordType === "string" ? body.recordType : "";
      if (["training", "evaluation", "document", "activity", "test", "certificate"].includes(recordType)) return NextResponse.json({ error: "Only Admin can create or publish this resource." }, { status: 403 });
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "";
      const studentId = typeof body.studentId === "string" && body.studentId ? body.studentId : null;
      const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
      const resourceUrl = typeof body.resourceUrl === "string" && body.resourceUrl.trim() ? body.resourceUrl.trim().slice(0, 2048) : null;
      const status = recordType === "notification" ? "published" : "open";
      if (!["assignment", "evaluation", "document", "notification", "training", "activity", "test", "certificate"].includes(recordType) || title.length < 2 || title.length > 180) {
        return NextResponse.json({ error: "Choose a record type and enter a title between 2 and 180 characters." }, { status: 400 });
      }
      if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return NextResponse.json({ error: "Due date is invalid." }, { status: 400 });
      if (resourceUrl) {
        try { const url = new URL(resourceUrl); if (!["https:", "http:"].includes(url.protocol)) throw new Error(); }
        catch { return NextResponse.json({ error: "Resource link must be a valid HTTP or HTTPS URL." }, { status: 400 }); }
      }
      const { data: assignedInstitutions, error: assignedError } = await client.from("colleges")
        .select("id").eq("nodal_officer_id", auth.user.id);
      if (assignedError) throw assignedError;
      const institutionIds = (assignedInstitutions ?? []).map((item) => item.id);
      if (!institutionIds.length) return NextResponse.json({ error: "No institution is assigned to this account." }, { status: 403 });
      const institutionId = typeof body.institutionId === "string" && institutionIds.includes(body.institutionId)
        ? body.institutionId : institutionIds[0];
      if (studentId) {
        const { data: student, error: studentError } = await client.from("profiles")
          .select("id").eq("id", studentId).eq("role", "student").eq("college_id", institutionId).maybeSingle();
        if (studentError || !student) return NextResponse.json({ error: "Choose a student from your assigned institution." }, { status: 400 });
      }
      const { data: record, error: insertError } = await client.from("nodal_portal_records").insert({
        institution_id: institutionId, student_id: studentId, record_type: recordType,
        title, description: description || null, status, due_date: dueDate,
        resource_url: resourceUrl, created_by: auth.user.id,
      }).select("id").single();
      if (insertError) {
        console.error("Nodal record create failed:", insertError.message);
        return NextResponse.json({ error: "Record could not be saved." }, { status: 400 });
      }
      return NextResponse.json({ success: true, id: record.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    if (body.action !== "mark_attendance") {
      return NextResponse.json({ error: "Unsupported Nodal Officer action." }, { status: 400 });
    }
    const studentId = typeof body.studentId === "string" ? body.studentId : "";
    const attendanceDate = typeof body.date === "string" ? body.date : "";
    const status = typeof body.status === "string" ? body.status : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
    const hours = body.hours === "" || body.hours === null || body.hours === undefined ? null : Number(body.hours);
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 24)) return NextResponse.json({ error: "Hours must be between 0 and 24." }, { status: 400 });
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
      status, notes: notes || null, hours, marked_by: auth.user.id, updated_at: new Date().toISOString(),
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
    if (body.action === "update_submission") {
      const submissionId = typeof body.submissionId === "string" ? body.submissionId : "";
      const status = typeof body.status === "string" ? body.status : "";
      const feedback = typeof body.feedback === "string" ? body.feedback.trim().slice(0, 5000) : "";
      if (!submissionId || !["reviewed", "accepted", "revision_requested"].includes(status)) {
        return NextResponse.json({ error: "Submission or review status is invalid." }, { status: 400 });
      }
      const { data: assignedInstitutions, error: assignedError } = await client.from("colleges")
        .select("id").eq("nodal_officer_id", auth.user.id);
      if (assignedError) throw assignedError;
      const institutionIds = (assignedInstitutions ?? []).map((item) => item.id);
      const { data: records, error: recordError } = institutionIds.length
        ? await client.from("nodal_portal_records").select("id").in("institution_id", institutionIds)
        : { data: [], error: null };
      if (recordError) throw recordError;
      const recordIds = (records ?? []).map((item) => item.id);
      const submissionUpdates: { status: string; reviewed_by: string; reviewed_at: string; updated_at: string; feedback?: string | null } = {
        status, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      if (typeof body.feedback === "string") submissionUpdates.feedback = feedback || null;
      const { data: submission, error: updateError } = recordIds.length
        ? await client.from("nodal_record_submissions").update(submissionUpdates)
            .eq("id", submissionId).in("record_id", recordIds).select("id,status,feedback").maybeSingle()
        : { data: null, error: null };
      if (updateError || !submission) return NextResponse.json({ error: "Submission not found in your assigned institution." }, { status: 404 });
      return NextResponse.json({ success: true, submission }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "update_record") {
      const recordId = typeof body.recordId === "string" ? body.recordId : "";
      const status = typeof body.status === "string" ? body.status : "";
      if (!recordId || !["open", "in_progress", "submitted", "completed", "published"].includes(status)) {
        return NextResponse.json({ error: "Record or status is invalid." }, { status: 400 });
      }
      const { data: assignedInstitutions, error: assignedError } = await client.from("colleges")
        .select("id").eq("nodal_officer_id", auth.user.id);
      if (assignedError) throw assignedError;
      const institutionIds = (assignedInstitutions ?? []).map((item) => item.id);
      if (!institutionIds.length) return NextResponse.json({ error: "No institution is assigned to this account." }, { status: 403 });
      const { data: existingRecord, error: existingRecordError } = await client.from("nodal_portal_records")
        .select("id,record_type").eq("id", recordId).in("institution_id", institutionIds).maybeSingle();
      if (existingRecordError) throw existingRecordError;
      if (!existingRecord) return NextResponse.json({ error: "Record not found in your assigned institution." }, { status: 404 });
      if (["training", "evaluation", "document", "activity", "test", "certificate"].includes(existingRecord.record_type)) return NextResponse.json({ error: "Only Admin can change this resource or its publication status." }, { status: 403 });
      const { data: record, error: updateError } = await client.from("nodal_portal_records")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", recordId).in("institution_id", institutionIds).select("id,status").maybeSingle();
      if (updateError || !record) return NextResponse.json({ error: "Record not found in your assigned institution." }, { status: 404 });
      return NextResponse.json({ success: true, record }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "application_remarks") {
      const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
      const reviewRemarks = typeof body.reviewRemarks === "string" ? body.reviewRemarks.trim().slice(0, 2000) : "";
      if (!applicationId) return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
      const { data: institutions, error: institutionError } = await client.from("colleges")
        .select("id").eq("nodal_officer_id", auth.user.id);
      if (institutionError) throw institutionError;
      const institutionIds = (institutions ?? []).map((college) => college.id);
      if (!institutionIds.length) return NextResponse.json({ error: "No institution is assigned to this account." }, { status: 403 });
      const { data: scopedStudents, error: studentsError } = await client.from("profiles")
        .select("id").eq("role", "student").in("college_id", institutionIds);
      if (studentsError) throw studentsError;
      const studentIds = (scopedStudents ?? []).map((student) => student.id);
      const { data: application, error: updateError } = await client.from("internship_applications")
        .update({ review_remarks: reviewRemarks || null, updated_at: new Date().toISOString() })
        .eq("id", applicationId).in("student_id", studentIds)
        .select("id,application_number,review_remarks").maybeSingle();
      if (updateError || !application) return NextResponse.json({ error: "Application not found in your assigned institution." }, { status: 404 });
      return NextResponse.json({ success: true, application }, { headers: { "Cache-Control": "no-store" } });
    }
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

    const { data: currentApplication, error: currentError } = await client.from("internship_applications")
      .select("id,status,student_id").eq("id", applicationId).in("student_id", studentIds).maybeSingle();
    if (currentError || !currentApplication) return NextResponse.json({ error: "Application not found in your assigned institution." }, { status: 404 });
    if (!["submitted", "under_review"].includes(currentApplication.status)) {
      return NextResponse.json({ error: "This application has already been decided or activated and cannot be changed." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status, nodal_review_status: status === "accepted" ? "approved" : status === "rejected" ? "rejected" : "under_review", updated_at: now };
    if (status === "accepted") { update.approved_by = auth.user.id; update.approved_at = now; }
    if (status === "rejected") { update.rejected_by = auth.user.id; update.rejected_at = now; }
    const { data: application, error: updateError } = await client.from("internship_applications")
      .update(update).eq("id", applicationId).in("student_id", studentIds)
      .select("id,status,application_number,nodal_review_status,approved_at,rejected_at").maybeSingle();
    if (updateError || !application) return NextResponse.json({ error: "Application review could not be saved." }, { status: 400 });
    return NextResponse.json({ success: true, application }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Nodal portal PATCH failed:", error);
    return NextResponse.json({ error: "Application review could not be completed." }, { status: 500 });
  }
}
