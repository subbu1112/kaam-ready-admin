import { useState, useEffect, useCallback } from 'react'
import { sb } from './lib/supabase'

const Y = '#F5C000'
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'kaamready@admin'

const NAV = [
  { id: 'overview',  label: '📊 Analytics'  },
  { id: 'bookings',  label: '📋 Bookings'  },
  { id: 'workers',   label: '👷 Workers'   },
  { id: 'kyc',       label: '🛡️ KYC Review' },
  { id: 'commissions', label: '💸 Commissions' },
  { id: 'welfare',   label: '🏛️ Welfare Fee' },
  { id: 'payments',  label: '💳 Verify Payments' },
  { id: 'disputes',  label: '⚠️ Disputes'  },
  { id: 'payouts',   label: '💰 Payouts'   },
  { id: 'pricing',   label: '🏷️ Pricing'   },
]

function Badge({ status }) {
  const map = {
    pending:   ['#2a1a00','#F5C000'],
    searching: ['#2a1a00','#F5C000'],
    assigned:  ['#0a1a2a','#60a5fa'],
    priced:    ['#241a00','#fbbf24'],
    claimed:   ['#0a1a2a','#60a5fa'],
    accepted:  ['#0a2a1a','#34d399'],
    arrived:   ['#0a1a2a','#60a5fa'],
    completed: ['#0a2a0a','#4ade80'],
    cancelled: ['#2a0a0a','#f87171'],
    open:      ['#2a1a00','#F5C000'],
    resolved:  ['#0a2a0a','#4ade80'],
    paid:      ['#0a2a0a','#4ade80'],
    failed:    ['#2a0a0a','#f87171'],
  }
  const [bg, color] = map[status] || ['#1a1a1a','#888']
  return <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{status}</span>
}

function Card({ children, style }) {
  return <div style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:12, padding:20, ...style }}>{children}</div>
}

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <p style={{ fontSize:13, color:'#666', marginBottom:6 }}>{label}</p>
      <p style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:'#555', marginTop:4 }}>{sub}</p>}
    </Card>
  )
}

