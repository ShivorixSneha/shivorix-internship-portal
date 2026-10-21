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

    const [profiles, colleges, internships, applications, profileCount, studentCount, collegeCount, internshipCount, activeInternshipCount, applicationCount, pendingCount, acceptedCount, rejectedCount] = await Promise.all([
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
      client.from("profiles").select("id", { count: "exact", head: true }),
      client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      client.from("colleges").select("id", { count: "exact", head: true }),
      client.from("internships").select("id", { count: "exact", head: true }),
      client.from("internships").select("id", { count: "exact", head: true }).eq("is_active", true),
      client.from("internship_applications").select("id", { count: "exact", head: true }),
      client.from("internship_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
      client.from("internship_applications").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      client.from("internship_applications").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    ]);
    const error = profiles.error || colleges.error || internships.error || applications.error || profileCount.error || studentCount.error || collegeCount.error || internshipCount.error || activeInternshipCount.error || applicationCount.error || pendingCount.error || acceptedCount.error || rejectedCount.error;
    if (error) {
      console.error("Admin portal data query failed:", error.message);
      return NextResponse.json({ error: "Portal data could not be loaded. Check the database schema and server configuration." }, { status: 503 });
    }
    return NextResponse.json({
      profiles: profiles.data ?? [],
      colleges: colleges.data ?? [],
      internships: internships.data ?? [],
      applications: applications.data ?? [],
      stats: {
        profiles: profileCount.count ?? 0,
        students: studentCount.count ?? 0,
        colleges: collegeCount.count ?? 0,
        internships: internshipCount.count ?? 0,
        activeInternships: activeInternshipCount.count ?? 0,
        applications: applicationCount.count ?? 0,
        pendingApplications: pendingCount.count ?? 0,
        acceptedApplications: acceptedCount.count ?? 0,
        rejectedApplications: rejectedCount.count ?? 0,
      },
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
    if (body.action === "create_nodal_officer") {
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (fullName.length < 2 || fullName.length > 100) return NextResponse.json({ error: "Officer name must be between 2 and 100 characters." }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid staff email address." }, { status: 400 });
      if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Temporary password must be between 8 and 72 characters." }, { status: 400 });
      const { data: created, error: createError } = await client.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: fullName, provisioned_by: "admin" },
      });
      if (createError || !created.user) {
        const message = createError?.message.toLowerCase().includes("already") ? "An account with this email already exists. Use a different email or contact the administrator." : "Could not create the staff login. Check the email and server configuration.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
      const { error: profileError } = await client.from("profiles").upsert({
        id: created.user.id, role: "nodal_officer", full_name: fullName, email,
      }, { onConflict: "id" });
      if (profileError) {
        await client.auth.admin.deleteUser(created.user.id);
        console.error("Nodal Officer profile creation failed:", profileError.message);
        return NextResponse.json({ error: "Login was rolled back because the Nodal Officer profile could not be created. Check the profiles schema and role guard." }, { status: 500 });
      }
      const { error: auditError } = await client.from("admin_audit_log").insert({
        actor_id: user.id, target_profile_id: created.user.id, action: "nodal_officer_account_created",
        old_value: null, new_value: { role: "nodal_officer" },
        details: { target_email: email, target_name: fullName },
      });
      if (auditError) console.error("Nodal Officer creation audit failed:", auditError.message);
      return NextResponse.json({ success: true, profileId: created.user.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
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

    if (body.action === "set_profile_role") {
      const targetId = typeof body.profileId === "string" ? body.profileId : "";
      const role = typeof body.role === "string" ? body.role : "";
      if (!targetId || targetId === user.id || !["student", "nodal_officer"].includes(role)) {
        return NextResponse.json({ error: "Choose a different user and a supported staff/student role." }, { status: 400 });
      }
      const { data: target, error: targetError } = await client.from("profiles")
        .select("id,role,full_name,email").eq("id", targetId).maybeSingle();
      if (targetError || !target) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      if (target.role === "admin") return NextResponse.json({ error: "Admin roles cannot be changed from this screen." }, { status: 403 });
      if (target.role === role) return NextResponse.json({ success: true, unchanged: true });
      const { error: roleError } = await client.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", targetId);
      if (roleError) {
        console.error("Admin profile role update failed:", roleError.message);
        return NextResponse.json({ error: "Role could not be updated." }, { status: 400 });
      }
      const { error: auditError } = await client.from("admin_audit_log").insert({
        actor_id: user.id, target_profile_id: targetId, action: "profile_role_changed",
        old_value: { role: target.role }, new_value: { role },
        details: { target_email: target.email, target_name: target.full_name },
      });
      if (auditError) {
        console.error("Admin role audit insert failed:", auditError.message);
        return NextResponse.json({ error: "Role was updated, but the audit record failed. Contact the administrator." }, { status: 500 });
      }
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
  } catch (error) {
    console.error("Admin portal PATCH failed:", error);
    return NextResponse.json({ error: "Admin action could not be completed." }, { status: 500 });
  }
}
