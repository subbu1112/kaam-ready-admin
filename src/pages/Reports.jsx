import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { exportCSV, exportExcel, exportPDF } from '../lib/export'

const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '-'
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('revenue')
  const [range, setRange] = useState(30)

  useEffect(() => { load() }, [range])

  async function load() {
    setLoading(true)
    const since = new Date(); since.setDate(since.getDate()-range)
    const [bookings, workers, payouts] = await Promise.all([
      sb.from('bookings').select('*').gte('created_at',since.toISOString()),
      sb.from('workers').select('id,name,city,skill,total_jobs,rating,wallet_balance,kyc_status'),
      sb.from('payouts').select('*,workers(name)').gte('created_at',since.toISOString()),
    ])
    const b = bookings.data||[]
    const w = workers.data||[]
    const p = payouts.data||[]

    // Revenue by day
    const dayMap = {}
    b.forEach(x=>{
      const d = new Date(x.created_at).toLocaleDateString('en-IN',{month:'short',day:'numeric'})
      if(!dayMap[d]) dayMap[d]={ date:d, revenue:0, bookings:0, commission:0 }
      if(x.status==='completed'&&x.amount) { dayMap[d].revenue+=x.amount; dayMap[d].commission+=Math.round(x.amount*0.1) }
      dayMap[d].bookings++
    })
    const revenueByDay = Object.values(dayMap).slice(-range)

    // City performance
    const cityMap = {}
    b.forEach(x=>{ if(x.city){ if(!cityMap[x.city]) cityMap[x.city]={city:x.city,bookings:0,revenue:0,completed:0}; cityMap[x.city].bookings++; if(x.status==='completed'&&x.amount){cityMap[x.city].revenue+=x.amount;cityMap[x.city].completed++} } })
    const cityPerf = Object.values(cityMap).sort((a,z)=>z.bookings-a.bookings)

    // Worker performance
    const workerPerf = w.map(wk=>({ name:wk.name||'?', city:wk.city||'-', skill:wk.skill||'-', jobs:wk.total_jobs||0, rating:wk.rating||5, kyc:wk.kyc_status||'pending' })).sort((a,z)=>z.jobs-a.jobs)

    // Service breakdown
    const svcMap = {}
    b.forEach(x=>{ if(x.service){ if(!svcMap[x.service]) svcMap[x.service]={service:x.service,count:0,revenue:0}; svcMap[x.service].count++; if(x.amount&&x.status==='completed') svcMap[x.service].revenue+=x.amount } })
    const serviceBreakdown = Object.values(svcMap).sort((a,z)=>z.count-a.count)

    // Commission report
    const commissionReport = p.map(x=>({ worker:x.workers?.name||'-', amount:x.amount||0, commission:x.commission_amount||Math.round((x.amount||0)*0.1), status:x.status, date:fmt(x.created_at) }))

    const totalRevenue = b.filter(x=>x.status==='completed'&&x.amount).reduce((a,x)=>a+(x.amount||0),0)
    const totalCommission = Math.round(totalRevenue*0.1)

    setData({ revenueByDay, cityPerf, workerPerf, serviceBreakdown, commissionReport, totalRevenue, totalCommission, totalBookings:b.length, completed:b.filter(x=>x.status==='completed').length })
    setLoading(false)
  }

  const REPORTS = ['revenue','workers','cities','services','commission']
  const th = { padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'11px 14px',fontSize:13,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }

  function exportReport(type) {
    if (!data) return
    const reports = {
      revenue: { rows: data.revenueByDay.map(r=>({Date:r.date,Bookings:r.bookings,Revenue:r.revenue,Commission:r.commission})), name:'revenue_report', title:'Revenue Report' },
      workers: { rows: data.workerPerf.map(r=>({Name:r.name,City:r.city,Skill:r.skill,Jobs:r.jobs,Rating:r.rating,KYC:r.kyc})), name:'worker_performance', title:'Worker Performance' },
      cities:  { rows: data.cityPerf.map(r=>({City:r.city,Bookings:r.bookings,Revenue:r.revenue,Completed:r.completed})), name:'city_performance', title:'City Performance' },
      services:{ rows: data.serviceBreakdown.map(r=>({Service:r.service,Count:r.count,Revenue:r.revenue})), name:'service_breakdown', title:'Service Breakdown' },
      commission: { rows: data.commissionReport.map(r=>({Worker:r.worker,Amount:r.amount,Commission:r.commission,Status:r.status,Date:r.date})), name:'commission_report', title:'Commission Report' },
    }
    const r = reports[reportType]
    if(type==='csv') exportCSV(r.rows, r.name)
    else if(type==='excel') exportExcel(r.rows, r.name, r.title)
    else exportPDF(Object.keys(r.rows[0]||{}), r.rows.map(row=>Object.values(row).map(String)), r.title, r.name)
  }

  return (
    <div>
      <TopBar title="Reports & Analytics" subtitle={`Last ${range} days summary`} actions={
        <div style={{ display:'flex', gap:8 }}>
          <select value={range} onChange={e=>setRange(Number(e.target.value))} style={{ padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button onClick={()=>exportReport('csv')} style={btnS('#10b981')}>CSV</button>
          <button onClick={()=>exportReport('excel')} style={btnS('#3b82f6')}>Excel</button>
          <button onClick={()=>exportReport('pdf')} style={btnS('#ef4444')}>PDF</button>
        </div>
      } />
      <div style={{ padding:32 }}>
        {loading||!data ? <Loader /> : (<>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
            {[['Total Bookings',data.totalBookings,'#6366f1'],['Completed',data.completed,'#10b981'],['Total Revenue',INR(data.totalRevenue),'#3b82f6'],['Commission',INR(data.totalCommission),'#8b5cf6']].map(([l,v,c])=>(
              <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
                <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#0f172a' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', marginBottom:24 }}>
            <h3 style={{ fontWeight:700, marginBottom:20, color:'#0f172a' }}>Revenue & Bookings Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize:11}} />
                <YAxis yAxisId="left" tick={{fontSize:11}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize:11}} />
                <Tooltip formatter={(v,n)=>n==='Revenue'||n==='Commission'?`Rs.${v}`:v} />
                <Legend />
                <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#6366f1" strokeWidth={2} dot={false} name="Bookings" />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue" />
                <Line yAxisId="left" type="monotone" dataKey="commission" stroke="#f59e0b" strokeWidth={2} dot={false} name="Commission" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {REPORTS.map(r=>(
              <button key={r} onClick={()=>setReportType(r)} style={{ padding:'10px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:reportType===r?'#6366f1':'#fff', color:reportType===r?'#fff':'#64748b', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', textTransform:'capitalize' }}>{r}</button>
            ))}
          </div>

          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
            {reportType==='revenue' && (
              <table><thead><tr>{['Date','Bookings','Revenue','Commission'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{data.revenueByDay.map((r,i)=><tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}><td style={td}>{r.date}</td><td style={td}>{r.bookings}</td><td style={td}><b>{INR(r.revenue)}</b></td><td style={td}>{INR(r.commission)}</td></tr>)}</tbody></table>
            )}
            {reportType==='workers' && (
              <table><thead><tr>{['Name','City','Skill','Total Jobs','Rating','KYC'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{data.workerPerf.map((r,i)=><tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}><td style={td}><b>{r.name}</b></td><td style={td}>{r.city}</td><td style={td}>{r.skill}</td><td style={td}><b>{r.jobs}</b></td><td style={td}>{r.rating} ★</td><td style={td}><span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, background:r.kyc==='approved'?'#d1fae5':'#fef3c7', color:r.kyc==='approved'?'#065f46':'#92400e', fontWeight:700 }}>{r.kyc}</span></td></tr>)}</tbody></table>
            )}
            {reportType==='cities' && (
              <table><thead><tr>{['City','Total Bookings','Completed','Revenue'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{data.cityPerf.map((r,i)=><tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}><td style={td}><b>{r.city}</b></td><td style={td}>{r.bookings}</td><td style={td}>{r.completed}</td><td style={td}><b>{INR(r.revenue)}</b></td></tr>)}</tbody></table>
            )}
            {reportType==='services' && (
              <table><thead><tr>{['Service','Total Bookings','Revenue'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{data.serviceBreakdown.map((r,i)=><tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}><td style={td}><b>{r.service}</b></td><td style={td}>{r.count}</td><td style={td}><b>{INR(r.revenue)}</b></td></tr>)}</tbody></table>
            )}
            {reportType==='commission' && (
              <table><thead><tr>{['Worker','Payout Amount','Commission','Status','Date'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{data.commissionReport.map((r,i)=><tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}><td style={td}><b>{r.worker}</b></td><td style={td}>{INR(r.amount)}</td><td style={td}><b>{INR(r.commission)}</b></td><td style={td}><span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, background:r.status==='paid'?'#d1fae5':'#fef3c7', color:r.status==='paid'?'#065f46':'#92400e', fontWeight:700 }}>{r.status}</span></td><td style={td}>{r.date}</td></tr>)}</tbody></table>
            )}
            {(data[reportType==='revenue'?'revenueByDay':reportType==='workers'?'workerPerf':reportType==='cities'?'cityPerf':reportType==='services'?'serviceBreakdown':'commissionReport']||[]).length===0 && (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No data for this period</div>
            )}
          </div>
        </>)}
      </div>
    </div>
  )
}
