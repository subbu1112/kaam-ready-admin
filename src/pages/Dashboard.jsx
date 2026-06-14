import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import StatCard from '../components/StatCard'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6']

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:32 }}>
      <h2 style={{ fontSize:16, fontWeight:700, color:'#0f172a', marginBottom:16, paddingBottom:8, borderBottom:'2px solid #e2e8f0' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [bookingTrend, setBookingTrend] = useState([])
  const [statusDist, setStatusDist] = useState([])
  const [cityData, setCityData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [users, workers, bookings, payouts] = await Promise.all([
      sb.from('profiles').select('id,created_at,account_status'),
      sb.from('workers').select('id,is_online,aadhar_verified,kyc_status,account_status,created_at'),
      sb.from('bookings').select('id,status,amount,payment_status,created_at,city,worker_id'),
      sb.from('payouts').select('amount,status,commission_amount'),
    ])

    const u = users.data || []
    const w = workers.data || []
    const b = bookings.data || []
    const p = payouts.data || []

    const today = new Date().toDateString()
    const thisMonth = new Date().getMonth()

    const totalRevenue = b.filter(x=>x.status==='completed'&&x.amount).reduce((a,x)=>a+(x.amount||0),0)
    const commission = Math.round(totalRevenue * 0.1)
    const dailyBookings = b.filter(x=>new Date(x.created_at).toDateString()===today).length
    const monthlyBookings = b.filter(x=>new Date(x.created_at).getMonth()===thisMonth).length

    setStats({
      totalUsers: u.length,
      totalWorkers: w.length,
      activeWorkers: w.filter(x=>x.is_online).length,
      verifiedWorkers: w.filter(x=>x.aadhar_verified||x.aadhaar_verified).length,
      pendingVerifications: w.filter(x=>x.kyc_status==='pending').length,
      dailyBookings,
      monthlyBookings,
      totalBookings: b.length,
      revenue: totalRevenue,
      commission,
      pendingPayouts: p.filter(x=>x.status==='pending').reduce((a,x)=>a+(x.amount||0),0),
    })

    // booking trend last 14 days
    const days = Array.from({length:14},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-13+i)
      return { date: d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}), full: d.toDateString() }
    })
    setBookingTrend(days.map(d=>({ date:d.date, bookings: b.filter(x=>new Date(x.created_at).toDateString()===d.full).length, revenue: b.filter(x=>new Date(x.created_at).toDateString()===d.full&&x.status==='completed').reduce((a,x)=>a+(x.amount||0),0) })))

    // status distribution
    const statuses = ['searching','assigned','priced','completed','cancelled']
    setStatusDist(statuses.map(s=>({ name:s, value: b.filter(x=>x.status===s).length })).filter(x=>x.value>0))

    // city breakdown
    const cities = {}
    b.forEach(x=>{ if(x.city) { cities[x.city]=(cities[x.city]||0)+1 } })
    setCityData(Object.entries(cities).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([city,count])=>({ city, count })))

    setLoading(false)
  }

  if (loading) return <><TopBar title="Dashboard" subtitle="Platform overview" /><Loader /></>

  return (
    <div>
      <TopBar title="Dashboard" subtitle="KaamReady Platform Overview" actions={
        <button onClick={load} style={{ padding:'8px 16px', background:'#6366f1', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>Refresh</button>
      } />
      <div style={{ padding:32 }}>
        <Section title="Key Metrics">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
            <StatCard label="Total Users" value={stats.totalUsers} icon="👥" color="blue" sub="Registered customers" />
            <StatCard label="Total Workers" value={stats.totalWorkers} icon="👷" color="indigo" sub={`${stats.activeWorkers} online now`} />
            <StatCard label="Verified Workers" value={stats.verifiedWorkers} icon="✅" color="green" sub={`${stats.pendingVerifications} pending`} />
            <StatCard label="Total Bookings" value={stats.totalBookings} icon="📋" color="purple" sub={`${stats.dailyBookings} today`} />
            <StatCard label="Monthly Bookings" value={stats.monthlyBookings} icon="📅" color="amber" sub="This month" />
            <StatCard label="Total Revenue" value={INR(stats.revenue)} icon="💰" color="green" sub="Completed jobs" />
            <StatCard label="Commission Earned" value={INR(stats.commission)} icon="🏦" color="indigo" sub="10% platform fee" />
            <StatCard label="Pending Payouts" value={INR(stats.pendingPayouts)} icon="⏳" color="amber" sub="To be released" />
          </div>
        </Section>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:24, marginBottom:32 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontWeight:700, marginBottom:20, color:'#0f172a' }}>Bookings & Revenue — Last 14 Days</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={bookingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize:11}} />
                <YAxis yAxisId="left" tick={{fontSize:11}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize:11}} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#6366f1" strokeWidth={2} dot={false} name="Bookings" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue (Rs.)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontWeight:700, marginBottom:20, color:'#0f172a' }}>Booking Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value})=>`${name}:${value}`} labelLine={false}>
                  {statusDist.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight:700, marginBottom:20, color:'#0f172a' }}>Bookings by City</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="city" tick={{fontSize:12}} />
              <YAxis tick={{fontSize:12}} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
