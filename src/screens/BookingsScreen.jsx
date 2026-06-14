import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { SERVICES } from '../constants'
import Btn from '../components/Btn'

const SVC_COLORS = {
  elec:{bg:'#FFF9E6'},plumb:{bg:'#EFF6FF'},clean:{bg:'#ECFDF5'},carpen:{bg:'#FFF7ED'},
  paint:{bg:'#F5F3FF'},pest:{bg:'#FFF1F2'},mech:{bg:'#F1F5F9'},labor:{bg:'#EFF6FF'},emerg:{bg:'#FFF1F2'},
}
const STATUS_CFG = {
  completed: { bg:'#D1FAE5', c:'#065F46', label:'✓ Done',         dot:'#10B981' },
  searching:  { bg:'#FFF8D6', c:'#B8900A', label:'Searching...',   dot:'#F5C000' },
  assigned:   { bg:'#DBEAFE', c:'#1E40AF', label:'Active',         dot:'#3B82F6' },
  priced:     { bg:'#FEF3C7', c:'#92400E', label:'💳 Pay Now',     dot:'#F59E0B' },
  cancelled:  { bg:'#FEE2E2', c:'#991B1B', label:'Cancelled',      dot:'#EF4444' },
  scheduled:  { bg:'#EDE9FE', c:'#5B21B6', label:'📅 Scheduled',   dot:'#7C3AED' },
}
const FILTERS = [
  { id:'all',    label:'All'     },
  { id:'active', label:'Active'  },
  { id:'done',   label:'Done'    },
]

