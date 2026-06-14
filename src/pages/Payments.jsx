import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { exportCSV, exportExcel } from '../lib/export'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [verifyModal, setVerifyModal] = useState(null)  // payment being verified
  const [refInput, setRefInput] = useState('')           // payment reference admin enters
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('bookings')
      .select('*, workers(name,phone,upi_id)')
      .order('created_at',{ascending:false})
    setPayments((data||[]).filter(b=>b.amount&&b.amount>0))
    setLoading(false)
  }

  async function approvePayment() {
    if (!verifyModal) return
    setSaving(true)
    await sb.from('bookings').update({
      payment_status: 'paid',
      payment_confirmed_at: new Date().toISOString(),
      payment_id: refInput.trim() || verifyModal.payment_id || null
    }).eq('id', verifyModal.id)
    setVerifyModal(null)
    setRefInput('')
    await load()
    setSaving(false)
    setSelected(null)
  }

  async function updatePayment(id, status) {
    setSaving(true)
    await sb.from('bookings').update({
      payment_status: status,
      payment_confirmed_at: status==='paid' ? new Date().toISOString() : null
    }).eq('id', id)
    await load()
    setSelected(s=>s?{...s,payment_status:status}:null)
    setSaving(false)
  }

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q||(p.customer_name||'').toLowerCase().includes(q)||(p.payment_id||'').toLowerCase().includes(q)||(p.service||'').toLowerCase().includes(q)
    const matchF = filter==='all'||p.payment_status===filter||(filter==='pending'&&!p.payment_status)
    return matchQ&&matchF
  })

  const totalPaid = payments.filter(p=>p.payment_status==='paid').reduce((a,p)=>a+(p.amount||0),0)
  const totalPending = payments.filter(p=>p.payment_status==='pending'||!p.payment_status).reduce((a,p)=>a+(p.amount||0),0)
  const commission = Math.round(totalPaid*0.1)
  const pendingCount = payments.filter(p=>p.payment_status==='pending'||!p.payment_status).length

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:14,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }
  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', marginBottom:12, boxSizing:'border-box' }

  return (
    <div>
      <TopBar
        title="Payment Management"
        subtitle={`Collected: ${INR(totalPaid)} | Pending: ${INR(totalPending)} | Commission: ${INR(commission)}`}
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>exportCSV(filtered.map(p=>({Customer:p.customer_name,Service:p.service,Amount:p.amount,PaymentID:p.payment_id,Method:p.payment_method,Status:p.payment_status,Date:fmt(p.created_at)})),'payments')} style={btnS('#10b981')}>CSV</button>
            <button onClick={()=>exportExcel(filtered.map(p=>({Customer:p.customer_name,Service:p.service,Amount:p.amount,PaymentID:p.payment_id,Method:p.payment_method,Status:p.payment_status,Date:fmt(p.created_at)})),'payments','Payments')} style={btnS('#3b82f6')}>Excel</button>
          </div>
        }
      />
      <div style={{ padding:32 }}>

        {/* Pending verification banner */}
        {pendingCount > 0 && (
          <div style={{ background:'#fff7ed', border:'1px solid #f59e0b', borderRadius:10, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22 }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, color:'#92400e', fontSize:14 }}>{pendingCount} customer payment{pendingCount>1?'s':''} awaiting verification</div>
              <div style={{ fontSize:12, color:'#b45309', marginTop:2 }}>Total {INR(totalPending)} to verify. Review each payment and confirm or reject.</div>
            </div>
            <button onClick={()=>setFilter('pending')} style={{ ...btnS('#f59e0b'), fontSize:12, padding:'7px 14px' }}>View Pending</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            ['Total Transactions', payments.length, '#6366f1'],
            ['Total Collected', INR(totalPaid), '#10b981'],
            ['Pending Verification', `${pendingCount} (${INR(totalPending)})`, '#f59e0b'],
            ['Commission (10%)', INR(commission), '#8b5cf6']
          ].map(([l,v,c])=>(
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:l==='Total Transactions'?28:20, fontWeight:800, color:'#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search customer, payment ID, service..."
              style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, width:280, outline:'none' }}
            />
            {['all','pending','paid','failed','refunded'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:filter===f?'#6366f1':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize', position:'relative' }}>
                {f}
                {f==='pending'&&pendingCount>0 && <span style={{ position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{pendingCount}</span>}
              </button>
            ))}
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Booking ID','Customer','Worker','Service','Amount','Method','Payment Ref','Status','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(p=>(
                    <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontFamily:'monospace', fontSize:12, color:'#6366f1' }}>{p.id.slice(0,8)}</span></td>
                      <td style={td}>
                        <div style={{ fontWeight:600 }}>{p.customer_name||'-'}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{p.customer_phone||'-'}</div>
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight:600 }}>{p.workers?.name||'-'}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{p.workers?.phone||'-'}</div>
                      </td>
                      <td style={td}>{p.service||'-'}</td>
                      <td style={td}><span style={{ fontWeight:700, fontSize:15 }}>{INR(p.amount)}</span></td>
                      <td style={td}>{p.payment_method||'UPI'}</td>
                      <td style={td}><span style={{ fontFamily:'monospace', fontSize:11, color:'#6366f1' }}>{p.payment_id||'—'}</span></td>
                      <td style={td}>
 