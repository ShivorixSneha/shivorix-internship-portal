import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Applications are temporarily unavailable. Please contact the portal administrator." }, { status: 503 });
    }
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign in as a student before applying." }, { status: 401 });

    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError || profile?.role !== "student") {
      return NextResponse.json({ error: "Only student accounts can apply for internships." }, { status: 403 });
    }

    const body = await request.json();
    const internshipId = typeof body.internshipId === "string" ? body.internshipId : "";
    const coverNote = typeof body.coverNote === "string" ? body.coverNote.trim() : "";
    if (!internshipId) return NextResponse.json({ error: "Choose an internship first." }, { status: 400 });
    if (coverNote.length > 2000) return NextResponse.json({ error: "Cover note must be 2,000 characters or fewer." }, { status: 400 });

    const { data: internship, error: internshipError } = await admin
      .from("internships").select("id").eq("id", internshipId).eq("is_active", true).not("published_at", "is", null).maybeSingle();
    if (internshipError || !internship) return NextResponse.json({ error: "This internship is no longer available." }, { status: 404 });

    const { data: existing, error: existingError } = await admin
      .from("internship_applications").select("id").eq("student_id", authData.user.id).eq("internship_id", internshipId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ error: "You have already applied for this internship." }, { status: 409 });

    const { error: insertError } = await admin.from("internship_applications").insert({
      student_id: authData.user.id, internship_id: internshipId,
      status: "submitted", cover_note: coverNote || null
    });
    if (insertError) throw insertError;
    return NextResponse.json({ message: "Application submitted successfully." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not submit your application right now. Please try again." }, { status: 500 });
  }
}
