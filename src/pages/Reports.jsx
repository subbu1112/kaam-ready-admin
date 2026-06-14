import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const Y = '#F5C000'

// Simple bar chart
function BarChart({ data, valueKey = 'v', labelKey = 'l', color = Y, height = 120, prefix = '' }) {
  if (!data?.length) return <div style={{ color:'#475569', padding:20, textAlign:'center' }}>No data</div>
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{ color:'#475569', fontSize:10, writingMode: data.length>7 ? 'vertical-lr' : 'horizontal-tb' }}>
            {prefix}{d[valueKey]?.toLocaleString()}
          </div>
          <div style={{
            width:'100%', background:color, opacity:.8,
            height: Math.max(4, (d[valueKey] / max) * (height - 28)),
            borderRadius:'3px 3px 0 0', minWidth:8
          }} />
          <div style={{ color:'#475569', fontSize:9, textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>
            {d[labelKey]}
          </div>
        </div>
      ))}
    </div>
  )
}

const RANGES = [
  { l:'Last 7 Days',  days: 7  },
  { l:'Last 30 Days', days: 30 },
  { l:'Last 90 Days', days: 90 },
]

export default function Reports({ showToast }) {
  const [range,       setRange]       = useState(30)
  const [bookings,    setBookings]    = useState([])
  const [workers,     setWorkers]     = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { load() }, [range])

  async function load() {
    setLoading(true)
    const from = new Date()
    from.setDate(from.getDate() - range)

    const [bRes, wRes] = await Promise.all([
      sb.from('bookings').select('id, status, amount, service, city, created_at, worker_id').gte('created_at', from.toISOString()),
      sb.from('workers').select('id, skill, city, total_jobs, rating, kyc_status'),
    ])
    if (bRes.error) showToast(bRes.error.message, 'error')
    if (wRes.error) showToast(wRes.error.message, 'error')
    setBookings(bRes.data || [])
    setWorkers(wRes.data  || [])
    setLoading(false)
  }

  // Aggregate helpers
  function byField(arr, field, valField, valFn) {
    const map = {}
    arr.forEach(x => {
      const k = x[field] || 'Unknown'
      if (!map[k]) map[k] = 0
      map[k] += valFn ? valFn(x) : (x[valField] || 1)
    })
    return Object.entries(map).map(([l,v]) => ({ l, v })).sort((a,b) => b.v-a.v)
  }

  const completed = bookings.filter(b => b.status === 'completed')
  const cancelled = bookings.filter(b => b.status === 'cancelled')
  const gmv       = completed.reduce((s,b) => s+(b.amount||0), 0)

  // Daily bookings
  const dayMap = {}
  bookings.forEach(b => {
    const d = b.created_at?.slice(5,10)  // MM-DD
    if (d) dayMap[d] = (dayMap[d]||0) + 1
  })
  const dailyData = Object.entries(dayMap).sort().slice(-14).map(([l,v]) => ({ l, v }))

  // By service
  const byService = byField(bookings, 'service', null, null).slice(0,9)

  // By city
  const byCity    = byField(bookings, 'city',    null, null).slice(0,10)

  // Top workers
  const workerJobMap = {}
  completed.forEach(b => { if (b.worker_id) workerJobMap[b.worker_id] = (workerJobMap[b.worker_id]||0)+1 })
  const topWorkerIds = Object.entries(workerJobMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,cnt]) => ({id,cnt}))
  const topWorkers = topWorkerIds.map(({ id, cnt }) => {
    const w = workers.find(w => w.id === id)
    return { l: w?.name || id.slice(0,8), v: cnt, skill: w?.skill }
  })

  // Revenue by service
  const revByService = byField(completed, 'service', 'amount', b => b.amount||0).slice(0,9)

  function exportCSV() {
    const rows = [
      ['Date','Service','City','Status','Amount'],
      ...bookings.map(b => [b.created_at?.slice(0,10), b.service, b.city, b.status, b.amount||0])
    ].map(r => r.join(',')).join('\n')
    const blob = new Blob([rows], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href=url; a.download='kaamready-report.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('Report exported ✓')
  }

  const KPIs = [
    { ico:'📋', l:'Total Bookings',   v: bookings.length,   color:'#3b82f6' },
    { ico:'✅', l:'Completed',         v: completed.length,  color:'#22c55e' },
    { ico:'❌', l:'Cancelled',         v: cancelled.length,  color:'#ef4444' },
    { ico:'💰', l:'GMV',              v: '₹'+gmv.toLocaleString(), color:Y },
    { ico:'🏦', l:'Commission (10%)', v: '₹'+Math.round(gmv*.10).toLocaleString(), color:'#a855f7' },
    { ico:'🔧', l:'Active Workers',   v: workers.filter(w=>w.kyc_status==='approved').length, color:'#f97316' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Controls */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ display:'flex', gap:8 }}>
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setRange(r.days)}
              style={{
                padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:13, fontWeight:600,
                background: range===r.days ? Y : '#1E293B',
                color: range===r.days ? '#0F172A' : '#64748B'
              }}>
              {r.l}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={exportCSV}
            style={{ background:Y, border:'none', borderRadius:8, padding:'8px 16px', color:'#0F172A', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
            ↓ Export CSV
          </button>
          <button onClick={load}
            style={{ background:'#334155', border:'none', borderRadius:8, padding:'8px 14px', color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
            ↻
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#475569' }}>⏳ Loading analytics…</div>
      ) : (
        <>
          {/* KPI grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
            {KPIs.map(k => (
              <div key={k.l} style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:20, marginBottom:6 }}>{k.ico}</div>
                <div style={{ color:'#64748B', fontSize:10, textTransform:'uppercase' }}>{k.l}</div>
                <div style={{ color:k.color, fontWeight:800, fontSize:20, marginTop:4 }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Daily bookings chart */}
          <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 24px' }}>
            <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 20px' }}>Daily Bookings Trend</h3>
            <BarChart data={dailyData} height={130} color="#3b82f6" />
          </div>

          {/* 2-col charts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 24px' }}>
              <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 16px' }}>Bookings by Service</h3>
              <BarChart data={byService} height={120} color={Y} />
            </div>
            <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 24px' }}>
              <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 16px' }}>Bookings by City</h3>
              <BarChart data={byCity} height={120} color="#a855f7" />
            </div>
          </div>

          {/* Revenue by service + Top workers */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 24px' }}>
              <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 16px' }}>Revenue by Service (₹)</h3>
              <BarChart data={revByService} height={120} color="#22c55e" prefix="₹" />
            </div>
            <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 24px' }}>
              <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 16px' }}>Top Workers (by Jobs)</h3>
              {topWorkers.length === 0
                ? <div style={{ color:'#475569', textAlign:'center', padding:20 }}>No completed jobs yet</div>
                : topWorkers.map((w, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #334155' }}>
                    <span style={{ color:Y, fontWeight:800, minWidth:20, fontSize:13 }}>#{i+1}</span>
                    <span style={{ flex:1, color:'#F1F5F9', fontSize:13 }}>{w.l}</span>
                    {w.skill && <span style={{ color:'#64748B', fontSize:11 }}>{w.skill}</span>}
                    <span style={{ color:'#22c55e', fontWeight:700, fontSize:14 }}>{w.v} jobs</span>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  )
}
