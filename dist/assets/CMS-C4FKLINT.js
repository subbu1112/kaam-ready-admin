import{r as i,s as o,j as a}from"./index-CdHURacI.js";import{T,L as E}from"./Loader-CGsIYohr.js";const r=[{id:"terms",label:"Terms & Conditions",ico:"📜"},{id:"privacy",label:"Privacy Policy",ico:"🔒"},{id:"refund",label:"Cancellation & Refund Policy",ico:"↩️"}],h={terms:`TERMS & CONDITIONS

Last updated: June 2025

1. ACCEPTANCE OF TERMS
By using Kaam Ready, you agree to these Terms & Conditions.

2. SERVICES
Kaam Ready is a platform connecting customers with skilled service professionals.

3. COMMISSION
Kaam Ready charges a 10% platform fee on all completed bookings. Workers receive 90% of the booking amount.

4. PAYMENT
All payments are processed through Kaam Ready's secure payment gateway. Workers receive payouts within 7 business days of job completion.

5. CANCELLATION
Cancellations made before dispatch carry no penalty. Cancellations after dispatch are subject to cancellation fees.

6. CONDUCT
All users must maintain professional conduct. Harassment, fraud, or misconduct will result in immediate account suspension.

7. LIABILITY
Kaam Ready acts as a marketplace and is not liable for the quality of services beyond the platform's dispute resolution mechanism.

8. GOVERNING LAW
These terms are governed by Indian law, with jurisdiction in Telangana courts.`,privacy:`PRIVACY POLICY

Last updated: June 2025

1. INFORMATION WE COLLECT
We collect name, phone, email, address, location, payment details, and usage data.

2. HOW WE USE YOUR INFORMATION
- Matching customers with nearby service workers
- Processing payments and payouts
- KYC verification
- Customer support and dispute resolution
- Platform improvements

3. DATA SHARING
We share data only with service partners, payment processors, and government agencies when legally required.

4. SECURITY
All data is encrypted in transit and at rest. We follow ISO 27001 security standards.

5. YOUR RIGHTS
You may access, correct, or request deletion of your data by contacting privacy@kaamready.in.

6. CONTACT
privacy@kaamready.in | 1800-KR-HELP`,refund:`CANCELLATION & REFUND POLICY

Last updated: June 2025

CUSTOMER CANCELLATIONS
- Cancelled before worker is assigned: Full refund within 3–5 business days
- Cancelled after worker assignment but before dispatch: 90% refund; 10% processing fee retained
- Cancelled after worker is en route: 50% refund; 50% cancellation charge
- Cancelled after worker has arrived: No refund; full cancellation charge applies

WORKER CANCELLATIONS
- If worker cancels before dispatch: Automatic re-assignment or full customer refund
- Repeated cancellations by worker: Account review and suspension may apply

REFUND TIMELINE
- UPI/Wallets: 1–2 business days
- Cards: 5–7 business days
- Bank transfers: 3–5 business days

SERVICE DISPUTES
If service quality does not meet standards, raise a dispute within 24 hours via the app. Valid disputes may receive partial or full refunds after admin review.

CONTACT
refunds@kaamready.in | 1800-KR-HELP`};function w(){var g,y;const[t,b]=i.useState("terms"),[c,d]=i.useState({}),[x,f]=i.useState(!0),[l,u]=i.useState(!1),[p,m]=i.useState(!1);i.useEffect(()=>{C()},[]);async function C(){f(!0);const{data:e}=await o.from("cms_content").select("*").catch(()=>({data:[]})),n={};e&&e.forEach(s=>{n[s.page_id]=s.content}),r.forEach(s=>{n[s.id]||(n[s.id]=h[s.id])}),d(n),f(!1)}async function S(){u(!0);const e=t,n=c[e]||"";await o.from("cms_content").upsert({page_id:e,content:n,updated_at:new Date().toISOString()},{onConflict:"page_id"}).catch(async()=>{await o.rpc("exec_sql",{sql:"CREATE TABLE IF NOT EXISTS cms_content (page_id TEXT PRIMARY KEY, content TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())"}).catch(()=>{}),await o.from("cms_content").upsert({page_id:e,content:n,updated_at:new Date().toISOString()},{onConflict:"page_id"}).catch(()=>{})}),u(!1),m(!0),setTimeout(()=>m(!1),2500)}function v(){window.confirm("Reset to default content? This cannot be undone.")&&d(e=>({...e,[t]:h[t]}))}return a.jsxs("div",{children:[a.jsx(T,{title:"Content Management (CMS)",subtitle:"Edit legal pages shown to customers and workers",actions:a.jsxs("div",{style:{display:"flex",gap:8},children:[a.jsx("button",{onClick:v,style:{padding:"9px 16px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:"#64748b"},children:"Reset to Default"}),a.jsx("button",{onClick:S,disabled:l,style:{padding:"9px 20px",borderRadius:8,border:"none",background:p?"#10b981":"#6366f1",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:l?.7:1},children:l?"Saving...":p?"✓ Saved!":"Save Changes"})]})}),a.jsx("div",{style:{padding:32},children:x?a.jsx(E,{}):a.jsxs("div",{style:{display:"flex",gap:24,alignItems:"flex-start"},children:[a.jsxs("div",{style:{width:220,flexShrink:0,display:"flex",flexDirection:"column",gap:8},children:[r.map(e=>a.jsxs("button",{onClick:()=>b(e.id),style:{padding:"14px 16px",borderRadius:10,border:"2px solid "+(t===e.id?"#6366f1":"#e2e8f0"),background:t===e.id?"#eef2ff":"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:10},children:[a.jsx("span",{style:{fontSize:22},children:e.ico}),a.jsx("span",{style:{fontSize:13,fontWeight:700,color:t===e.id?"#4f46e5":"#1e293b"},children:e.label})]},e.id)),a.jsxs("div",{style:{background:"#fef3c7",borderRadius:10,padding:14,border:"1px solid #f59e0b",marginTop:8},children:[a.jsx("p",{style:{fontSize:12,color:"#92400e",fontWeight:700},children:"⚠️ Live Content"}),a.jsx("p",{style:{fontSize:11,color:"#b45309",marginTop:4,lineHeight:1.5},children:"Changes go live immediately in customer and worker apps when saved."})]})]}),a.jsxs("div",{style:{flex:1},children:[a.jsxs("div",{style:{background:"#fff",borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",overflow:"hidden"},children:[a.jsxs("div",{style:{padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:10},children:[a.jsx("span",{style:{fontSize:20},children:(g=r.find(e=>e.id===t))==null?void 0:g.ico}),a.jsx("span",{style:{fontWeight:700,fontSize:15,color:"#0f172a"},children:(y=r.find(e=>e.id===t))==null?void 0:y.label})]}),a.jsx("textarea",{value:c[t]||"",onChange:e=>d(n=>({...n,[t]:e.target.value})),style:{width:"100%",minHeight:520,padding:"20px",fontSize:13,fontFamily:"monospace",border:"none",outline:"none",resize:"vertical",color:"#1e293b",lineHeight:1.8,boxSizing:"border-box"}})]}),a.jsx("p",{style:{fontSize:11,color:"#94a3b8",marginTop:8},children:"Use plain text. Line breaks are preserved. Changes are saved per page."})]})]})})]})}export{w as default};