export default function BookingsScreen({ user, setTab, setSelSvc, setRebookWorker, showToast }) {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [reportFor, setReportFor] = useState(null)
  const [reason,    setReason]    = useState('')
  const [busy,      setBusy]      = useState(false)

  useEffect(() => { if (user?.id) load(user.id) }, [user?.id])

  async function load(uid) {
    setLoading(true)
    const { data } = await sb.from('bookings').select('*')
      .eq('user_id', uid).order('created_at', { ascending:false })
    if (data) setBookings(data)
    setLoading(false)
  }

  async function rebook(b) {
    if (!b.worker_id) return
    const { data: w } = await sb.from('workers').select('*').eq('id', b.worker_id).single()
    if (!w) { showToast && showToast('Worker not found'); return }
    setRebookWorker(w)
    setSelSvc(SERVICES.find(s=>s.id===b.service_id) || { id:b.service_id, lbl:b.service, ico:'🔧', range:'' })
    setTab('book')
  }

  async function submitReport() {
    if (!reason.trim() || busy) return
    setBusy(true)
    const { error } = await sb.from('disputes').insert({
      booking_id:reportFor.id, raised_by:user.id, raised_by_role:'customer',
      reason:reason.trim(), status:'open',
    })
    setBusy(false)
    if (error) { showToast && showToast(error.message); return }
    setReportFor(null); setReason('')
    showToast && showToast('Reported — our team will reach out ✓')
  }

  const filtered = bookings.filter(b => {
    if (filter==='active') return ['searching','assigned','priced','scheduled'].includes(b.status)
    if (filter==='done')   return ['completed','cancelled'].includes(b.status)
    return true
  })

  function getSvc(b) { return SERVICES.find(s=>s.lbl===b.service) }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#F5F5F8' }}>

      {/* Header */}
      <div style={{ background:'#fff', padding:'52px 20px 0', borderBottom:'1px solid #F0F0F2', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1A1A1A' }}>My Bookings</h1>
          <span style={{ background:'#F5F5F8', color:'#6B7280', fontSize:12, fontWeight:700,
            padding:'4px 10px', borderRadius:20 }}>
            {bookings.length} total
          </span>
        </div>
        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6, paddingBottom:1 }}>
          {FILTERS.map(f => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
              style={{
                padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer',
                fontFamily:'inherit', fontWeight:700, fontSize:13, transition:'.15s',
                background: filter===f.id ? '#F5C000' : '#F5F5F8',
                color: filter===f.id ? '#1A1A1A' : '#6B7280',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report modal */}
      {reportFor && (
        <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:999,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430,
            padding:'20px 20px 40px', animation:'slideUp .3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <p style={{ fontWeight:800, fontSize:18 }}>⚠️ Report a Problem</p>
              <button type="button" onClick={() => { setReportFor(null); setReason('') }}
                style={{ background:'#F5F5F8', border:'none', borderRadius:10, padding:'6px 12px',
                  cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13 }}>
                Close
              </button>
            </div>
            <p style={{ fontSize:12, color:'#9CA3AF', marginBottom:12 }}>
              {reportFor.service} · {reportFor.amount ? '₹'+reportFor.amount : ''}
            </p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="What went wrong? e.g. charged more than agreed, poor work quality..."
              style={{ width:'100%', border:'1.5px solid #EBEBEB', borderRadius:13, padding:13,
                fontSize:14, outline:'none', fontFamily:'inherit', resize:'none', marginBottom:14,
                background:'#FAFAFA', boxSizing:'border-box' }} />
            <button type="button" onClick={submitReport} disabled={busy}
              style={{ width:'100%', background:'#EF4444', color:'#fff', border:'none', borderRadius:14,
                padding:15, fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit',
                opacity:busy?.6:1 }}>
              {busy ? 'Sending...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid #F5C000',
              borderTopColor:'transparent', margin:'0 auto 16px', animation:'spin .8s linear infinite' }} />
            <p style={{ color:'#9CA3AF', fontSize:14 }}>Loading bookings...</p>
          </div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'56px 24px' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📋</div>
            <p style={{ fontWeight:800, fontSize:18, color:'#1A1A1A' }}>
              {filter==='all' ? 'No bookings yet' : `No ${filter} bookings`}
            </p>
            <p style={{ fontSize:13, color:'#9CA3AF', margin:'8px 0 24px' }}>
              {filter==='all' ? 'Book your first service to get started' : 'Nothing here right now'}
            </p>
            {filter==='all' && <Btn label="Book Now →" onClick={() => setTab('home')}
              style={{ width:'auto', padding:'13px 28px', margin:'0 auto', display:'block' }} />}
          </div>
        ) : filtered.map(b => {
          const st  = STATUS_CFG[b.status] || STATUS_CFG.searching
          const svc = getSvc(b)
          const c   = SVC_COLORS[svc?.id] || { bg:'#F5F5F8' }
          const isActive = ['searching','assigned','priced','scheduled'].includes(b.status)
          return (
            <div key={b.id} style={{
              background:'#fff', borderRadius:18,
              boxShadow:'0 1px 3px rgba(0,0,0,.05), 0 4px 14px rgba(0,0,0,.04)',
              border: isActive ? '2px solid #F5C000' : '1px solid #F0F0F2',
              overflow:'hidden',
            }}>
              {/* Card header */}
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:46, height:46, borderRadius:14, background:c.bg,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                  {svc?.ico||'🔧'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <p style={{ fontSize:15, fontWeight:700, color:'#1A1A1A' }}>{b.service}</p>
                    <span style={{ background:st.bg, color:st.c, fontSize:11, fontWeight:700,
                      padding:'4px 10px', borderRadius:20, flexShrink:0 }}>
                      {st.label}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:'#9CA3AF', marginTop:3 }}>
                    {new Date(b.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    {b.is_scheduled && b.scheduled_at && (
                      <span style={{ marginLeft:6, color:'#7C3AED' }}>
                        · 📅 {new Date(b.scheduled_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Worker row */}
              {b.worker?.name && (
                <div style={{ margin:'0 16px 12px', display:'flex', alignItems:'center', gap:10,
                  background:'#FAFAFA', borderRadius:12, padding:'10px 12px' }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:'#FFF8D6',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {b.worker.ico||'👷'}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1A1A1A' }}>{b.worker.name}</p>
                    <p style={{ fontSize:11, color:'#9CA3AF' }}>
                      {b.worker.skill} · ★ {b.worker.rating||'5.0'}
                    </p>
                  </div>
                  {b.worker.phone && (
                    <a href={'tel:+91'+b.worker.phone}
                      style={{ width:34, height:34, borderRadius:10, background:'#D1FAE5',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:16, textDecoration:'none' }}>
                      📞
                    </a>
                  )}
                </div>
              )}

              {/* Address */}
              {b.address && (
                <p style={{ fontSize:12, color:'#9CA3AF', padding:'0 16px', marginBottom:10 }}>
                  📍 {b.address}
                </p>
              )}

              {/* Actions + amount */}
              {(b.status==='completed' || b.status==='cancelled' || b.amount > 0) && (
                <div style={{ borderTop:'1px solid #F0F0F2', padding:'12px 16px',
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:8, flex:1 }}>
                    {b.worker_id && b.status==='completed' && (
                      <button type="button" onClick={() => rebook(b)}
                        style={{ flex:1, background:'#FFF8D6', color:'#B8900A', border:'none',
                          borderRadius:12, padding:'9px 8px', fontWeight:700, fontSize:12,
                          cursor:'pointer', fontFamily:'inherit' }}>
                        🔁 Rebook
                      </button>
                    )}
                    {b.status==='completed' && (
                      <button type="button" onClick={() => setReportFor(b)}
                        style={{ flex:1, background:'#FEE2E2', color:'#991B1B', border:'none',
                          borderRadius:12, padding:'9px 8px', fontWeight:700, fontSize:12,
                          cursor:'pointer', fontFamily:'inherit' }}>
                        ⚠️ Report
                      </button>
                    )}
                  </div>
                  {b.amount > 0 && (
                    <p style={{ fontSize:16, fontWeight:800, color:'#B8900A', flexShrink:0 }}>₹{b.amount}</p>
                  )}
                </div>
              )}

              {b.rating > 0 && (
                <div style={{ padding:'0 16px 12px' }}>
                  <span style={{ fontSize:14, color:'#F59E0B' }}>{'★'.repeat(b.rating)}{'☆'.repeat(5-b.rating)}</span>
                </div>
              )}
            </div>
          )
        })}
        <div style={{ height:8 }} />
      </div>
    </div>
  )
}
