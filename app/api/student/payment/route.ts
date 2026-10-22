import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Payment service is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function studentFor(request: Request, client: ReturnType<typeof serviceClient>) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("id,role").eq("id", data.user.id).maybeSingle();
  if (profileError || profile?.role !== "student") return null;
  return data.user;
}

export async function GET(request: Request) {
  try {
    const client = serviceClient();
    const user = await studentFor(request, client);
    if (!user) return NextResponse.json({ error: "Student sign-in required." }, { status: 401 });
    const { data, error } = await client.from("internship_applications")
      .select("id,status,approved_at,activated_at,internships(title,fee_amount),internship_payments(id,status,amount,currency,verified_at)")
      .eq("student_id", user.id).order("applied_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ applications: data ?? [], gatewayConfigured: Boolean(process.env.PAYMENT_GATEWAY) },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Payment information is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const client = serviceClient();
    const user = await studentFor(request, client);
    if (!user) return NextResponse.json({ error: "Student sign-in required." }, { status: 401 });
    const body = await request.json();
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
    if (!applicationId) return NextResponse.json({ error: "Choose an application first." }, { status: 400 });
    const { data: application, error } = await client.from("internship_applications")
      .select("id,status,student_id,internship_id,internships(title,fee_amount)")
      .eq("id", applicationId).eq("student_id", user.id).maybeSingle();
    if (error || !application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (application.status !== "accepted") return NextResponse.json({ error: "Payment is available only after Nodal Officer approval." }, { status: 409 });
    const internship = Array.isArray(application.internships) ? application.internships[0] : application.internships;
    if (internship?.fee_amount == null) return NextResponse.json({ error: "The Admin has not set a fee for this internship yet. Please contact the portal administrator." }, { status: 409 });
    if (Number(internship.fee_amount) === 0) {
      return NextResponse.json({ error: "This internship has a zero fee. Ask the administrator to activate the application under the approved zero-fee policy." }, { status: 409 });
    }
    // Never accept a client-provided payment success. A provider and signed verification webhook must be configured first.
    return NextResponse.json({ error: "Online payment is not enabled yet. The portal administrator must configure a payment gateway before you can pay. No payment has been taken." }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Payment could not be started. No payment has been taken." }, { status: 500 });
  }
}
