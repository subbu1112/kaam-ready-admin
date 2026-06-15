import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

const C = {
  primary:'#6366F1', success:'#10B981', danger:'#EF4444',
  warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B',
}

function Badge({ status }) {
  const map = {
    pending_verification: ['#FEF3C7','#92400E','🕐 Awaiting Approval'],
    verified:             ['#D1FAE5','#065F46','✅ Approved'],
    paid:                 ['#D1FAE5','#065F46','✅ Paid'],
    refunded:             ['#EDE9FE','#5B21B6','↩ Refunded'],
    rejected:             ['#FEE2E2','#991B1B','✕ Rejected'],
    pending:              ['#F1F5F9','#475569','— Pending'],
  }
  const [bg,col,lbl] = map[status] || ['#F1F5F9','#475569', status||'—']
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{lbl}</span>
}

export default function PaymentApprovals({ user, showToast, loadPending }) {
  const [rows,        setRows]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('pending_verification')
  const [modal,       setModal]       = useState(null)   // booking for approve modal
  const [refundModal, setRefundModal] = useState(null)
  const [refundReason,setRefundReason]= useState('')
  const [acting,      setActing]      = useState(false)
  const [page,        setPage]        = useState(0)
  const [total,       setTotal]       = useState(0)
  const PAGE = 20

  useEffect(() => { load(0) }, [filter])

  async function load(pg=0) {
    setLoading(true)
    setPage(pg)
    const from = pg * PAGE, to = from + PAGE - 1
    let q = sb.from('bookings')
      .select('id,status,payment_status,amount,service,customer_name,customer_phone,worker_id,created_at,payment_proof_url,refund_reason,cancelled_by,worker:workers(name,phone)', { count:'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filter === 'pending_verification') q = q.eq('payment_status','pending_verification')
    else if (filter === 'verified')        q = q.in('payment_status',['verified','paid'])
    else if (filter === 'refunded')        q = q.eq('payment_status','refunded')
    else if (filter === 'all')             q = q.not('payment_status','is',null)

    const { data, count, error } = await q
    setRows(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function getAdminToken() {
    const { data } = await sb.auth.getSession()
    return data.session?.access_token
  }

  async function approvePayment() {
    if (!modal || acting) return
    setActing(true)
    try {
      const token = await getAdminToken()
      // Verify via Edge Function first
      const check = await fetch(`${SUPABASE_URL}/functions/v1/admin-verify`, {
        method:'POST', headers:{ Authorization:`Bearer ${token}`, apikey:SUPABASE_ANON, 'Content-Type':'application/json' }
      })
      if (!check.ok) { showToast('Admin verification failed', 'error'); setActing(false); return }

      const amount = modal.amount || 0
      const workerShare = Math.round(amount * 0.9)

      // Update booking
      await sb.from('bookings').update({ payment_status:'verified', status:'completed' }).eq('id', modal.id)

      // Credit worker wallet
      if (modal.worker_id) {
        await sb.rpc('increment_wallet', { worker_id: modal.worker_id, amount: workerShare })
        // Notify worker
        await sb.from('notifications').insert({ user_id: modal.worker_id, title:'💰 Payment Verified!', body:`₹${workerShare} has been credited to your wallet for booking #${modal.id.slice(0,8).toUpperCase()}.` })
      }

      // Notify customer
      if (modal.user_id) {
        await sb.from('notifications').insert({ user_id: modal.user_id, title:'✅ Payment Confirmed!', body:`Your payment of ₹${amount} for ${modal.service} has been verified.` })
      }

      // Log action
      await sb.from('admin_logs').insert({ admin_id: user.id, action:'approve_payment', target_id: modal.id, details:{ amount, worker_share: workerShare } }).then(()=>{})

      showToast(`Payment approved — ₹${workerShare} credited to worker`, 'success')
      setModal(null)
      load(page)
      loadPending()
    } catch(e) {
      showToast(e.message, 'error')
    }
    setActing(false)
  }

  async function rejectPayment() {
    if (!modal || acting) return
    setActing(true)
    await sb.from('bookings').update({ payment_status:'rejected' }).eq('id', modal.id)
    if (modal.user_id) {
      await sb.from('notifications').insert({ user_id: modal.user_id, title:'⚠ Payment Not Verified', body:`We could not verify your payment for ${modal.service}. Please contact support.` })
    }
    await sb.from('admin_logs').insert({ admin_id: user.id, action:'reject_payment', target_id: modal.id, details:{} }).then(()=>{})
    showToast('Payment rejected', 'error')
    setModal(null)
    load(page)
    loadPending()
    setActing(false)
  }

  async function processRefund() {
    if (!refundModal || !refundReason.trim() || acting) return
    setActing(true)
    await sb.from('bookings').update({ payment_status:'refunded', refund_reason: refundReason.trim(), refund_requested_at: new Date().toISOString() }).eq('id', refundModal.id)
    if (refundModal.user_id) {
      await sb.from('notifications').insert({ user_id: refundModal.user_id, title:'↩ Refund Initiated', body:`Refund for ₹${refundModal.amount} has been initiated. Reason: ${refundReason.trim()}` })
    }
    await sb.from('admin_logs').insert({ admin_id: user.id, action:'refund_payment', target_id: refundModal.id, details:{ reason: refundReason.trim() } }).then(()=>{})
    showToast('Refund processed', 'success')
    setRefundModal(null)
    setRefundReason('')
    load(page)
    setActing(false)
  }

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'

  const FILTERS = [
    { id:'pending_verification', label:'⏳ Pending' },
    { id:'verified',             label:'✅ Approved' },
    { id:'refunded',             label:'↩ Refunded'  },
    { id:'all',                  label:'📋 All'      },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', marginBottom:20, border:'1px solid '+C.border }}>
        <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Payment Approvals</h2>
        <p style={{ fontSize:13, color:C.muted }}>Admin reviews and approves customer payments before workers are credited.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ background: filter===f.id ? C.primary : C.card, color: filter===f.id ? '#fff' : C.muted,
              border:'1px solid '+(filter===f.id ? C.primary : C.border), borderRadius:10, padding:'8px 16px',
              fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:13, color:C.muted, alignSelf:'center' }}>{total} total</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ background:C.card, borderRadius:16, padding:48, textAlign:'center', color:C.muted, border:'1px solid '+C.border }}>Loading...</div>
      ) : rows.length === 0 ? (
        <div style={{ background:C.card, borderRadius:16, padding:48, textAlign:'center', border:'1px solid '+C.border }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
          <p style={{ fontWeight:700, fontSize:16 }}>{filter==='pending_verification' ? 'All caught up!' : 'No records found'}</p>
          <p style={{ fontSize:13, color:C.muted, marginTop:6 }}>{filter==='pending_verification' ? 'No payments waiting for approval right now.' : 'No records match this filter.'}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rows.map(r => (
            <div key={r.id} style={{ background:C.card, borderRadius:16, padding:'16px 20px', border:'1px solid '+C.border, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:14 }}>{r.service || '—'}</span>
                  <Badge status={r.payment_status} />
                </div>
                <p style={{ fontSize:12, color:C.muted }}>#{r.id.slice(0,8).toUpperCase()} · {fmt(r.created_at)}</p>
                <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Customer: {r.customer_name||'—'} · Worker: {r.worker?.name||'—'}</p>
              </div>
              <div style={{ textAlign:'right', minWidth:80 }}>
                <p style={{ fontWeight:800, fontSize:18, color:'#0F172A' }}>₹{(r.amount||0).toLocaleString('en-IN')}</p>
                <p style={{ fontSize:11, color:C.muted }}>Worker gets ₹{Math.round((r.amount||0)*0.9).toLocaleString('en-IN')}</p>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                {r.payment_status === 'pending_verification' && (
                  <button onClick={() => setModal(r)}
                    style={{ background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                    Review →
                  </button>
                )}
                {(r.payment_status === 'verified' || r.payment_status === 'paid') && (
                  <button onClick={() => setRefundModal(r)}
                    style={{ background:'#EDE9FE', color:'#5B21B6', border:'1px solid #DDD6FE', borderRadius:10, padding:'8px 14px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                    ↩ Refund
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > PAGE && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0' }}>
              <p style={{ fontSize:13, color:C.muted }}>Showing {page*PAGE+1}–{Math.min((page+1)*PAGE, total)} of {total}</p>
              <div style={{ display:'flex', gap:8 }}>
                <button disabled={page===0} onClick={() => load(page-1)} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13, opacity:page===0?0.4:1 }}>← Prev</button>
                <button disabled={(page+1)*PAGE>=total} onClick={() => load(page+1)} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13, opacity:(page+1)*PAGE>=total?0.4:1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve / Reject Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:460 }}>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:4 }}>Review Payment</h3>
            <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Booking #{modal.id.slice(0,8).toUpperCase()}</p>
            {[
              ['Service',   modal.service],
              ['Customer',  modal.customer_name + (modal.customer_phone ? ' · '+modal.customer_phone : '')],
              ['Worker',    modal.worker?.name || '—'],
              ['Amount',    '₹' + (modal.amount||0).toLocaleString('en-IN')],
              ['Worker gets', '₹' + Math.round((modal.amount||0)*0.9).toLocaleString('en-IN') + ' (90%)'],
              ['Date',      fmt(modal.created_at)],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F1F5F9' }}>
                <span style={{ fontSize:13, color:C.muted }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
              </div>
            ))}
            {modal.payment_proof_url && (
              <div style={{ marginTop:16, marginBottom:4 }}>
                <p style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Payment Proof</p>
                <img src={modal.payment_proof_url} alt="proof" style={{ width:'100%', borderRadius:12, border:'1px solid '+C.border, maxHeight:200, objectFit:'contain' }} />
              </div>
            )}
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={() => setModal(null)} style={{ flex:1, background:'#F1F5F9', border:'none', borderRadius:12, padding:13, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={rejectPayment} disabled={acting} style={{ flex:1, background:'#FEE2E2', color:C.danger, border:'none', borderRadius:12, padding:13, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', opacity:acting?0.6:1 }}>✕ Reject</button>
              <button onClick={approvePayment} disabled={acting} style={{ flex:2, background:C.success, color:'#fff', border:'none', borderRadius:12, padding:13, fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit', opacity:acting?0.6:1 }}>{acting?'Processing...':'✅ Approve'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:400 }}>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:4 }}>Process Refund</h3>
            <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Booking #{refundModal.id.slice(0,8).toUpperCase()} · ₹{(refundModal.amount||0).toLocaleString('en-IN')}</p>
            <p style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Reason for refund</p>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value.slice(0,300))} placeholder="Explain why this refund is being issued..." rows={4}
              style={{ width:'100%', border:'1.5px solid '+C.border, borderRadius:12, padding:'12px 14px', fontSize:14, outline:'none', fontFamily:'inherit', resize:'none', boxSizing:'border-box', marginBottom:16 }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setRefundModal(null); setRefundReason('') }} style={{ flex:1, background:'#F1F5F9', border:'none', borderRadius:12, padding:13, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={processRefund} disabled={acting || !refundReason.trim()} style={{ flex:2, background:'#7C3AED', color:'#fff', border:'none', borderRadius:12, padding:13, fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit', opacity:(acting||!refundReason.trim())?0.6:1 }}>{acting?'Processing...':'↩ Issue Refund'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
