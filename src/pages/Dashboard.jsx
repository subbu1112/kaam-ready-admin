import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import StatCard from '../components/StatCard'

const Y = '#F5C000'

// Simple SVG bar chart
function BarChart({ data, label, color = Y }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.v), 1)
  return (
    <div>
      <p style={{ color:'#64748B', fontSize:12, fontWeight:600, textTransform:'uppercase', marginBottom:12, letterSpacing:'.5px' }}>{label}</p>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{
              width:'100%', background: color,
              height: Math.max(4, (d.v / max) * 72),
              borderRadius:'3px 3px 0 0', opacity:.85
            }} title={`${d.l}: ${d.v}`} />
            <span style={{ color:'#475569', fontSize:9, textAlign:'center' }}>{d.l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Donut chart for service distribution
function DonutChart({ slices }) {
  if (!slices?.length) return null
  const total = slices.reduce((s, x) => s + x.v, 0) || 1
  let offset = 0
  const COLORS = [Y, '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f97316', '#06b6d4', '#ec4899', '#84cc16']
  return (
    <div style={{ display:'flex', alignItems:'center', gap:20 }}>
      <svg viewBox="0 0 36 36" width={120} height={120}>
        {slices.map((s, i) => {
          const pct = s.v / total
          const dash = pct * 100
          const gap  = 100 - dash
          const seg = (
            <circle
              key={i}
              r="15.915" cx="18" cy="18"
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="4"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 18 18)"
            />
          )
          offset += dash
          return seg
        })}
        <circle r="11" cx="18" cy="18" fill="#1E293B" />
        <text x="18" y="19" textAnchor="middle" fill="#F1F5F9" fontSize="5" fontWeight="bold">{total}</text>
        <text x="18" y="23.5" textAnchor="middle" fill="#64748B" fontSize="3">total</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
            <span style={{ color:'#94A3B8', fontSize:12 }}>{s.l}</span>
            <span style={{ color:'#F1F5F9', fontSize:12, fontWeight:700, marginLeft:'auto', paddingLeft:8 }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ showToast }) {
  const [stats,   setStats]   = useState(null)
  const [weekly,  setWeekly]  = useState([])
  const [services, setServices] = useState([])
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // Parallel queries
      const [usersRes, workersRes, bookingsRes, paymentsRes] = await Promise.all([
        sb.from('profiles').select('id, created_at', { count:'exact', head:false }),
        sb.from('workers').select('id, is_online, skill', { count:'exact', head:false }),
        sb.from('bookings').select('id, status, amount, created_at, service'),
        sb.from('bookings').select('id, amount, created_at').order('created_at', { ascending:false }).limit(5),
      ])

      const users    = usersRes.data    || []
      const workers  = workersRes.data  || []
      const bookings = bookingsRes.data || []
      const recentB  = paymentsRes.data || []

      const totalRevenue = bookings
        .filter(b => b.status === 'completed')
        .reduce((s, b) => s + (b.amount || 0), 0)

      // Weekly bookings (last 7 days)
      const now = new Date()
      const week = Array.from({ length:7 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (6 - i))
        return { l: d.toLocaleDateString('en-IN', { weekday:'short' }), v: 0, date: d.toISOString().slice(0,10) }
      })
      bookings.forEach(b => {
        const bd = b.created_at?.slice(0,10)
        const slot = week.find(w => w.date === bd)
        if (slot) slot.v++
      })

      // Service distribution
      const svcMap = {}
      bookings.forEach(b => {
        const s = b.service || 'Unknown'
        svcMap[s] = (svcMap[s] || 0) + 1
      })
      const svcSlices = Object.entries(svcMap)
        .sort((a,b) => b[1]-a[1])
        .slice(0,6)
        .map(([l,v]) => ({ l, v }))

      setStats({
        users:    users.length,
        workers:  workers.length,
        online:   workers.filter(w => w.is_online).length,
        bookings: bookings.length,
        completed: bookings.filter(b => b.status === 'completed').length,
        revenue:  totalRevenue,
        commission: totalRevenue * 0.10,
      })
      setWeekly(week)
      setServices(svcSlices)
      setRecent(recentB)
    } catch(e) {
      showToast('Failed to load stats: ' + e.message, 'error')
    }
    setLoading(false)
  }

  function fmt(n) {
    if (n >= 100000) return '₹' + (n/100000).toFixed(1) + 'L'
    if (n >= 1000)   return '₹' + (n/1000).toFixed(1)   + 'K'
    return '₹' + Math.round(n)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#475569' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
        Loading dashboard...
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <StatCard ico="👥" label="Total Users"    value={stats?.users    || 0}  color="#3b82f6" />
        <StatCard ico="🔧" label="Workers"        value={stats?.workers  || 0}  sub={`${stats?.online||0} online now`} color="#22c55e" />
        <StatCard ico="📋" label="Total Bookings" value={stats?.bookings || 0}  sub={`${stats?.completed||0} completed`} color={Y} />
        <StatCard ico="💰" label="Platform Revenue" value={fmt(stats?.commission||0)} sub={`GMV ${fmt(stats?.revenue||0)}`} color="#a855f7" />
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        {/* Bookings chart */}
        <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 22px' }}>
          <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 20px' }}>Bookings — Last 7 Days</h3>
          <BarChart data={weekly} color={Y} />
        </div>

        {/* Service distribution */}
        <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 22px' }}>
          <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 16px' }}>By Service</h3>
          <DonutChart slices={services} />
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, padding:'20px 22px' }}>
        <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:15, margin:'0 0 16px' }}>Recent Bookings</h3>
        {recent.length === 0 ? (
          <p style={{ color:'#475569', textAlign:'center', padding:'20px 0' }}>No bookings yet</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #334155' }}>
                {['ID','Amount','Time'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:'#64748B', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(b => (
                <tr key={b.id} style={{ borderBottom:'1px solid #1E293B' }}>
                  <td style={{ padding:'10px 12px', color:'#94A3B8', fontFamily:'monospace', fontSize:12 }}>{b.id?.slice(0,12)}…</td>
                  <td style={{ padding:'10px 12px', color:Y, fontWeight:700 }}>₹{b.amount || 0}</td>
                  <td style={{ padding:'10px 12px', color:'#475569' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleString('en-IN', { month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
