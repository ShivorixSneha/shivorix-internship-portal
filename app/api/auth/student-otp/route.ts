import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "your registered email";
  return `${name.length < 3 ? name[0] || "*" : name.slice(0, 2)}${"*".repeat(Math.max(3, name.length - 2))}@${domain}`;
}
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
    if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: "Email OTP is not configured. Contact the portal administrator." }, { status: 503 });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error } = await admin.from("profiles").select("id,email,role")
      .eq("role", "student").eq("roll_number", rollNumber).eq("registration_number", registrationNumber).maybeSingle();
    if (error) return NextResponse.json({ error: "Could not verify your student record. Try again." }, { status: 503 });
    if (!profile?.email) return NextResponse.json({ error: "No verified student account matches those numbers. Check your details or contact the portal administrator." }, { status: 404 });
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: otpError } = await auth.auth.signInWithOtp({ email: profile.email, options: { shouldCreateUser: false } });
    if (otpError) {
      console.error("Student OTP request failed:", otpError.message);
      return NextResponse.json({ error: "OTP could not be sent. Check your email verification and authentication email settings." }, { status: 503 });
    }
    return NextResponse.json({ success: true, email: profile.email, maskedEmail: maskEmail(profile.email) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not request an OTP right now." }, { status: 500 });
  }
}
