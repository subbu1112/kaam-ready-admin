import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const C = {
  primary:'#6366F1', success:'#10B981', danger:'#EF4444',
  warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF',
  muted:'#64748B', text:'#0F172A', bg:'#F0F4FF',
}
const COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6']
const INR = v => '₹' + (v||0).toLocaleString('en-IN')

function StatCard({ label, value, icon, sub, color }) {
  const colors = {
    indigo:  { bg:'#EEF2FF', icon:'#6366F1' },
    green:   { bg:'#D1FAE5', icon:'#10B981' },
    amber:   { bg:'#FEF3C7', icon:'#F59E0B' },
    red:     { bg:'#FEE2E2', icon:'#EF4444' },
    blue:    { bg:'#DBEAFE', icon:'#3B82F6' },
    purple:  { bg:'#EDE9FE', icon:'#7C3AED' },
  }
  const col = colors[color] || colors.indigo
  return (
    <div style={{ background:C.card, borderRadius:16, padding:'18px 20px', border:'1px solid '+C.border, display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:46, height:46, borderRadius:12, background:col.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>{label}</p>
        <p style={{ fontSize:22, fontWeight:800, color:C.text, lineHeight:1 }}>{value}</p>
        {sub && <p style={{ fontSize:11, color:C.muted, marginTop:3 }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard({ user, showToast, setPage }) {
  const [stats, setStats]             = useState(null)
  const [bookingTrend, setBookingTrend] = useState([])
  const [statusDist, setStatusDist]   = useState([])
  const [cityData, setCityData]       = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [users, workers, bookings] = await Promise.all([
      sb.from('profiles').select('id,created_at,account_status'),
      sb.from('workers').select('id,is_online,aadhar_verified,aadhaar_verified,kyc_status,account_status,created_at'),
      sb.from('bookings').select('id,status,amount,payment_status,created_at,city'),
    ])

    const u = users.data  || []
    const w = workers.data || []
    const b = bookings.data || []

    const today      = new Date().toDateString()
    const thisMonth  = new Date().getMonth()
    const totalRev   = b.filter(x=>x.status==='completed'&&x.amount).reduce((a,x)=>a+(x.amount||0),0)
    const pendingPmt = b.filter(x=>x.payment_status==='pending_verification').length

    setStats({
      totalUsers:          u.length,
      totalWorkers:        w.length,
      activeWorkers:       w.filter(x=>x.is_online).length,
      verifiedWorkers:     w.filter(x=>x.aadhar_verified||x.aadhaar_verified).length,
      pendingVerifications:w.filter(x=>x.kyc_status==='pending').length,
      dailyBookings:       b.filter(x=>new Date(x.created_at).toDateString()===today).length,
      monthlyBookings:     b.filter(x=>new Date(x.created_at).getMonth()===thisMonth).length,
      totalBookings:       b.length,
      revenue:             totalRev,
      commission:          Math.round(totalRev * 0.1),
      pendingPayments:     pendingPmt,
    })

    // trend: last 14 days
    const days = Array.from({length:14},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-13+i)
      return { date: d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}), full: d.toDateString() }
    })
    setBookingTrend(days.map(d=>({
      date: d.date,
      bookings: b.filter(x=>new Date(x.created_at).toDateString()===d.full).length,
      revenue:  b.filter(x=>new Date(x.created_at).toDateString()===d.full&&x.status==='completed').reduce((a,x)=>a+(x.amount||0),0),
    })))

    const statuses = ['searching','assigned','priced','completed','cancelled']
    setStatusDist(statuses.map(s=>({ name:s, value: b.filter(x=>x.status===s).length })).filter(x=>x.value>0))

    const cities = {}
    b.forEach(x=>{ if(x.city) cities[x.city]=(cities[x.city]||0)+1 })
    setCityData(Object.entries(cities).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([city,count])=>({ city,count })))

    setLoading(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:32, height:32, border:'3px solid '+C.border, borderTop:'3px solid '+C.primary, borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      {/* Alert for pending payments */}
      {stats.pendingPayments > 0 && (
        <div onClick={() => setPage('payments')} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:14, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
          <p style={{ fontWeight:700, color:'#991B1B', fontSize:14 }}>
            🔔 {stats.pendingPayments} payment{stats.pendingPayments!==1?'s':''} waiting for your approval
          </p>
          <span style={{ fontSize:13, color:'#EF4444', fontWeight:700 }}>Review →</span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, marginBottom:24 }}>
        <StatCard label="Customers"         value={stats.totalUsers}          icon="👥" color="blue"   sub="Registered users" />
        <StatCard label="Workers"           value={stats.totalWorkers}         icon="👷" color="indigo" sub={`${stats.activeWorkers} online now`} />
        <StatCard label="Verified Workers"  value={stats.verifiedWorkers}      icon="✅" color="green"  sub={`${stats.pendingVerifications} pending KYC`} />
        <StatCard label="Total Bookings"    value={stats.totalBookings}        icon="📋" color="purple" sub={`${stats.dailyBookings} today`} />
        <StatCard label="This Month"        value={stats.monthlyBookings}      icon="📅" color="amber"  sub="Bookings" />
        <StatCard label="Total Revenue"     value={INR(stats.revenue)}         icon="💰" color="green"  sub="Completed jobs" />
        <StatCard label="Commission"        value={INR(stats.commission)}      icon="🏦" color="indigo" sub="10% platform fee" />
        <StatCard label="Pending Approvals" value={stats.pendingPayments}      icon="⏳" color="red"    sub="Payments to review" />
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', border:'1px solid '+C.border }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Bookings & Revenue — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={bookingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{fontSize:10}} />
              <YAxis yAxisId="left" tick={{fontSize:10}} />
              <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left"  type="monotone" dataKey="bookings" stroke={C.primary} strokeWidth={2} dot={false} name="Bookings" />
              <Line yAxisId="right" type="monotone" dataKey="revenue"  stroke={C.success} strokeWidth={2} dot={false} name="Revenue (₹)" />
            </Lin