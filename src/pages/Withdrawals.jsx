import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { exportCSV } from '../lib/export'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
const INR = v => 'Rs.' + (Number(v)||0).toLocaleString('en-IN')
function btnS(bg,size='md'){ return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

// Admin processing of worker-initiated UPI withdrawal requests (public.withdrawals).
export default function Withdrawals({ showToast }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [payNow, setPayNow]   = useState(null)
  const [utr, setUtr]         = useState('')
  const [saving, setSaving]   = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('withdrawals')
      .select('*, workers(name,phone,upi_id,wallet_balance)')
      .order('created_at', { ascending:false })
    setRows(data || [])
    setLoading(false)
  }

  async function markPaid() {
    if (!payNow) return
    if (!utr.trim()) { showToast ? showToast('Enter the UTR / transaction reference.') : alert('Enter the UTR / transaction reference.'); return }
    setSaving(true)
    const { error } = await sb.from('withdrawals').update({
      status:'paid', utr: utr.trim(), processed_at: new Date().toISOString(),
    }).eq('id', payNow.id)
    if (error) { setSaving(false); showToast && showToast(error.message); return }
    // Deduct the wallet at payout time (admin-authorized, atomic RPC). The worker
    // app reserves funds via "available = wallet − pending" but never writes balance.
    const { error: wErr } = await sb.rpc('increment_wallet', { worker_id: payNow.worker_id, amount: -Math.abs(Number(payNow.amount) || 0) })
    setSaving(false)
    if (wErr) { showToast && showToast('Paid, but wallet not deducted: ' + wErr.message); }
    setPayNow(null); setUtr('')
    showToast && showToast('Marked as paid & wallet deducted — worker notified ✓')
    load()
  }

  // Rejecting just closes the request. No wallet change is needed because the
  // balance is only deducted on payout, not at request time.
  async function reject(w) {
    if (!confirm(`Reject ${INR(w.amount)} withdrawal for ${w.workers?.name||'worker'}?`)) return
    setSaving(true)
    const { error } = await sb.from('withdrawals').update({ status:'rejected', processed_at:new Date().toISOString() }).eq('id', w.id)
    setSaving(false)
    if (error) { showToast && showToast(error.message); return }
    showToast && showToast('Withdrawal rejected — worker notified')
    load()
  }

  function copyUPI(t) { navigator.clipboard.writeText(t||'').then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),1500) }) }

  const isPending = s => s==='requested' || s==='pending'
  const filtered = rows.filter(r => filter==='all' ? true : filter==='pending' ? isPending(r.status) : r.status===filter)
  const pendingAmt = rows.filter(r=>isPending(r.status)).reduce((a,r)=>a+(Number(r.amount)||0),0)
  const paidAmt    = rows.filter(r=>r.status==='paid').reduce((a,r)=>a+(Number(r.amount)||0),0)
  const pendingCount = rows.filter(r=>isPending(r.status)).length

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:14,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }
  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' }

  return (
    <div>
      <TopBar title="Withdrawal Requests" subtitle="Worker-initiated UPI payouts" actions={
        <button onClick={()=>exportCSV(filtered.map(r=>({Worker:r.workers?.name,UPI:r.upi_id,Amount:r.amount,Status:r.status,UTR:r.utr,Requested:fmt(r.created_at)})),'withdrawals')} style={btnS('#10b981')}>CSV</button>
      } />
      <div style={{ padding:32 }}>
        {pendingCount > 0 && (
          <div style={{ background:'#fffbeb', border:'1px solid #f59e0b', borderRadius:10, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight:700, color:'#92400e', fontSize:14 }}>{pendingCount} withdrawal{pendingCount>1?'s':''} awaiting payout</div>
              <div style={{ fontSize:12, color:'#b45309' }}>Total {INR(pendingAmt)} requested by workers. Transfer via UPI, then mark paid.</div>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {[['Pending',INR(pendingAmt),'#f59e0b'],['Paid Out',INR(paidAmt),'#10b981'],['Requests',rows.length,'#6366f1']].map(([l,v,c])=>(
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8 }}>
            {['all','pending','paid','rejected'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:filter===f?'#6366f1':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize' }}>{f}</button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b', lineHeight:'34px' }}>{filtered.length} requests</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Worker','UPI ID','Amount','Status','UTR','Requested','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(r=>(
                    <tr key={r.id}>
                      <td style={td}><div style={{ fontWeight:600 }}>{r.workers?.name||'-'}</div><div style={{ fontSize:12, color:'#94a3b8' }}>{r.workers?.phone||''}</div></td>
                      <td style={td}><span style={{ fontSize:12, fontFamily:'monospace', color:'#6366f1' }}>{r.upi_id||r.workers?.upi_id||'—'}</span></td>
                      <td style={td}><span style={{ fontWeight:700, color:'#10b981' }}>{INR(r.amount)}</span></td>
                      <td style={td}><Badge status={r.status==='requested'?'pending':r.status} /></td>
                      <td style={td}><span style={{ fontSize:12, fontFamily:'monospace' }}>{r.utr||'—'}</span></td>
                      <td style={{ ...td, fontSize:12 }}>{fmt(r.created_at)}</td>
                      <td style={td}>
                        {isPending(r.status) ? (
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={()=>{ setPayNow(r); setUtr('') }} style={btnS('#10b981','sm')}>Pay Now</button>
                            <button disabled={saving} onClick={()=>reject(r)} style={btnS('#ef4444','sm')}>Reject</button>
                          </div>
                        ) : <span style={{ fontSize:12, color:'#94a3b8' }}>{fmt(r.processed_at)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No withdrawal requests</div>}
            </div>
          )}
        </div>
      </div>

      {payNow && (
        <Modal title="Pay Withdrawal" onClose={()=>{ setPayNow(null); setUtr('') }} width={480}>
          <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:8 }}>WORKER</div>
            <div style={{ fontWeight:700, fontSize:16, color:'#0f172a' }}>{payNow.workers?.name||'—'}</div>
            <div style={{ fontSize:13, color:'#64748b' }}>{payNow.workers?.phone||'—'}</div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#64748b', fontWeight:700, marginBottom:6, textTransform:'uppercase' }}>UPI ID to pay</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, background:'#eff6ff', border:'2px solid #6366f1', borderRadius:8, padding:'12px 16px', fontFamily:'monospace', fontSize:16, fontWeight:700 }}>{payNow.upi_id || payNow.workers?.upi_id || 'No UPI on file'}</div>
              <button onClick={()=>copyUPI(payNow.upi_id||payNow.workers?.upi_id)} style={{ padding:'12px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:copied?'#10b981':'#fff', color:copied?'#fff':'#374151', cursor:'pointer', fontSize:13, fontWeight:600 }}>{copied?'✓':'Copy'}</button>
            </div>
          </div>
          <div style={{ background:'#f0fdf4', border:'2px solid #10b981', borderRadius:8, padding:'14px 20px', marginBottom:16 }}>
            <div style={{ fontSize:28, fontWeight:800, color:'#065f46' }}>{INR(payNow.amount)}</div>
            <div style={{ fontSize:12, color:'#6b7280' }}>Transfer this amount to the worker's UPI</div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#64748b', fontWeight:700, marginBottom:6, textTransform:'uppercase' }}>UTR / Transaction Reference</div>
            <input style={{ ...inp, fontFamily:'monospace' }} placeholder="e.g. 406123456789" value={utr} onChange={e=>setUtr(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button disabled={saving || !utr.trim()} onClick={markPaid} style={{ ...btnS('#10b981'), flex:1, padding:'13px', opacity:(!utr.trim()||saving)?0.5:1 }}>{saving?'Saving...':'✓ Confirm Paid'}</button>
            <button onClick={()=>{ setPayNow(null); setUtr('') }} style={{ ...btnS('#64748b'), padding:'13px 20px' }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
