import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'
const INR = v => '₹' + (v||0).toLocaleString('en-IN')

function StatusBadge({ status }) {
  const m = {
    searching:   ['#DBEAFE','#1D4ED8','🔍 Searching'],
    assigned:    ['#EDE9FE','#5B21B6','👷 Assigned'],
    priced:      ['#FEF3C7','#92400E','💰 Priced'],
    completed:   ['#D1FAE5','#065F46','✅ Completed'],
    cancelled:   ['#FEE2E2','#991B1B','✕ Cancelled'],
  }
  const [bg,col,lbl] = m[status] || ['#F1F5F9','#475569',status||'—']
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{lbl}</span>
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
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{lbl}</span>
}

export default function Bookings({ user, showToast }) {
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('all')
  const [payF,      setPayF]      = useState('all')
  const [selected,  setSelected]  = useState(null)
  const [page,      setPage]      = useState(0)
  const [total,     setTotal]     = useState(0)
  const PAGE = 50

  useEffect(() => { load(0) }, [statusF])

  async function load(pg=0) {
    setLoading(true)
    setPage(pg)
    const from = pg*PAGE, to = from+PAGE-1
    let q = sb.from('bookings')
      .select('id,status,payment_status,amount,service,customer_name,customer_phone,worker_id,created_at,city,worker:workers(name,phone)', { count:'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (statusF !== 'all') q = q.eq('status', statusF)
    const { data, count } = await q
    setBookings(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    const mQ = !q || (b.customer_name||'').toLowerCase().includes(q) || (b.customer_phone||'').includes(q) || (b.service||'').toLowerCase().includes(q) || (b.worker?.name||'').toLowerCase().includes(q)
    const mP = payF==='all' || b.payment_status===payF || (payF==='none'&&!b.payment_status)
    return mQ && mP
  })

  const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, background:C.bg, borderBottom:'1px solid '+C.border }
  const td = { padding:'11px 14px', fontSize:13, color:C.text, borderBottom:'1px solid '+C.border }

  const STATUSES = ['all','searching','assigned','priced','completed','cancelled']

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Bookings</h2>
          <p style={{ fontSize:13, color:C.muted }}>{total} total bookings</p>
        </div>
        <button onClick={()=>load(0)} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>↺ Refresh</button>
      </div>

      <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid '+C.border, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, worker, service..."
            style={{ padding:'9px 14px', border:'1.5px solid '+C.border, borderRadius:10, fontSize:13, width:260, outline:'none', fontFamily:'inherit', background:C.bg }} />
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {STATUSES.map(f=>(
              <button key={f} onClick={()=>setStatusF(f)}
                style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', textTransform:'capitalize',
                  background:statusF===f?C.primary:C.bg, color:statusF===f?'#fff':C.muted }}>{f}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {[['all','All Pay'],['pending_verification','Pending'],['verified','Verified'],['none','No Pay']].map(([f,l])=>(
              <button key={f} onClick={()=>setPayF(f)}
                style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit',
                  background:payF===f?C.warning:C.bg, color:payF===f?'#fff':C.muted }}>{l}</button>
            ))}
          </div>
          <span style={{ marginLeft:'auto', fontSize:12, color:C.muted }}>{filtered.length} of {total}</span>
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading...</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Booking','Service','Customer','Worker','Amount','Payment','Status','Date','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(b=>(
                  <tr key={b.id}>
                    <td style={td}><p style={{ fontWeight:600, fontFamily:'monospace', fontSize:12 }}>{b.id.slice(0,8).toUpperCase()}</p><p style={{ fontSize:11, color:C.muted }}>{b.city||'—'}</p></td>
                    <td style={td}>{b.service||'—'}</td>
                    <td style={td}><p style={{ fontWeight:600 }}>{b.customer_name||'—'}</p><p style={{ fontSize:11, color:C.muted }}>{b.customer_phone||'—'}</p></td>
                    <td style={td}><p style={{ fontWeight:600 }}>{b.worker?.name||'—'}</p><p style={{ fontSize:11, color:C.muted }}>{b.worker?.phone||'—'}</p></td>
                    <td style={td}><span style={{ fontWeight:700 }}>{b.amount ? INR(b.amount) : '—'}</span></td>
                    <td style={td}><PayBadge status={b.payment_status} /></td>
                    <td style={td}><StatusBadge status={b.status} /></td>
                    <td style={td}><p style={{ fontSize:12 }}>{fmt(b.created_at)}</p></td>
                    <td style={td}>
                      <button onClick={()=>setSelected(b)} style={{ background:C.primary, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div style={{ padding:48, textAlign:'center', color:C.muted }}>No bookings found</div>}
          </div>
        )}

        {total > PAGE && (
          <div style={{ padding:'12px 18px', borderTop:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:C.muted }}>Showing {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span>
            <div style={{ display:'flex', gap:8 }}>
              <button disabled={page===0} onClick={()=>load(page-1)} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13, opacity:page===0?0.4:1 }}>← Prev</button>
              <button disabled={(page+1)*PAGE>=total} onClick={()=>load(page+1)} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13, opacity:(page+1)*PAGE>=total?0.4:1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:520, margin:'20px auto' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontWeight:800, fontSize:18 }}>Booking #{selected.id.slice(0,8).toUpperCase()}</h3>
                <p style={{ fontSize:13, color:C.muted }}>{selected.service}</p>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:C.bg, border:'none', borderRadius:10, width:36, height:36, fontSize:18, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <StatusBadge status={selected.status} />
                <PayBadge status={selected.payment_status} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[['Customer',selected.customer_name],['Customer Phone',selected.customer_phone],['Worker',selected.worker?.name],['Worker Phone',selected.worker?.phone],['Service',selected.service],['City',selected.city],['Amount',selected.amount?INR(selected.amount):null],['Date',fmt(selected.created_at)]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} style={{ background:C.bg, borderRadius:10, padding:'10px 14px' }}>
                    <p style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:3 }}>{l}</p>
                    <p style={{ fontWeight:600, fontSize:13 }}>{v}</p>
                  </div>
                ))}
              </div>
              {selected.payment_proof_url && (
                <div style={{ marginTop:16 }}>
                  <p style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Payment Proof</p>
                  <img src={selected.payment_proof_url} alt="proof" style={{ width:'100%', borderRadius:12, maxHeight:200, objectFit:'contain', border:'1px solid '+C.border }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
