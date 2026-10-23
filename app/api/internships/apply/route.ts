import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const REQUIRED_DOCUMENTS = [
  { field: "admitCard", type: "4th Semester Admit Card" },
  { field: "apaarId", type: "APAAR / ABC ID Proof" },
  { field: "collegeIdCard", type: "College ID Card" },
  { field: "consentLetter", type: "College Internship Letter / Consent Letter" },
  { field: "photograph", type: "Passport-size Photograph" },
] as const;

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Application service is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

export async function GET(request: Request) {
  try {
    const client = serverClient();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const { data: applications, error: queryError } = await client.from("internship_applications").select("application_number,status").eq("student_id", data.user.id).limit(1);
    if (queryError) throw queryError;
    return NextResponse.json({ alreadyApplied: Boolean(applications?.length), applicationNumber: applications?.[0]?.application_number ?? null, status: applications?.[0]?.status ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check application status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = serverClient();
  let applicationId = "";
  const uploadedPaths: string[] = [];
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign in as a student before applying." }, { status: 401 });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("id,role,college_id,email,full_name,phone,roll_number,registration_number,course,branch,academic_year,current_semester,institution_name")
      .eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "student") {
      return NextResponse.json({ error: "Only student accounts can apply for internships." }, { status: 403 });
    }
    if (!profile.college_id) return NextResponse.json({ error: "Your student profile must be linked to a college before applying." }, { status: 400 });
    const { data: college, error: collegeError } = await client.from("colleges")
      .select("id,name,university_name,nodal_officer_id,status").eq("id", profile.college_id).maybeSingle();
    if (collegeError || !college || college.status !== "active") {
      return NextResponse.json({ error: "Your college is not active. Contact the portal administrator." }, { status: 400 });
    }
    if (!college.nodal_officer_id) {
      return NextResponse.json({ error: "Your college does not have an assigned Nodal Officer yet. Contact your college or portal admin before applying." }, { status: 400 });
    }

    const { data: priorApplications, error: priorApplicationsError } = await client.from("internship_applications").select("id,application_number,status").eq("student_id", authData.user.id).limit(1);
    if (priorApplicationsError) throw priorApplicationsError;
    if (priorApplications?.length) return NextResponse.json({ error: "You have already submitted your one internship application. Please track it in My Application; a second application is not allowed.", alreadyApplied: true, existingApplication: priorApplications[0].application_number }, { status: 409 });

    const form = await request.formData();
    const internshipId = text(form, "internshipId");
    const sectorId = text(form, "sectorId");
    const fullName = text(form, "fullName");
    const fatherName = text(form, "fatherName");
    const motherName = text(form, "motherName");
    const dateOfBirth = text(form, "dateOfBirth");
    const gender = text(form, "gender");
    const mobile = text(form, "phone").replace(/\D/g, "");
    const email = text(form, "email").toLowerCase();
    const course = text(form, "course");
    const department = text(form, "department");
    const semester = text(form, "semester");
    const academicSession = text(form, "academicYear");
    const registrationNumber = text(form, "registrationNumber");
    const rollNumber = text(form, "rollNumber");
    const modeInput = text(form, "mode");
    const startDate = text(form, "preferredStartDate");
    const endDate = text(form, "preferredEndDate");
    const state = text(form, "state");
    const city = text(form, "city");
    const pinCode = text(form, "pinCode");
    const address = text(form, "address");
    const coverNote = text(form, "coverNote");
    const declarations = ["declaration1", "declaration2", "declaration3"].map(key => form.get(key) === "on" || form.get(key) === "true");
    const required = [sectorId, fullName, fatherName, motherName, dateOfBirth, gender, mobile, email, course, department, semester, academicSession, registrationNumber, rollNumber, modeInput, startDate, endDate, state, city, pinCode, address];
    if (required.some(value => !value)) return NextResponse.json({ error: "Complete every required personal, academic, internship and address field." }, { status: 400 });
    if (!/^\d{10}$/.test(mobile)) return NextResponse.json({ error: "Mobile number must contain exactly 10 digits." }, { status: 400 });
    if (!/^\d{6}$/.test(pinCode)) return NextResponse.json({ error: "PIN code must contain exactly 6 digits." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (authData.user.email && email !== authData.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Use the email address registered to your student account." }, { status: 400 });
    }
    if (!["Male", "Female", "Other"].includes(gender)) return NextResponse.json({ error: "Choose Male, Female or Other for gender." }, { status: 400 });
    if (!["onsite", "hybrid", "remote"].includes(modeInput)) return NextResponse.json({ error: "Choose a valid internship mode." }, { status: 400 });
    if (!validDate(dateOfBirth) || !validDate(startDate) || !validDate(endDate) || startDate > endDate) {
      return NextResponse.json({ error: "Enter valid dates and ensure the end date is on or after the start date." }, { status: 400 });
    }
    if (address.length > 1000 || coverNote.length > 2000) return NextResponse.json({ error: "Address or additional note is too long." }, { status: 400 });
    if (text(form, "requiredHours") !== "120" || text(form, "credits") !== "4") {
      return NextResponse.json({ error: "Internship requirement must be 120 hours and 4 credits." }, { status: 400 });
    }
    if (declarations.some(accepted => !accepted)) return NextResponse.json({ error: "Accept all three student declarations before submitting." }, { status: 400 });

    const files: { type: string; file: File }[] = [];
    for (const document of REQUIRED_DOCUMENTS) {
      const entry = form.get(document.field);
      if (!(entry instanceof File) || entry.size === 0) return NextResponse.json({ error: `Upload the required document: ${document.type}.` }, { status: 400 });
      if (entry.size > MAX_FILE_SIZE) return NextResponse.json({ error: `${document.type} must be 10 MB or smaller.` }, { status: 400 });
      if (!ACCEPTED_TYPES.has(entry.type)) return NextResponse.json({ error: `${document.type} must be a PDF, JPG/JPEG, PNG or WEBP file.` }, { status: 400 });
      if (document.field === "photograph" && !entry.type.startsWith("image/")) return NextResponse.json({ error: "Passport-size photograph must be an image." }, { status: 400 });
      files.push({ type: document.type, file: entry });
    }

    const { data: sector, error: sectorError } = await client.from("sectors")
      .select("id,is_active").eq("id", sectorId).eq("is_active", true).maybeSingle();
    if (sectorError || !sector) return NextResponse.json({ error: "Choose an active internship sector." }, { status: 400 });
    let internship: { id: string; sector_id: string | null; mode: string } | null = null;
    if (internshipId) {
      const { data, error: internshipError } = await client.from("internships")
        .select("id,sector_id,mode").eq("id", internshipId).eq("is_active", true).not("published_at", "is", null).maybeSingle();
      if (internshipError || !data) return NextResponse.json({ error: "This internship is no longer available." }, { status: 404 });
      internship = data;
      if (internship.sector_id && internship.sector_id !== sectorId) return NextResponse.json({ error: "The selected internship does not match the selected sector." }, { status: 400 });
      const { data: existing, error: existingError } = await client.from("internship_applications")
        .select("id").eq("student_id", authData.user.id).eq("internship_id", internshipId).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return NextResponse.json({ error: "You have already applied for this internship." }, { status: 409 });
    }

    const { data: application, error: insertError } = await client.from("internship_applications").insert({
      student_id: authData.user.id, internship_id: internshipId || null, college_id: college.id, sector_id: sectorId,
      mode: modeInput, requested_hours: 120, requested_credits: 4,
      preferred_start_date: startDate, preferred_end_date: endDate, state, city, pin_code: pinCode,
      full_address: address, status: "submitted", nodal_review_status: "pending",
      cover_note: coverNote || null,
      declarations: { declaration1: true, declaration2: true, declaration3: true, accepted_at: new Date().toISOString() },
    }).select("id,application_number").single();
    if (insertError || !application) throw insertError || new Error("Application record could not be created.");
    applicationId = application.id;

    const documentRows = [];
    for (const document of files) {
      const safeName = document.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "document";
      const path = `${authData.user.id}/applications/${application.id}/${document.type.replace(/[^a-zA-Z0-9]/g, "-")}-${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await client.storage.from("student-documents").upload(path, document.file, {
        contentType: document.file.type, upsert: false, cacheControl: "3600",
      });
      if (uploadError) throw new Error(`Could not upload ${document.type}. Please try again.`);
      uploadedPaths.push(path);
      documentRows.push({
        student_id: authData.user.id, application_id: application.id, document_type: document.type,
        storage_path: path, status: "pending",
        metadata: { file_name: document.file.name, mime_type: document.file.type, size_bytes: document.file.size, college_id: college.id },
      });
    }
    const { error: documentError } = await client.from("portal_documents").insert(documentRows);
    if (documentError) throw new Error("Application documents could not be linked to the application.");

    const { error: profileUpdateError } = await client.from("profiles").update({
      full_name: fullName, phone: mobile, father_name: fatherName, mother_name: motherName, date_of_birth: dateOfBirth,
      gender, address, city, state, pin_code: pinCode, roll_number: rollNumber, registration_number: registrationNumber,
      course, branch: department, academic_year: academicSession, current_semester: semester,
      institution_name: college.name, updated_at: new Date().toISOString(),
    }).eq("id", authData.user.id);
    if (profileUpdateError) throw new Error("Application was created, but profile details could not be saved.");

    return NextResponse.json({ message: "Application submitted successfully.", applicationId: application.id, applicationNumber: application.application_number, status: "submitted" }, { status: 201 });
  } catch (error) {
    if (applicationId) {
      try {
        await client.from("portal_documents").delete().eq("application_id", applicationId);
        await client.from("internship_applications").delete().eq("id", applicationId);
      } catch {}
    }
    if (uploadedPaths.length) {
      try { await client.storage.from("student-documents").remove(uploadedPaths); } catch {}
    }
    console.error("Internship application submission failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit your application right now. Please try again." }, { status: 500 });
  }
}
