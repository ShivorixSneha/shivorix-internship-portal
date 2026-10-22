import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Profile service is not configured." }, { status: 503 });
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Session is invalid. Sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles").select("id,role").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });
    const body = await request.json();
    const dateOfBirth = typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(Date.parse(dateOfBirth + "T00:00:00Z"))) {
      return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
    }
    const { error } = await client.from("profiles").update({ date_of_birth: dateOfBirth, updated_at: new Date().toISOString() }).eq("id", profile.id);
    if (error) return NextResponse.json({ error: "Date of birth could not be saved." }, { status: 400 });
    return NextResponse.json({ success: true, dateOfBirth }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Profile could not be updated." }, { status: 500 });
  }
}
