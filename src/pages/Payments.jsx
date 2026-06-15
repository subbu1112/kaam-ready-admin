import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { exportCSV, exportExcel } from '../lib/export'
import { audit, AUDIT_ACTIONS } from '../lib/audit'
import { notifyPaymentSuccess } from '../lib/notify'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

export default function Payments() {
  const [payments,    setPayments]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all')
  const [selected,    setSelected]    = useState(null)
  const [verifyModal, setVerifyModal] = useState(null)
  const [refundModal, setRefundModal] = useState(null)
  const [refInput,    setRefInput]    = useState('')
  const [refundReason,setRefundReason]= useState('')
  const [saving,      setSaving]      = useState(false)

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
    const { data: { user } } = await sb.auth.getUser()
    const amt = verifyModal.amount || 0
    const workerShare = Math.round(amt * 0.9)
    // Mark payment verified + credit worker wallet via RPC
    await sb.from('bookings').update({
      payment_status: 'verified',
      payment_confirmed_at: new Date().toISOString(),
      payment_id: refInput.trim() || verifyModal.payment_id || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', verifyModal.id)
    // Credit worker wallet atomically
    if (verifyModal.worker_id) {
      await sb.rpc('increment_wallet', { worker_id: verifyModal.worker_id, amount: workerShare })
        .catch(() => {})
    }
    await audit(user?.email || 'admin', AUDIT_ACTIONS.VERIFY_PAYMENT, 'booking', verifyModal.id, {
      customer: verifyModal.customer_name, amount: amt, ref: refInput.trim()
    })
    if (verifyModal.customer_phone) {
      await notifyPaymentSuccess(verifyModal.customer_phone, null, {
        customerName: verifyModal.customer_name || '',
        amount: String(amt),
        bookingId: verifyModal.id.slice(0,8),
        service: verifyModal.service || '',
      })
    }
    setVerifyModal(null); setRefInput('')
    await load()
    setSaving(false); setSelected(null)
  }

  async function rejectPayment(id) {
    setSaving(true)
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('bookings').update({ payment_status: 'failed' }).eq('id', id)
    await audit(user?.email || 'admin', AUDIT_ACTIONS.REJECT_PAYMENT, 'booking', id, { status: 'failed' })
    await load()
    setSelected(s => s ? { ...s, payment_status:'failed' } : null)
    setSaving(false)
  }

  async function processRefund() {
    if (!refundModal) return
    if (!refundReason.trim()) { alert('Please enter a refund reason'); return }
    setSaving(true)
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('bookings').update({
      payment_status: 'refunded',
      refund_reason: refundReason.trim(),
      refund_requested_at: new Date().toISOString(),
    }).eq('id', refundModal.id)
    await audit(user?.email || 'admin', AUDIT_ACTIONS.REFUND_PAYMENT, 'booking', refundModal.id, {
      reason: refundReason.trim(), amount: refundModal.amount, customer: refundModal.customer_name,
    })
    // Notify customer
    if (refundModal.customer_phone) {
      await sb.from('notifications').insert({
        user_id: refundModal.user_id,
        title: 'Refund Processed',
        body: `Your refund of Rs.${refundModal.amount} for "${refundModal.service}" has been processed. Reason: ${refundReason.trim()}`,
        type: 'refund',
        booking_id: refundModal.id,
      }).catch(() => {})
    }
    setRefundModal(null); setRefundReason('')
    await load()
    setSaving(false); setSelected(null)
  }

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q||(p.customer_name||'').toLowerCase().includes(q)||(p.payment_id||'').toLowerCase().includes(q)||(p.service||'').toLowerCase().includes(q)
    const matchF = filter==='all'
      || p.payment_status===filter
      || (filter==='pending' && (p.payment_status==='pending_verification' || !p.payment_status))
    return matchQ&&matchF
  })

  const totalPaid    = payments.filter(p=>p.payment_status==='verified'||p.payment_status==='paid').reduce((a,p)=>a+(p.amount||0),0)
  const totalPending = payments.filter(p=>p.payment_status==='pending_verification'||!p.payment_status).reduce((a,p)=>a+(p.amount||0),0)
  const commission   = Math.round(totalPaid*0.1)
  const pendingCount = payments.filter(p=>p.payment_status==='pending_verification'||!p.payment_status).length

  const th  = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td  = { padding:'12px 16px',fontSize:14,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }
  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', marginBottom:12, boxSizing:'border-box' }

  function statusBadge(ps) {
    const map = {
      verified:             { bg:'#D1FAE5', c:'#065F46', label:'✓ Verified' },
      paid:                 { bg:'#D1FAE5', c:'#065F46', label:'✓ Paid' },
      pending_verification: { bg:'#DBEAFE', c:'#1d4ed8', label:'🔍 Under Review' },
      refunded:             { bg:'#EDE9FE', c:'#5B21B6', label:'↩ Refunded' },
      failed:               { bg:'#FEE2E2', c:'#991B1B', label:'✗ Failed' },
    }
    const s = map[ps] || { bg:'#FEF3C7', c:'#92400E', label:'Pending' }
    return <span style={{ background:s.bg, color:s.c, fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6, whiteSpace:'nowrap' }}>{s.label}</span>
  }

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

        {pendingCount > 0 && (
          <div style={{ background:'#fff7ed', border:'1px solid #f59e0b', borderRadius:10, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22 }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, color:'#92400e', fontSize:14 }}>{pendingCount} payment{pendingCount>1?'s':''} awaiting verification</div>
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
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, payment ID, service..."
              style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, width:280, outline:'none' }} />
            {['all','pending','verified','failed','refunded'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:filter===f?'#6366f1':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize', position:'relative' }}>
                {f==='pending'?'Pending':f==='verified'?'Verified':f}
                {f==='pending'&&pendingCount>0 && <span style={{ position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{pendingCount}</span>}
              </button>
            ))}
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Booking ID','Customer','Worker','Service','Amount','Method','Status','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(p=>(
                    <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontFamily:'monospace', fontSize:12, color:'#6366f1' }}>#{p.id.slice(0,8)}</span></td>
                      <td style={td}><div style={{ fontWeight:600 }}>{p.customer_name||'—'}</div><div style={{ fontSize:11, color:'#94a3b8' }}>{p.customer_phone||''}</div></td>
                      <td style={td}>{p.workers?.name||'—'}</td>
                      <td style={td}>{p.service||'—'}</td>
                      <td style={td}><span style={{ fontWeight:700, color:'#10b981' }}>{INR(p.amount)}</span></td>
                      <td style={td}>{p.payment_method||'UPI'}</td>
                      <td style={td}>{statusBadge(p.payment_status)}</td>
                      <td style={td} style={{ ...td, fontSize:12, color:'#64748b' }}>{fmt(p.created_at)}</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {p.payment_status==='pending_verification' && <>
                            <button onClick={()=>{ setVerifyModal(p); setRefInput('') }} style={btnS('#10b981','sm')}>✓ Verify</button>
                            <button onClick={()=>rejectPayment(p.id)} disabled={saving} style={btnS('#ef4444','sm')}>✕ Reject</button>
                          </>}
                          {(p.payment_status==='verified'||p.payment_status==='paid') && (
                            <button onClick={()=>{ setRefundModal(p); setRefundReason('') }} style={btnS('#8b5cf6','sm')}>↩ Refund</button>
                          )}
                          <button onClick={()=>setSelected(p)} style={btnS('#6366f1','sm')}>View</button>
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

      {/* Verify Payment Modal */}
      {verifyModal && (
        <Modal title="Verify Payment" onClose={()=>{setVerifyModal(null);setRefInput('')}} width={500}>
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {[['Customer',verifyModal.customer_name],['Service',verifyModal.service],['Amount',INR(verifyModal.amount)],['Worker',verifyModal.workers?.name]].map(([l,v])=>(
                <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                  <div style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{l}</div>
                  <div style={{ fontWeight:700, color:'#0f172a', marginTop:2 }}>{v||'—'}</div>
                </div>
              ))}
            </div>
            <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>UPI Transaction Reference (optional)</label>
            <input style={inp} placeholder="e.g. TXNID123456" value={refInput} onChange={e=>setRefInput(e.target.value)} />
            <p style={{ fontSize:12, color:'#64748b', marginTop:-8, marginBottom:16 }}>Checking this confirms the customer paid {INR(verifyModal.amount)} to KaamReady UPI. Worker gets {INR(Math.round((verifyModal.amount||0)*0.9))} (90%).</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>{setVerifyModal(null);setRefInput('')}} style={{ flex:1, padding:'11px', background:'#f1f5f9', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' }}>Cancel</button>
            <button onClick={approvePayment} disabled={saving} style={{ flex:2, ...btnS('#10b981'), padding:'11px', fontSize:14 }}>{saving?'Processing...':'✓ Confirm Payment Verified'}</button>
          </div>
        </Modal>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <Modal title="Process Refund" onClose={()=>{setRefundModal(null);setRefundReason('')}} width={460}>
          <div style={{ background:'#fff7ed', border:'1px solid #f59e0b', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
            <p style={{ fontWeight:700, color:'#92400e', fontSize:14 }}>⚠️ Refund {INR(refundModal.amount)} to {refundModal.customer_name}</p>
            <p style={{ fontSize:12, color:'#b45309', marginTop:4 }}>This marks the payment as refunded. Process the actual UPI refund manually from your bank app.</p>
          </div>
          <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Reason for Refund *</label>
          <textarea value={refundReason} onChange={e=>setRefundReason(e.target.value)} placeholder="e.g. Worker did not show up, duplicate payment, etc."
            rows={3} style={{ ...inp, resize:'vertical' }} />
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button onClick={()=>{setRefundModal(null);setRefundReason('')}} style={{ flex:1, padding:'11px', background:'#f1f5f9', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' }}>Cancel</button>
            <button onClick={processRefund} disabled={saving||!refundReason.trim()} style={{ flex:2, ...btnS('#8b5cf6'), padding:'11px', fontSize:14, opacity:(!refundReason.trim())?0.5:1 }}>{saving?'Processing...':'↩ Confirm Refund'}</button>
          </div>
        </Modal>
      )}

      {/* View details modal */}
      {selected && (
        <Modal title={`Booking #${selected.id.slice(0,8)}`} onClose={()=>setSelected(null)} width={500}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {[['Customer',selected.customer_name],['Phone',selected.customer_phone],['Worker',selected.workers?.name],['Service',selected.service],['Amount',INR(selected.amount)],['Method',selected.payment_method||'UPI'],['Status',selected.payment_status||'Pending'],['Date',fmt(selected.created_at)]].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{l}</div>
                <div style={{ fontWeight:600, color:'#0f172a', marginTop:2, fontSize:13 }}>{v||'—'}</div>
              </div>
            ))}
          </div>
          {selected.payment_status==='pending_verification' && (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setSelected(null);setVerifyModal(selected);setRefInput('')}} style={{ flex:1, ...btnS('#10b981'), padding:'10px' }}>✓ Verify Payment</button>
              <button onClick={()=>rejectPayment(selected.id)} disabled={saving} style={{ flex:1, ...btnS('#ef4444'), padding:'10px' }}>✕ Reject</button>
            </div>
          )}
          {(selected.payment_status==='verified'||selected.payment_status==='paid') && (
            <button onClick={()=>{setSelected(null);setRefundModal(selected);setRefundReason('')}} style={{ width:'100%', ...btnS('#8b5cf6'), padding:'10px' }}>↩ Process Refund</button>
          )}
        </Modal>
      )}
    </div>
  )
}
