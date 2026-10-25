import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Student records server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
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

    const form = await request.formData();
    const file = form.get("file");
    const recordId = typeof form.get("recordId") === "string" ? String(form.get("recordId")) : "";
    if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File must be 10 MB or smaller." }, { status: 413 });
    const allowedTypes: Record<string, string> = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    if (!allowedTypes[file.type]) return NextResponse.json({ error: "Only PDF, JPG, PNG, or WEBP files are supported." }, { status: 415 });
    if (!recordId || !profile.college_id) return NextResponse.json({ error: "Assignment or institution could not be verified." }, { status: 400 });

    const { data: record, error: recordError } = await client.from("nodal_portal_records")
      .select("id,institution_id,student_id,record_type").eq("id", recordId).maybeSingle();
    if (recordError || !record || record.institution_id !== profile.college_id ||
        (record.student_id && record.student_id !== authData.user.id) ||
        !["assignment", "project", "activity", "test", "evaluation"].includes(record.record_type)) {
      return NextResponse.json({ error: "This task is not available for file submission from your account." }, { status: 403 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || ("submission" + allowedTypes[file.type]);
    const path = "submissions/" + authData.user.id + "/" + recordId + "/" + crypto.randomUUID() + "-" + safeName;
    const { error: uploadError } = await client.storage.from("student-documents").upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error("Student submission upload failed:", uploadError.message);
      return NextResponse.json({ error: "File could not be uploaded. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ success: true, path }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Student submission upload failed:", error);
    return NextResponse.json({ error: "File upload is temporarily unavailable." }, { status: 500 });
  }
}
