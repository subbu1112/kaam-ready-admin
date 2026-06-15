import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const INR = v => '₹' + (v||0).toLocaleString('en-IN')
const COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6']

export default function Reports({ user, showToast }) {
  const [data,    setData]    = useState(null)
  const [range,   setRange]   = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [range])

  async function load() {
    setLoading(true)
    const since = new Date(); since.setDate(since.getDate() - range)
    const iso   = since.toISOString()

    const [bookings, workers, users] = await Promise.all([
      sb.from('bookings').select('id,status,amount,payment_status,created_at,city,service,worker_id').gte('created_at', iso),
      sb.from('workers').select('id,created_at,kyc_status,total_jobs,wallet_balance,city,skill'),
      sb.from('profiles').select('id,created_at'),
    ])

    const b = bookings.data || []
    const w = workers.data  || []
    const u = users.data    || []

    // Daily trend
    const days = Array.from({length: Math.min(range,30)}, (_,i)=>{
      const d = new Date(); d.setDate(d.getDate() - (Math.min(range,30)-1-i))
      return { date: d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}), full: d.toDateString() }
    })
    const dailyTrend = days.map(d=>({
      date:     d.date,
      bookings: b.filter(x=>new Date(x.created_at).toDateString()===d.full).length,
      revenue:  b.filter(x=>new Date(x.created_at).toDateString()===d.full&&x.status==='completed').reduce((a,x)=>a+(x.amount||0),0),
      newUsers: u.filter(x=>new Date(x.created_at).toDateString()===d.full).length,
    }))

    // City breakdown
    const cities = {}
    b.forEach(x=>{ if(x.city) cities[x.city]=(cities[x.city]||0)+1 })
    const cityData = Object.entries(cities).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([city,count])=>({city,count}))

    // Service breakdown
    const services = {}
    b.forEach(x=>{ if(x.service) services[x.service]=(services[x.service]||0)+1 })
    const serviceData = Object.entries(services).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value}))

    // Status distribution
    const statuses = ['searching','assigned','priced','completed','cancelled']
    const statusData = statuses.map(s=>({ name:s, value:b.filter(x=>x.status===s).length })).filter(x=>x.value>0)

    // KPIs
    const completed    = b.filter(x=>x.status==='completed')
    const revenue      = completed.reduce((a,x)=>a+(x.amount||0),0)
    const completionR  = b.length ? Math.round(completed.length/b.length*100) : 0
    const avgTicket    = completed.length ? Math.round(revenue/completed.length) : 0
    const pendingPay   = b.filter(x=>x.payment_status==='pending_verification').length
    const newWorkers   = w.filter(x=>new Date(x.created_at)>=since).length
    const newCustomers = u.filter(x=>new Date(x.created_at)>=since).length

    setData({ dailyTrend, cityData, serviceData, statusData,
      kpis:{ revenue, commission:Math.round(revenue*.1), avgTicket, completionR, pendingPay, totalBookings:b.length, newWorkers, newCustomers, completed:completed.length } })
    setLoading(false)
  }

  if (loading) return <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading analytics...</div>

  const { kpis, dailyTrend, cityData, serviceData, statusData } = data

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Analytics</h2>
          <p style={{ fontSize:13, color:C.muted }}>Platform performance overview</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[7,30,90].map(d=>(
            <button key={d} onClick={()=>setRange(d)}
              style={{ background:range===d?C.primary:C.bg, color:range===d?'#fff':C.muted, border:'1px solid '+C.border, borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        {[
          ['Revenue',      INR(kpis.revenue),        '💰','#D1FAE5','#065F46'],
          ['Commission',   INR(kpis.commission),      '🏦','#EEF2FF','#4338CA'],
          ['Avg. Ticket',  INR(kpis.avgTicket),       '🎯','#FEF3C7','#92400E'],
          ['Completion',   kpis.completionR+'%',      '✅','#D1FAE5','#065F46'],
          ['Bookings',     kpis.totalBookings,        '📋','#DBEAFE','#1D4ED8'],
          ['Completed',    kpis.completed,            '🎉','#D1FAE5','#065F46'],
          ['Pending Pay',  kpis.pendingPay,           '⏳','#FEF3C7','#92400E'],
          ['New Workers',  kpis.newWorkers,           '👷','#EDE9FE','#5B21B6'],
          ['New Customers',kpis.newCustomers,         '👥','#DBEAFE','#1D4ED8'],
        ].map(([l,v,ico,bg,col])=>(
          <div key={l} style={{ background:C.card, borderRadius:14, padding:'14px 16px', border:'1px solid '+C.border, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{ico}</div>
            <div>
              <p style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{l}</p>
              <p style={{ fontWeight:800, fontSize:18, color:col }}>{v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', marginBottom:16, border:'1px solid '+C.border }}>
        <h3 style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Daily Trend — Bookings & Revenue</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{fontSize:10}} />
            <YAxis yAxisId="left" tick={{fontSize:10}} />
            <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left"  type="monotone" dataKey="bookings" stroke={C.primary} strokeWidth={2} dot={false} name="Bookings" />
            <Line yAxisId="right" type="monotone" dataKey="revenue"  stroke={C.success} strokeWidth={2} dot={false} name="Revenue (₹)" />
            <Line yAxisId="left"  type="monotone" dataKey="newUsers" stroke={C.warning} strokeWidth={2} dot={false} name="New Users" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', border:'1px solid '+C.border }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Bookings by City</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tick={{fontSize:10}} />
              <YAxis type="category" dataKey="city" tick={{fontSize:11}} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill={C.primary} radius={[0,6,6,0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', border:'1px solid '+C.border }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Booking Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {serviceData.length > 0 && (
        <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', border:'1px solid '+C.border }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Top Services</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} />
              <Tooltip />
              <Bar dataKey="value" fill={C.warning} radius={[6,6,0,0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
