import { useState, useEffect, useCallback } from 'react'
import { sb } from '../lib/supabase'
import { statusOf, staffingLabel } from '../lib/status'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'
const INR = v => '₹' + (v||0).toLocaleString('en-IN')
const digits10 = v => String(v||'').replace(/\D/g,'').slice(-10)

function Badge({ bg, fg, children }) {
  return <span style={{ background:bg, color:fg, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, whiteSpace:'nowrap' }}>{children}</span>
}

function StatusBadge({ booking }) {
  const st = statusOf(booking)
  return <Badge bg={st.bg} fg={st.fg}>{st.ico} {st.label}</Badge>
}

function PayBadge({ status }) {
  const m = {
    pending_verification: ['#FEF3C7','#92400E','⏳ Pending'],
    verified:             ['#D1FAE5','#065F46','✅ Verified'],
    paid:                 ['#D1FAE5','#065F46','✅ Paid'],
    refunded:             ['#EDE9FE','#5B21B6','↩ Refunded'],
    rejected:             ['#FEE2E2','#991B1B','✕ Rejected'],
  }
  if (!status) return <span style={{ fontSize:11, color:C.muted }}>—</span>
  const [bg,col,lbl] = m[status] || ['#F1F5F9','#475569',status]
  return <Badge bg={bg} fg={col}>{lbl}</Badge>
}

const STATUS_FILTERS = [
  ['all','All'], ['searching','Pending'], ['assigned','Confirmed'], ['otp_verified','In Progress'],
  ['priced','Awaiting Payment'], ['completed','Completed'],
  ['customer_cancelled','Cancelled by Customer'], ['worker_cancelled','Cancelled by Worker'],
  ['expired','Expired'],
]

