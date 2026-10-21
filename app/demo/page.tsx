"use client";

import { useState } from "react";
import Link from "next/link";

type View = "student" | "nodal" | "admin";

const preview = {
  student: {
    eyebrow: "STUDENT WORKSPACE",
    title: "Your internship, step by step.",
    description: "A preview of the student journey. Sample records below are illustrative and do not change real student data.",
    stats: [["Application", "Under review"], ["Attendance", "12 days"], ["Hours logged", "48 / 120"], ["Assignments", "3 / 4"]],
    items: [
      ["Internship application", "Submitted · Waiting for review", "In review"],
      ["Daily log book", "12 attendance entries · 48 verified hours", "In progress"],
      ["Activity: Week 3 reflection", "Your submission and mentor feedback appear here", "Submitted"],
      ["Performance marksheet", "Visible after the evaluator records and approves marks", "Pending"],
      ["Completion certificate", "Available after approved completion", "Locked"],
    ],
  },
  nodal: {
    eyebrow: "NODAL OFFICER WORKSPACE",
    title: "Manage only your assigned college.",
    description: "Preview of college-scoped operations. Sample figures are illustrative, not live data.",
    stats: [["Assigned colleges", "1"], ["Students", "32"], ["Applications", "8"], ["Hours this week", "176"]],
    items: [
      ["Student applications", "Review applications from your assigned institution", "Review"],
      ["Attendance & log book", "Record daily status, hours and notes", "Update"],
      ["Assignments & activities", "Assign work and review student submissions", "Manage"],
      ["Assessments", "Record evaluations and feedback", "Manage"],
      ["Documents", "Track document readiness and completion", "Review"],
    ],
  },
  admin: {
    eyebrow: "ADMIN WORKSPACE",
    title: "Control the whole internship programme.",
    description: "Preview of admin workflows. Sample figures are illustrative, not live data.",
    stats: [["Institutions", "6"], ["Nodal officers", "6"], ["Applications", "128"], ["Active internships", "4"]],
    items: [
      ["Institutions", "Add/edit colleges and assign Nodal Officers", "Manage"],
      ["Nodal officers", "Manage accounts, contact details and college assignments", "Manage"],
      ["Students", "Review student profiles and role permissions", "Manage"],
      ["Internships", "Edit details and publish or unpublish opportunities", "Manage"],
      ["Applications & reports", "Review status changes and export records", "Manage"],
    ],
  },
};

export default function DemoPage() {
  const [view, setView] = useState<View>("student");
  const [expanded, setExpanded] = useState(0);
  const data = preview[view];
  return (
    <main style={{minHeight:"100vh",background:"#f7f4fb",color:"#28163f",fontFamily:"Arial,Helvetica,sans-serif",padding:"28px 16px 56px"}}>
      <div style={{maxWidth:1050,margin:"0 auto"}}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:28}}>
          <div><div style={{fontSize:13,fontWeight:800,letterSpacing:2,color:"#6b2bbd"}}>SHIVORIX</div><div style={{fontSize:12,color:"#756783",marginTop:4}}>INTERNSHIP PORTAL · INTERACTIVE PREVIEW</div></div>
          <Link href="/login" style={{background:"#6828b8",color:"white",padding:"11px 16px",borderRadius:10,textDecoration:"none",fontWeight:700}}>Open live student login ↗</Link>
        </header>
        <section style={{background:"linear-gradient(120deg,#35135d,#702cc1)",borderRadius:24,padding:"clamp(22px,5vw,42px)",color:"white",marginBottom:20}}>
          <div style={{fontSize:12,letterSpacing:2,fontWeight:800,color:"#f8c48b"}}>TRY THE PORTAL BEFORE USING REAL ACCOUNTS</div>
          <h1 style={{fontSize:"clamp(28px,5vw,44px)",lineHeight:1.12,margin:"14px 0"}}>A demo you can explore safely.</h1>
          <p style={{maxWidth:700,lineHeight:1.7,color:"#eee2ff",margin:0}}>Switch between Student, Nodal and Admin previews. Expand each workflow to see what it is meant to do. This is a preview using sample data—not a real login and not connected to production records.</p>
        </section>
        <nav aria-label="Demo role selector" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:16}}>
          {(["student","nodal","admin"] as View[]).map((role)=> <button key={role} onClick={()=>{setView(role);setExpanded(0)}} style={{border:view===role?"2px solid #702cc1":"1px solid #e2d7ef",background:view===role?"#eee3ff":"white",borderRadius:12,padding:"14px 8px",fontWeight:800,color:view===role?"#58219c":"#655573",cursor:"pointer",textTransform:"capitalize"}}>{role==="nodal"?"Nodal Officer":role==="admin"?"Admin Panel":"Student Portal"}</button>)}
        </nav>
        <section style={{background:"white",border:"1px solid #e9e0f1",borderRadius:20,padding:"clamp(18px,4vw,30px)",boxShadow:"0 12px 34px #32164a0c"}}>
          <div style={{fontSize:11,letterSpacing:1.8,fontWeight:800,color:"#8b55c4"}}>{data.eyebrow}</div>
          <h2 style={{fontSize:"clamp(23px,4vw,32px)",margin:"8px 0"}}>{data.title}</h2>
          <p style={{color:"#71647e",lineHeight:1.65,marginTop:0}}>{data.description}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,margin:"22px 0"}}>
            {data.stats.map(([label,value])=><div key={label} style={{background:"#faf7fd",border:"1px solid #eee5f6",borderRadius:14,padding:15}}><div style={{fontSize:12,color:"#786a86"}}>{label}</div><div style={{fontSize:22,fontWeight:800,color:"#51208b",marginTop:7}}>{value}</div></div>)}
          </div>
          <h3 style={{fontSize:17,margin:"24px 0 10px"}}>Explore workflows</h3>
          <div style={{display:"grid",gap:9}}>
            {data.items.map(([title,description,status],i)=><div key={title} style={{border:"1px solid #e8dff0",borderRadius:12,overflow:"hidden"}}>
              <button onClick={()=>setExpanded(expanded===i?-1:i)} aria-expanded={expanded===i} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,textAlign:"left",background:"white",border:0,padding:"15px",cursor:"pointer",color:"#302044"}}>
                <span style={{fontWeight:800}}>{title}</span><span style={{fontSize:12,color:"#6d35a8",fontWeight:700,whiteSpace:"nowrap"}}>{status}　{expanded===i?"−":"+"}</span>
              </button>
              {expanded===i&&<div style={{padding:"0 15px 15px",color:"#71647e",fontSize:14,lineHeight:1.65}}>{description}<div style={{marginTop:10,background:"#fff7eb",color:"#85551a",borderRadius:8,padding:10,fontSize:12}}>Demo preview only · No production data is changed.</div></div>}
            </div>)}
          </div>
        </section>
        <footer style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",marginTop:20,color:"#776b83",fontSize:13}}>
          <span>Use this page to preview the intended workflow before testing real accounts.</span>
          <Link href="/register" style={{color:"#6828b8",fontWeight:800}}>Go to student registration →</Link>
        </footer>
      </div>
    </main>
  );
}
