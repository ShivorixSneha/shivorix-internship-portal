import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rollNumber = typeof body.rollNumber === "string" ? body.rollNumber.trim() : "";
    const registrationNumber = typeof body.registrationNumber === "string" ? body.registrationNumber.trim() : "";
    if (!/^\d{12}$/.test(rollNumber) || !/^\d{15}$/.test(registrationNumber)) {
      return NextResponse.json({ error: "Enter your registered 12-digit Roll Number and 15-digit Registration Number." }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Email verification is not configured. Please contact the portal administrator." }, { status: 503 });
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from("profiles").select("id,email,role")
      .eq("role", "student").eq("roll_number", rollNumber).eq("registration_number", registrationNumber).maybeSingle();
    let email = profile?.email || "";
    if (!email) {
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        const user = data.users.find((u) =>
          u.user_metadata?.role === "student" &&
          String(u.user_metadata?.roll_number || "").trim() === rollNumber &&
          String(u.user_metadata?.registration_number || "").trim() === registrationNumber
        );
        if (user?.email) { email = user.email; break; }
        if (data.users.length < 1000) break;
      }
    }
    if (email) {
      const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await auth.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${new URL(request.url).origin}/auth/callback` },
      });
      if (error) {
        console.error("Student verification resend failed:", error.message);
        return NextResponse.json({ error: "Verification email could not be sent. The portal email delivery settings need attention; please contact the administrator." }, { status: 503 });
      }
    }
    return NextResponse.json({ success: true, message: "If an unverified student account matches these details, a fresh verification email has been requested. Check Inbox and Spam." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not request a verification email right now. Please try again." }, { status: 500 });
  }
}
