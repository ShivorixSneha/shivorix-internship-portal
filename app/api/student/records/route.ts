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
    const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Session is invalid. Please sign in again." }, { status: 401 });

    const { data: profile, error: profileError } = await client.from("profiles")
      .select("id,role,college_id").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "student") {
      return NextResponse.json({ error: "Student access required." }, { status: 403 });
    }
    if (!profile.college_id) {
      return NextResponse.json({ records: [], attendance: [], notice: "Your profile is not linked to an institution yet." }, { headers: { "Cache-Control": "no-store" } });
    }

    const [recordsResult, attendanceResult] = await Promise.all([
      client.from("nodal_portal_records")
        .select("id,record_type,title,description,status,due_date,resource_url,created_at,student_id")
        .eq("institution_id", profile.college_id)
        .or(`student_id.is.null,student_id.eq.${authData.user.id}`)
        .order("created_at", { ascending: false }).limit(300),
      client.from("internship_attendance")
        .select("id,attendance_date,status,notes,updated_at")
        .eq("student_id", authData.user.id)
        .order("attendance_date", { ascending: false }).limit(300),
    ]);
    if (recordsResult.error || attendanceResult.error) {
      console.error("Student records query failed:", recordsResult.error?.message || attendanceResult.error?.message);
      return NextResponse.json({ error: "Student records could not be loaded." }, { status: 503 });
    }
    return NextResponse.json({ records: recordsResult.data ?? [], attendance: attendanceResult.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Student records API failed:", error);
    return NextResponse.json({ error: "Student records are temporarily unavailable." }, { status: 503 });
  }
}
