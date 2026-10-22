import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Portal server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authorizedStaff(request: Request, admin: ReturnType<typeof adminClient>) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile, error: profileError } = await admin
    .from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profileError || !profile || !["admin", "nodal_officer"].includes(profile.role)) return null;
  return data.user;
}

export async function GET() {
  try {
    const admin = adminClient();
    const [internshipResult, sectorResult] = await Promise.all([
      admin.from("internships")
        .select("id,title,description,sector_id,mode,location,duration_weeks,fee_amount,published_at,sectors(id,name)")
        .eq("is_active", true).not("published_at", "is", null).order("published_at", { ascending: false }),
      admin.from("sectors").select("id,name,category,description").eq("is_active", true).order("name"),
    ]);
    if (internshipResult.error || sectorResult.error) throw internshipResult.error || sectorResult.error;
    return NextResponse.json({ internships: internshipResult.data ?? [], sectors: sectorResult.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Internship listings are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = adminClient();
    const user = await authorizedStaff(request, admin);
    if (!user) return NextResponse.json({ error: "Only authorized staff can publish internships." }, { status: 403 });

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const sectorId = typeof body.sectorId === "string" ? body.sectorId : "";
    const mode = typeof body.mode === "string" ? body.mode : "remote";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const durationWeeks = body.durationWeeks === "" || body.durationWeeks == null ? null : Number(body.durationWeeks);
    const feeAmount = body.feeAmount === "" || body.feeAmount == null ? null : Number(body.feeAmount);

    if (title.length < 3 || title.length > 160) {
      return NextResponse.json({ error: "Title must be between 3 and 160 characters." }, { status: 400 });
    }
    if (description.length < 10 || description.length > 5000) {
      return NextResponse.json({ error: "Description must be between 10 and 5,000 characters." }, { status: 400 });
    }
    if (!["remote", "onsite", "hybrid"].includes(mode)) {
      return NextResponse.json({ error: "Choose a valid internship mode." }, { status: 400 });
    }
    if (feeAmount !== null && (!Number.isFinite(feeAmount) || feeAmount < 0 || feeAmount > 1000000)) return NextResponse.json({ error: "Fee must be between ₹0 and ₹10,00,000." }, { status: 400 });
    if (durationWeeks !== null && (!Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 104)) {
      return NextResponse.json({ error: "Duration must be between 1 and 104 weeks." }, { status: 400 });
    }
    if (sectorId) {
      const { data: sector, error: sectorError } = await admin.from("sectors").select("id").eq("id", sectorId).eq("is_active", true).maybeSingle();
      if (sectorError || !sector) return NextResponse.json({ error: "Choose an active sector." }, { status: 400 });
    }

    const { data, error } = await admin.from("internships").insert({
      title, description, sector_id: sectorId || null, mode,
      location: location || null, duration_weeks: durationWeeks, fee_amount: feeAmount,
      is_active: true, published_at: new Date().toISOString(), created_by: user.id
    }).select("id,title,description,mode,location,duration_weeks,published_at,sectors(name)").single();
    if (error) throw error;
    return NextResponse.json({ internship: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not publish this internship. Check the portal configuration and try again." }, { status: 500 });
  }
}
