import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

// Worker Approvals — a focused queue of workers awaiting KYC verification.
// Admin reviews each worker's category, contact and documents, then approves or rejects.
export default function Approvals({ user, showToast }) {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat,     setCat]     = useState('all')
  const [saving,  setSaving]  = useState(null)   // id currently being saved
  const [zoom,    setZoom]    = useState(null)   // image url to preview

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('workers')
      .select('*')
      .eq('kyc_status', 'pending')
      .order('created_at', { ascending: true })   // oldest first — fair queue
    setWorkers(data || [])
    setLoading(false)
  }

  async function decide(w, status) {
    if (status === 'rejected' && !confirm(`Reject ${w.name || 'this worker'}? They will need to resubmit KYC.`)) return
    setSaving(w.id)
    await sb.from('workers').update({
      kyc_status: status,
      aadhar_verified:  status === 'approved',
      aadhaar_verified: status === 'approved',
    }).eq('id', w.id)
    await sb.from('admin_logs').insert({
      admin_id: user?.id, action: 'update_kyc', target_id: w.id,
      details: { kyc_status: status, skill: w.skill },
    }).then(()=>{}).catch(()=>{})
    setWorkers(list => list.filter(x => x.id !== w.id))
    setSaving(null)
    showToast(`${w.name || 'Worker'} ${status === 'approved' ? 'approved ✓' : 'rejected'}`, status === 'approved' ? 'success' : 'error')
  }

  const cats = ['all', ...Array.from(new Set(workers.map(w => w.skill).filter(Boolean)))]
  const list = cat === 'all' ? workers : workers.filter(w => w.skill === cat)

  const field = (label, value) => value ? (
    <div style={{ background:C.bg, borderRadius:8, padding:'7px 11px' }}>
      <p style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:.3 }}>{label}</p>
      <p style={{ fontSize:13, fontWeight:600, color:C.text, wordBreak:'break-word' }}>{value}</p>
    </div>
  ) : null

  const docs = w => [
    ['Aadhaar Front', w.aadhar_front_url || w.aadhaar_front_url],
    ['Aadhaar Back',  w.aadhar_back_url  || w.aadhaar_back_url],
    ['PAN',           w.pan_front_url],
  ].filter(([, u]) => u)

  return (
    <div>
      {/* Header */}
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.text }}>Worker Approvals</h2>
          <p style={{ fontSize:13, color:C.muted }}>{workers.length} worker{workers.length!==1?'s':''} awaiting verification</p>
        </div>
        <button onClick={load} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.text }}>↺ Refresh</button>
      </div>

      {/* Category filter */}
      {cats.length > 1 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {cats.map(f => (
            <button key={f} onClick={()=>setCat(f)}
              style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', textTransform:'capitalize',
                background: cat===f ? C.primary : C.card, color: cat===f ? '#fff' : C.muted, borderWidth: cat===f?0:1, borderStyle:'solid', borderColor:C.border }}>
              {f}{f!=='all' && ` (${workers.filter(w=>w.skill===f).length})`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, padding:48, textAlign:'center', color:C.muted }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, padding:56, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <p style={{ fontWeight:700, color:C.text }}>All caught up</p>
          <p style={{ fontSize:13, color:C.muted }}>No workers are waiting for approval.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
          {list.map(w => (
            <div key={w.id} style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, padding:18, display:'flex', flexDirection:'column', gap:12 }}>
              {/* top: name + category */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div>
                  <p style={{ fontWeight:800, fontSize:15, color:C.text }}>{w.name || 'Unnamed worker'}</p>
                  <p style={{ fontSize:11, color:C.muted }}>Applied {fmt(w.created_at)}</p>
                </div>
                <span style={{ background:'#EEF2FF', color:C.primary, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, whiteSpace:'nowrap', textTransform:'capitalize' }}>{w.skill || 'No category'}</span>
              </div>

              {/* details */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {field('Phone', w.phone)}
                {field('City', w.city)}
                {field('Email', w.email)}
                {field('UPI ID', w.upi_id)}
                {field('Aadhaar No.', w.aadhaar_number)}
                {field('PAN No.', w.pan_number)}
              </div>

              {/* documents */}
              {docs(w).length > 0 && (
                <div>
                  <p style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:6 }}>DOCUMENTS (tap to enlarge)</p>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {docs(w).map(([l, u]) => (
                      <button key={l} onClick={()=>setZoom(u)}
                        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:C.bg, borderRadius:10, padding:6, border:'1px solid '+C.border, cursor:'pointer' }}>
                        <img src={u} alt={l} style={{ width:78, height:56, objectFit:'cover', borderRadius:6 }} />
                        <span style={{ fontSize:10, fontWeight:600, color:C.text }}>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* actions */}
              <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
                <button onClick={()=>decide(w,'approved')} disabled={saving===w.id}
                  style={{ flex:1, background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'11px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:saving===w.id?.6:1 }}>✓ Approve</button>
                <button onClick={()=>decide(w,'rejected')} disabled={saving===w.id}
                  style={{ flex:1, background:'#fff', color:C.danger, border:'1.5px solid '+C.danger, borderRadius:10, padding:'11px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:saving===w.id?.6:1 }}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* image zoom */}
      {zoom && (
        <div onClick={()=>setZoom(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:24, cursor:'zoom-out' }}>
          <img src={zoom} alt="document" style={{ maxWidth:'100%', maxHeight:'100%', borderRadius:12, objectFit:'contain' }} />
        </div>
      )}
    </div>
  )
}
