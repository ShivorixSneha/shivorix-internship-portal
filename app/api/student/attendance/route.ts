import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
function indiaTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (key: string) => parts.find(part => part.type === key)?.value || "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, weekday: value("weekday"), hour: Number(value("hour")), minute: Number(value("minute")) };
}
export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Attendance service is not configured." }, { status: 503 });
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign in as a student to use attendance." }, { status: 401 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("id,role,college_id").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });
    if (!profile.college_id) return NextResponse.json({ eligible: false, message: "Your student profile is not linked to a college yet." });
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "auto_checkin";
    if (!["auto_checkin", "check_out"].includes(action)) return NextResponse.json({ error: "Attendance action is invalid." }, { status: 400 });

    const { data: activeApplications, error: activeError } = await client.from("internship_applications")
      .select("id,college_id,activated_at").eq("student_id", profile.id).eq("college_id", profile.college_id)
      .not("activated_at", "is", null).order("activated_at", { ascending: false }).limit(1);
    if (activeError) throw activeError;
    const activeApplication = activeApplications?.[0];
    if (!activeApplication) return NextResponse.json({ eligible: false, message: "Attendance becomes available after your internship is activated." });

    const now = new Date();
    const local = indiaTime(now);
    if (action === "auto_checkin") {
      if (local.weekday === "Sun") return NextResponse.json({ eligible: false, message: "Sunday attendance is closed." });
      if (local.hour < 7 || local.hour > 23 || (local.hour === 23 && local.minute > 55)) {
        return NextResponse.json({ eligible: false, message: "Attendance check-in is available from 7:00 AM to 11:55 PM, Monday through Saturday." });
      }
      const { data: existing, error: existingError } = await client.from("internship_attendance")
        .select("id,attendance_date,status,check_in_at,check_out_at,hours,application_id")
        .eq("student_id", profile.id).eq("attendance_date", local.date).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return NextResponse.json({ eligible: true, created: false, attendance: existing, message: existing.check_in_at && !existing.check_out_at ? "Today's attendance is open. Check out when you finish." : "Today's attendance record already exists." });
      const { data: attendance, error: insertError } = await client.from("internship_attendance").insert({
        student_id: profile.id, institution_id: profile.college_id, application_id: activeApplication.id,
        attendance_date: local.date, status: "present", notes: "Automatic check-in on student portal access",
        marked_by: profile.id, check_in_at: now.toISOString(), hours: 0,
      }).select("id,attendance_date,status,check_in_at,check_out_at,hours,application_id").single();
      if (insertError) {
        const { data: raced } = await client.from("internship_attendance").select("id,attendance_date,status,check_in_at,check_out_at,hours,application_id")
          .eq("student_id", profile.id).eq("attendance_date", local.date).maybeSingle();
        if (raced) return NextResponse.json({ eligible: true, created: false, attendance: raced, message: "Today's attendance record already exists." });
        throw insertError;
      }
      return NextResponse.json({ eligible: true, created: true, attendance, message: "Attendance check-in recorded automatically." });
    }

    const { data: existing, error: existingError } = await client.from("internship_attendance")
      .select("id,attendance_date,status,check_in_at,check_out_at,hours,application_id")
      .eq("student_id", profile.id).eq("attendance_date", local.date).maybeSingle();
    if (existingError) throw existingError;
    if (!existing?.check_in_at) return NextResponse.json({ error: "There is no open attendance check-in for today." }, { status: 409 });
    if (existing.check_out_at) return NextResponse.json({ error: "Today's attendance has already been checked out." }, { status: 409 });
    const elapsedHours = Math.min(4, Math.max(0, (now.getTime() - new Date(existing.check_in_at).getTime()) / 3600000));
    const hours = Math.round(elapsedHours * 100) / 100;
    const { data: attendance, error: updateError } = await client.from("internship_attendance")
      .update({ check_out_at: now.toISOString(), hours, updated_at: now.toISOString() })
      .eq("id", existing.id).is("check_out_at", null)
      .select("id,attendance_date,status,check_in_at,check_out_at,hours,application_id").maybeSingle();
    if (updateError || !attendance) return NextResponse.json({ error: "Attendance check-out could not be saved." }, { status: 409 });
    return NextResponse.json({ eligible: true, attendance, message: `Attendance check-out recorded. Credited hours: ${hours} (maximum 4 per day).` });
  } catch (error) {
    console.error("Student attendance action failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Attendance could not be updated right now." }, { status: 500 });
  }
}
