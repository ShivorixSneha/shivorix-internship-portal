import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function POST(request:Request){try{const body=await request.json();const rollNumber=typeof body.rollNumber==="string"?body.rollNumber.trim():"";const registrationNumber=typeof body.registrationNumber==="string"?body.registrationNumber.trim():"";const password=typeof body.password==="string"?body.password:"";if(!rollNumber||!registrationNumber||!password)return NextResponse.json({error:"Enter your Roll Number, Registration Number and password."},{status:400});if(!/^[0-9]{12}$/.test(rollNumber))return NextResponse.json({error:"Roll number must contain exactly 12 digits."},{status:400});if(!/^[0-9]{15}$/.test(registrationNumber))return NextResponse.json({error:"Registration number must contain exactly 15 digits."},{status:400});const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!anonKey||!serviceKey)return NextResponse.json({error:"Student login is not fully configured yet. Please contact info.shivorix@gmail.com."},{status:503});const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});let {data:profile,error:lookupError}=await admin.from("profiles").select("id,email,role,roll_number,registration_number").eq("role","student").eq("roll_number",rollNumber).eq("registration_number",registrationNumber).maybeSingle();
if(lookupError)return NextResponse.json({error:"Unable to check your student record. Please try again shortly."},{status:500});
if(!profile){
  // Recover student accounts created before the profile trigger completed, using
  // the exact identifiers stored in Supabase Auth metadata.
  let matchingUser:any=null;
  for(let page=1;page<=10&&!matchingUser;page++){
    const {data:users,error:usersError}=await admin.auth.admin.listUsers({page,perPage:1000});
    if(usersError)return NextResponse.json({error:"Unable to check your student record. Please try again shortly."},{status:500});
    matchingUser=users.users.find((u:any)=>u.user_metadata?.role==="student"&&String(u.user_metadata?.roll_number||"").trim()===rollNumber&&String(u.user_metadata?.registration_number||"").trim()===registrationNumber);
    if(users.users.length<1000)break;
  }
  if(!matchingUser?.email)return NextResponse.json({error:"No student account matches these numbers. Register on this same portal first, and use the exact Roll Number and Registration Number you registered with."},{status:401});
  if(matchingUser.email_confirmed_at==null)return NextResponse.json({error:"Please verify your registered email first, then try signing in again."},{status:401});
  const recovered={id:matchingUser.id,role:"student",full_name:matchingUser.user_metadata?.full_name||null,email:matchingUser.email,phone:matchingUser.user_metadata?.phone||null,roll_number:rollNumber,registration_number:registrationNumber,institution_name:matchingUser.user_metadata?.institution_name||null,course:matchingUser.user_metadata?.course||null,academic_year:matchingUser.user_metadata?.academic_year||null,current_semester:matchingUser.user_metadata?.current_semester||null,updated_at:new Date().toISOString()};
  const {error:repairError}=await admin.from("profiles").upsert(recovered,{onConflict:"id"});
  if(repairError)return NextResponse.json({error:"Your registration exists, but the student profile needs repair. Please contact the portal administrator."},{status:500});
  profile={id:matchingUser.id,email:matchingUser.email,role:"student",roll_number:rollNumber,registration_number:registrationNumber};
}
if(!profile.email)return NextResponse.json({error:"Your student profile has no email address. Please contact the portal administrator."},{status:401});
const auth=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await auth.auth.signInWithPassword({email:profile.email,password});
if(error||!data.session){
  if(error?.message?.toLowerCase().includes("email not confirmed"))return NextResponse.json({error:"Please verify your registered email first, then try signing in again."},{status:401});
  return NextResponse.json({error:"The Roll Number and Registration Number were found, but the password did not match. Use the password you created during registration."},{status:401});
}return NextResponse.json({session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({error:"Unable to sign in right now. Please try again."},{status:500});}}