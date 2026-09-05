import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { WORKER_DOCS, PAN_DOC, docSubmitted, allDocsSubmitted, resolveDocUrl, KYC_LABEL, KYC_TONE } from '../lib/kycDocs'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const INR = v => '₹' + (v||0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

function KycBadge({ status }) {
  const [bg, col] = KYC_TONE[status] || KYC_TONE.pending
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, whiteSpace:'nowrap' }}>
    {KYC_LABEL[status] || KYC_LABEL.pending}
  </span>
}

function StatusBadge({ status }) {
  const m = { active:['#D1FAE5','#065F46','Active'], suspended:['#FEE2E2','#991B1B','Suspended'], blocked:['#FEE2E2','#991B1B','Blocked'], deleted:['#E5E7EB','#374151','Deleted'] }
  const [bg,col,lbl] = m[status||'active'] || ['#D1FAE5','#065F46','Active']
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{lbl}</span>
}

export default function Workers({ user, showToast }) {
  const [workers,  setWorkers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [kycF,     setKycF]     = useState('all')
  const [selected, setSelected] = useState(null)
  const [bkgs,     setBkgs]     = useState([])
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('workers').select('*').order('created_at', { ascending: false })
    setWorkers(data || [])
    setLoading(false)
  }

  async function openWorker(w) {
    setSelected(w)
    const { data } = await sb.from('bookings').select('id,status,amount,service,created_at').eq('worker_id', w.id).order('created_at', { ascending: false }).limit(10)
    setBkgs(data || [])
  }

  async function updateKYC(id, status) {
    let reason = null
    if (status !== 'approved') {
      reason = window.prompt('Reason for ' + (status === 'rejected' ? 'rejecting' : 'requesting resubmission') + ' (the worker sees this):')
      if (reason === null) return
      if (!reason.trim()) { showToast('A reason is required', 'error'); return }
    }
    setSaving(true)
    // Same audited path as the Approvals queue: it flips the verification
    // flags, tells the worker why, and writes the admin log in one step.
    const { error } = await sb.rpc('admin_review_worker_kyc', {
      p_worker_id: id, p_decision: status, p_reason: reason,
    })
    if (error) { setSaving(false); showToast(error.message.replace(/^.*?:\s*/, ''), 'error'); return }
    await load()
    setSaving(false)
    setSelected(s => s ? { ...s, kyc_status: status, aadhar_verified: status==='approved', kyc_rejection_reason: reason } : null)
    showToast('Verification ' + status.replace('_',' '), status==='approved' ? 'success' : 'error')
  }

  // Documents live in the private kyc bucket; sign a fresh URL on demand.
  async function openWorkerDoc(worker, doc) {
    const url = await resolveDocUrl(worker, doc)
    if (!url) { showToast('That document is not available', 'error'); return }
    window.open(url, '_blank', 'noopener')
  }

  async function updateStatus(id, status) {
    setSaving(true)
    await sb.from('workers').update({ account_status: status }).eq('id', id)
    await sb.from('admin_logs').insert({ admin_id: user.id, action:'update_worker_status', target_id: id, details:{ account_status: status } }).then(()=>{})
    await load()
    setSaving(false)
    setSelected(s => s ? { ...s, account_status: status } : null)
    showToast('Worker ' + status, 'success')
  }

  // Delete a worker account. Hard-deletes clean accounts; if the worker has job
  // or payout history (protected by NO ACTION foreign keys), the account is
  // archived instead so financial/accounting records are preserved.
  async function deleteWorker(w) {
    if (!confirm(`Delete worker "${w.name || ''}"?\n\nIf they have job or payout history the account is ARCHIVED (records kept). Otherwise it is permanently deleted.`)) return
    setSaving(true)
    const { error } = await sb.from('workers').delete().eq('id', w.id)
    if (error) {
      const { error: e2 } = await sb.from('workers').update({ account_status: 'deleted', is_online: false }).eq('id', w.id)
      setSaving(false)
      if (e2) { showToast('Delete failed: ' + e2.message, 'error'); return }
      await sb.from('admin_logs').insert({ admin_id: user.id, action: 'archive_worker', target_id: w.id, details: { reason: 'has_history' } }).then(() => {})
      showToast('Worker archived — had history, records preserved', 'success')
    } else {
      setSaving(false)
      await sb.from('admin_logs').insert({ admin_id: user.id, action: 'delete_worker', target_id: w.id, details: {} }).then(() => {})
      showToast('Worker account deleted', 'success')
    }
    setSelected(null)
    load()
  }

  const filtered = workers.filter(w => {
    const q = search.toLowerCase()
    const mQ = !q || (w.name||'').toLowerCase().includes(q) || (w.phone||'').includes(q) || (w.skill||'').toLowerCase().includes(q) || (w.city||'').toLowerCase().includes(q)
    const mF = filter==='all' || (w.account_status||'active')===filter
    const mK = kycF==='all' || (w.kyc_status||'pending')===kycF
    return mQ && mF && mK
  })

  const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, background:C.bg, borderBottom:'1px solid '+C.border }
  const td = { padding:'11px 14px', fontSize:13, color:C.text, borderBottom:'1px solid '+C.border }

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Workers</h2>
          <p style={{ fontSize:13, color:C.muted }}>{workers.length} registered · {workers.filter(w=>w.is_online).length} online now</p>
        </div>
        <button onClick={load} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>↺ Refresh</button>
      </div>

      <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid '+C.border, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, skill, city..."
            style={{ padding:'9px 14px', border:'1.5px solid '+C.border, borderRadius:10, fontSize:13, width:250, outline:'none', fontFamily:'inherit', background:C.bg }} />
          <div style={{ display:'flex', gap:6 }}>
            {['all','active','suspended'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:'7px 13px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', textTransform:'capitalize',
                  background:filter===f?C.primary:C.bg, color:filter===f?'#fff':C.muted }}>{f}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[['all',C.primary,'All'],['pending',C.warning,'Incomplete'],['submitted','#2563EB','Awaiting review'],
              ['approved',C.success,'Approved'],['resubmit_required','#9A3412','Resubmit'],['rejected',C.danger,'Rejected']].map(([f,col,lbl])=>(
              <button key={f} onClick={()=>setKycF(f)}
                style={{ padding:'7px 13px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit',
                  background:kycF===f?col:C.bg, color:kycF===f?'#fff':C.muted }}>{lbl}</button>
            ))}
          </div>
          <span style={{ marginLeft:'auto', fontSize:12, color:C.muted }}>{filtered.length} results</span>
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading...</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Worker','Phone','Skill','City','Rating','Jobs','Wallet','KYC','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(w=>(
                  <tr key={w.id}>
                    <td style={td}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:w.is_online?C.success:'#CBD5E1', flexShrink:0 }} />
                        <div><p style={{ fontWeight:600 }}>{w.name||'—'}</p><p style={{ fontSize:11, color:C.muted }}>{w.id.slice(0,8)}…</p></div>
                      </div>
                    </td>
                    <td style={td}>{w.phone||'—'}</td>
                    <td style={td}>{w.skill||'—'}</td>
                    <td style={td}>{w.city||'—'}</td>
                    <td style={td}><span style={{ color:C.warning, fontWeight:700 }}>{w.rating||5} ★</span></td>
                    <td style={td}>{w.total_jobs||0}</td>
                    <td style={td}>{INR(w.wallet_balance)}</td>
                    <td style={td}><KycBadge status={w.kyc_status||'pending'} /></td>
                    <td style={td}><StatusBadge status={w.account_status} /></td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <button onClick={()=>openWorker(w)} style={{ background:C.primary, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>View</button>
                        {(w.kyc_status||'pending')==='pending' && <>
                          <button onClick={()=>updateKYC(w.id,'approved')} style={{ background:C.success, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ KYC</button>
                          <button onClick={()=>updateKYC(w.id,'rejected')} style={{ background:C.danger, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                        </>}
                        {(w.account_status||'active')==='active'
                          ? <button onClick={()=>updateStatus(w.id,'suspended')} style={{ background:C.warning, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Suspend</button>
                          : <button onClick={()=>updateStatus(w.id,'active')}    style={{ background:C.success, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Restore</button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div style={{ padding:48, textAlign:'center', color:C.muted }}>No workers match filters</div>}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:640, margin:'20px auto' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontWeight:800, fontSize:18 }}>{selected.name||'Worker'}</h3>
                <p style={{ fontSize:13, color:C.muted }}>{selected.phone} · {selected.city}</p>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:C.bg, border:'none', borderRadius:10, width:36, height:36, fontSize:18, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
                {[['Rating',(selected.rating||5)+' ★',C.warning],['Jobs',selected.total_jobs||0,C.primary],['Wallet',INR(selected.wallet_balance),C.success],['KYC',selected.kyc_status||'pending',C.muted]].map(([l,v,col])=>(
                  <div key={l} style={{ background:C.bg, borderRadius:12, padding:'12px', textAlign:'center' }}>
                    <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{l}</p>
                    <p style={{ fontWeight:800, fontSize:14, color:col }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[['Skill',selected.skill],['Email',selected.email],['UPI ID',selected.upi_id],['Aadhaar No.',selected.aadhaar_number],['PAN No.',selected.pan_number],['Joined',fmt(selected.created_at)]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} style={{ background:C.bg, borderRadius:10, padding:'10px 14px' }}>
                    <p style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:3 }}>{l}</p>
                    <p style={{ fontWeight:600, fontSize:13 }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:20 }}>
                <p style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Verification Documents</p>
                {WORKER_DOCS.map(doc => {
                  const ok = docSubmitted(selected, doc)
                  return (
                    <div key={doc.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderTop:'1px solid '+C.border }}>
                      <span style={{ width:22, height:22, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                        background: ok ? '#D1FAE5' : '#FEE2E2', color: ok ? '#065F46' : '#991B1B', fontSize:12, fontWeight:900 }}>{ok ? '✓' : '✕'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600 }}>{doc.label}</p>
                        <p style={{ fontSize:11, color: ok ? C.muted : '#991B1B' }}>{ok ? 'Submitted' : 'Not Submitted'}</p>
                      </div>
                      {ok && (
                        <button onClick={()=>openWorkerDoc(selected, doc)}
                          style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:C.primary }}>
                          {doc.kind === 'video' ? '▶ Play' : '🔍 View'}
                        </button>
                      )}
                    </div>
                  )
                })}
                {selected.pan_front_url && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderTop:'1px solid '+C.border }}>
                    <span style={{ width:22, height:22, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#E0E7FF', color:C.primary, fontSize:12, fontWeight:900 }}>i</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:600 }}>PAN (optional)</p>
                      <p style={{ fontSize:11, color:C.muted }}>Submitted</p>
                    </div>
                    <button onClick={()=>openWorkerDoc(selected, PAN_DOC)}
                      style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:C.primary }}>🔍 View</button>
                  </div>
                )}
                {!allDocsSubmitted(selected) && (
                  <p style={{ fontSize:12, color:'#92400E', background:'#FEF3C7', borderRadius:9, padding:'8px 11px', marginTop:10 }}>
                    ⚠️ Identity check incomplete — this worker has not submitted all three documents.
                  </p>
                )}
                {selected.kyc_rejection_reason && (
                  <p style={{ fontSize:12, color:'#991B1B', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:9, padding:'8px 11px', marginTop:10 }}>
                    Last decision: {selected.kyc_rejection_reason}
                  </p>
                )}
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom: bkgs.length?20:0 }}>
                {(selected.kyc_status||'pending')!=='approved' && (
                  <button onClick={()=>updateKYC(selected.id,'approved')} disabled={saving}
                    style={{ background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✅ Approve Verification</button>
                )}
                <button onClick={()=>updateKYC(selected.id,'resubmit_required')} disabled={saving}
                  style={{ background:'#fff', color:C.warning, border:'1.5px solid '+C.warning, borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>↻ Request Resubmission</button>
                <button onClick={()=>updateKYC(selected.id,'rejected')} disabled={saving}
                  style={{ background:C.danger, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕ Reject</button>
                {(selected.account_status||'active')==='active'
                  ? <button onClick={()=>updateStatus(selected.id,'suspended')} disabled={saving}
                      style={{ background:C.warning, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>⚠ Suspend</button>
                  : <button onClick={()=>updateStatus(selected.id,'active')} disabled={saving}
                      style={{ background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✓ Restore</button>
                }
                <button onClick={()=>deleteWorker(selected)} disabled={saving}
                  style={{ background:'#7f1d1d', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>🗑 Delete Account</button>
              </div>
              {bkgs.length > 0 && (
                <div>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Recent Bookings</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {bkgs.map(b=>(
                      <div key={b.id} style={{ background:C.bg, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between' }}>
                        <div><p style={{ fontWeight:600, fontSize:13 }}>{b.service||'Service'}</p><p style={{ fontSize:11, color:C.muted }}>{fmt(b.created_at)}</p></div>
                        <div style={{ textAlign:'right' }}><p style={{ fontWeight:700 }}>{INR(b.amount)}</p><p style={{ fontSize:11, color:C.muted }}>{b.status}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
