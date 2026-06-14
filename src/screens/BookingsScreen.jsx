import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000'
const STATUS_COLOR = { searching:'#f59e0b', assigned:'#3b82f6', priced:'#8b5cf6', completed:'#22c55e', cancelled:'#6b7280', scheduled:'#06b6d4' }
const FILTERS = ['all','searching','assigned','priced','completed','cancelled']

export default function BookingsScreen() {
  const [filter,   setFilter]   = useState('all')
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [sel,      setSel]      = useState(null)
  const [busy,     setBusy]     = useState(false)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = sb.from('bookings').select('*').order('created_at',{ascending:false}).limit(60)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setBookings(data||[])
    setLoading(false)
  }

  async function forceComplete(b) {
    if (!confirm(`Mark booking #${b.id.slice(-6)} as completed?`)) return
    setBusy(true)
    await sb.from('bookings').update({ status:'completed', payment_status:'paid', completed_at: new Date().toISOString() }).eq('id', b.id)
    showToast && showToast('Booking marked complete')
    setSel(null); load()
    setBusy(false)
  }

  async function forceCancel(b) {
    if (!confirm(`Cancel booking #${b.id.slice(-6)}?`)) return
    setBusy(true)
    await sb.from('bookings').update({ status:'cancelled' }).eq('id', b.id)
    setSel(null); load()
    setBusy(false)
  }

  async function confirmPayment(b) {
    setBusy(true)
    await sb.from('bookings').update({ status:'completed', payment_status:'paid', payment_confirmed_at: new Date().toISOString(), completed_at: new Date().toISOString() }).eq('id', b.id)
    setSel(null); load()
    setBusy(false)
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#0A0A0A' }}>
      <div style={{ background:'#111', padding:'16px 16px 0', borderBottom:'1px solid #1a1a1a', flexShrink:0 }}>
        <p style={{ color:'#fff', fontWeight:900, fontSize:18, marginBottom:12 }}>📋 Bookings</p>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:12 }}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:'5px 12px', borderRadius:20, border:'none', background:filter===f?Y:'#1a1a1a', color:filter===f?'#000':'#888', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0, textTransform:'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 80px' }}>
        {loading ? <p style={{ color:'#555', textAlign:'center', padding:32 }}>Loading…</p> :
         bookings.length===0 ? <p style={{ color:'#555', textAlign:'center', padding:32 }}>No bookings</p> :
         bookings.map(b => (
          <div key={b.id} onClick={()=>setSel(b===sel?null:b)}
            style={{ background:'#111', borderRadius:14, border:`1px solid ${sel?.id===b.id?Y:'#1a1a1a'}`, padding:'12px 14px', marginBottom:8, cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <p style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{b.service||'—'} · {b.city}</p>
                <p style={{ color:'#555', fontSize:11, marginTop:3 }}>
                  #{b.id.slice(-6)} · {new Date(b.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                </p>
                {b.amount && <p style={{ color:Y, fontWeight:800, fontSize:13, marginTop:4 }}>₹{b.amount}</p>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                <span style={{ background:STATUS_COLOR[b.status]+'22', color:STATUS_COLOR[b.status], fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, textTransform:'uppercase' }}>{b.status}</span>
                {b.payment_status && <span style={{ background:'#1a1a1a', color:'#888', fontSize:10, padding:'2px 6px', borderRadius:4 }}>{b.payment_status}</span>}
              </div>
            </div>

            {sel?.id===b.id && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #222' }}>
                <div style={{ fontSize:12, color:'#555', lineHeight:1.8 }}>
                  <p><span style={{color:'#888'}}>Customer:</span> {b.user_id?.slice(-8)||'—'}</p>
                  <p><span style={{color:'#888'}}>Worker:</span> {b.worker_id?.slice(-8)||'Not assigned'}</p>
                  <p><span style={{color:'#888'}}>Address:</span> {b.address||'—'}</p>
                  {b.price_note && <p><span style={{color:'#888'}}>Note:</span> {b.price_note}</p>}
                </div>
                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  {b.payment_status==='claimed' && (
                    <button onClick={e=>{e.stopPropagation();confirmPayment(b)}} disabled={busy}
                      style={{ flex:1, background:'#22c55e', border:'none', borderRadius:10, padding:'10px 0', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                      ✓ Confirm Payment
                    </button>
                  )}
                  {b.status!=='completed' && b.status!=='cancelled' && (
                    <button onClick={e=>{e.stopPropagation();forceComplete(b)}} disabled={busy}
                      style={{ flex:1, background:'#1a1a1a', border:'1px solid #3b82f6', borderRadius:10, padding:'10px 0', color:'#3b82f6', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      Force Complete
                    </button>
                  )}
                  {b.status!=='completed' && b.status!=='cancelled' && (
                    <button onClick={e=>{e.stopPropagation();forceCancel(b)}} disabled={busy}
                      style={{ flex:1, background:'#1a1a1a', border:'1px solid #ef4444', borderRadius:10, padding:'10px 0', color:'#ef4444', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
