import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }
const td = { padding:'10px 14px', fontSize:13, color:'#e2e8f0', borderBottom:'1px solid #0f172a' }

export default function Workers() {
  const [workers, setWorkers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search,  setSearch]    = useState('')
  const [filter,  setFilter]    = useState('all')
  const [selected, setSelected] = useState(null)
  const [toast,   setToast]     = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function load() {
    const { data } = await sb.from('workers')
      .select(`id,name,phone,email,alternate_phone,city,address,skill,skills,
               upi_id,is_online,rating,total_jobs,wallet_balance,trust_score,
               kyc_status,account_status,onboarding_done,created_at,
               aadhar_submitted,aadhar_verified,aadhar_front_url,aadhar_back_url,aadhaar_number,
               pan_submitted,pan_verified,pan_front_url,pan_number,
               service_radius_km,working_hours_start,working_hours_end`)
      .order('created_at', { ascending: false })
      .limit(300)
    setWorkers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id, status) {
    const { error } = await sb.from('workers').update({ account_status: status }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else {
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, account_status: status } : w))
      if (selected?.id === id) setSelected(s => ({ ...s, account_status: status }))
      showToast('Status updated ✓')
    }
  }

  async function verifyKYC(id) {
    const { error } = await sb.from('workers').update({ kyc_status:'verified', aadhar_verified:true }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else {
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, kyc_status:'verified', aadhar_verified:true } : w))
      if (selected?.id === id) setSelected(s => ({ ...s, kyc_status:'verified', aadhar_verified:true }))
      showToast('KYC verified ✓')
    }
  }

  async function verifyPAN(id) {
    const { error } = await sb.from('workers').update({ pan_verified: true }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else {
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, pan_verified:true } : w))
      if (selected?.id === id) setSelected(s => ({ ...s, pan_verified:true }))
      showToast('PAN verified ✓')
    }
  }

  const filtered = workers.filter(w => {
    const q = search.toLowerCase()
    const matchQ = !q || w.name?.toLowerCase().includes(q) || w.phone?.includes(q) || w.city?.toLowerCase().includes(q) || w.skill?.toLowerCase().includes(q) || w.email?.toLowerCase().includes(q)
    const matchF = filter === 'all' || w.account_status === filter || (filter==='online' && w.is_online) || (filter==='kyc_pending' && w.kyc_status==='pending')
    return matchQ && matchF
  })

  const fmt = n => '₹'+(n||0).toLocaleString('en-IN')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

  const badge = (label, color) => (
    <span style={{ background:color+'22', color, padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>{label}</span>
  )

  return (
    <div style={{ padding:24, fontFamily:'inherit', position:'relative' }}>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, background:'#1e293b', color:'#e2e8f0', padding:'12px 20px', borderRadius:12, fontWeight:700, fontSize:13, zIndex:1000, border:'1px solid #334155', boxShadow:'0 4px 20px rgba(0,0,0,.4)' }}>
          {toast}
        </div>
      )}

      <h1 style={{ color:'#f1f5f9', fontSize:22, fontWeight:800, marginBottom:4 }}>👷 Workers</h1>
      <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>All registered service providers</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Total Workers', workers.length, '#6366f1'],
          ['Online Now', workers.filter(w => w.is_online).length, '#22c55e'],
          ['KYC Pending', workers.filter(w => w.kyc_status==='pending').length, '#f59e0b'],
          ['Suspended', workers.filter(w => w.account_status==='suspended').length, '#ef4444'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#1e293b', borderRadius:12, padding:'16px 18px', border:'1px solid #334155' }}>
            <p style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:6 }}>{l}</p>
            <p style={{ color:c, fontSize:22, fontWeight:900 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, city, skill, email..."
          style={{ flex:1, minWidth:220, background:'#1e293b', border:'1px solid #334155', borderRadius:10, padding:'8px 14px', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        {[['all','All'],['active','Active'],['online','Online'],['suspended','Suspended'],['kyc_pending','KYC Pending']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid '+(filter===v?'#6366f1':'#334155'), background:filter===v?'#6366f1':'#1e293b', color:filter===v?'#fff':'#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ background:'#1e293b', borderRadius:20, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ color:'#f1f5f9', fontWeight:800, fontSize:18 }}>{selected.name}</h2>
                <p style={{ color:'#64748b', fontSize:12, marginTop:3 }}>{selected.skill} • {selected.city}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'#334155', border:'none', borderRadius:8, padding:'6px 14px', color:'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Close</button>
            </div>

            {/* Contact Info */}
            <div style={{ background:'#0f2847', borderRadius:12, padding:16, marginBottom:14, border:'1px solid #1e4d8c' }}>
              <p style={{ color:'#60a5fa', fontWeight:800, fontSize:13, marginBottom:12 }}>📞 Contact Information</p>
              {[
                ['Phone', selected.phone],
                ['Email', selected.email || '—'],
                ['Alternate Phone', selected.alternate_phone || '—'],
                ['Address', selected.address || '—'],
                ['City', selected.city || '—'],
                ['Working Hours', selected.working_hours_start ? `${selected.working_hours_start} – ${selected.working_hours_end}` : '—'],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', gap:12, marginBottom:8 }}>
                  <span style={{ color:'#64748b', fontSize:12, fontWeight:600, minWidth:130, flexShrink:0 }}>{l}</span>
                  <span style={{ color:'#e2e8f0', fontSize:13 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Info grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                ['Rating', (selected.rating||5.0).toFixed(1)+'⭐', '#f59e0b'],
                ['Total Jobs', selected.total_jobs||0, '#6366f1'],
                ['Wallet', fmt(selected.wallet_balance), '#22c55e'],
                ['Trust Score', (selected.trust_score||100)+'%', '#a5b4fc'],
                ['UPI ID', selected.upi_id||'—', '#94a3b8'],
                ['Service Radius', (selected.service_radius_km||10)+' km', '#94a3b8'],
                ['Aadhaar No.', selected.aadhaar_number||'—', '#94a3b8'],
                ['PAN No.', selected.pan_number||'—', '#94a3b8'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:'#0f172a', borderRadius:10, padding:'12px 14px' }}>
                  <p style={{ color:'#64748b', fontSize:10, fontWeight:600, marginBottom:4 }}>{l}</p>
                  <p style={{ color:c||'#e2e8f0', fontSize:13, fontWeight:700 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* KYC Status */}
            <div style={{ background:'#0f172a', borderRadius:12, padding:14, marginBottom:14 }}>
              <p style={{ color:'#64748b', fontSize:12, fontWeight:700, marginBottom:10, textTransform:'uppercase' }}>KYC Status</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                {badge('Aadhaar: '+(selected.aadhar_verified?'✓ Verified':selected.aadhar_submitted?'Submitted':'Not Submitted'),
                  selected.aadhar_verified?'#22c55e':selected.aadhar_submitted?'#f59e0b':'#ef4444')}
                {badge('PAN: '+(selected.pan_verified?'✓ Verified':selected.pan_submitted?'Submitted':'Not Submitted'),
                  selected.pan_verified?'#22c55e':selected.pan_submitted?'#f59e0b':'#94a3b8')}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {selected.aadhar_front_url && (
                  <a href={selected.aadhar_front_url} target="_blank" rel="noreferrer"
                    style={{ color:'#6366f1', fontSize:11, fontWeight:700, padding:'4px 10px', background:'#6366f122', borderRadius:6, textDecoration:'none' }}>
                    View Aadhaar Front
                  </a>
                )}
                {selected.aadhar_back_url && (
                  <a href={selected.aadhar_back_url} target="_blank" rel="noreferrer"
                    style={{ color:'#6366f1', fontSize:11, fontWeight:700, padding:'4px 10px', background:'#6366f122', borderRadius:6, textDecoration:'none' }}>
                    View Aadhaar Back
                  </a>
                )}
                {selected.pan_front_url && (
                  <a href={selected.pan_front_url} target="_blank" rel="noreferrer"
                    style={{ color:'#a5b4fc', fontSize:11, fontWeight:700, padding:'4px 10px', background:'#6366f122', borderRadius:6, textDecoration:'none' }}>
                    View PAN Card
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {!selected.aadhar_verified && selected.aadhar_submitted && (
                <button onClick={() => verifyKYC(selected.id)} style={{ background:'#22c55e', border:'none', borderRadius:10, padding:'10px 16px', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  ✓ Verify Aadhaar
                </button>
              )}
              {!selected.pan_verified && selected.pan_submitted && (
                <button onClick={() => verifyPAN(selected.id)} style={{ background:'#6366f1', border:'none', borderRadius:10, padding:'10px 16px', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  ✓ Verify PAN
                </button>
              )}
              {selected.account_status !== 'suspended' ? (
                <button onClick={() => updateStatus(selected.id, 'suspended')} style={{ background:'#ef444422', border:'1px solid #ef4444', borderRadius:10, padding:'10px 16px', color:'#ef4444', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  Suspend
                </button>
              ) : (
                <button onClick={() => updateStatus(selected.id, 'active')} style={{ background:'#22c55e22', border:'1px solid #22c55e', borderRadius:10, padding:'10px 16px', color:'#22c55e', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  Reinstate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:32, height:32, border:'3px solid #1e293b', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ background:'#1e293b', borderRadius:14, border:'1px solid #334155', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Name','Phone','Skill','City','Rating','Jobs','Wallet','KYC','Status','Online',''].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ ...td, textAlign:'center', color:'#475569', padding:40 }}>No workers found</td></tr>
              )}
              {filtered.map(w => (
                <tr key={w.id} style={{ cursor:'pointer' }} onClick={() => setSelected(w)}>
                  <td style={td}><p style={{ fontWeight:700 }}>{w.name||'—'}</p></td>
                  <td style={td}>{w.phone||'—'}</td>
                  <td style={td}>{w.skill||'—'}</td>
                  <td style={td}>{w.city||'—'}</td>
                  <td style={td}>{(w.rating||5.0).toFixed(1)}⭐</td>
                  <td style={td}>{w.total_jobs||0}</td>
                  <td style={td}><span style={{ fontFamily:'monospace', fontSize:11, color:'#22c55e', fontWeight:700 }}>{fmt(w.wallet_balance)}</span></td>
                  <td style={td}>
                    {w.kyc_status==='verified' ? badge('Verified','#22c55e') : w.aadhar_submitted ? badge('Pending','#f59e0b') : badge('None','#64748b')}
                  </td>
                  <td style={td}>
                    {w.account_status==='active' ? badge('Active','#22c55e') : w.account_status==='suspended' ? badge('Suspended','#ef4444') : badge(w.account_status||'—','#64748b')}
                  </td>
                  <td style={td}>
                    <span style={{ background:w.is_online?'#22c55e':'#334155', width:8, height:8, borderRadius:'50%', display:'inline-block' }} />
                  </td>
                  <td style={td}><span style={{ color:'#6366f1', fontWeight:700, fontSize:12 }}>View →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:'10px 14px', color:'#475569', fontSize:12 }}>{filtered.length} workers</div>
        </div>
      )}
    </div>
  )
}
