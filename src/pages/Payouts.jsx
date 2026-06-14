import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }
const td = { padding:'10px 14px', fontSize:13, color:'#e2e8f0', borderBottom:'1px solid #0f172a' }

export default function Payouts() {
  const [payouts, setPayouts] = useState([])
  const [workers, setWorkers] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(null)
  const [utrInput, setUtrInput] = useState({})
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    async function load() {
      const [{ data: pData }, { data: wData }] = await Promise.all([
        sb.from('payouts').select('*').order('created_at', { ascending: false }).limit(300),
        sb.from('workers').select('id,name,upi_id,phone'),
      ])
      setPayouts(pData || [])
      const wMap = {}
      for (const w of wData || []) wMap[w.id] = w
      setWorkers(wMap)
      setLoading(false)
    }
    load()
  }, [])

  async function markPaid(payout) {
    const utr = utrInput[payout.id] || ''
    setSaving(payout.id)
    const { error } = await sb.from('payouts').update({ status:'paid', utr: utr || null, paid_at: new Date().toISOString() }).eq('id', payout.id)
    if (error) showToast('Error: ' + error.message)
    else {
      setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status:'paid', utr, paid_at: new Date().toISOString() } : p))
      showToast('Payout marked as paid ✓')
    }
    setSaving(null)
  }

  async function createPayouts() {
    // Auto-calculate pending payouts from completed bookings
    const { data: completed } = await sb.from('bookings')
      .select('worker_id,amount')
      .eq('status', 'completed')
      .eq('payout_created', false)

    if (!completed?.length) { showToast('No new payouts to create'); return }

    const grouped = {}
    for (const b of completed) {
      if (!grouped[b.worker_id]) grouped[b.worker_id] = 0
      grouped[b.worker_id] += Math.round((b.amount || 0) * 0.9)
    }

    for (const [wid, amt] of Object.entries(grouped)) {
      await sb.from('payouts').insert({ worker_id:wid, amount:amt, status:'pending', week_start: new Date().toISOString() })
    }
    showToast(`Created payouts for ${Object.keys(grouped).length} workers`)
    window.location.reload()
  }

  const filtered = filter === 'all' ? payouts : payouts.filter(p => p.status === filter)
  const pendingTotal = payouts.filter(p => p.status==='pending').reduce((s,p) => s+(p.amount||0), 0)
  const paidTotal    = payouts.filter(p => p.status==='paid').reduce((s,p) => s+(p.amount||0), 0)

  const fmt = n => '₹'+(n||0).toLocaleString('en-IN')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

  return (
    <div style={{ padding:24, fontFamily:'inherit', position:'relative' }}>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, background:'#1e293b', color:'#e2e8f0', padding:'12px 20px', borderRadius:12, fontWeight:700, fontSize:13, zIndex:999, border:'1px solid #334155', boxShadow:'0 4px 20px rgba(0,0,0,.4)' }}>
          {toast}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ color:'#f1f5f9', fontSize:22, fontWeight:800, marginBottom:4 }}>💸 Payouts</h1>
          <p style={{ color:'#64748b', fontSize:13 }}>Manage worker payment disbursements</p>
        </div>
        <button onClick={createPayouts}
          style={{ background:'#6366f1', border:'none', borderRadius:10, padding:'10px 18px', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          + Generate Payouts
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Total Payouts', payouts.length, '#94a3b8'],
          ['Pending', fmt(pendingTotal), '#f59e0b'],
          ['Paid Out', fmt(paidTotal), '#22c55e'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#1e293b', borderRadius:12, padding:'16px 18px', border:'1px solid #334155' }}>
            <p style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:6 }}>{l}</p>
            <p style={{ color:c, fontSize:22, fontWeight:900 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['all','pending','paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'8px 16px', borderRadius:10, border:'1.5px solid '+(filter===f?'#6366f1':'#334155'), background:filter===f?'#6366f1':'#1e293b', color:filter===f?'#fff':'#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
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
                {['Date','Worker','Phone','UPI ID','Amount','Week','UTR','Status','Action'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ ...td, textAlign:'center', color:'#475569', padding:40 }}>No payouts found</td></tr>
              )}
              {filtered.map(p => {
                const w = workers[p.worker_id]
                const isPending = p.status === 'pending'
                return (
                  <tr key={p.id}>
                    <td style={td}>{fmtDate(p.created_at)}</td>
                    <td style={td}>
                      <p style={{ fontWeight:700, color:'#e2e8f0' }}>{w?.name || '—'}</p>
                      <p style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{p.worker_id?.slice(0,8)}...</p>
                    </td>
                    <td style={td}>{w?.phone || '—'}</td>
                    <td style={td}><span style={{ fontFamily:'monospace', fontSize:11, color:'#a5b4fc' }}>{w?.upi_id || '—'}</span></td>
                    <td style={td}><span style={{ fontFamily:'monospace', fontSize:13, color:'#22c55e', fontWeight:700 }}>{'₹'+(p.amount||0).toLocaleString('en-IN')}</span></td>
                    <td style={td}>{fmtDate(p.week_start)}</td>
                    <td style={td}>
                      {isPending ? (
                        <input value={utrInput[p.id] || ''} onChange={e => setUtrInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Enter UTR..." style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:6, padding:'4px 8px', color:'#e2e8f0', fontSize:11, outline:'none', fontFamily:'inherit', width:100 }} />
                      ) : (
                        <span style={{ fontFamily:'monospace', fontSize:11, color:'#64748b' }}>{p.utr || '—'}</span>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ background: isPending?'#f59e0b22':'#22c55e22', color: isPending?'#f59e0b':'#22c55e', padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:700 }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={td}>
                      {isPending && (
                        <button onClick={() => markPaid(p)} disabled={saving === p.id}
                          style={{ background:'#22c55e', border:'none', borderRadius:8, padding:'6px 12px', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'inherit', opacity:saving===p.id?0.6:1 }}>
                          {saving === p.id ? '...' : '✓ Mark Paid'}
                        </button>
                      )}
                      {!isPending && <span style={{ color:'#64748b', fontSize:11 }}>Paid {fmtDate(p.paid_at)}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding:'10px 14px', color:'#475569', fontSize:12 }}>{filtered.length} records</div>
        </div>
      )}
    </div>
  )
}
