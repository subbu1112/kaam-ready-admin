import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'

function PriBadge({ p }) {
  const m = { high:['#FEE2E2','#991B1B','🔴 High'], medium:['#FEF3C7','#92400E','🟡 Medium'], low:['#D1FAE5','#065F46','🟢 Low'] }
  const [bg,col,lbl] = m[p||'medium'] || m.medium
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{lbl}</span>
}

function StatusBadge({ s }) {
  const m = { open:['#DBEAFE','#1D4ED8','Open'], in_progress:['#FEF3C7','#92400E','In Progress'], resolved:['#D1FAE5','#065F46','Resolved'], closed:['#F1F5F9','#475569','Closed'] }
  const [bg,col,lbl] = m[s||'open'] || m.open
  return <span style={{ background:bg, color:col, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{lbl}</span>
}

export default function Support({ user, showToast }) {
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('open')
  const [selected, setSelected] = useState(null)
  const [reply,    setReply]    = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = sb.from('support_tickets').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setTickets(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    setSaving(true)
    await sb.from('support_tickets').update({ status, resolved_at: status==='resolved'?new Date().toISOString():null }).eq('id', id)
    await sb.from('admin_logs').insert({ admin_id: user.id, action:'update_ticket', target_id: id, details:{ status } }).then(()=>{})
    await load()
    setSaving(false)
    setSelected(s => s ? { ...s, status } : null)
    showToast('Ticket ' + status, 'success')
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setSaving(true)
    await sb.from('support_replies').insert({ ticket_id: selected.id, admin_id: user.id, message: reply.trim(), is_admin: true })
    if (selected.user_id) {
      await sb.from('notifications').insert({ user_id: selected.user_id, title:'📩 Support Reply', body: reply.trim().slice(0,100) })
    }
    setReply('')
    setSaving(false)
    showToast('Reply sent', 'success')
  }

  const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, background:C.bg, borderBottom:'1px solid '+C.border }
  const td = { padding:'11px 14px', fontSize:13, color:C.text, borderBottom:'1px solid '+C.border }

  const FILTERS = ['open','in_progress','resolved','closed','all']

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Support Tickets</h2>
          <p style={{ fontSize:13, color:C.muted }}>{tickets.length} tickets in view</p>
        </div>
        <button onClick={load} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>↺ Refresh</button>
      </div>

      <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid '+C.border, display:'flex', gap:8 }}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:'7px 13px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', textTransform:'capitalize',
                background:filter===f?C.primary:C.bg, color:filter===f?'#fff':C.muted }}>{f.replace('_',' ')}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading...</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Ticket','User','Subject','Category','Priority','Status','Date','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {tickets.map(t=>(
                  <tr key={t.id}>
                    <td style={td}><p style={{ fontFamily:'monospace', fontSize:12, fontWeight:600 }}>{t.id.slice(0,8).toUpperCase()}</p></td>
                    <td style={td}><p style={{ fontWeight:600 }}>{t.user_name||'—'}</p><p style={{ fontSize:11, color:C.muted }}>{t.user_phone||t.user_email||'—'}</p></td>
                    <td style={td}><p style={{ fontWeight:600 }}>{t.subject||t.message?.slice(0,40)||'—'}</p></td>
                    <td style={td}>{t.category||'general'}</td>
                    <td style={td}><PriBadge p={t.priority} /></td>
                    <td style={td}><StatusBadge s={t.status} /></td>
                    <td style={td}><p style={{ fontSize:12 }}>{fmt(t.created_at)}</p></td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={()=>setSelected(t)} style={{ background:C.primary, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>View</button>
                        {t.status==='open' && <button onClick={()=>updateStatus(t.id,'in_progress')} style={{ background:C.warning, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Start</button>}
                        {t.status!=='resolved' && t.status!=='closed' && <button onClick={()=>updateStatus(t.id,'resolved')} style={{ background:C.success, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Resolve</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tickets.length && <div style={{ padding:48, textAlign:'center', color:C.muted }}>No tickets in this view</div>}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:560, margin:'20px auto' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontWeight:800, fontSize:18 }}>Ticket #{selected.id.slice(0,8).toUpperCase()}</h3>
                <p style={{ fontSize:13, color:C.muted }}>{selected.user_name||'—'} · {fmt(selected.created_at)}</p>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:C.bg, border:'none', borderRadius:10, width:36, height:36, fontSize:18, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <StatusBadge s={selected.status} />
                <PriBadge p={selected.priority} />
              </div>
              {selected.subject && <p style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>{selected.subject}</p>}
              <div style={{ background:C.bg, borderRadius:12, padding:'14px 16px', marginBottom:20, border:'1px solid '+C.border }}>
                <p style={{ fontSize:14, lineHeight:1.6 }}>{selected.message||'No message'}</p>
              </div>

              {/* Status actions */}
              <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                {selected.status==='open' && <button onClick={()=>updateStatus(selected.id,'in_progress')} disabled={saving} style={{ background:C.warning, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>▶ Start Working</button>}
                {selected.status!=='resolved'&&selected.status!=='closed' && <button onClick={()=>updateStatus(selected.id,'resolved')} disabled={saving} style={{ background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✅ Mark Resolved</button>}
                {selected.status!=='closed' && <button onClick={()=>updateStatus(selected.id,'closed')} disabled={saving} style={{ background:C.muted, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Close</button>}
              </div>

              {/* Reply */}
              <p style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Send Reply to User</p>
              <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type your reply here..." rows={3}
                style={{ width:'100%', border:'1.5px solid '+C.border, borderRadius:12, padding:'12px 14px', fontSize:14, outline:'none', fontFamily:'inherit', resize:'none', boxSizing:'border-box', marginBottom:10 }} />
              <button onClick={sendReply} disabled={saving || !reply.trim()}
                style={{ background:C.primary, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:!reply.trim()||saving?0.6:1 }}>
                {saving ? 'Sending...' : '📨 Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
