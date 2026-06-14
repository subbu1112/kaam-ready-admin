import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'

const PAGES = [
  { id:'terms',   label:'Terms & Conditions', ico:'📜' },
  { id:'privacy', label:'Privacy Policy',      ico:'🔒' },
  { id:'refund',  label:'Cancellation & Refund Policy', ico:'↩️' },
]

const DEFAULT = {
  terms: `TERMS & CONDITIONS

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
These terms are governed by Indian law, with jurisdiction in Telangana courts.`,

  privacy: `PRIVACY POLICY

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
privacy@kaamready.in | 1800-KR-HELP`,

  refund: `CANCELLATION & REFUND POLICY

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
refunds@kaamready.in | 1800-KR-HELP`
}

export default function CMS() {
  const [active, setActive] = useState('terms')
  const [content, setContent] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('cms_content').select('*').catch(()=>({ data:[] }))
    const map = {}
    if (data) data.forEach(row => { map[row.page_id] = row.content })
    // Fill defaults for missing pages
    PAGES.forEach(p => { if (!map[p.id]) map[p.id] = DEFAULT[p.id] })
    setContent(map)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const page = active
    const text = content[page] || ''
    await sb.from('cms_content').upsert({ page_id:page, content:text, updated_at:new Date().toISOString() }, { onConflict:'page_id' }).catch(async ()=>{
      // Table may not exist yet — create it
      await sb.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS cms_content (page_id TEXT PRIMARY KEY, content TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())` }).catch(()=>{})
      await sb.from('cms_content').upsert({ page_id:page, content:text, updated_at:new Date().toISOString() }, { onConflict:'page_id' }).catch(()=>{})
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function reset() {
    if (!window.confirm('Reset to default content? This cannot be undone.')) return
    setContent(c => ({ ...c, [active]: DEFAULT[active] }))
  }

  return (
    <div>
      <TopBar title="Content Management (CMS)" subtitle="Edit legal pages shown to customers and workers" actions={
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={reset} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#64748b' }}>Reset to Default</button>
          <button onClick={save} disabled={saving} style={{ padding:'9px 20px', borderRadius:8, border:'none', background: saved ? '#10b981' : '#6366f1', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      } />
      <div style={{ padding:32 }}>
        {loading ? <Loader /> : (
          <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
            {/* Page selector */}
            <div style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', gap:8 }}>
              {PAGES.map(p => (
                <button key={p.id} onClick={() => setActive(p.id)} style={{ padding:'14px 16px', borderRadius:10, border:'2px solid '+(active===p.id?'#6366f1':'#e2e8f0'), background: active===p.id?'#eef2ff':'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:22 }}>{p.ico}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:active===p.id?'#4f46e5':'#1e293b' }}>{p.label}</span>
                </button>
              ))}
              <div style={{ background:'#fef3c7', borderRadius:10, padding:14, border:'1px solid #f59e0b', marginTop:8 }}>
                <p style={{ fontSize:12, color:'#92400e', fontWeight:700 }}>⚠️ Live Content</p>
                <p style={{ fontSize:11, color:'#b45309', marginTop:4, lineHeight:1.5 }}>Changes go live immediately in customer and worker apps when saved.</p>
              </div>
            </div>
            {/* Editor */}
            <div style={{ flex:1 }}>
              <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{PAGES.find(p=>p.id===active)?.ico}</span>
                  <span style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>{PAGES.find(p=>p.id===active)?.label}</span>
                </div>
                <textarea
                  value={content[active] || ''}
                  onChange={e => setContent(c => ({ ...c, [active]: e.target.value }))}
                  style={{ width:'100%', minHeight:520, padding:'20px', fontSize:13, fontFamily:'monospace', border:'none', outline:'none', resize:'vertical', color:'#1e293b', lineHeight:1.8, boxSizing:'border-box' }}
                />
              </div>
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:8 }}>Use plain text. Line breaks are preserved. Changes are saved per page.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
