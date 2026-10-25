import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Admin server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  try {
    const client = serviceClient();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Session is invalid. Please sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const form = await request.formData();
    const file = form.get("file");
    const institutionId = typeof form.get("institutionId") === "string" ? String(form.get("institutionId")) : "";
    if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File must be 10 MB or smaller." }, { status: 413 });
    const allowedTypes: Record<string, string> = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    if (!allowedTypes[file.type]) return NextResponse.json({ error: "Only PDF, JPG, PNG, or WEBP files are supported." }, { status: 415 });
    if (!institutionId) return NextResponse.json({ error: "Select a college before uploading an attachment." }, { status: 400 });
    const { data: college, error: collegeError } = await client.from("colleges").select("id").eq("id", institutionId).maybeSingle();
    if (collegeError || !college) return NextResponse.json({ error: "Choose a valid college." }, { status: 400 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || ("resource" + allowedTypes[file.type]);
    const path = "resources/" + institutionId + "/" + crypto.randomUUID() + "-" + safeName;
    const { error: uploadError } = await client.storage.from("student-documents").upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error("Admin resource upload failed:", uploadError.message);
      return NextResponse.json({ error: "File could not be uploaded. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ success: true, path }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin resource upload failed:", error);
    return NextResponse.json({ error: "File upload is temporarily unavailable." }, { status: 500 });
  }
}
