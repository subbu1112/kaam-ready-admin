import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', G='#22c55e', R='#ef4444'

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ background:'#111', borderRadius:16, padding:'16px 14px', border:'1px solid #1a1a1a' }}>
      <p style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</p>
      <p style={{ color: color||Y, fontWeight:900, fontSize:28, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ color:'#555', fontSize:12, marginTop:4 }}>{sub}</p>}
    </div>
  )
}

export default function DashboardScreen({ onSignOut }) {
  const [stats,    setStats]    = useState({ bookings:0, revenue:0, workers:0, online:0, today:0, todayRev:0 })
  const [recent,   setRecent]   = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const today = new Date().toISOString().slice(0,10)
    const [
      { count: totalB },
      { count: todayB },
      { data: revData },
      { data: todayRevData },
      { count: totalW },
      { count: onlineW },
      { data: recentB }
    ] = await Promise.all([
      sb.from('bookings').select('*',{count:'exact',head:true}),
      sb.from('bookings').select('*',{count:'exact',head:true}).gte('created_at', today),
      sb.from('bookings').select('amount').eq('status','completed'),
      sb.from('bookings').select('amount').eq('status','completed').gte('created_at', today),
      sb.from('workers').select('*',{count:'exact',head:true}).eq('onboarding_done',true),
      sb.from('workers').select('*',{count:'exact',head:true}).eq('is_online',true),
      sb.from('bookings').select('*').order('created_at',{ascending:false}).limit(8)
    ])
    const revenue   = (revData||[]).reduce((s,b)=>s+(b.amount||0),0)
    const todayRev  = (todayRevData||[]).reduce((s,b)=>s+(b.amount||0),0)
    setStats({ bookings:totalB||0, revenue, workers:totalW||0, online:onlineW||0, today:todayB||0, todayRev })
    setRecent(recentB||[])
    setLoading(false)
  }

  const STATUS_COLOR = { searching:'#f59e0b', assigned:'#3b82f6', priced:'#8b5cf6', completed:'#22c55e', cancelled:'#6b7280', scheduled:'#06b6d4' }

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#0A0A0A', padding:'0 0 80px' }}>
      {/* Header */}
      <div style={{ background:'#111', padding:'20px 16px 16px', borderBottom:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ color:Y, fontWeight:900, fontSize:20 }}>⚡ KaamReady Admin</p>
          <p style={{ color:'#555', fontSize:12, marginTop:2 }}>Live Dashboard</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={load} style={{ background:'#1a1a1a', border:'none', borderRadius:10, padding:'7px 12px', color:'#888', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>↻</button>
          <button onClick={onSignOut} style={{ background:'#1a1a1a', border:'none', borderRadius:10, padding:'7px 12px', color:'#ef4444', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <Stat label="Today's Bookings"  value={stats.today}    sub={`${stats.bookings} total`} />
          <Stat label="Today's Revenue"   value={`₹${stats.todayRev.toLocaleString('en-IN')}`} sub={`₹${stats.revenue.toLocaleString('en-IN')} total`} color={G} />
          <Stat label="Workers Online"    value={stats.online}   sub={`${stats.workers} total`} color={G} />
          <Stat label="Platform Earnings" value={`₹${Math.round(stats.revenue*0.1).toLocaleString('en-IN')}`} sub="10% commission" color={Y} />
        </div>

        {/* Recent bookings */}
        <p style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Recent Bookings</p>
        {loading ? <p style={{ color:'#555', textAlign:'center', padding:24 }}>Loading…</p> : (
          <div style={{ background:'#111', borderRadius:16, border:'1px solid #1a1a1a', overflow:'hidden' }}>
            {recent.length===0 ? <p style={{ color:'#555', textAlign:'center', padding:24 }}>No bookings yet</p> : recent.map((b,i)=>(
              <div key={b.id} style={{ padding:'12px 14px', borderBottom: i<recent.length-1?'1px solid #1a1a1a':'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:'#fff', fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.service||'Service'}</p>
                  <p style={{ color:'#555', fontSize:11, marginTop:2 }}>{b.city} · {new Date(b.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ background:STATUS_COLOR[b.status]+'22', color:STATUS_COLOR[b.status], fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, textTransform:'uppercase' }}>{b.status}</span>
                  {b.amount ? <span style={{ color:Y, fontSize:12, fontWeight:800 }}>₹{b.amount}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
