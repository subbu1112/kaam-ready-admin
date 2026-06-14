import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Loader from '../components/Loader'

const INR = v => '₹' + (v||0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit' } }

const STATUS_COLOR = { pending_verification:'#f59e0b', verified:'#10b981', rejected:'#ef4444', paid:'#10b981', claimed:'#6366f1', pending:'#94a3b8' }

export default function Payments() {
  const [data,     setData]     = useState([])
  const [stats,    setStats]    = useState({})
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('verify')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: bookings } = await sb.from('bookings')
      .select('id,service,amount,payment_status,payment_proof_url,payment_method,customer_paid_at,created_at,city,address,customer_name,customer_phone,worker_id,status,transaction_id,rejection_reason')
      .not('amount', 'is', null)
      .order('created_at', { ascending:false })
    const b = bookings||[]
    const total   = b.filter(x=>x.payment_status==='verified'||x.payment_status==='paid').reduce((a,x)=>a+(x.amount||0),0)
    const commission = Math.round(total*0.1)
    const pending = b.filter(x=>x.payment_status==='pending_verification').length
    setStats({ total, commission, pending, totalTx:b.length })
    setData(b)
    setLoading(false)
  }

  async function approvePayment(booking) {
    setSaving(true)
    const workerPayout = Math.round((booking.amount||0)*0.9)
    await sb.from('bookings').update({
      payment_status: 'verified',
      status: 'completed',
      payment_verified_at: new Date().toISOString(),
    }).eq('id', booking.id)
    // Create/update payout record for worker
    if (booking.worker_id) {
      await sb.from('payouts').upsert({
        worker_id: booking.worker_id,
        booking_id: booking.id,
        amount: workerPayout,
        commission_amount: Math.round((booking.amount||0)*0.1),
        status: 'pending',
        created_at: new Date().toISOString(),
      }, { onConflict:'booking_id' }).catch(()=>{})
      // Credit worker wallet
      await sb.rpc('increment_wallet', { worker_id: booking.worker_id, amount: workerPayout }).catch(()=>{})
    }
    setSaving(false)
    setSelected(null)
    await load()
  }

  async function rejectPayment(booking) {
    if (!rejectReason.trim()) { alert('Enter rejection reason'); return }
    setSaving(true)
    await sb.from('bookings').update({
      payment_status: 'rejected',
      rejection_reason: rejectReason.trim(),
    }).eq('id', booking.id)
    setSaving(false)
    setSelected(null)
    setRejectReason('')
    await load()
  }

  const queue   = data.filter(b => b.payment_status==='pending_verification')
  const history = data.filter(b => b.payment_status==='verified' || b.payment_status==='paid' || b.payment_status==='rejected')
  const filtered = (tab==='verify' ? queue : history).filter(b =>
    !search || [b.customer_name,b.service,b.city,b.id].some(v=>(v||'').toLowerCase().includes(search.toLowerCase()))
  )

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:13,color:'#1e293b',borderBottom:'1px solid #f1f5f9',verticalAlign:'top' }

  return (
    <div>
      <TopBar title="Payment Management" subtitle="Verify customer payments and manage payouts" />
      <div style={{ padding:32 }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
          {[
            ['Verification Queue', stats.pending||0, '#f59e0b', stats.pending>0?'Needs attention':'All clear'],
            ['Total Revenue', INR(stats.total||0), '#10b981', '10% commission model'],
            ['Commission Earned', INR(stats.commission||0), '#6366f1', 'Platform earnings'],
            ['Total Transactions', stats.totalTx||0, '#3b82f6', 'All bookings with amounts'],
          ].map(([l,v,c,sub]) => (
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:24, fontWeight:800, color:'#0f172a' }}>{v}</div>
              <div style={{ fontSize:11, color:c, fontWeight:600, marginTop:4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
          <button onClick={()=>setTab('verify')} style={{ padding:'10px 18px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, background:tab==='verify'?'#f59e0b':'#fff', color:tab==='verify'?'#fff':'#64748b', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', display:'flex', alignItems:'center', gap:6 }}>
            🔍 Verification Queue {queue.length>0 && <span style={{ background:'#ef4444', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:11 }}>{queue.length}</span>}
          </button>
          <button onClick={()=>setTab('history')} style={{ padding:'10px 18px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, background:tab==='history'?'#6366f1':'#fff', color:tab==='history'?'#fff':'#64748b', boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
            📋 Payment History
          </button>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, service, city..." style={{ marginLeft:'auto', padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', width:260 }} />
          <button onClick={load} style={btnS('#6366f1','sm')}>↺ Refresh</button>
        </div>

        {loading ? <Loader /> : (
          <>
            {tab==='verify' && queue.length===0 && (
              <div style={{ background:'#f0fdf4', borderRadius:12, padding:40, textAlign:'center', border:'1px solid #bbf7d0' }}>
                <div style={{ fontSize:48, marginBottom:8 }}>✅</div>
                <p style={{ fontWeight:700, color:'#16a34a', fontSize:16 }}>All payments verified!</p>
                <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>No pending payment screenshots to review</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Customer','Service','Amount','City','Date','Status','Proof','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map(b => (
                      <tr key={b.id} style={{ cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={td}>
                          <b>{b.customer_name||'—'}</b>
                          <br/><span style={{fontSize:11,color:'#94a3b8'}}>{b.customer_phone||''}</span>
                        </td>
                        <td style={td}>{b.service||'—'}</td>
                        <td style={td}><b style={{color:'#10b981'}}>{INR(b.amount)}</b></td>
                        <td style={td}>{b.city||'—'}</td>
                        <td style={td}><span style={{fontSize:11,color:'#64748b'}}>{fmt(b.customer_paid_at||b.created_at)}</span></td>
                        <td style={td}>
                          <Badge label={b.payment_status||'pending'} color={STATUS_COLOR[b.payment_status]||'#94a3b8'} />
                        </td>
                        <td style={td}>
                          {b.payment_proof_url
                            ? <a href={b.payment_proof_url} target="_blank" rel="noreferrer" style={{ color:'#6366f1', fontSize:12, fontWeight:600 }}>📷 View</a>
                            : <span style={{color:'#cbd5e1',fontSize:12}}>—</span>}
                        </td>
                        <td style={td}>
                          {b.payment_status==='pending_verification' && (
                            <button onClick={()=>{ setSelected(b); setRejectReason('') }} style={btnS('#6366f1','sm')}>Review</button>
                          )}
                          {b.payment_status==='verified' && <span style={{color:'#10b981',fontSize:12,fontWeight:700}}>✓ Approved</span>}
                          {b.payment_status==='rejected' && <span style={{color:'#ef4444',fontSize:12,fontWeight:700}}>✗ Rejected</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:600, maxHeight:'92vh', overflow:'auto', padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontWeight:800, fontSize:18, color:'#0f172a' }}>🔍 Verify Payment</h2>
              <button onClick={()=>setSelected(null)} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'#64748b' }}>✕ Close</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              {[
                ['Customer', selected.customer_name||'—'],
                ['Phone', selected.customer_phone||'—'],
                ['Service', selected.service||'—'],
                ['City', selected.city||'—'],
                ['Amount', INR(selected.amount)],
                ['Paid At', fmt(selected.customer_paid_at)],
              ].map(([l,v]) => (
                <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                  <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{l}</p>
                  <p style={{ fontSize:14, color:'#0f172a', fontWeight:600 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Payment Proof Image */}
            {selected.payment_proof_url ? (
              <div style={{ marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', marginBottom:10 }}>Payment Screenshot</p>
                <img src={selected.payment_proof_url} alt="payment proof" style={{ width:'100%', borderRadius:10, maxHeight:300, objectFit:'contain', background:'#f8fafc', border:'1px solid #e2e8f0' }} />
                <a href={selected.payment_proof_url} target="_blank" rel="noreferrer" style={{ display:'block', textAlign:'center', marginTop:8, fontSize:12, color:'#6366f1', fontWeight:600 }}>🔗 Open full image</a>
              </div>
            ) : (
              <div style={{ background:'#fef3c7', borderRadius:10, padding:16, marginBottom:20, textAlign:'center' }}>
                <p style={{ color:'#92400e', fontWeight:700 }}>⚠️ No payment proof uploaded yet</p>
              </div>
            )}

            {/* Reject reason */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', display:'block', marginBottom:8 }}>Rejection Reason (required for reject)</label>
              <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={2} placeholder="e.g. Screenshot unclear, amount mismatch, wrong UPI ID shown..."
                style={{ width:'100%', border:'2px solid #e2e8f0', borderRadius:8, padding:10, fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box' }} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>approvePayment(selected)} disabled={saving} style={{ ...btnS('#10b981'), flex:1, padding:14, fontSize:15 }}>
                {saving ? 'Processing...' : '✅ Approve Payment'}
              </button>
              <button onClick={()=>rejectPayment(selected)} disabled={saving||!rejectReason.trim()} style={{ ...btnS('#ef4444'), flex:1, padding:14, fontSize:15, opacity: rejectReason.trim()?1:0.5 }}>
                {saving ? 'Processing...' : '❌ Reject Payment'}
              </button>
            </div>
            <p style={{ fontSize:11, color:'#94a3b8', marginTop:10, textAlign:'center' }}>Approving credits ₹{Math.round((selected.amount||0)*0.9)} to worker's wallet (90%) and marks job complete</p>
          </div>
        </div>
      )}
    </div>
  )
}
