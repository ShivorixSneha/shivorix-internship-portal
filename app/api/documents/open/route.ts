import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Document service is not configured." }, { status: 503 });
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Session is invalid. Sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("id,role,college_id").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || !["student", "nodal_officer", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "You are not authorized to open this document." }, { status: 403 });
    }
    const documentId = new URL(request.url).searchParams.get("id") || "";
    if (!documentId) return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    const { data: document, error: documentError } = await client.from("portal_documents")
      .select("id,student_id,application_id,storage_path,document_type").eq("id", documentId).maybeSingle();
    if (documentError || !document || !document.storage_path) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    if (profile.role === "student" && document.student_id !== profile.id) {
      return NextResponse.json({ error: "Students can only open their own documents." }, { status: 403 });
    }
    if (profile.role === "nodal_officer") {
      const { data: student } = await client.from("profiles").select("college_id")
        .eq("id", document.student_id).maybeSingle();
      const { data: assigned } = await client.from("colleges").select("id")
        .eq("nodal_officer_id", profile.id).eq("id", student?.college_id || "").maybeSingle();
      if (!assigned) return NextResponse.json({ error: "This document is outside your assigned college." }, { status: 403 });
    }
    const { data: signed, error: signedError } = await client.storage.from("student-documents")
      .createSignedUrl(document.storage_path, 60);
    if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "A secure document link could not be created." }, { status: 503 });
    return NextResponse.json({ url: signed.signedUrl, documentType: document.document_type }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Document could not be opened." }, { status: 500 });
  }
}
