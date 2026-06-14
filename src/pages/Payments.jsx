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

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('bookings').select('*').order('created_at',{ascending:false})
    setPayments((data||[]).filter(b=>b.amount&&b.amount>0))
    setLoading(false)
  }

  async function updatePayment(id, status) {
    await sb.from('bookings').update({ payment_status: status, payment_confirmed_at: status==='paid'?new Date().toISOString():null }).eq('id',id)
    await load()
    setSelected(s=>s?{...s,payment_status:status}:null)
  }

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q||(p.customer_name||'').toLowerCase().includes(q)||(p.payment_id||'').toLowerCase().includes(q)||(p.service||'').toLowerCase().includes(q)
    const matchF = filter==='all'||p.payment_status===filter
    return matchQ&&matchF
  })

  const totalPaid = payments.filter(p=>p.payment_status==='paid').reduce((a,p)=>a+(p.amount||0),0)
  const totalPending = payments.filter(p=>p.payment_status==='pending').reduce((a,p)=>a+(p.amount||0),0)
  const commission = Math.round(totalPaid*0.1)

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:14,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }

  return (
    <div>
      <TopBar title="Payment Management" subtitle={`Collected: ${INR(totalPaid)} | Pending: ${INR(totalPending)} | Commission: ${INR(commission)}`} actions={
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>exportCSV(filtered.map(p=>({Customer:p.customer_name,Service:p.service,Amount:p.amount,PaymentID:p.payment_id,Method:p.payment_method,Status:p.payment_status,Date:fmt(p.created_at)})),'payments')} style={btnS('#10b981')}>CSV</button>
          <button onClick={()=>exportExcel(filtered.map(p=>({Customer:p.customer_name,Service:p.service,Amount:p.amount,PaymentID:p.payment_id,Method:p.payment_method,Status:p.payment_status,Date:fmt(p.created_at)})),'payments','Payments')} style={btnS('#3b82f6')}>Excel</button>
        </div>
      } />
      <div style={{ padding:32 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[['Total Transactions',payments.length,'#6366f1'],['Total Collected',INR(totalPaid),'#10b981'],['Pending Payments',INR(totalPending),'#f59e0b'],['Commission (10%)',INR(commission),'#8b5cf6']].map(([l,v,c])=>(
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:24, fontWeight:800, color:'#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'center' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, payment ID, service..." style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, width:280, outline:'none' }} />
            {['all','pending','paid','failed','refunded'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:filter===f?'#6366f1':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize' }}>{f}</button>
            ))}
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>{['Booking ID','Customer','Service','Amount','Method','Payment ID','Status','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(p=>(
                    <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontFamily:'monospace', fontSize:12, color:'#6366f1' }}>{p.id.slice(0,8)}</span></td>
                      <td style={td}><div style={{ fontWeight:600 }}>{p.customer_name||'-'}</div><div style={{ fontSize:11, color:'#94a3b8' }}>{p.customer_phone||'-'}</div></td>
                      <td style={td}>{p.service||'-'}</td>
                      <td style={td}><span style={{ fontWeight:700, fontSize:15 }}>{INR(p.amount)}</span></td>
                      <td style={td}>{p.payment_method||'UPI'}</td>
                      <td style={td}><span style={{ fontFamily:'monospace', fontSize:11 }}>{p.payment_id||'-'}</span></td>
                      <td style={td}><Badge status={p.payment_status||'pending'} /></td>
                      <td style={td} style={{ ...td, fontSize:12 }}>{fmt(p.created_at)}</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>setSelected(p)} style={btnS('#6366f1','sm')}>View</button>
                          {(p.payment_status==='pending'||!p.payment_status) && <>
                            <button onClick={()=>updatePayment(p.id,'paid')} style={btnS('#10b981','sm')}>Verify</button>
                            <button onClick={()=>updatePayment(p.id,'failed')} style={btnS('#ef4444','sm')}>Reject</button>
                          </>}
                          {p.payment_status==='paid' && <button onClick={()=>updatePayment(p.id,'refunded')} style={btnS('#f59e0b','sm')}>Refund</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No payments found</div>}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <Modal title="Payment Details" onClose={()=>setSelected(null)} width={580}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {[['Booking ID',selected.id.slice(0,8)],['Customer',selected.customer_name||'-'],['Phone',selected.customer_phone||'-'],['Service',selected.service],['Amount',INR(selected.amount)],['Commission',INR(Math.round((selected.amount||0)*0.1))],['Worker Share',INR(Math.round((selected.amount||0)*0.9))],['Payment Method',selected.payment_method||'UPI'],['Payment ID',selected.payment_id||'-'],['Payment Status',<Badge status={selected.payment_status||'pending'} />],['Booking Status',<Badge status={selected.status} />],['Date',fmt(selected.created_at)]].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:3 }}>{l}</div>
                <div style={{ fontWeight:600, fontSize:13 }}>{v||'-'}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {(selected.payment_status==='pending'||!selected.payment_status) && <>
              <button onClick={()=>updatePayment(selected.id,'paid')} style={btnS('#10b981')}>Approve Payment</button>
              <button onClick={()=>updatePayment(selected.id,'failed')} style={btnS('#ef4444')}>Reject Payment</button>
            </>}
            {selected.payment_status==='paid' && <button onClick={()=>updatePayment(selected.id,'refunded')} style={btnS('#f59e0b')}>Issue Refund</button>}
          </div>
        </Modal>
      )}
    </div>
  )
}
