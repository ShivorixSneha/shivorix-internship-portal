import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Admin server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireAdmin(request: Request, client: ReturnType<typeof serviceClient>) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile, error: profileError } = await client
    .from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profileError || profile?.role !== "admin") return null;
  return data.user;
}

export async function GET(request: Request) {
  try {
    const client = serviceClient();
    const user = await requireAdmin(request, client);
    if (!user) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const [profiles, colleges, internships, applications] = await Promise.all([
      client.from("profiles")
        .select("id,role,full_name,email,college_id,institution_name,course,created_at")
        .order("created_at", { ascending: false }).limit(500),
      client.from("colleges")
        .select("id,name,university_name,city,state,nodal_officer_id,created_at")
        .order("name"),
      client.from("internships")
        .select("id,title,mode,is_active,created_at")
        .order("created_at", { ascending: false }).limit(100),
      client.from("internship_applications")
        .select("id,status,applied_at,updated_at,profiles(full_name,email),internships(title)")
        .order("applied_at", { ascending: false }).limit(100),
    ]);
    const error = profiles.error || colleges.error || internships.error || applications.error;
    if (error) {
      console.error("Admin portal data query failed:", error.message);
      return NextResponse.json({ error: "Portal data could not be loaded. Check the database schema and server configuration." }, { status: 503 });
    }
    return NextResponse.json({
      profiles: profiles.data ?? [],
      colleges: colleges.data ?? [],
      internships: internships.data ?? [],
      applications: applications.data ?? [],
      limits: { profiles: 500, internships: 100, applications: 100 },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin portal GET failed:", error);
    return NextResponse.json({ error: "Admin portal is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const client = serviceClient();
    const user = await requireAdmin(request, client);
    if (!user) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const body = await request.json();
    if (body.action !== "create_college") {
      return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const university = typeof body.university === "string" ? body.university.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    if (name.length < 2 || name.length > 200) {
      return NextResponse.json({ error: "Institution name must be between 2 and 200 characters." }, { status: 400 });
    }
    const { data, error } = await client.from("colleges").insert({
      name, university_name: university || null, city: city || null, state: state || null,
    }).select("id").single();
    if (error) {
      console.error("Admin create institution failed:", error.message);
      return NextResponse.json({ error: "Could not create institution. Check the details and try again." }, { status: 400 });
    }
    return NextResponse.json({ success: true, id: data.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin portal POST failed:", error);
    return NextResponse.json({ error: "Admin action could not be completed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const client = serviceClient();
    const user = await requireAdmin(request, client);
    if (!user) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const body = await request.json();

    if (body.action === "application_status") {
      const id = typeof body.id === "string" ? body.id : "";
      const status = typeof body.status === "string" ? body.status : "";
      if (!id || !["submitted", "under_review", "accepted", "rejected", "withdrawn"].includes(status)) {
        return NextResponse.json({ error: "Application ID or status is invalid." }, { status: 400 });
      }
      const { data, error } = await client.from("internship_applications")
        .update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id,status").maybeSingle();
      if (error || !data) {
        console.error("Admin application update failed:", error?.message || "record not found");
        return NextResponse.json({ error: "Application status could not be updated." }, { status: 400 });
      }
      return NextResponse.json({ success: true, application: data }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "assign_officer") {
      const collegeId = typeof body.collegeId === "string" ? body.collegeId : "";
      const officerId = typeof body.officerId === "string" ? body.officerId : "";
      if (!collegeId) return NextResponse.json({ error: "Institution is required." }, { status: 400 });
      if (officerId) {
        const { data: officer, error: officerError } = await client.from("profiles")
          .select("id").eq("id", officerId).eq("role", "nodal_officer").maybeSingle();
        if (officerError || !officer) return NextResponse.json({ error: "Choose a valid Nodal Officer account." }, { status: 400 });
      }
      const { data, error } = await client.from("colleges")
        .update({ nodal_officer_id: officerId || null, updated_at: new Date().toISOString() })
        .eq("id", collegeId).select("id").maybeSingle();
      if (error || !data) {
        console.error("Admin officer assignment failed:", error?.message || "institution not found");
        return NextResponse.json({ error: "Nodal Officer assignment could not be saved." }, { status: 400 });
      }
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
  } catch (error) {
    console.error("Admin portal PATCH failed:", error);
    return NextResponse.json({ error: "Admin action could not be completed." }, { status: 500 });
  }
}
