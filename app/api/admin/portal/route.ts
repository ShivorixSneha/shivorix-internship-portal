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
        .select("id,name,college_code,college_type,university_name,affiliation_code,website,official_email,official_phone,address_line,city,district,state,pin_code,status,created_by,nodal_officer_id,created_at,updated_at")
        .order("name"),
      client.from("internships")
        .select("id,title,description,mode,location,duration_weeks,fee_amount,is_active,published_at,created_at")
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
    const { data: authUsers, error: authUsersError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsersError) {
      console.error("Admin portal user metadata query failed:", authUsersError.message);
      return NextResponse.json({ error: "Officer contact details could not be loaded." }, { status: 503 });
    }
    const mobileByUserId = new Map((authUsers.users ?? []).map((authUser) => [authUser.id, typeof authUser.user_metadata?.mobile_number === "string" ? authUser.user_metadata.mobile_number : null]));
    const { data: portalRecords, error: recordsError } = await client.from("nodal_portal_records")
      .select("id,record_type,title,description,due_date,resource_url,institution_id,student_id,status,created_at")
      .order("created_at", { ascending: false }).limit(500);
    if (recordsError) {
      console.error("Admin portal records query failed:", recordsError.message);
      return NextResponse.json({ error: "Learning records could not be loaded." }, { status: 503 });
    }
    const { data: auditLogs, error: auditError } = await client.from("admin_audit_log")
      .select("id,actor_id,target_profile_id,action,old_value,new_value,details,created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (auditError) console.error("Admin audit log query failed:", auditError.message);
    return NextResponse.json({
      records: portalRecords ?? [],
      auditLogs: auditLogs ?? [],
      profiles: (profiles.data ?? []).map((profile) => ({ ...profile, mobile_number: mobileByUserId.get(profile.id) ?? null })),
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
      const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";
      if (fullName.length < 2 || fullName.length > 100) return NextResponse.json({ error: "Officer name must be between 2 and 100 characters." }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid staff email address." }, { status: 400 });
      if (!/^[6-9][0-9]{9}$/.test(mobileNumber)) return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
      if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Temporary password must be between 8 and 72 characters." }, { status: 400 });
      const { data: created, error: createError } = await client.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: fullName, mobile_number: mobileNumber, provisioned_by: "admin" },
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
        details: { target_email: email, target_name: fullName, target_mobile: mobileNumber },
      });
      if (auditError) console.error("Nodal Officer creation audit failed:", auditError.message);
      return NextResponse.json({ success: true, profileId: created.user.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "create_portal_record") {
      const type = typeof body.recordType === "string" ? body.recordType : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const institutionId = typeof body.institutionId === "string" ? body.institutionId : "";
      const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
      const resourceUrl = typeof body.resourceUrl === "string" ? body.resourceUrl.trim() : "";
      const allowedTypes = ["assignment", "evaluation", "document", "notification", "training", "activity", "test", "certificate"];
      if (!allowedTypes.includes(type) || title.length < 3 || title.length > 180 || description.length > 5000 || !institutionId) {
        return NextResponse.json({ error: "Choose a supported module, college, and valid title/description." }, { status: 400 });
      }
      if (resourceUrl && !(resourceUrl.startsWith("http://") || resourceUrl.startsWith("https://"))) return NextResponse.json({ error: "Resource link must start with http:// or https://." }, { status: 400 });
      if (institutionId) {
        const { data: college, error: collegeError } = await client.from("colleges").select("id").eq("id", institutionId).maybeSingle();
        if (collegeError || !college) return NextResponse.json({ error: "Choose a valid college." }, { status: 400 });
      }
      const { data, error } = await client.from("nodal_portal_records").insert({
        record_type: type, title, description: description || null, institution_id: institutionId || null,
        due_date: dueDate, resource_url: resourceUrl || null, status: "published", created_by: user.id,
      }).select("id").single();
      if (error || !data) {
        console.error("Admin portal record create failed:", error?.message);
        return NextResponse.json({ error: "This module item could not be saved." }, { status: 400 });
      }
      const { error: auditInsertError } = await client.from("admin_audit_log").insert({
        actor_id: user.id, action: "portal_record_created", old_value: null,
        new_value: { record_type: type, title, institution_id: institutionId || null },
        details: { record_id: data.id },
      });
      if (auditInsertError) console.error("Portal record audit failed:", auditInsertError.message);
      return NextResponse.json({ success: true, id: data.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    if (body.action !== "create_college") {
      return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const university = typeof body.university === "string" ? body.university.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const collegeCode = typeof body.collegeCode === "string" ? body.collegeCode.trim().toUpperCase() : "";
    const collegeType = typeof body.collegeType === "string" ? body.collegeType : "";
    const affiliationCode = typeof body.affiliationCode === "string" ? body.affiliationCode.trim() : "";
    const website = typeof body.website === "string" ? body.website.trim() : "";
    const officialEmail = typeof body.officialEmail === "string" ? body.officialEmail.trim().toLowerCase() : "";
    const officialPhone = typeof body.officialPhone === "string" ? body.officialPhone.trim() : "";
    const addressLine = typeof body.addressLine === "string" ? body.addressLine.trim() : "";
    const pinCode = typeof body.pinCode === "string" ? body.pinCode.trim() : "";
    if (name.length < 2 || name.length > 200) {
      return NextResponse.json({ error: "Institution name must be between 2 and 200 characters." }, { status: 400 });
    }
    if (!collegeCode || collegeCode.length > 40) return NextResponse.json({ error: "Enter a unique College Code (up to 40 characters)." }, { status: 400 });
    if (!["Government", "Private", "Autonomous", "Other"].includes(collegeType)) return NextResponse.json({ error: "Choose a valid college type." }, { status: 400 });
    if (university.length < 2 || !city || !state || !addressLine || !/^[0-9]{6}$/.test(pinCode)) return NextResponse.json({ error: "University, city/district, state, address, and a 6-digit PIN code are required." }, { status: 400 });
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(officialEmail) || officialEmail.length > 254) return NextResponse.json({ error: "Enter a valid official college email." }, { status: 400 });
    if (!/^[0-9+() -]{10,18}$/.test(officialPhone)) return NextResponse.json({ error: "Enter a valid official contact number." }, { status: 400 });
    if (website && !(website.startsWith("https://") || website.startsWith("http://"))) return NextResponse.json({ error: "Website must start with http:// or https://." }, { status: 400 });
    const { data, error } = await client.from("colleges").insert({
      name, college_code: collegeCode, college_type: collegeType, university_name: university, affiliation_code: affiliationCode || null,
      website: website || null, official_email: officialEmail, official_phone: officialPhone, address_line: addressLine,
      city, district: city, state, pin_code: pinCode, status: "active", created_by: user.id,
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

    if (body.action === "update_portal_record") {
      const recordId = typeof body.recordId === "string" ? body.recordId : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
      const resourceUrl = typeof body.resourceUrl === "string" ? body.resourceUrl.trim() : "";
      const status = typeof body.status === "string" ? body.status : "published";
      if (!recordId || title.length < 3 || title.length > 180 || description.length > 5000 || !["open", "in_progress", "submitted", "completed", "published"].includes(status)) return NextResponse.json({ error: "Check the record title and status." }, { status: 400 });
      if (resourceUrl && !(resourceUrl.startsWith("http://") || resourceUrl.startsWith("https://"))) return NextResponse.json({ error: "Resource link must start with http:// or https://." }, { status: 400 });
      const { data, error } = await client.from("nodal_portal_records").update({ title, description: description || null, due_date: dueDate, resource_url: resourceUrl || null, status }).eq("id", recordId).select("id").maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Module item could not be updated." }, { status: 400 });
      const { error: auditInsertError } = await client.from("admin_audit_log").insert({ actor_id: user.id, action: "portal_record_updated", old_value: null, new_value: { title, status }, details: { record_id: recordId } });
      if (auditInsertError) console.error("Portal record update audit failed:", auditInsertError.message);
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "toggle_college_status") {
      const collegeId = typeof body.collegeId === "string" ? body.collegeId : "";
      const status = typeof body.status === "string" ? body.status : "";
      if (!collegeId || !["active", "inactive"].includes(status)) return NextResponse.json({ error: "Choose a valid college and status." }, { status: 400 });
      const { data, error } = await client.from("colleges").update({ status, updated_at: new Date().toISOString() }).eq("id", collegeId).select("id,status").maybeSingle();
      if (error || !data) return NextResponse.json({ error: "College status could not be updated." }, { status: 400 });
      const { error: auditError } = await client.from("admin_audit_log").insert({ actor_id: user.id, action: "college_status_changed", old_value: null, new_value: { status }, details: { college_id: collegeId } });
      if (auditError) console.error("College status audit failed:", auditError.message);
      return NextResponse.json({ success: true, college: data }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "update_college") {
      const collegeId = typeof body.collegeId === "string" ? body.collegeId : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const university = typeof body.university === "string" ? body.university.trim() : "";
      const city = typeof body.city === "string" ? body.city.trim() : "";
      const state = typeof body.state === "string" ? body.state.trim() : "";
      const collegeCode = typeof body.collegeCode === "string" ? body.collegeCode.trim().toUpperCase() : "";
      const collegeType = typeof body.collegeType === "string" ? body.collegeType : "";
      const affiliationCode = typeof body.affiliationCode === "string" ? body.affiliationCode.trim() : "";
      const website = typeof body.website === "string" ? body.website.trim() : "";
      const officialEmail = typeof body.officialEmail === "string" ? body.officialEmail.trim().toLowerCase() : "";
      const officialPhone = typeof body.officialPhone === "string" ? body.officialPhone.trim() : "";
      const addressLine = typeof body.addressLine === "string" ? body.addressLine.trim() : "";
      const pinCode = typeof body.pinCode === "string" ? body.pinCode.trim() : "";
      if (!collegeId || name.length < 2 || name.length > 200 || !collegeCode || !["Government", "Private", "Autonomous", "Other"].includes(collegeType)) return NextResponse.json({ error: "Check the college name, code, and type." }, { status: 400 });
      if (!university || !city || !state || !addressLine || !/^[0-9]{6}$/.test(pinCode) || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(officialEmail) || !/^[0-9+() -]{10,18}$/.test(officialPhone)) return NextResponse.json({ error: "Check the university, contact, and address details." }, { status: 400 });
      if (website && !(website.startsWith("https://") || website.startsWith("http://"))) return NextResponse.json({ error: "Website must start with http:// or https://." }, { status: 400 });
      const { data, error } = await client.from("colleges").update({ name, college_code: collegeCode, college_type: collegeType, university_name: university, affiliation_code: affiliationCode || null, website: website || null, official_email: officialEmail, official_phone: officialPhone, address_line: addressLine, city, district: city, state, pin_code: pinCode, updated_at: new Date().toISOString() }).eq("id", collegeId).select("id").maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Institution details could not be updated." }, { status: 400 });
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "update_internship") {
      const internshipId = typeof body.internshipId === "string" ? body.internshipId : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const mode = typeof body.mode === "string" ? body.mode : "";
      const location = typeof body.location === "string" ? body.location.trim() : "";
      const durationWeeks = body.durationWeeks === "" || body.durationWeeks == null ? null : Number(body.durationWeeks);
      const feeAmount = body.feeAmount === "" || body.feeAmount == null ? null : Number(body.feeAmount);
      if (!internshipId || title.length < 3 || title.length > 160 || description.length < 10 || description.length > 5000 || !["remote", "hybrid", "onsite"].includes(mode)) return NextResponse.json({ error: "Check the internship title, description, and mode." }, { status: 400 });
      if (durationWeeks !== null && (!Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 104)) return NextResponse.json({ error: "Duration must be between 1 and 104 weeks." }, { status: 400 });
      if (feeAmount !== null && (!Number.isFinite(feeAmount) || feeAmount < 0 || feeAmount > 1000000)) return NextResponse.json({ error: "Fee must be between ₹0 and ₹10,00,000." }, { status: 400 });
      const { data, error } = await client.from("internships").update({ title, description, mode, location: location || null, duration_weeks: durationWeeks, fee_amount: feeAmount, updated_at: new Date().toISOString() }).eq("id", internshipId).select("id").maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Internship details could not be updated." }, { status: 400 });
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "toggle_internship") {
      const internshipId = typeof body.internshipId === "string" ? body.internshipId : "";
      if (!internshipId || typeof body.isActive !== "boolean") return NextResponse.json({ error: "Internship and publication status are required." }, { status: 400 });
      const patch: { is_active: boolean; published_at?: string } = { is_active: body.isActive };
      if (body.isActive) patch.published_at = new Date().toISOString();
      const { data, error } = await client.from("internships").update(patch).eq("id", internshipId).select("id").maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Internship publication status could not be updated." }, { status: 400 });
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "update_student_profile") {
      const profileId = typeof body.profileId === "string" ? body.profileId : "";
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const course = typeof body.course === "string" ? body.course.trim() : "";
      const collegeId = typeof body.collegeId === "string" ? body.collegeId : "";
      if (!profileId || fullName.length < 2 || fullName.length > 100 || course.length > 160) return NextResponse.json({ error: "Check the student name and course details." }, { status: 400 });
      const { data: target, error: targetError } = await client.from("profiles").select("id,role,full_name,email,college_id,course").eq("id", profileId).maybeSingle();
      if (targetError || !target || target.role !== "student") return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
      if (collegeId) {
        const { data: college, error: collegeError } = await client.from("colleges").select("id").eq("id", collegeId).maybeSingle();
        if (collegeError || !college) return NextResponse.json({ error: "Choose a valid institution." }, { status: 400 });
      }
      const { error } = await client.from("profiles").update({ full_name: fullName, course: course || null, college_id: collegeId || null, updated_at: new Date().toISOString() }).eq("id", profileId);
      if (error) return NextResponse.json({ error: "Student profile could not be updated." }, { status: 400 });
      const { error: auditError } = await client.from("admin_audit_log").insert({ actor_id: user.id, target_profile_id: profileId, action: "student_profile_updated", old_value: { full_name: target.full_name, course: target.course, college_id: target.college_id }, new_value: { full_name: fullName, course: course || null, college_id: collegeId || null }, details: { target_email: target.email } });
      if (auditError) console.error("Student profile audit failed:", auditError.message);
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

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
        const { data: existingAssignments, error: assignmentError } = await client.from("colleges")
          .select("id,name").eq("nodal_officer_id", officerId).neq("id", collegeId).limit(1);
        if (assignmentError) return NextResponse.json({ error: "Could not verify this officer's current college assignment." }, { status: 503 });
        if (existingAssignments?.length) {
          return NextResponse.json({ error: "This Nodal Officer is already assigned to another college. Remove the existing assignment first." }, { status: 409 });
        }
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