export default function Bookings({ user, showToast }) {
  const [rows,     setRows]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [query,    setQuery]    = useState('')
  const [applied,  setApplied]  = useState('')
  const [statusF,  setStatusF]  = useState('all')
  const [payF,     setPayF]     = useState('all')
  const [selected, setSelected] = useState(null)

  // Everything — including the phone lookup — is resolved server-side by
  // admin_search_bookings, because the number a customer books with can live in
  // three different places (the booking, their profile, or their auth record)
  // and a Google sign-up may have no number on the booking at all.
  const load = useCallback(async (q = '') => {
    setLoading(true)
    const { data, error } = await sb.rpc('admin_search_bookings', { p_query: q, p_limit: 400 })
    if (error) { showToast?.('Search failed: ' + error.message, 'error'); setRows([]); setLoading(false); return }
    setRows(data || [])
    setLoading(false)
  }, [showToast])

  useEffect(() => { load('') }, [load])

  function runSearch() {
    const q = query.trim()
    setApplied(q)
    load(q)
  }

  function clearSearch() {
    setQuery(''); setApplied(''); load('')
  }

  const filtered = rows.filter(b => {
    const mS = statusF === 'all' || b.status === statusF ||
               (statusF === 'completed' && ['completed','paid'].includes(b.status))
    const mP = payF === 'all' || b.payment_status === payF || (payF === 'none' && !b.payment_status)
    return mS && mP
  })

  const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, background:C.bg, borderBottom:'1px solid '+C.border }
  const td = { padding:'11px 14px', fontSize:13, color:C.text, borderBottom:'1px solid '+C.border, verticalAlign:'top' }

  const phoneSearch = digits10(applied).length === 10

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Bookings</h2>
          <p style={{ fontSize:13, color:C.muted }}>
            {applied ? `${rows.length} result${rows.length===1?'':'s'} for "${applied}"` : `${rows.length} most recent bookings`}
          </p>
        </div>
        <button onClick={() => load(applied)} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>↺ Refresh</button>
      </div>

      {/* ── Search by customer mobile number ─────────────────────────── */}
      <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, padding:'16px 18px', marginBottom:16 }}>
        <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
          Search Customer Mobile Number
        </label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
            placeholder="e.g. 9876543210 — or a name, email or booking ID"
            style={{ flex:'1 1 320px', minWidth:0, padding:'11px 14px', border:'1.5px solid '+C.border,
              borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', background:C.bg }} />
          <button onClick={runSearch}
            style={{ background:C.primary, color:'#fff', border:'none', borderRadius:10, padding:'11px 22px',
              fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Search</button>
          {applied && (
            <button onClick={clearSearch}
              style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'11px 18px',
                fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
          )}
        </div>
        <p style={{ fontSize:11.5, color:C.muted, marginTop:8 }}>
          Matches the number on the booking, on the customer's profile and on their sign-in record —
          so a customer who signed up with Google still turns up once they've added a mobile.
          {phoneSearch && <strong> Searching by mobile number.</strong>}
        </p>
      </div>

      <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid '+C.border, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {STATUS_FILTERS.map(([f,l])=>(
              <button key={f} onClick={()=>setStatusF(f)}
                style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit',
                  background:statusF===f?C.primary:C.bg, color:statusF===f?'#fff':C.muted }}>{l}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {[['all','All Pay'],['pending_verification','Pending'],['verified','Verified'],['none','No Pay']].map(([f,l])=>(
              <button key={f} onClick={()=>setPayF(f)}
                style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit',
                  background:payF===f?C.warning:C.bg, color:payF===f?'#fff':C.muted }}>{l}</button>
            ))}
          </div>
          <span style={{ marginLeft:'auto', fontSize:12, color:C.muted }}>{filtered.length} shown</span>
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading...</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Booking','Service','Customer','Worker(s)','Amount','Payment','Status','Date','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(b=>{
                  const workers = Array.isArray(b.workers) ? b.workers : []
                  const active  = workers.filter(w => w.status !== 'cancelled')
                  return (
                    <tr key={b.id}>
                      <td style={td}>
                        <p style={{ fontWeight:600, fontFamily:'monospace', fontSize:12 }}>{b.id.slice(0,8).toUpperCase()}</p>
                        <p style={{ fontSize:11, color:C.muted }}>{b.city||'—'}</p>
                      </td>
                      <td style={td}>{b.service||'—'}</td>
                      <td style={td}>
                        <p style={{ fontWeight:600 }}>{b.customer_name||'—'}</p>
                        <p style={{ fontSize:11, color:C.muted }}>{b.customer_phone ? '📞 '+b.customer_phone : 'no mobile on file'}</p>
                        {b.customer_email && <p style={{ fontSize:11, color:C.muted }}>✉ {b.customer_email}</p>}
                      </td>
                      <td style={td}>
                        {active.length === 0
                          ? <span style={{ color:C.muted }}>—</span>
                          : active.map(w => (
                              <p key={w.worker_id} style={{ fontSize:12.5 }}>
                                <span style={{ fontWeight:600 }}>{w.name || '—'}</span>
                                {w.phone ? <span style={{ color:C.muted }}> · {w.phone}</span> : null}
                              </p>
                            ))}
                        {staffingLabel(b) && <p style={{ fontSize:11, color:C.muted }}>{staffingLabel(b)}</p>}
                      </td>
                      <td style={td}><span style={{ fontWeight:700 }}>{b.amount ? INR(b.amount) : '—'}</span></td>
                      <td style={td}><PayBadge status={b.payment_status} /></td>
                      <td style={td}><StatusBadge booking={b} /></td>
                      <td style={td}><p style={{ fontSize:12 }}>{fmt(b.created_at)}</p></td>
                      <td style={td}>
                        <button onClick={()=>setSelected(b)} style={{ background:C.primary, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>View</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <div style={{ padding:48, textAlign:'center', color:C.muted }}>
                {applied ? `No bookings found for "${applied}"` : 'No bookings found'}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && <BookingDetail booking={selected} onClose={()=>setSelected(null)} />}
    </div>
  )
}

// ── Full booking record ────────────────────────────────────────────────
function BookingDetail({ booking: b, onClose }) {
  const workers = Array.isArray(b.workers) ? b.workers : []
  const cancels = Array.isArray(b.cancellations) ? b.cancellations : []

  const Field = ({ label, value, wide }) => value ? (
    <div style={{ background:C.bg, borderRadius:10, padding:'10px 14px', gridColumn: wide ? '1 / -1' : undefined }}>
      <p style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:3 }}>{label}</p>
      <p style={{ fontWeight:600, fontSize:13, wordBreak:'break-word' }}>{value}</p>
    </div>
  ) : null

  const mapsLink = b.address_lat && b.address_lng
    ? `https://www.google.com/maps/search/?api=1&query=${b.address_lat},${b.address_lng}` : null

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:620, margin:'20px auto' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:18 }}>Booking #{b.id.slice(0,8).toUpperCase()}</h3>
            <p style={{ fontSize:13, color:C.muted }}>{b.service}</p>
          </div>
          <button onClick={onClose} style={{ background:C.bg, border:'none', borderRadius:10, width:36, height:36, fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:24 }}>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <StatusBadge booking={b} />
            <PayBadge status={b.payment_status} />
            {staffingLabel(b) && <Badge bg="#EDE9FE" fg="#5B21B6">{staffingLabel(b)}</Badge>}
          </div>

          <p style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Customer</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
            <Field label="Name" value={b.customer_name} />
            <Field label="Mobile number" value={b.customer_phone} />
            <Field label="Email" value={b.customer_email} wide />
          </div>

          <p style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Service</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
            <Field label="Service requested" value={b.service} />
            <Field label="City" value={b.city} />
            <Field label="Service location" value={b.address} wide />
            <Field label="Landmark / instructions" value={b.landmark} wide />
            <Field label="Coordinates" value={b.address_lat && b.address_lng ? `${Number(b.address_lat).toFixed(6)}, ${Number(b.address_lng).toFixed(6)}` : null} />
            <Field label="Workers required" value={String(b.workers_required || 1)} />
            <Field label="Description" value={b.description} wide />
            <Field label="Scheduled for" value={b.is_scheduled && b.scheduled_at ? fmt(b.scheduled_at) : null} />
          </div>
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noreferrer"
              style={{ display:'inline-block', marginTop:-8, marginBottom:20, background:C.bg, border:'1px solid '+C.border,
                borderRadius:9, padding:'8px 14px', fontSize:12.5, fontWeight:700, color:C.primary, textDecoration:'none' }}>
              🗺️ Open service location in Maps
            </a>
          )}

          <p style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
            Assigned worker{workers.length === 1 ? '' : 's'}
          </p>
          {workers.length === 0 ? (
            <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>No worker has been assigned to this booking.</p>
          ) : (
            <div style={{ marginBottom:20 }}>
              {workers.map(w => (
                <div key={w.worker_id} style={{ border:'1px solid '+C.border, borderRadius:12, padding:'11px 14px', marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <div>
                      <p style={{ fontWeight:700, fontSize:14 }}>
                        {w.name || '—'} {w.is_primary && <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>· lead</span>}
                      </p>
                      <p style={{ fontSize:12, color:C.muted }}>
                        {w.phone || 'no phone'}{w.skill ? ' · ' + w.skill : ''}
                        {w.assigned_at ? ' · accepted ' + fmt(w.assigned_at) : ''}
                      </p>
                    </div>
                    {w.status === 'cancelled'
                      ? <Badge bg="#FEE2E2" fg="#991B1B">Cancelled</Badge>
                      : <Badge bg="#D1FAE5" fg="#065F46">Assigned</Badge>}
                  </div>
                  {w.status === 'cancelled' && (w.cancellation_reason || w.cancellation_note) && (
                    <p style={{ fontSize:12, color:'#991B1B', marginTop:6 }}>
                      Reason: {w.cancellation_reason}{w.cancellation_note ? ` — ${w.cancellation_note}` : ''}
                      {w.cancelled_at ? ` (${fmt(w.cancelled_at)})` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Payment</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
            <Field label="Amount" value={b.amount ? INR(b.amount) : null} />
            <Field label="Payment status" value={b.payment_status || 'not started'} />
            <Field label="Method" value={b.payment_method} />
            <Field label="Reference / UTR" value={b.payment_id} />
          </div>

          {(cancels.length > 0 || b.cancellation_reason) && (
            <>
              <p style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Cancellation</p>
              {cancels.length === 0 ? (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'12px 14px', marginBottom:20 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#991B1B' }}>
                    Cancelled by {b.cancelled_by || 'unknown'} · {fmt(b.cancelled_at)}
                  </p>
                  <p style={{ fontSize:12.5, color:C.text, marginTop:4 }}>{b.cancellation_reason}</p>
                  {b.cancellation_note && <p style={{ fontSize:12.5, color:C.muted, marginTop:2 }}>“{b.cancellation_note}”</p>}
                </div>
              ) : cancels.map(c => (
                <div key={c.id} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#991B1B' }}>
                    Cancelled by {c.cancelled_by} · {fmt(c.created_at)}
                  </p>
                  <p style={{ fontSize:12.5, color:C.text, marginTop:4 }}>
                    Reason: {c.reason_label || c.reason_code}
                  </p>
                  {c.note && <p style={{ fontSize:12.5, color:C.muted, marginTop:2 }}>“{c.note}”</p>}
                  <p style={{ fontSize:11.5, color:C.muted, marginTop:6 }}>
                    {c.cancelled_by === 'worker'
                      ? `Worker: ${c.worker_name || '—'} ${c.worker_phone ? '· ' + c.worker_phone : ''}`
                      : `Customer: ${c.customer_name || '—'} ${c.customer_phone ? '· ' + c.customer_phone : ''}`}
                  </p>
                  <p style={{ fontSize:11.5, color:C.muted }}>
                    Status {c.status_before} → {c.status_after}
                  </p>
                </div>
              ))}
              <div style={{ height:12 }} />
            </>
          )}

          <p style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Timestamps</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="Created" value={fmt(b.created_at)} />
            <Field label="Last updated" value={fmt(b.updated_at)} />
            <Field label="Booking ID" value={b.id} wide />
          </div>
        </div>
      </div>
    </div>
  )
}
