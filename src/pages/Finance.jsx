import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import { exportCSV } from '../lib/export'

const INR = v => '₹' + Math.round(v || 0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' }

export default function Finance({ showToast }) {
  const [bookings, setBookings] = useState([])
  const [payouts, setPayouts]   = useState([])
  const [commPct, setCommPct]   = useState(10)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [b, p, s] = await Promise.all([
      sb.from('bookings').select('id,service,customer_name,amount,payment_status,created_at').in('payment_status',['verified','paid']).order('created_at',{ascending:false}),
      sb.from('payouts').select('amount,commission_amount,status,created_at'),
      sb.from('app_settings').select('value').eq('key','commission_pct').maybeSingle(),
    ])
    setBookings(b.data || [])
    setPayouts(p.data || [])
    if (s.data?.value) setCommPct(Number(s.data.value) || 10)
    setLoading(false)
  }

  const gmv        = bookings.reduce((a,b)=>a+(b.amount||0),0)
  const commission = Math.round(gmv * commPct/100)
  const workerShare= gmv - commission
  const released   = payouts.filter(p=>p.status==='paid').reduce((a,p)=>a+(p.amount||0),0)
  const pendingPay = payouts.filter(p=>p.status==='pending').reduce((a,p)=>a+(p.amount||0),0)

  // group GMV by month
  const byMonth = {}
  bookings.forEach(b => {
    const m = (b.created_at||'').slice(0,7)
    if (!m) return
    byMonth[m] = byMonth[m] || { gmv:0, count:0 }
    byMonth[m].gmv += b.amount||0
    byMonth[m].count += 1
  })
  const months = Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0]))

  const cards = [
    ['Gross Merchandise Value', INR(gmv), '#6366f1', `${bookings.length} paid bookings`],
    [`Platform Revenue (${commPct}%)`, INR(commission), '#10b981', 'Commission earned'],
    ['Worker Earnings', INR(workerShare), '#f59e0b', `Owed/paid to workers`],
    ['Payouts Released', INR(released), '#8b5cf6', `${INR(pendingPay)} pending`],
  ]

  return (
    <div>
      <TopBar title="Finance" subtitle="Revenue, commission & payout overview" actions={
        <button onClick={()=>exportCSV(bookings.map(b=>({Booking:b.id,Service:b.service,Customer:b.customer_name,Amount:b.amount,Date:fmt(b.created_at)})),'finance_transactions')}
          style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>Export CSV</button>
      } />
      <div style={{ padding:32 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {cards.map(([l,v,c,sub]) => (
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>{v}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {loading ? <Loader /> : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {/* Monthly breakdown */}
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.08)', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:700, fontSize:14 }}>Revenue by Month</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Month','Bookings','GMV','Commission'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {months.map(([m,d]) => (
                    <tr key={m}>
                      <td style={td}>{m}</td>
                      <td style={td}>{d.count}</td>
                      <td style={td}>{INR(d.gmv)}</td>
                      <td style={td}><span style={{ color:'#10b981', fontWeight:600 }}>{INR(d.gmv*commPct/100)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!months.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No revenue yet</div>}
            </div>

            {/* Recent transactions */}
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.08)', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:700, fontSize:14 }}>Recent Transactions</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Service','Customer','Amount','Date'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {bookings.slice(0,12).map(b => (
                    <tr key={b.id}>
                      <td style={td}>{b.service||'—'}</td>
                      <td style={td}>{b.customer_name||'—'}</td>
                      <td style={td}><span style={{ fontWeight:700 }}>{INR(b.amount)}</span></td>
                      <td style={{ ...td, fontSize:12 }}>{fmt(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!bookings.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No transactions yet</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
