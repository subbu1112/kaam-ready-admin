import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import DataTable from '../components/DataTable'

const Y = '#F5C000'

const STATUS_COLORS = {
  pending:   { bg:'#fef3c720', color:'#d97706' },
  approved:  { bg:'#dcfce720', color:'#16a34a' },
  rejected:  { bg:'#fee2e220', color:'#dc2626' },
  suspended: { bg:'#f3f4f620', color:'#6b7280' },
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:6, textTransform:'capitalize'
    }}>{status || 'pending'}</span>
  )
}

export default function Workers({ showToast }) {
  const [workers,  setWorkers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')  // all | pending | approved | rejected
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [kyc,      setKyc]      = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await sb
      .from('workers')
      .select('id, name, phone, skill, city, is_online, kyc_status, rating, total_jobs, price_min, upi_id, created_at, aadhaar_front_url, aadhaar_back_url')
      .order('created_at', { ascending: false })
    if (error) showToast(error.message, 'error')
    else setWorkers(data || [])
    setLoading(false)
  }

  async function approve(id) {
    const { error } = await sb.from('workers').update({ kyc_status:'approved' }).eq('id', id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Worker approved ✓')
    setSelected(w => w?.id === id ? {...w, kyc_status:'approved'} : w)
    setWorkers(ws => ws.map(w => w.id === id ? {...w, kyc_status:'approved'} : w))
  }

  async function reject(id) {
    const { error } = await sb.from('workers').update({ kyc_status:'rejected' }).eq('id', id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Worker rejected')
    setSelected(w => w?.id === id ? {...w, kyc_status:'rejected'} : w)
    setWorkers(ws => ws.map(w => w.id === id ? {...w, kyc_status:'rejected'} : w))
  }

  async function suspend(id) {
    const { error } = await sb.from('workers').update({ kyc_status:'suspended', is_online: false }).eq('id', id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Worker suspended')
    setSelected(null)
    setWorkers(ws => ws.map(w => w.id === id ? {...w, kyc_status:'suspended', is_online:false} : w))
  }

  async function loadKyc(worker) {
    if (!worker.aadhaar_front_url && !worker.aadhaar_back_url) {
      showToast('No KYC documents uploaded', 'error'); return
    }
    // Get signed URLs for KYC images
    const signed = {}
    for (const [k, path] of [['front', worker.aadhaar_front_url], ['back', worker.aadhaar_back_url]]) {
      if (!path) continue
      const { data } = await sb.storage.from('kyc').createSignedUrl(path.split('/kyc/')[1] || path, 3600)
      if (data?.signedUrl) signed[k] = data.signedUrl
    }
    setKyc(signed)
  }

  const filtered = workers.filter(w => {
    if (filter !== 'all' && (w.kyc_status || 'pending') !== filter) return false
    const q = search.toLowerCase()
    return !q || (w.name||'').toLowerCase().includes(q)
      || (w.phone||'').includes(q)
      || (w.skill||'').toLowerCase().includes(q)
      || (w.city||'').toLowerCase().includes(q)
  })

  const counts = {
    all:      workers.length,
    pending:  workers.filter(w => !w.kyc_status || w.kyc_status==='pending').length,
    approved: workers.filter(w => w.kyc_status==='approved').length,
    rejected: workers.filter(w => w.kyc_status==='rejected').length,
  }

  const columns = [
    { key:'name',       label:'Name',      render: v => <span style={{ color:'#F1F5F9', fontWeight:600 }}>{v || '—'}</span> },
    { key:'phone',      label:'Phone',     render: v => <span style={{ fontFamily:'monospace' }}>{v || '—'}</span> },
    { key:'skill',      label:'Skill',     render: v => <span style={{ color:Y, fontWeight:600 }}>{v || '—'}</span> },
    { key:'city',       label:'City'       },
    { key:'kyc_status', label:'KYC',       render: v => <StatusBadge status={v || 'pending'} /> },
    { key:'is_online',  label:'Status',    render: v => <span style={{ color: v ? '#22c55e' : '#475569', fontWeight:600, fontSize:12 }}>{v ? '● Online' : '○ Offline'}</span> },
    { key:'rating',     label:'Rating',    render: v => v ? `⭐ ${Number(v).toFixed(1)}` : '—' },
    { key:'total_jobs', label:'Jobs'       },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Tabs */}
      <div style={{ display:'flex', gap:8 }}>
        {['all','pending','approved','rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
              fontSize:13, fontWeight:600,
              background: filter===f ? Y : '#1E293B',
              color: filter===f ? '#0F172A' : '#64748B'
            }}>
            {f.charAt(0).toUpperCase()+f.slice(1)} ({counts[f] ?? 0})
          </button>
        ))}
        <div style={{ flex:1 }} />
        <input
          placeholder="Search name, skill, city…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            background:'#1E293B', border:'1px solid #334155', borderRadius:8,
            padding:'8px 14px', color:'#F1F5F9', fontSize:13, outline:'none',
            fontFamily:'inherit', width:220
          }}
        />
        <button onClick={load} style={{
          background:'#334155', border:'none', borderRadius:8, padding:'8px 14px',
          color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13
        }}>↻</button>
      </div>

      <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, overflow:'hidden' }}>
        <DataTable columns={columns} rows={filtered} loading={loading}
          emptyMsg="No workers found" onRowClick={setSelected} />
      </div>

      {/* Worker detail modal */}
      {selected && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:999,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20
        }} onClick={() => { setSelected(null); setKyc(null) }}>
          <div style={{
            background:'#1E293B', border:'1px solid #334155', borderRadius:20,
            padding:32, width:520, maxHeight:'90vh', overflowY:'auto',
            boxShadow:'0 24px 64px rgba(0,0,0,.5)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div>
                <h2 style={{ color:'#F1F5F9', fontWeight:700, fontSize:18, margin:0 }}>🔧 Worker Profile</h2>
                <StatusBadge status={selected.kyc_status || 'pending'} />
              </div>
              <button onClick={() => { setSelected(null); setKyc(null) }}
                style={{ background:'#334155', border:'none', borderRadius:8, color:'#94A3B8', padding:'6px 12px', cursor:'pointer', fontFamily:'inherit' }}>
                ✕
              </button>
            </div>

            {/* Details */}
            {[
              ['Name',     selected.name    || '—'],
              ['Phone',    selected.phone   || '—'],
              ['Skill',    selected.skill   || '—'],
              ['City',     selected.city    || '—'],
              ['Rating',   selected.rating ? `${selected.rating} ⭐` : '—'],
              ['Jobs Done',selected.total_jobs || 0],
              ['Min Price','₹' + (selected.price_min || 0)],
              ['UPI ID',   selected.upi_id  || 'Not set'],
              ['Joined',   selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : '—'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid #334155' }}>
                <span style={{ color:'#64748B', fontSize:13, minWidth:90 }}>{k}</span>
                <span style={{ color:'#F1F5F9', fontSize:13, fontWeight:500 }}>{v}</span>
              </div>
            ))}

            {/* KYC docs */}
            <div style={{ marginTop:20 }}>
              <button onClick={() => loadKyc(selected)}
                style={{
                  background:'#334155', border:'none', borderRadius:8, padding:'9px 18px',
                  color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13, marginBottom:14
                }}>
                📄 View KYC Documents
              </button>
              {kyc && (
                <div style={{ display:'flex', gap:12 }}>
                  {kyc.front && (
                    <div style={{ flex:1 }}>
                      <p style={{ color:'#64748B', fontSize:11, marginBottom:6 }}>AADHAAR FRONT</p>
                      <img src={kyc.front} alt="Aadhaar Front"
                        style={{ width:'100%', borderRadius:8, border:'1px solid #334155' }} />
                    </div>
                  )}
                  {kyc.back && (
                    <div style={{ flex:1 }}>
                      <p style={{ color:'#64748B', fontSize:11, marginBottom:6 }}>AADHAAR BACK</p>
                      <img src={kyc.back} alt="Aadhaar Back"
                        style={{ width:'100%', borderRadius:8, border:'1px solid #334155' }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              {selected.kyc_status !== 'approved' && (
                <button onClick={() => approve(selected.id)}
                  style={{ flex:1, background:'#16a34a', color:'#fff', border:'none', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>
                  ✓ Approve KYC
                </button>
              )}
              {selected.kyc_status !== 'rejected' && (
                <button onClick={() => reject(selected.id)}
                  style={{ flex:1, background:'#dc2626', color:'#fff', border:'none', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>
                  ✗ Reject KYC
                </button>
              )}
              <button onClick={() => suspend(selected.id)}
                style={{ background:'#334155', color:'#94A3B8', border:'none', borderRadius:10, padding:'12px 16px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>
                ⊘ Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