function Table({ cols, rows, loading }) {
  if (loading) return <p style={{ color:'#555', padding:20 }}>Loading…</p>
  if (!rows.length) return <p style={{ color:'#555', padding:20 }}>No records found.</p>
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #2a2a2a' }}>
            {cols.map(c => <th key={c.key} style={{ padding:'10px 12px', textAlign:'left', color:'#666', fontWeight:600, whiteSpace:'nowrap' }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:'1px solid #1f1f1f' }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding:'10px 12px', color:'#ccc', whiteSpace: c.wrap ? 'normal' : 'nowrap' }}>
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmt(ts) { return ts ? new Date(ts).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—' }

// ── Screens ──────────────────────────────────────────────────────────────────

// ANALYTICS SECTION — replaces Overview() function

function MiniBar({ pct, color = '#F5C000' }) {
  return (
    <div style={{ background:'#2a2a2a', borderRadius:4, height:8, overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width: pct + '%', background: color, borderRadius:4,
        transition:'width 1.2s cubic-bezier(.22,1,.36,1)', maxWidth:'100%' }} />
    </div>
  )
}

function TrendBadge({ value }) {
  if (value === null || value === undefined) return null
  const up = value >= 0
  return (
    <span style={{ fontSize:11, fontWeight:700, color: up ? '#4ade80' : '#f87171',
      background: up ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)',
      padding:'2px 7px', borderRadius:20 }}>
      {up ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

function DonutChart({ data, size = 120 }) {
  const total = data.reduce((s, d) => s + d.v, 0)
  if (!total) return <div style={{ width:size, height:size, borderRadius:'50%', background:'#2a2a2a' }} />
  let cumAngle = -90
  const cx = size/2, cy = size/2, r = size*0.38, sw = size*0.12
  const segments = data.map(d => {
    const angle = (d.v / total) * 360
    const startAngle = cumAngle; cumAngle += angle
    return { ...d, startAngle, angle }
  })
  function polarToXY(angle, radius) {
    const rad = (angle * Math.PI) / 180
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)]
  }
  function arcPath(start, angle) {
    const [x1,y1] = polarToXY(start, r)
    const end = start + angle - 0.3
    const [x2,y2] = polarToXY(end, r)
    const large = angle > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a2a" strokeWidth={sw} />
      {segments.map((s,i) => s.angle > 1 && (
        <path key={i} d={arcPath(s.startAngle, s.angle)} fill="none"
          stroke={s.color} strokeWidth={sw} strokeLinecap="round" />
      ))}
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
        style={{ fill:'#fff', fontSize: size*0.13, fontWeight:800, fontFamily:'Inter,sans-serif' }}>
        {total}
      </text>
      <text x={cx} y={cy+size*0.13} textAnchor="middle" dominantBaseline="middle"
        style={{ fill:'#666', fontSize: size*0.085, fontFamily:'Inter,sans-serif' }}>
        total
      </text>
    </svg>
  )
}

function SparkLine({ data, color = '#F5C000', height = 40, width = 120 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - (v / max) * (height - 4)
  ])
  const path = pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = path + ` L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={'sg'+color.replace('#','')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace('#','')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color} />
    </svg>
  )
}

function Overview() {
  const [stats, setStats]       = useState(null)
  const [bookings, setBookings] = useState([])
  const [profiles, setProfiles] = useState([])
  const [workers, setWorkers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  function refresh() { setLastRefresh(Date.now()) }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      sb.from('bookings').select('id, status, amount, service, created_at, city, payment_status, user_id'),
      sb.from('workers').select('id, is_online, onboarding_done, skill, city, created_at, total_jobs, rating'),
      sb.from('profiles').select('id, city, created_at'),
      sb.from('disputes').select('id, status'),
    ]).then(([b, w, p, d]) => {
      const bks = b.data || []
      const wks = w.data || []
      const prs = p.data || []
      const dsp = d.data || []

      const rev = bks.filter(x => x.status === 'completed').reduce((s, x) => s + (x.amount || 0), 0)
      const commission = rev * 0.10

      // Last 7 days bookings per day
      const now = new Date()
      const days7 = Array.from({length:7}, (_,i) => {
        const d = new Date(now); d.setDate(d.getDate() - (6-i))
        return d.toISOString().slice(0,10)
      })
      const bksByDay = days7.map(day => bks.filter(b => b.created_at?.slice(0,10) === day).length)
      const signupsByDay = days7.map(day => prs.filter(p => p.created_at?.slice(0,10) === day).length)

      // Service breakdown
      const svcMap = {}
      bks.forEach(b => { if (b.service) svcMap[b.service] = (svcMap[b.service] || 0) + 1 })
      const topSvcs = Object.entries(svcMap).sort((a,b)=>b[1]-a[1]).slice(0,8)

      // City breakdown
      const cityMap = {}
      bks.forEach(b => { if (b.city) cityMap[b.city] = (cityMap[b.city] || 0) + 1 })
      const topCities = Object.entries(cityMap).sort((a,b)=>b[1]-a[1]).slice(0,5)

      // Conversion funnel
      const uniqueBookers = new Set(bks.map(b=>b.user_id)).size
      const funnel = {
        signups: prs.length,
        bookers: uniqueBookers,
        completed: new Set(bks.filter(b=>b.status==='completed').map(b=>b.user_id)).size,
      }

      // Week-over-week
      const thisWeek = bks.filter(b => {
        const d = new Date(b.created_at); const diff = (now-d)/(1000*3600*24)
        return diff < 7
      }).length
      const lastWeek = bks.filter(b => {
        const d = new Date(b.created_at); const diff = (now-d)/(1000*3600*24)
        return diff >= 7 && diff < 14
      }).length
      const wow = lastWeek > 0 ? Math.round(((thisWeek-lastWeek)/lastWeek)*100) : null

      // Revenue by day (last 7)
      const revByDay = days7.map(day =>
        bks.filter(b => b.created_at?.slice(0,10) === day && b.status === 'completed')
           .reduce((s,b)=>s+(b.amount||0),0)
      )

      // Status split
      const statusSplit = ['searching','assigned','priced','completed','cancelled','scheduled']
        .map(s => ({ label: s, v: bks.filter(b=>b.status===s).length }))
        .filter(x=>x.v>0)

      const SVC_COLORS_MAP = ['#F5C000','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399','#e879f9']

      setStats({
        totalBookings: bks.length, activeBookings: bks.filter(x=>['searching','assigned','priced','scheduled'].includes(x.status)).length,
        completedBookings: bks.filter(x=>x.status==='completed').length,
        cancelledBookings: bks.filter(x=>x.status==='cancelled').length,
        revenue: rev, commission,
        totalWorkers: wks.length, onlineWorkers: wks.filter(x=>x.is_online).length,
        verifiedWorkers: wks.filter(x=>x.onboarding_done).length,
        totalCustomers: prs.length,
        openDisputes: dsp.filter(x=>x.status==='open').length,
        bksByDay, signupsByDay, revByDay, days7,
        topSvcs: topSvcs.map(([k,v],i)=>({k,v,color:SVC_COLORS_MAP[i%SVC_COLORS_MAP.length]})),
        topCities, funnel, wow, thisWeek, lastWeek,
        statusSplit: statusSplit.map((s,i)=>({...s,color:SVC_COLORS_MAP[i%SVC_COLORS_MAP.length]})),
        completionRate: bks.length>0 ? Math.round((bks.filter(x=>x.status==='completed').length/bks.length)*100) : 0,
        avgRating: wks.filter(x=>x.rating).length ? (wks.reduce((s,x)=>s+(x.rating||0),0)/wks.filter(x=>x.rating).length).toFixed(1) : '—',
        avgJobsPerWorker: wks.length ? (wks.reduce((s,x)=>s+(x.total_jobs||0),0)/wks.length).toFixed(1) : '—',
        pendingPayments: bks.filter(x=>x.payment_status==='claimed').length,
      })
      setLoading(false)
    })
  }, [lastRefresh])

  if (loading || !stats) return (
    <div style={{ display:'flex', gap:12, flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ fontSize:20, fontWeight:800 }}>Analytics</h2>
      </div>
      {[1,2,3].map(i => (
        <div key={i} style={{ background:'#1a1a1a', borderRadius:12, padding:20, height:80,
          animation:'shimmer 1.5s ease infinite', backgroundImage:'linear-gradient(90deg,#1a1a1a 0%,#252525 50%,#1a1a1a 100%)', backgroundSize:'200% 100%' }} />
      ))}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>Analytics Dashboard</h2>
          <p style={{ fontSize:12, color:'#555', marginTop:4 }}>Real-time data from Supabase</p>
        </div>
        <button onClick={refresh} style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:10,
          padding:'8px 16px', color:'#888', fontSize:13, cursor:'pointer', fontFamily:'Inter,sans-serif',
          display:'flex', alignItems:'center', gap:6 }}>
          🔄 Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
        {[
          { label:'Total Users',       value: stats.totalCustomers,       sub:'registered accounts',      color:'#60a5fa',  spark: stats.signupsByDay },
          { label:'Total Bookings',    value: stats.totalBookings,        sub:`${stats.activeBookings} active`, color:'#F5C000', spark: stats.bksByDay },
          { label:'Completed Jobs',    value: stats.completedBookings,    sub:`${stats.completionRate}% completion`, color:'#4ade80', spark: null },
          { label:'Platform Revenue',  value:`₹${stats.revenue.toLocaleString()}`, sub:`₹${Math.round(stats.commission).toLocaleString()} commission`, color:'#a78bfa', spark: stats.revByDay },
          { label:'Workers',           value: stats.totalWorkers,         sub:`${stats.onlineWorkers} online now`, color:'#fb923c', spark: null },
          { label:'Pending Verify',    value: stats.pendingPayments,      sub:'payments to confirm',      color:'#f87171',  spark: null },
        ].map(kpi => (
          <div key={kpi.label} style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:12,
            padding:'16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:12, right:12, opacity:.25 }}>
              {kpi.spark && <SparkLine data={kpi.spark} color={kpi.color} />}
            </div>
            <p style={{ fontSize:11, color:'#555', fontWeight:600, letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>{kpi.label}</p>
            <p style={{ fontSize:26, fontWeight:900, color:kpi.color, margin:'0 0 4px', letterSpacing:'-0.5px' }}>{kpi.value}</p>
            {stats.wow !== null && kpi.label === 'Total Bookings' && (
              <span style={{ marginRight:6 }}><TrendBadge value={stats.wow} /></span>
            )}
            <p style={{ fontSize:11, color:'#444', margin:0 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Service breakdown + Status donut */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Top Services */}
        <div style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:12, padding:20 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:16, color:'#ccc' }}>🔥 Top Services</p>
          {stats.topSvcs.length === 0 ? <p style={{ color:'#444', fontSize:13 }}>No bookings yet</p> :
            stats.topSvcs.map((s,i) => {
              const pct = Math.round((s.v / stats.totalBookings) * 100)
              return (
                <div key={s.k} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, color:'#ccc', fontWeight:600 }}>
                      #{i+1} {s.k}
                    </span>
                    <span style={{ fontSize:12, color: s.color, fontWeight:700 }}>{s.v} ({pct}%)</span>
                  </div>
                  <MiniBar pct={pct} color={s.color} />
                </div>
              )
            })
          }
        </div>

        {/* Booking status donut */}
        <div style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:12, padding:20 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:16, color:'#ccc' }}>📊 Booking Status</p>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            <DonutChart data={stats.statusSplit} size={110} />
            <div style={{ flex:1 }}>
              {stats.statusSplit.map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:'#888', flex:1, textTransform:'capitalize' }}>{s.label}</span>
                  <span style={{ fontSize:12, color:'#ccc', fontWeight:700 }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: 7-day chart + Funnel */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>

        {/* 7-day bookings + signups */}
        <div style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:12, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontWeight:700, fontSize:14, color:'#ccc', margin:0 }}>📈 Last 7 Days</p>
            <div style={{ display:'flex', gap:16, fontSize:11, color:'#555' }}>
              <span><span style={{ color:'#F5C000' }}>●</span> Bookings</span>
              <span><span style={{ color:'#60a5fa' }}>●</span> Signups</span>
            </div>
          </div>
          {/* Simple bar chart */}
          <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:80 }}>
            {stats.days7.map((day, i) => {
              const maxB = Math.max(...stats.bksByDay, 1)
              const maxS = Math.max(...stats.signupsByDay, 1)
              const maxAll = Math.max(maxB, maxS, 1)
              const bH = Math.round((stats.bksByDay[i] / maxAll) * 72)
              const sH = Math.round((stats.signupsByDay[i] / maxAll) * 72)
              const label = new Date(day).toLocaleDateString('en-IN', { weekday:'short' })
              return (
                <div key={day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:72 }}>
                    <div style={{ width:10, background:'#F5C000', borderRadius:'3px 3px 0 0', height:bH || 2,
                      minHeight:2, transition:'height .8s cubic-bezier(.22,1,.36,1)', opacity:.9 }} title={`${stats.bksByDay[i]} bookings`} />
                    <div style={{ width:10, background:'#60a5fa', borderRadius:'3px 3px 0 0', height:sH || 2,
                      minHeight:2, transition:'height .8s cubic-bezier(.22,1,.36,1)', opacity:.9 }} title={`${stats.signupsByDay[i]} signups`} />
                  </div>
                  <span style={{ fontSize:9, color:'#444', marginTop:2 }}>{label}</span>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:12, borderTop:'1px solid #222' }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:11, color:'#555', margin:'0 0 2px' }}>This week</p>
              <p style={{ fontSize:18, fontWeight:800, color:'#F5C000', margin:0 }}>{stats.thisWeek} bookings</p>
            </div>
            {stats.wow !== null && (
              <div style={{ flex:1 }}>
                <p style={{ fontSize:11, color:'#555', margin:'0 0 2px' }}>vs last week</p>
                <p style={{ fontSize:18, fontWeight:800, margin:0 }}><TrendBadge value={stats.wow} /></p>
              </div>
            )}
          </div>
        </div>

        {/* Conversion funnel */}
        <div style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:12, padding:20 }}>
          <p style={{ fontWeight:700, fontSize:14, color:'#ccc', marginBottom:16 }}>🎯 Conversion Funnel</p>
          {[
            { label:'Signed Up',  value: stats.funnel.signups,   color:'#60a5fa', emoji:'👤' },
            { label:'Booked',     value: stats.funnel.bookers,   color:'#F5C000', emoji:'📋' },
            { label:'Completed',  value: stats.funnel.completed, color:'#4ade80', emoji:'✅' },
          ].map((f, i, arr) => {
            const pct = i === 0 ? 100 : arr[0].value > 0 ? Math.round((f.value/arr[0].value)*100) : 0
            return (
              <div key={f.label} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'#888' }}>{f.emoji} {f.label}</span>
                  <span style={{ fontSize:12, color:f.color, fontWeight:800 }}>{f.value}</span>
                </div>
                <div style={{ background:'#2a2a2a', borderRadius:6, height:10, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:pct+'%', background:f.color, borderRadius:6,
                    transition:'width 1.4s cubic-bezier(.22,1,.36,1)', position:'relative' }}>
                    {pct > 15 && <span style={{ position:'absolute', right:5, top:0, fontSize:9, lineHeight:'10px', color:'rgba(0,0,0,.7)', fontWeight:800 }}>{pct}%</span>}
                  </div>
                </div>
                {i < arr.length-1 && (
                  <p style={{ fontSize:10, color:'#333', marginTop:3, textAlign:'right' }}>
                    {arr[0].value > 0 ? Math.round((f.value/arr[0].value)*100) : 0}% of users
                  </p>
                )}
              </div>
            )
          })}
          <div style={{ borderTop:'1px solid #2a2a2a', paddingTop:12, marginTop:4 }}>
            <p style={{ fontSize:11, color:'#555', margin:'0 0 4px' }}>Completion Rate</p>
            <p style={{ fontSize:22, fontWeight:900, color:'#4ade80', margin:0 }}>{stats.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Row 4: Cities + Worker health */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* City breakdown */}
        <div style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:12, padding:20 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:16, color:'#ccc' }}>🗺️ Bookings by City</p>
          {stats.topCities.length === 0 ? <p style={{ color:'#444', fontSize:13 }}>No data</p> :
            stats.topCities.map(([city, count]) => {
              const pct = Math.round((count/stats.totalBookings)*100)
              return (
                <div key={city} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:13, color:'#ccc' }}>📍 {city || 'Unknown'}</span>
                    <span style={{ fontSize:12, color:'#888' }}>{count} · {pct}%</span>
                  </div>
                  <MiniBar pct={pct} color='#60a5fa' />
                </div>
              )
            })
          }
        </div>

        {/* Worker health */}
        <div style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:12, padding:20 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:16, color:'#ccc' }}>👷 Worker Health</p>
          {[
            { label:'Total Workers',      value: stats.totalWorkers,       color:'#ccc'   },
            { label:'Online Now',         value: stats.onlineWorkers,      color:'#4ade80'},
            { label:'KYC Verified',       value: stats.verifiedWorkers,    color:'#F5C000'},
            { label:'Avg Rating',         value: '⭐ '+stats.avgRating,    color:'#fb923c'},
            { label:'Avg Jobs / Worker',  value: stats.avgJobsPerWorker,   color:'#a78bfa'},
          ].map(s => (
            <div key={s.label} style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', padding:'9px 0', borderBottom:'1px solid #222' }}>
              <span style={{ fontSize:13, color:'#666' }}>{s.label}</span>
              <span style={{ fontSize:14, fontWeight:800, color:s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}


function Bookings() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const statuses = ['all','searching','assigned','priced','completed','cancelled']
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Bookings</h2>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ background: filter===s ? Y : '#1a1a1a', color: filter===s ? '#000' : '#888',
              border:'1px solid #2a2a2a', borderRadius:20, padding:'5px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            {s}
          </button>
        ))}
      </div>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={filtered} cols={[
          { key:'created_at', label:'Date',    render: r => fmt(r.created_at) },
          { key:'service',    label:'Service'  },
          { key:'city',       label:'City'     },
          { key:'status',     label:'Status',  render: r => <Badge status={r.status} /> },
          { key:'amount',     label:'Amount',  render: r => r.amount ? `₹${r.amount}` : '—' },
          { key:'payment_status', label:'Payment', render: r => r.payment_status ? <Badge status={r.payment_status} /> : '—' },
          { key:'address',    label:'Address', wrap: true },
        ]} />
      </Card>
    </div>
  )
}

function Workers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sb.from('workers').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Workers ({rows.length})</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'name',           label:'Name'      },
          { key:'phone',          label:'Phone'     },
          { key:'city',           label:'City'      },
          { key:'skill',          label:'Skill'     },
          { key:'rating',         label:'Rating',   render: r => r.rating ? `⭐ ${r.rating}` : '—' },
          { key:'total_jobs',     label:'Jobs'      },
          { key:'wallet_balance', label:'Wallet',   render: r => `₹${r.wallet_balance || 0}` },
          { key:'credit_balance', label:'Credits',  render: r => `₹${r.credit_balance || 0}` },
          { key:'upi_id',         label:'UPI',      render: r => r.upi_id || '—' },
          { key:'price_max',      label:'Max ₹',    render: r => r.price_max ? `₹${r.price_max}` : '—' },
          { key:'is_online',      label:'Online',   render: r => r.is_online ? '🟢' : '🔴' },
          { key:'aadhaar_verified', label:'KYC',    render: r => r.aadhaar_verified ? '✅' : '❌' },
          { key:'onboarding_done',  label:'Onboarded', render: r => r.onboarding_done ? '✅' : '❌' },
        ]} />
      </Card>
    </div>
  )
}

function Disputes() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    sb.from('disputes').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])
  async function resolve(r) {
    const resolution = prompt('Resolution note (what was done):', r.resolution || '')
    if (resolution === null) return
    const { error } = await sb.from('disputes').update({ status:'resolved', resolution, resolved_at:new Date().toISOString() }).eq('id', r.id)
    if (error) { alert('Failed: '+error.message); return }
    load()
  }
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Disputes</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'created_at',    label:'Date',       render: r => fmt(r.created_at) },
          { key:'raised_by_role',label:'Raised By'   },
          { key:'reason',        label:'Reason',     wrap: true },
          { key:'status',        label:'Status',     render: r => <Badge status={r.status} /> },
          { key:'resolution',    label:'Resolution', wrap: true },
          { key:'_act', label:'', render: r => r.status!=='resolved' && (
            <button onClick={() => resolve(r)} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontWeight:700, cursor:'pointer', fontSize:12 }}>Resolve</button>
          )},
        ]} />
      </Card>
    </div>
  )
}

function Payouts() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sb.from('payouts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Payouts</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'created_at', label:'Date',   render: r => fmt(r.created_at) },
          { key:'amount',     label:'Amount', render: r => `₹${r.amount || 0}` },
          { key:'utr',        label:'UTR'    },
          { key:'status',     label:'Status', render: r => <Badge status={r.status} /> },
          { key:'paid_at',    label:'Paid At', render: r => fmt(r.paid_at) },
        ]} />
      </Card>
    </div>
  )
}

function Pricing() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sb.from('pricing').select('*').order('service_id')
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Pricing</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'service_id',     label:'Service'          },
          { key:'city',           label:'City'             },
          { key:'base_price',     label:'Base (₹)',        render: r => `₹${r.base_price}` },
          { key:'per_hour',       label:'Per Hour (₹)',    render: r => r.per_hour ? `₹${r.per_hour}` : '—' },
          { key:'emergency_mult', label:'Emergency ×',     render: r => r.emergency_mult ? `${r.emergency_mult}×` : '—' },
          { key:'weekend_mult',   label:'Weekend ×',       render: r => r.weekend_mult ? `${r.weekend_mult}×` : '—' },
        ]} />
      </Card>
    </div>
  )
}

function KYCReview() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)        // worker being reviewed
  const [imgs, setImgs] = useState(null)      // { front, back } signed URLs
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    sb.from('workers').select('*').eq('aadhar_submitted', true).eq('aadhar_verified', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  async function open(w) {
    setSel(w); setImgs(null)
    const [f, b] = await Promise.all([
      sb.storage.from('kyc').createSignedUrl(`${w.id}/aadhaar-front.jpg`, 600),
      sb.storage.from('kyc').createSignedUrl(`${w.id}/aadhaar-back.jpg`, 600),
    ])
    setImgs({ front: f.data?.signedUrl, back: b.data?.signedUrl,
      err: f.error?.message || b.error?.message })
  }

  async function decide(approve) {
    if (!sel || busy) return
    setBusy(true)
    const patch = approve
      ? { aadhar_verified: true, aadhaar_verified: true, trust_score: Math.max(sel.trust_score||60, 80) }
      : { aadhar_submitted: false }   // rejected → worker must re-upload
    const { error } = await sb.from('workers').update(patch).eq('id', sel.id)
    setBusy(false)
    if (error) { alert('Failed: '+error.message+' (are you signed in as admin?)'); return }
    setSel(null); setImgs(null); load()
  }

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>ID Verification — {rows.length} pending</h2>
      {sel && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div>
              <p style={{ fontWeight:800, fontSize:16 }}>{sel.name}</p>
              <p style={{ fontSize:12, color:'#666' }}>{sel.skill} · {sel.city} · {sel.phone} · ID: {sel.id_doc_type || 'aadhaar'}</p>
            </div>
            <button onClick={() => { setSel(null); setImgs(null) }} style={{ background:'#222', border:'none', borderRadius:8, color:'#888', padding:'6px 12px', cursor:'pointer' }}>Close</button>
          </div>
          {!imgs ? <p style={{ color:'#555' }}>Loading documents…</p> : imgs.err ? (
            <p style={{ color:'#f87171', fontSize:13 }}>Could not load documents: {imgs.err}. Sign in as admin@kaamready.in to view KYC files.</p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {[['Front', imgs.front],['Back', imgs.back]].map(([lb,u]) => (
                <div key={lb}>
                  <p style={{ fontSize:12, color:'#666', marginBottom:6 }}>ID {lb}</p>
                  {u ? <img src={u} alt={lb} style={{ width:'100%', borderRadius:10, border:'1px solid #2a2a2a' }} /> : <p style={{ color:'#555' }}>Missing</p>}
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => decide(true)} disabled={busy}
              style={{ flex:1, background:'#16a34a', color:'#fff', border:'none', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', opacity:busy?.6:1 }}>✓ Approve</button>
            <button onClick={() => decide(false)} disabled={busy}
              style={{ flex:1, background:'#dc2626', color:'#fff', border:'none', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', opacity:busy?.6:1 }}>✕ Reject (re-upload)</button>
          </div>
        </Card>
      )}
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'name',  label:'Name'  },
          { key:'phone', label:'Phone' },
          { key:'city',  label:'City'  },
          { key:'skill', label:'Skill' },
          { key:'created_at', label:'Submitted', render: r => fmt(r.created_at) },
          { key:'_act', label:'', render: r => (
            <button onClick={() => open(r)} style={{ background:Y, border:'none', borderRadius:8, padding:'6px 14px', fontWeight:700, cursor:'pointer', fontSize:12 }}>Review</button>
          )},
        ]} />
      </Card>
    </div>
  )
}

function Commissions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const load = useCallback(() => {
    setLoading(true)
    sb.from('workers').select('id,name,phone,city,upi_id,commission_due,wallet_balance,total_jobs')
      .gt('commission_due', 0).order('commission_due', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])
  const total = rows.reduce((s,r) => s+(r.commission_due||0), 0)

  async function collect(w) {
    if (busy) return
    if (!confirm(`Mark ₹${w.commission_due} collected from ${w.name}?`)) return
    setBusy(w.id)
    const { error: pe } = await sb.from('payouts').insert({
      worker_id: w.id, amount: w.commission_due, status:'paid', paid_at:new Date().toISOString(), utr:'COMMISSION-COLLECTED',
    })
    const { error: we } = await sb.from('workers').update({ commission_due: 0 }).eq('id', w.id)
    setBusy(null)
    if (pe || we) { alert('Failed: '+(pe?.message||we?.message)+' (are you signed in as admin?)'); return }
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Commission Ledger</h2>
      <p style={{ fontSize:13, color:'#666', marginBottom:16 }}>10% platform fee per completed job, owed by workers. Total outstanding: <b style={{ color:Y }}>₹{total.toLocaleString('en-IN')}</b></p>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'name',  label:'Worker' },
          { key:'phone', label:'Phone'  },
          { key:'city',  label:'City'   },
          { key:'upi_id', label:'UPI'   },
          { key:'total_jobs', label:'Jobs' },
          { key:'commission_due', label:'Due', render: r => <b style={{ color:Y }}>₹{r.commission_due}</b> },
          { key:'_act', label:'', render: r => (
            <button onClick={() => collect(r)} disabled={busy===r.id}
              style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:700, cursor:'pointer', fontSize:12, opacity:busy===r.id?.6:1 }}>
              {busy===r.id ? '...' : 'Mark Collected'}
            </button>
          )},
        ]} />
      </Card>
    </div>
  )
}

function WelfareFee() {
  // Karnataka Platform-Based Gig Workers Act 2025: 1% of payout, capped ₹1.50/transaction
  // (professional services), self-declared quarterly to the Welfare Board.
  const RATE = 0.01, CAP = 1.5
  const [rows, setRows] = useState(null)
  useEffect(() => {
    sb.from('bookings').select('amount, payment_confirmed_at')
      .eq('status','completed').eq('payment_status','paid').not('payment_confirmed_at','is',null)
      .then(({ data }) => setRows(data || []))
  }, [])
  if (!rows) return <p style={{ color:'#555' }}>Loading…</p>
  const fee = a => Math.min((a||0)*RATE, CAP)
  const byQuarter = {}
  rows.forEach(b => {
    const d = new Date(b.payment_confirmed_at)
    const q = d.getFullYear()+' Q'+(Math.floor(d.getMonth()/3)+1)
    byQuarter[q] = byQuarter[q] || { jobs:0, payout:0, fee:0 }
    byQuarter[q].jobs++; byQuarter[q].payout += (b.amount||0); byQuarter[q].fee += fee(b.amount)
  })
  const quarters = Object.entries(byQuarter).sort((a,b) => b[0].localeCompare(a[0]))
  function downloadCSV() {
    const lines = ['Quarter,Completed Jobs,Total Payout (INR),Welfare Fee Due (INR)']
    quarters.forEach(([q,v]) => lines.push(`${q},${v.jobs},${v.payout},${v.fee.toFixed(2)}`))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type:'text/csv' }))
    a.download = 'kaam-ready-welfare-fee.csv'
    a.click()
  }
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Gig Workers' Welfare Fee</h2>
      <p style={{ fontSize:13, color:'#666', marginBottom:16 }}>
        Karnataka Platform-Based Gig Workers Act, 2025 — 1% of each worker payout (capped at ₹1.50/transaction for professional services), paid quarterly to the Welfare Board. Figures below are auto-calculated from confirmed UPI payments; verify rates on the Labour Department site before filing.
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
        <StatCard label="All-time fee accrued" value={'₹'+quarters.reduce((s,[,v])=>s+v.fee,0).toFixed(2)} />
        <StatCard label="Completed paid jobs" value={rows.length} />
      </div>
      <Card style={{ padding:0, marginBottom:14 }}>
        <Table loading={false} rows={quarters.map(([q,v])=>({ q, ...v }))} cols={[
          { key:'q',      label:'Quarter' },
          { key:'jobs',   label:'Completed Jobs' },
          { key:'payout', label:'Total Payout', render: r => '₹'+r.payout.toLocaleString('en-IN') },
          { key:'fee',    label:'Fee Due',      render: r => <b style={{ color:Y }}>₹{r.fee.toFixed(2)}</b> },
        ]} />
      </Card>
      <button onClick={downloadCSV}
        style={{ background:Y, border:'none', borderRadius:10, padding:'10px 18px', fontWeight:800, cursor:'pointer', fontSize:13 }}>
        ⬇ Download CSV for filing
      </button>
    </div>
  )
}

function Recharges() {
  const [rows, setRows] = useState([])
  const [workers, setWorkers] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: r }, { data: w }] = await Promise.all([
      sb.from('recharges').select('*').order('claimed_at', { ascending:false }).limit(100),
      sb.from('workers').select('id,name,phone,credit_balance'),
    ])
    setRows(r || [])
    setWorkers(Object.fromEntries((w||[]).map(x => [x.id, x])))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  async function decide(r, ok) {
    if (busy) return
    const w = workers[r.worker_id]
    if (ok && !confirm(`Confirm ₹${r.amount} received from ${w?.name||'worker'}? Check your UPI app first.`)) return
    setBusy(r.id)
    const { error } = await sb.from('recharges').update({ status: ok?'confirmed':'rejected', confirmed_at: new Date().toISOString() }).eq('id', r.id)
    if (!error && ok) {
      await sb.from('workers').update({ credit_balance: (w?.credit_balance||0) + r.amount }).eq('id', r.worker_id)
    }
    setBusy(null)
    if (error) alert('Failed: '+error.message); else load()
  }
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Credit Recharges</h2>
      <p style={{ fontSize:13, color:'#666', marginBottom:16 }}>Workers prepay credits via UPI; confirm here after checking the money arrived in your UPI account. Confirming adds the amount to their credit balance.</p>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'claimed_at', label:'Date',   render: r => fmt(r.claimed_at) },
          { key:'worker_id',  label:'Worker', render: r => workers[r.worker_id]?.name || '—' },
          { key:'phone',      label:'Phone',  render: r => workers[r.worker_id]?.phone || '—' },
          { key:'amount',     label:'Amount', render: r => <b style={{ color:Y }}>₹{r.amount}</b> },
          { key:'status',     label:'Status', render: r => <Badge status={r.status==='claimed'?'pending':r.status==='confirmed'?'paid':'failed'} /> },
          { key:'_act', label:'', render: r => r.status==='claimed' && (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => decide(r, true)} disabled={busy===r.id}
                style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontWeight:700, cursor:'pointer', fontSize:12 }}>✓ Confirm</button>
              <button onClick={() => decide(r, false)} disabled={busy===r.id}
                style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontWeight:700, cursor:'pointer', fontSize:12 }}>✕</button>
            </div>
          )},
        ]} />
      </Card>
    </div>
  )
}

const COMMISSION = 0.10
function VerifyPayments() {
  const [rows, setRows] = useState([])
  const [workers, setWorkers] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: w }] = await Promise.all([
      sb.from('bookings').select('*').eq('payment_status','claimed').order('customer_paid_at', { ascending:true }),
      sb.from('workers').select('id,name,phone,wallet_balance,total_jobs,upi_id'),
    ])
    setRows(b || [])
    setWorkers(Object.fromEntries((w||[]).map(x => [x.id, x])))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  async function confirmPayment(b) {
    if (busy) return
    if (!confirm(`Confirm ₹${b.amount} arrived in your UPI for "${b.service}" (${b.customer_name||'customer'})? Check your UPI app first.`)) return
    setBusy(b.id)
    const fee = Math.round((b.amount||0)*COMMISSION)
    // Guard: only confirm if still in claimed state — prevents double-confirm
    const { error } = await sb.from('bookings').update({
      payment_status:'paid', status:'completed',
      payment_confirmed_at:new Date().toISOString(), completed_at:new Date().toISOString(),
    }).eq('id', b.id).eq('payment_status','claimed')
    if (error) { setBusy(null); alert('Failed: '+error.message); return }
    if (b.worker_id) {
      // Fetch fresh wallet to avoid stale read → double-credit
      const { data: fresh } = await sb.from('workers').select('wallet_balance,total_jobs').eq('id', b.worker_id).single()
      const base = fresh || {}
      const { error: we } = await sb.from('workers').update({
        wallet_balance: (base.wallet_balance||0) + (b.amount||0) - fee,
        total_jobs: (base.total_jobs||0) + 1,
      }).eq('id', b.worker_id)
      if (we) {
        alert('⚠️ Payment marked complete but worker wallet update FAILED. Manually add ₹' + ((b.amount||0)-fee) + ' to worker ' + (b.worker_id) + '. Error: ' + we.message)
      }
    }
    setBusy(null)
    load()
  }
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Verify Payments — {rows.length} pending</h2>
      <p style={{ fontSize:13, color:'#666', marginBottom:16 }}>Customers pay Kaam Ready's UPI. Check your UPI app, then confirm here — this completes the booking and credits the worker's payout balance (amount minus 10% fee).</p>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'customer_paid_at', label:'Paid At', render: r => fmt(r.customer_paid_at) },
          { key:'service',        label:'Service' },
          { key:'customer_name',  label:'Customer', render: r => (r.customer_name||'—')+(r.customer_phone?' · '+r.customer_phone:'') },
          { key:'worker_id',      label:'Worker',  render: r => workers[r.worker_id]?.name || '—' },
          { key:'amount',         label:'Amount',  render: r => <b style={{ color:Y }}>₹{r.amount}</b> },
          { key:'_fee',           label:'Your Fee', render: r => '₹'+Math.round((r.amount||0)*COMMISSION) },
          { key:'_act', label:'', render: r => (
            <button onClick={() => confirmPayment(r)} disabled={busy===r.id}
              style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:700, cursor:'pointer', fontSize:12 }}>
              {busy===r.id ? '...' : '✓ Money Received'}
            </button>
          )},
        ]} />
      </Card>
    </div>
  )
}

function WeeklyPayouts() {
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: w }, { data: p }] = await Promise.all([
      sb.from('workers').select('id,name,phone,upi_id,wallet_balance,total_jobs').gt('wallet_balance', 0).order('wallet_balance', { ascending:false }),
      sb.from('payouts').select('*').order('created_at', { ascending:false }).limit(50),
    ])
    setRows(w || []); setHistory(p || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  async function payout(w) {
    if (busy) return
    const utr = prompt(`Pay ₹${w.wallet_balance} to ${w.name} (${w.upi_id||'no UPI set!'}) from your UPI app, then enter the UPI reference/UTR number:`)
    if (utr === null) return
    setBusy(w.id)
    const { error: pe } = await sb.from('payouts').insert({ worker_id:w.id, amount:w.wallet_balance, status:'paid', utr:utr||'manual', paid_at:new Date().toISOString() })
    const { error: we } = await sb.from('workers').update({ wallet_balance: 0 }).eq('id', w.id)
    setBusy(null)
    if (pe || we) { alert('Failed: '+(pe?.message||we?.message)); return }
    load()
  }
  const total = rows.reduce((s,r)=>s+(r.wallet_balance||0),0)
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Weekly Payouts</h2>
      <p style={{ fontSize:13, color:'#666', marginBottom:16 }}>Owed to workers from verified payments (after your 10% fee). Total due: <b style={{ color:Y }}>₹{total.toLocaleString('en-IN')}</b>. Pay via UPI, then record it here.</p>
      <Card style={{ padding:0, marginBottom:18 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'name',  label:'Worker' },
          { key:'phone', label:'Phone'  },
          { key:'upi_id',label:'UPI ID', render: r => r.upi_id || <span style={{ color:'#f87171' }}>not set</span> },
          { key:'wallet_balance', label:'Due', render: r => <b style={{ color:Y }}>₹{r.wallet_balance}</b> },
          { key:'_act', label:'', render: r => (
            <button onClick={() => payout(r)} disabled={busy===r.id}
              style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:700, cursor:'pointer', fontSize:12 }}>
              {busy===r.id ? '...' : '💸 Mark Paid'}
            </button>
          )},
        ]} />
      </Card>
      <h3 style={{ fontSize:14, fontWeight:700, marginBottom:10, color:'#888' }}>Payout history</h3>
      <Card style={{ padding:0 }}>
        <Table loading={false} rows={history} cols={[
          { key:'created_at', label:'Date',   render: r => fmt(r.created_at) },
          { key:'amount',     label:'Amount', render: r => '₹'+(r.amount||0) },
          { key:'utr',        label:'UTR'    },
          { key:'status',     label:'Status', render: r => <Badge status={r.status} /> },
        ]} />
      </Card>
    </div>
  )
}

const SCREENS = { overview: Overview, bookings: Bookings, workers: Workers, kyc: KYCReview, commissions: Commissions, welfare: WelfareFee, payments: VerifyPayments, disputes: Disputes, payouts: WeeklyPayouts, pricing: Pricing }

// ── Login ─────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@kaamready.in'
function Login({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (busy) return
    setBusy(true); setErr('')
    const { data, error } = await sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pass })
    setBusy(false)
    if (error || !data?.session) { setErr('Incorrect password'); setPass(''); return }
    onLogin()
  }
  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f0f' }}>
      <div style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:16, padding:36, width:320, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:8 }}>⚡</div>
        <h1 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Kaam Ready Admin</h1>
        <p style={{ fontSize:13, color:'#555', marginBottom:24 }}>Restricted access</p>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Admin password"
          style={{ width:'100%', background:'#111', border:'1px solid #333', borderRadius:10, padding:'12px 14px',
            color:'#fff', fontSize:14, outline:'none', marginBottom:12, fontFamily:'inherit' }} />
        {err && <p style={{ color:'#f87171', fontSize:13, marginBottom:8 }}>{err}</p>}
        <button onClick={submit}
          style={{ width:'100%', background:Y, border:'none', borderRadius:10, padding:14,
            fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
          Sign In →
        </button>
        <p style={{ fontSize:11, color:'#444', marginTop:12 }}>Signs in as {ADMIN_EMAIL}</p>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false)
  const [active, setActive] = useState('overview')
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.email === ADMIN_EMAIL) setAuthed(true)
    })
  }, [])
  function login() { setAuthed(true) }
  function logout() { sb.auth.signOut(); setAuthed(false) }

  if (!authed) return <Login onLogin={login} />

  const Screen = SCREENS[active] || Overview

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Sidebar */}
      <div style={{ width:220, background:'#111', borderRight:'1px solid #1f1f1f', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid #1f1f1f' }}>
          <div style={{ fontSize:22 }}>⚡</div>
          <p style={{ fontSize:13, fontWeight:800, marginTop:4 }}>Kaam Ready</p>
          <p style={{ fontSize:11, color:'#555' }}>Admin Panel</p>
        </div>
        <nav style={{ flex:1, padding:'12px 8px' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)}
              style={{ display:'block', width:'100%', textAlign:'left', background: active===n.id ? '#1f1f1f' : 'transparent',
                color: active===n.id ? Y : '#888', border:'none', borderRadius:8, padding:'10px 12px',
                fontSize:13, fontWeight: active===n.id ? 700 : 400, cursor:'pointer', marginBottom:2, fontFamily:'inherit' }}>
              {n.label}
            </button>
          ))}
        </nav>
        <button onClick={logout}
          style={{ margin:'12px 8px', background:'transparent', border:'1px solid #2a2a2a',
            borderRadius:8, padding:'10px 12px', color:'#555', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:'auto', padding:28 }}>
        <Screen />
      </div>
    </div>
  )
}
