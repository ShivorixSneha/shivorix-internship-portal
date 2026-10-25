import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Student records server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: Request) {
  try {
    const client = serviceClient();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Session is invalid. Please sign in again." }, { status: 401 });

    const { data: profile, error: profileError } = await client.from("profiles")
      .select("id,role,college_id").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "student") {
      return NextResponse.json({ error: "Student access required." }, { status: 403 });
    }
    const [recordsResult, attendanceResult, applicationsResult, submissionsResult] = await Promise.all([
      profile.college_id
        ? client.from("nodal_portal_records")
            .select("id,record_type,title,description,status,due_date,resource_url,created_at,student_id")
            .eq("institution_id", profile.college_id)
            .or(`student_id.is.null,student_id.eq.${authData.user.id}`)
            .order("created_at", { ascending: false }).limit(300)
        : Promise.resolve({ data: [], error: null } as any),
      client.from("internship_attendance")
        .select("id,attendance_date,status,notes,hours,check_in_at,check_out_at,application_id,updated_at")
        .eq("student_id", authData.user.id)
        .order("attendance_date", { ascending: false }).limit(300),
      client.from("internship_applications")
        .select("id,application_number,status,nodal_review_status,review_remarks,mode,requested_hours,requested_credits,preferred_start_date,preferred_end_date,city,state,pin_code,full_address,applied_at,updated_at,approved_at,activated_at,internships(title,description,mode,location,duration_weeks,fee_amount),sectors(name),portal_documents(id,document_type,status,metadata),internship_payments(status,amount,verified_at)")
        .eq("student_id", authData.user.id)
        .order("applied_at", { ascending: false }).limit(100),
      client.from("nodal_record_submissions")
        .select("id,record_id,status,submission_url,submission_note,feedback,submitted_at,updated_at")
        .eq("student_id", authData.user.id).order("submitted_at", { ascending: false }).limit(300),
    ]);
    if (recordsResult.error || attendanceResult.error || applicationsResult.error || submissionsResult.error) {
      console.error("Student records query failed:", recordsResult.error?.message || attendanceResult.error?.message || applicationsResult.error?.message || submissionsResult.error?.message);
      return NextResponse.json({ error: "Student records could not be loaded." }, { status: 503 });
    }
    const records = await Promise.all((recordsResult.data ?? []).map(async (record: any) => {
      if (typeof record.resource_url !== "string" || !record.resource_url.startsWith("resources/")) return record;
      const { data } = await client.storage.from("student-documents").createSignedUrl(record.resource_url, 3600);
      return { ...record, resource_file_url: data?.signedUrl ?? null };
    }));
    const submissions = await Promise.all((submissionsResult.data ?? []).map(async (submission: any) => {
      if (typeof submission.submission_url !== "string" || !submission.submission_url.startsWith("submissions/")) return submission;
      const { data } = await client.storage.from("student-documents").createSignedUrl(submission.submission_url, 3600);
      return { ...submission, submission_url: data?.signedUrl ?? null };
    }));
    return NextResponse.json({
      records,
      attendance: attendanceResult.data ?? [],
      applications: applicationsResult.data ?? [],
      submissions,
      notice: profile.college_id ? "" : "Your profile is not linked to an institution yet. Applications can still be tracked here.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Student records API failed:", error);
    return NextResponse.json({ error: "Student records are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const client = serviceClient();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Session is invalid. Please sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles").select("id,role,college_id").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });
    const body = await request.json();
    const recordId = typeof body.recordId === "string" ? body.recordId : "";
    const submissionUrl = typeof body.submissionUrl === "string" ? body.submissionUrl.trim().slice(0, 2048) : "";
    const submissionNote = typeof body.submissionNote === "string" ? body.submissionNote.trim().slice(0, 5000) : "";
    if (!recordId || (!submissionUrl && !submissionNote)) return NextResponse.json({ error: "Attach a file, add a link, or write your answer before submitting." }, { status: 400 });
    if (submissionUrl && !submissionUrl.startsWith("submissions/")) {
      try { const url = new URL(submissionUrl); if (!["https:", "http:"].includes(url.protocol)) throw new Error(); }
      catch { return NextResponse.json({ error: "Submission link must be a valid HTTP or HTTPS URL." }, { status: 400 }); }
    }
    if (submissionUrl.startsWith("submissions/") && !submissionUrl.startsWith("submissions/" + authData.user.id + "/")) {
      return NextResponse.json({ error: "Uploaded file does not belong to your account." }, { status: 403 });
    }
    const { data: record, error: recordError } = await client.from("nodal_portal_records")
      .select("id,institution_id,student_id,record_type").eq("id", recordId).maybeSingle();
    if (recordError || !record || !profile.college_id || record.institution_id !== profile.college_id ||
        (record.student_id && record.student_id !== authData.user.id) ||
        !["assignment","project","activity","test","evaluation"].includes(record.record_type)) {
      return NextResponse.json({ error: "This record is not available for submission from your account." }, { status: 403 });
    }
    if (record.record_type === "assignment" || record.record_type === "project") {
      if (!submissionUrl && !submissionNote) return NextResponse.json({ error: "Attach a file, add an optional link, or write your assignment answer." }, { status: 400 });
      const { data: activeApplications, error: activeError } = await client.from("internship_applications")
        .select("id").eq("student_id", authData.user.id).not("activated_at", "is", null).limit(1);
      if (activeError) throw activeError;
      if (!activeApplications?.length) return NextResponse.json({ error: "An active internship is required before submitting assignments or project reports." }, { status: 409 });
      if (record.record_type === "assignment") {
        const { data: existingSubmission, error: existingError } = await client.from("nodal_record_submissions")
          .select("id").eq("record_id", recordId).eq("student_id", authData.user.id).maybeSingle();
        if (existingError) throw existingError;
        if (existingSubmission) return NextResponse.json({ error: "This assignment has already been submitted. Editing and resubmission are not available." }, { status: 409 });
      }
    }
    const submissionPayload = {
      record_id: recordId, student_id: authData.user.id, submission_url: submissionUrl || null,
      submission_note: submissionNote || null, status: "submitted", feedback: null,
      submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { data: submission, error: saveError } = record.record_type === "assignment"
      ? await client.from("nodal_record_submissions").insert(submissionPayload).select("id,status,submitted_at").single()
      : await client.from("nodal_record_submissions").upsert(submissionPayload, { onConflict: "record_id,student_id" }).select("id,status,submitted_at").single();
    if (saveError) {
      console.error("Student submission save failed:", saveError.message);
      return NextResponse.json({ error: "Submission could not be saved." }, { status: 400 });
    }
    return NextResponse.json({ success: true, submission }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Student submission API failed:", error);
    return NextResponse.json({ error: "Submission could not be saved." }, { status: 500 });
  }
}
