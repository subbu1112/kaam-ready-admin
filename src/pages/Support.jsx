import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const Y = '#F5C000'

const PRIORITY_COLORS = {
  low:    { bg:'#33415520', color:'#64748B' },
  medium: { bg:'#f9731620', color:'#f97316' },
  high:   { bg:'#ef444420', color:'#ef4444' },
}

const STATUS_COLORS = {
  open:        { bg:'#3b82f620', color:'#3b82f6' },
  in_progress: { bg:Y+'20',     color:Y          },
  resolved:    { bg:'#22c55e20',color:'#22c55e'  },
  closed:      { bg:'#33415520',color:'#64748B'  },
}

function Badge({ text, map }) {
  const s = (map || {})[text] || { bg:'#33415520', color:'#64748B' }
  return (
    <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:6, textTransform:'capitalize', whiteSpace:'nowrap' }}>
      {(text||'—').replace(/_/g,' ')}
    </span>
  )
}

export default function Support({ showToast }) {
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('open')
  const [selected, setSelected] = useState(null)
  const [reply,    setReply]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await sb
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending:false })
    if (error) {
      // Table may not exist yet
      if (error.code === '42P01') {
        showToast('support_tickets table not found — run DB migration', 'error')
        setTickets([])
      } else {
        showToast(error.message, 'error')
      }
    } else {
      setTickets(data || [])
    }
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const { error } = await sb.from('support_tickets').update({ status }).eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setTickets(ts => ts.map(t => t.id === id ? {...t, status} : t))
    if (selected?.id === id) setSelected(s => ({...s, status}))
    showToast('Status updated ✓')
  }

  async function sendReply(id) {
    if (!reply.trim()) return
    setSaving(true)
    const { error } = await sb.from('support_tickets').update({
      admin_reply: reply.trim(),
      status:      'in_progress',
      replied_at:  new Date().toISOString(),
    }).eq('id', id)
    if (error) { showToast(error.message, 'error') }
    else {
      showToast('Reply sent ✓')
      setSelected(s => ({...s, admin_reply: reply.trim(), status:'in_progress'}))
      setTickets(ts => ts.map(t => t.id===id ? {...t, admin_reply:reply.trim(), status:'in_progress'} : t))
      setReply('')
    }
    setSaving(false)
  }

  const FILTERS = ['all','open','in_progress','resolved','closed']
  const counts  = {}
  FILTERS.forEach(f => counts[f] = f==='all' ? tickets.length : tickets.filter(t=>t.status===f).length)

  const filtered = tickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    const q = search.toLowerCase()
    return !q || (t.subject||'').toLowerCase().includes(q) || (t.body||'').toLowerCase().includes(q) || (t.user_email||'').toLowerCase().includes(q)
  })

  return (
    <div style={{ display:'flex', gap:16, height:'calc(100vh - 108px)' }}>
      {/* Ticket list */}
      <div style={{ width:380, display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:11, fontWeight:600,
                background: filter===f ? Y : '#1E293B',
                color: filter===f ? '#0F172A' : '#64748B'
              }}>
              {f.replace(/_/g,' ')} ({counts[f]??0})
            </button>
          ))}
        </div>
        <input placeholder="Search tickets…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', color:'#F1F5F9', fontSize:13, outline:'none', fontFamily:'inherit' }} />

        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'#475569' }}>⏳ Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#475569' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🎫</div>
              No tickets found
            </div>
          ) : filtered.map(t => (
            <button key={t.id}
              onClick={() => { setSelected(t); setReply('') }}
              style={{
                background: selected?.id===t.id ? '#334155' : '#1E293B',
                border:`1px solid ${selected?.id===t.id ? Y+'40' : '#334155'}`,
                borderRadius:10, padding:'12px 14px', cursor:'pointer',
                fontFamily:'inherit', textAlign:'left', transition:'all .15s'
              }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <span style={{ color:'#F1F5F9', fontWeight:600, fontSize:13 }}>{t.subject || t.category || 'Support Request'}</span>
                <Badge text={t.status||'open'} map={STATUS_COLORS} />
              </div>
              <div style={{ color:'#64748B', fontSize:12 }}>{t.user_email || 'Anonymous'}</div>
              <div style={{ color:'#475569', fontSize:12, marginTop:4 }}>
                {new Date(t.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket detail */}
      {selected ? (
        <div style={{ flex:1, background:'#1E293B', border:'1px solid #334155', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'20px 24px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h3 style={{ color:'#F1F5F9', fontWeight:700, fontSize:16, margin:0 }}>
                {selected.subject || selected.category || 'Support Ticket'}
              </h3>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <Badge text={selected.status||'open'} map={STATUS_COLORS} />
                {selected.priority && <Badge text={selected.priority} map={PRIORITY_COLORS} />}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {['in_progress','resolved','closed'].map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)}
                  disabled={selected.status===s}
                  style={{
                    padding:'7px 12px', borderRadius:8, border:'none',
                    background: selected.status===s ? '#334155' : '#0F172A',
                    color: selected.status===s ? '#475569' : '#94A3B8',
                    cursor: selected.status===s ? 'default' : 'pointer',
                    fontFamily:'inherit', fontSize:11, fontWeight:600
                  }}>
                  {s.replace(/_/g,' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket body */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
            <div style={{ marginBottom:16 }}>
              {[
                ['From',     selected.user_email || 'Anonymous'],
                ['Category', selected.category   || '—'],
                ['Created',  new Date(selected.created_at).toLocaleString('en-IN')],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', gap:10, marginBottom:6 }}>
                  <span style={{ color:'#64748B', fontSize:12, minWidth:70 }}>{k}:</span>
                  <span style={{ color:'#94A3B8', fontSize:12 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Message */}
            <div style={{ background:'#0F172A', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
              <p style={{ color:'#64748B', fontSize:11, marginBottom:6 }}>CUSTOMER MESSAGE</p>
              <p style={{ color:'#F1F5F9', fontSize:14, lineHeight:1.6 }}>{selected.body || selected.message || '(No message)'}</p>
            </div>

            {/* Existing admin reply */}
            {selected.admin_reply && (
              <div style={{ background:'rgba(245,192,0,.08)', border:'1px solid rgba(245,192,0,.2)', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
                <p style={{ color:Y, fontSize:11, marginBottom:6 }}>ADMIN REPLY</p>
                <p style={{ color:'#F1F5F9', fontSize:14, lineHeight:1.6 }}>{selected.admin_reply}</p>
              </div>
            )}

            {/* Reply box */}
            <div>
              <p style={{ color:'#64748B', fontSize:11, marginBottom:6 }}>REPLY TO CUSTOMER</p>
              <textarea
                value={reply} onChange={e => setReply(e.target.value)}
                rows={4} placeholder="Type your reply…"
                style={{
                  width:'100%', background:'#0F172A', border:'1px solid #334155', borderRadius:10,
                  padding:'12px 14px', color:'#F1F5F9', fontSize:14, fontFamily:'inherit',
                  outline:'none', resize:'vertical', boxSizing:'border-box'
                }}
              />
              <button onClick={() => sendReply(selected.id)} disabled={!reply.trim() || saving}
                style={{
                  marginTop:10, background:Y, border:'none', borderRadius:10, padding:'10px 22px',
                  color:'#0F172A', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit',
                  opacity: (!reply.trim() || saving) ? 0.5 : 1
                }}>
                {saving ? 'Sending…' : '↑ Send Reply'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, background:'#1E293B', border:'1px solid #334155', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎫</div>
            <p>Select a ticket to view details</p>
          </div>
        </div>
      )}
    </div>
  )
}
