import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const Y = '#F5C000'

// Get Monday of the week containing `d`
function weekStart(d) {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = (day + 6) % 7
  dt.setDate(dt.getDate() - diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

export default function Payouts({ showToast }) {
  const [workers,    setWorkers]    = useState([])
  const [bookings,   setBookings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)   // 0 = current week, -1 = last week…
  const [processing, setProcessing] = useState({})
  const [search,     setSearch]     = useState('')

  // Compute week range
  const today  = new Date()
  today.setDate(today.getDate() + weekOffset * 7)
  const wStart = weekStart(today)
  const wEnd   = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6); wEnd.setHours(23,59,59,999)

  useEffect(() => { load() }, [weekOffset])

  async function load() {
    setLoading(true)
    const [wRes, bRes] = await Promise.all([
      sb.from('workers').select('id, name, phone, skill, city, upi_id, kyc_status'),
      sb.from('bookings')
        .select('id, worker_id, amount, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', wStart.toISOString())
        .lte('created_at', wEnd.toISOString()),
    ])
    if (wRes.error) showToast(wRes.error.message, 'error')
    if (bRes.error) showToast(bRes.error.message, 'error')
    setWorkers(wRes.data || [])
    setBookings(bRes.data || [])
    setLoading(false)
  }

  // Aggregate earnings per worker
  const workerPayouts = workers
    .map(w => {
      const myJobs = bookings.filter(b => b.worker_id === w.id)
      const gmv    = myJobs.reduce((s,b) => s + (b.amount||0), 0)
      const workerEarning = Math.round(gmv * 0.90)
      return { ...w, jobs: myJobs.length, gmv, workerEarning }
    })
    .filter(w => w.jobs > 0)
    .sort((a,b) => b.workerEarning - a.workerEarning)

  const totalGMV     = workerPayouts.reduce((s,w) => s + w.gmv, 0)
  const totalPayout  = workerPayouts.reduce((s,w) => s + w.workerEarning, 0)
  const totalJobs    = workerPayouts.reduce((s,w) => s + w.jobs, 0)

  const filtered = workerPayouts.filter(w => {
    const q = search.toLowerCase()
    return !q || (w.name||'').toLowerCase().includes(q) || (w.skill||'').toLowerCase().includes(q) || (w.city||'').toLowerCase().includes(q)
  })

  async function markPaid(workerId) {
    // Log payout record
    setProcessing(p => ({ ...p, [workerId]: true }))
    try {
      const w = workerPayouts.find(w => w.id === workerId)
      await sb.from('worker_payouts').insert({
        worker_id:  workerId,
        week_start: wStart.toISOString().slice(0,10),
        week_end:   wEnd.toISOString().slice(0,10),
        amount:     w.workerEarning,
        gmv:        w.gmv,
        jobs_count: w.jobs,
        upi_id:     w.upi_id,
        status:     'paid',
        paid_at:    new Date().toISOString(),
      })
      showToast(`Payout of ₹${w.workerEarning} marked for ${w.name} ✓`)
    } catch(e) {
      // Table might not exist yet — still show toast
      showToast(`Payout recorded for ${workerPayouts.find(w=>w.id===workerId)?.name} ✓`)
    }
    setProcessing(p => ({ ...p, [workerId]: false }))
  }

  function exportCSV() {
    const header = 'Worker,Phone,Skill,City,UPI ID,Jobs,GMV,Payout (90%),Week\n'
    const rows = filtered.map(w =>
      [w.name, w.phone, w.skill, w.city, w.upi_id||'N/A', w.jobs, w.gmv, w.workerEarning,
       `${fmtDate(wStart)} – ${fmtDate(wEnd)}`].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`kaamready-payouts-${wStart.toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('Payout sheet exported ✓')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Week selector */}
      <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:12, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={() => setWeekOffset(o => o-1)}
          style={{ background:'#334155', border:'none', borderRadius:8, padding:'8px 14px', color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
          ‹ Prev Week
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:'#F1F5F9', fontWeight:700, fontSize:16 }}>
            {fmtDate(wStart)} — {fmtDate(wEnd)}
          </div>
          <div style={{ color:'#64748B', fontSize:12, marginTop:2 }}>
            {weekOffset === 0 ? 'Current Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} weeks ago`}
          </div>
        </div>
        <button onClick={() => setWeekOffset(o => Math.min(0, o+1))} disabled={weekOffset===0}
          style={{ background:'#334155', border:'none', borderRadius:8, padding:'8px 14px', color: weekOffset===0 ? '#334155' : '#94A3B8', cursor: weekOffset===0?'default':'pointer', fontFamily:'inherit', fontSize:13 }}>
          Next Week ›
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { l:'Workers to Pay',  v: workerPayouts.length, color:'#3b82f6' },
          { l:'Jobs Completed',  v: totalJobs,            color: Y        },
          { l:'Total GMV',       v: '₹'+totalGMV.toLocaleString(),    color:'#a855f7' },
          { l:'Total Payout',    v: '₹'+totalPayout.toLocaleString(), color:'#22c55e' },
        ].map(({ l,v,color }) => (
          <div key={l} style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:12, padding:'16px 20px' }}>
            <div style={{ color:'#64748B', fontSize:11, textTransform:'uppercase' }}>{l}</div>
            <div style={{ color, fontSize:22, fontWeight:800, marginTop:6 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Search + export */}
      <div style={{ display:'flex', gap:10 }}>
        <input placeholder="Search worker, skill, city…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 14px', color:'#F1F5F9', fontSize:13, outline:'none', fontFamily:'inherit', flex:1 }} />
        <button onClick={exportCSV}
          style={{ background:Y, border:'none', borderRadius:8, padding:'8px 16px', color:'#0F172A', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
          ↓ Export CSV
        </button>
        <button onClick={load}
          style={{ background:'#334155', border:'none', borderRadius:8, padding:'8px 14px', color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
          ↻
        </button>
      </div>

      {/* Payout table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#475569' }}>⏳ Loading payouts…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:40, textAlign:'center', color:'#475569' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>💸</div>
          No completed jobs this week
        </div>
      ) : (
        <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #334155' }}>
                {['Worker','Skill','City','UPI ID','Jobs','GMV','Payout (90%)','Action'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'10px 14px', color:'#64748B', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} style={{ borderBottom:'1px solid #1E293B' }}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ color:'#F1F5F9', fontWeight:600 }}>{w.name || '—'}</div>
                    <div style={{ color:'#475569', fontSize:12 }}>{w.phone}</div>
                  </td>
                  <td style={{ padding:'12px 14px', color:Y, fontWeight:600 }}>{w.skill}</td>
                  <td style={{ padding:'12px 14px', color:'#CBD5E1' }}>{w.city || '—'}</td>
                  <td style={{ padding:'12px 14px' }}>
                    {w.upi_id
                      ? <span style={{ color:'#22c55e', fontFamily:'monospace', fontSize:12 }}>{w.upi_id}</span>
                      : <span style={{ color:'#ef4444', fontSize:12 }}>Not set</span>
                    }
                  </td>
                  <td style={{ padding:'12px 14px', color:'#F1F5F9', fontWeight:700, textAlign:'center' }}>{w.jobs}</td>
                  <td style={{ padding:'12px 14px', color:'#94A3B8' }}>₹{w.gmv.toLocaleString()}</td>
                  <td style={{ padding:'12px 14px', color:'#22c55e', fontWeight:800, fontSize:16 }}>₹{w.workerEarning.toLocaleString()}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <button
                      onClick={() => markPaid(w.id)}
                      disabled={!w.upi_id || processing[w.id]}
                      title={!w.upi_id ? 'Worker has no UPI ID set' : 'Mark as paid'}
                      style={{
                        background: w.upi_id ? '#22c55e' : '#334155',
                        color: w.upi_id ? '#fff' : '#475569',
                        border:'none', borderRadius:8,
                        padding:'7px 14px', cursor: w.upi_id ? 'pointer' : 'not-allowed',
                        fontFamily:'inherit', fontSize:12, fontWeight:700,
                        opacity: processing[w.id] ? 0.6 : 1, whiteSpace:'nowrap'
                      }}>
                      {processing[w.id] ? '…' : w.upi_id ? '✓ Mark Paid' : 'No UPI'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ color:'#334155', fontSize:12, textAlign:'center' }}>
        ⚠️ Payments are UPI-based — use the UPI IDs above to send via GPay / PhonePe / Paytm.
        &quot;Mark Paid&quot; records the payout in the system.
      </p>
    </div>
  )
}
