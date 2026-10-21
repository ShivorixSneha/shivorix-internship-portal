import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Applications are temporarily unavailable. Please contact the portal administrator." }, { status: 503 });
    }
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign in as a student before applying." }, { status: 401 });

    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError || profile?.role !== "student") {
      return NextResponse.json({ error: "Only student accounts can apply for internships." }, { status: 403 });
    }

    const body = await request.json();
    const internshipId = typeof body.internshipId === "string" ? body.internshipId : "";
    const coverNote = typeof body.coverNote === "string" ? body.coverNote.trim() : "";
    const studentDetails = {
      full_name: typeof body.fullName === "string" ? body.fullName.trim() : "",
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      father_name: typeof body.fatherName === "string" ? body.fatherName.trim() : "",
      mother_name: typeof body.motherName === "string" ? body.motherName.trim() : "",
      date_of_birth: typeof body.dateOfBirth === "string" ? body.dateOfBirth : "",
      gender: typeof body.gender === "string" ? body.gender.trim() : "",
      address: typeof body.address === "string" ? body.address.trim() : "",
      roll_number: typeof body.rollNumber === "string" ? body.rollNumber.trim() : "",
      registration_number: typeof body.registrationNumber === "string" ? body.registrationNumber.trim() : "",
      course: typeof body.course === "string" ? body.course.trim() : "",
      academic_year: typeof body.academicYear === "string" ? body.academicYear.trim() : "",
      current_semester: "V",
    };
    const requiredFields = [studentDetails.full_name, studentDetails.phone, studentDetails.father_name, studentDetails.mother_name, studentDetails.date_of_birth, studentDetails.gender, studentDetails.address, studentDetails.roll_number, studentDetails.registration_number, studentDetails.course, studentDetails.academic_year];
    if (requiredFields.some(value => !value)) return NextResponse.json({ error: "Complete all required personal and academic details before applying." }, { status: 400 });
    if (!/^\\d{10}$/.test(studentDetails.phone.replace(/\\D/g, ""))) return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    if (studentDetails.address.length > 500) return NextResponse.json({ error: "Address must be 500 characters or fewer." }, { status: 400 });

    if (!internshipId) return NextResponse.json({ error: "Choose an internship first." }, { status: 400 });
    if (coverNote.length > 2000) return NextResponse.json({ error: "Cover note must be 2,000 characters or fewer." }, { status: 400 });

    const { error: detailsError } = await admin.from("profiles").update({
      full_name: studentDetails.full_name, phone: studentDetails.phone.replace(/\\D/g, ""),
      father_name: studentDetails.father_name, mother_name: studentDetails.mother_name,
      date_of_birth: studentDetails.date_of_birth, gender: studentDetails.gender, address: studentDetails.address,
      roll_number: studentDetails.roll_number, registration_number: studentDetails.registration_number,
      course: studentDetails.course, academic_year: studentDetails.academic_year, current_semester: "V",
      updated_at: new Date().toISOString(),
    }).eq("id", authData.user.id);
    if (detailsError) throw detailsError;

    const { data: internship, error: internshipError } = await admin
      .from("internships").select("id").eq("id", internshipId).eq("is_active", true).not("published_at", "is", null).maybeSingle();
    if (internshipError || !internship) return NextResponse.json({ error: "This internship is no longer available." }, { status: 404 });

    const { data: existing, error: existingError } = await admin
      .from("internship_applications").select("id").eq("student_id", authData.user.id).eq("internship_id", internshipId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ error: "You have already applied for this internship." }, { status: 409 });

    const { error: insertError } = await admin.from("internship_applications").insert({
      student_id: authData.user.id, internship_id: internshipId,
      status: "submitted", cover_note: coverNote || null
    });
    if (insertError) throw insertError;
    return NextResponse.json({ message: "Application submitted successfully." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not submit your application right now. Please try again." }, { status: 500 });
  }
}
