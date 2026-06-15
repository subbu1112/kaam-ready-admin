import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const INR = v => '₹' + (v||0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

function KycBadge({ status }) {
  const m = { approved:['#D1FAE5','#065F46','✅ Approved'], pending:['#FEF3C7','#92400E','⏳ Pending'], rejected:['#FEE2E2','#991B1B','✕ Rejected'] }
  const [bg,col,lbl] = m[status] || m.pending
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{lbl}</span>
}

function StatusBadge({ status }) {
  const m = { active:['#D1FAE5','#065F46','Active'], suspended:['#FEE2E2','#991B1B','Suspended'], blocked:['#FEE2E2','#991B1B','Blocked'] }
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
    setSaving(true)
    await sb.from('workers').update({ kyc_status: status, aadhar_verified: status==='approved', aadhaar_verified: status==='approved' }).eq('id', id)
    await sb.from('admin_logs').insert({ admin_id: user.id, action:'update_kyc', target_id: id, details:{ kyc_status: status } }).then(()=>{})
    await load()
    setSaving(false)
    setSelected(s => s ? { ...s, kyc_status: status, aadhar_verified: status==='approved' } : null)
    showToast('KYC ' + status, status==='approved' ? 'success' : 'error')
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
            {[['all',C.primary],['pending',C.warning],['approved',C.success],['rejected',C.danger]].map(([f,col])=>(
              <button key={f} onClick={()=>setKycF(f)}
                style={{ padding:'7px 13px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', textTransform:'capitalize',
                  background:kycF===f?col:C.bg, color:kycF===f?'#fff':C.muted }}>KYC: {f}</button>
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
              {(selected.aadhar_front_url||selected.aadhaar_front_url||selected.pan_front_url) && (
                <div style={{ marginBottom:20 }}>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>KYC Documents</p>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    {[['Aadhaar Front',selected.aadhar_front_url||selected.aadhaar_front_url],['Aadhaar Back',selected.aadhar_back_url||selected.aadhaar_back_url],['PAN',selected.pan_front_url]].filter(([,u])=>u).map(([l,u])=>(
                      <a key={l} href={u} target="_blank" rel="noreferrer"
                        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, background:C.bg, borderRadius:10, padding:10, border:'1px solid '+C.border, textDecoration:'none', color:C.text }}>
                        <img src={u} alt={l} style={{ width:80, height:60, objectFit:'cover', borderRadius:6 }} />
                        <span style={{ fontSize:11, fontWeight:600 }}>{l}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom: bkgs.length?20:0 }}>
                {(selected.kyc_status||'pending')==='pending' && <>
                  <button onClick={()=>updateKYC(selected.id,'approved')} disabled={saving}
                    style={{ background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✅ Approve KYC</button>
                  <button onClick={()=>updateKYC(selected.id,'rejected')} disabled={saving}
                    style={{ background:C.danger, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕ Reject KYC</button>
                </>}
                {(selected.account_status||'active')==='active'
                  ? <button onClick={()=>updateStatus(selected.id,'suspended')} disabled={saving}
                      style={{ background:C.warning, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>⚠ Suspend</button>
                  : <button onClick={()=>updateStatus(selected.id,'active')} disabled={saving}
                      style={{ background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✓ Restore</button>
                }
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
