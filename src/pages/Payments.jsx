import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }
const td = { padding:'10px 14px', fontSize:13, color:'#e2e8f0', borderBottom:'1px solid #0f172a', whiteSpace:'nowrap' }

export default function Payments() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const { data } = await sb.from('bookings')
        .select('id,service,amount,status,payment_status,created_at,customer_name,worker_id,city')
        .order('created_at', { ascending: false })
        .limit(300)
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q || r.customer_name?.toLowerCase().includes(q) || r.service?.toLowerCase().includes(q) || r.city?.toLowerCase().includes(q)
    const matchF = filter === 'all' || r.payment_status === filter || r.status === filter
    return matchQ && matchF
  })

  const totalRevenue = rows.filter(r => r.status === 'completed').reduce((s, r) => s + (r.amount || 0), 0)
  const totalCommission = Math.round(totalRevenue * 0.10)
  const pendingCount = rows.filter(r => r.payment_status === 'pending').length

  const badge = s => {
    const map = { completed:'#22c55e', confirmed:'#6366f1', pending:'#f59e0b', cancelled:'#ef4444', paid:'#22c55e' }
    return <span style={{ background: (map[s]||'#475569')+'22', color: map[s]||'#94a3b8', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>{s}</span>
  }

  const fmt = n => '₹' + (n||0).toLocaleString('en-IN')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

  return (
    <div style={{ padding:24, fontFamily:'inherit' }}>
      <h1 style={{ color:'#f1f5f9', fontSize:22, fontWeight:800, marginBottom:4 }}>💳 Payments</h1>
      <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>All booking transactions</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Total Bookings', rows.length, '#6366f1'],
          ['Revenue (Gross)', fmt(totalRevenue), '#22c55e'],
          ['Platform Commission (10%)', fmt(totalCommission), '#f59e0b'],
          ['Pending Payments', pendingCount, '#ef4444'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#1e293b', borderRadius:12, padding:'16px 18px', border:'1px solid #334155' }}>
            <p style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:6 }}>{l}</p>
            <p style={{ color:c, fontSize:22, fontWeight:900 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, service, city..."
          style={{ flex:1, minWidth:200, background:'#1e293b', border:'1px solid #334155', borderRadius:10, padding:'8px 14px', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        {['all','completed','pending','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid '+(filter===f?'#6366f1':'#334155'), background:filter===f?'#6366f1':'#1e293b', color:filter===f?'#fff':'#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

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
                {['Date','Service','Customer','City','Amount','Worker Payout (90%)','Status','Payment'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign:'center', color:'#475569', padding:40 }}>No records found</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} style={{ cursor:'default' }}>
                  <td style={td}>{fmtDate(r.created_at)}</td>
                  <td style={td}>{r.service || '—'}</td>
                  <td style={td}>{r.customer_name || '—'}</td>
                  <td style={td}>{r.city || '—'}</td>
                  <td style={td}><span style={{ fontFamily:'monospace', fontSize:12, color:'#6366f1', fontWeight:700 }}>{fmt(r.amount)}</span></td>
                  <td style={td}><span style={{ fontFamily:'monospace', fontSize:12, color:'#22c55e', fontWeight:700 }}>{fmt(Math.round((r.amount||0)*0.9))}</span></td>
                  <td style={td}>{badge(r.status)}</td>
                  <td style={td}>{badge(r.payment_status||'pending')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:'10px 14px', color:'#475569', fontSize:12 }}>{filtered.length} records</div>
        </div>
      )}
    </div>
  )
}
