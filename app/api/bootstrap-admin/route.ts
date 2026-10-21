import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server admin activation is not configured." }, { status: 500 });
  }

  const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user || user.email?.toLowerCase() !== "info.shivorix@gmail.com" || !user.email_confirmed_at) {
    return NextResponse.json({ error: "This verified account is not permitted to bootstrap admin access." }, { status: 403 });
  }

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: lookupError } = await adminClient
    .from("profiles").select("id, role").eq("id", user.id).maybeSingle();
  if (lookupError || !profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (profile.role === "admin") return NextResponse.json({ role: "admin", alreadyAdmin: true });

  const { count, error: adminCheckError } = await adminClient
    .from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  if (adminCheckError) return NextResponse.json({ error: "Could not verify existing admin." }, { status: 500 });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "An admin already exists; bootstrap is closed." }, { status: 409 });
  }

  const { error: updateError } = await adminClient.from("profiles")
    .update({ role: "admin" }).eq("id", user.id);
  if (updateError) return NextResponse.json({ error: "Admin activation failed. Check the server key configuration." }, { status: 500 });

  const { data: updated, error: verifyError } = await adminClient
    .from("profiles").select("role").eq("id", user.id).single();
  if (verifyError || updated?.role !== "admin") {
    return NextResponse.json({ error: "Role change could not be verified." }, { status: 500 });
  }
  return NextResponse.json({ role: "admin", activated: true });
}
