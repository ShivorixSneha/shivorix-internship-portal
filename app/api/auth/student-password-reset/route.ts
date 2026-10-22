import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rollNumber = typeof body.rollNumber === "string" ? body.rollNumber.trim() : "";
    const registrationNumber = typeof body.registrationNumber === "string" ? body.registrationNumber.trim() : "";
    if (!/^\d{12}$/.test(rollNumber) || !/^\d{15}$/.test(registrationNumber)) {
      return NextResponse.json({ error: "Enter the registered 12-digit Roll Number and 15-digit Registration Number." }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: "Password reset is not configured. Contact the portal administrator." }, { status: 503 });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error } = await admin.from("profiles").select("email,role")
      .eq("role", "student").eq("roll_number", rollNumber).eq("registration_number", registrationNumber).maybeSingle();
    if (error) return NextResponse.json({ error: "Password reset could not be started. Try again." }, { status: 503 });
    // Keep the response generic when no matching account is found.
    if (profile?.email) {
      const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://shivorix-internship-portal-omega.vercel.app";
      const { error: resetError } = await auth.auth.resetPasswordForEmail(profile.email, { redirectTo: `${origin}/reset-password` });
      if (resetError) {
        console.error("Student password reset request failed:", resetError.message);
        return NextResponse.json({ error: "Password reset email could not be sent. Check the portal email configuration." }, { status: 503 });
      }
    }
    return NextResponse.json({ success: true, message: "If the student record matches, a password reset link will be sent to its registered email." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Password reset could not be started." }, { status: 500 });
  }
}
