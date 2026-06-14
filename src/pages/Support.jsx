import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

export default function Support() {
  const [tickets, setTickets] = useState([])
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tickets')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [t, d] = await Promise.all([
      sb.from('support_tickets').select('*').order('created_at',{ascending:false}),
      sb.from('disputes').select('*, bookings(service,customer_name,amount)').order('created_at',{ascending:false}),
    ])
    setTickets(t.data||[])
    setDisputes(d.data||[])
    setLoading(false)
  }

  async function updateTicket(id, status, adminReply) {
    setSaving(true)
    await sb.from('support_tickets').update({ status, admin_reply: adminReply||null, replied_at: adminReply?new Date().toISOString():null }).eq('id',id)
    await load()
    setSaving(false)
    setSelected(null)
  }

  async function updateDispute(id, status, resolution) {
    setSaving(true)
    await sb.from('disputes').update({ status, resolution: resolution||null, resolved_at: ['resolved','closed'].includes(status)?new Date().toISOString():null }).eq('id',id)
    await load()
    setSaving(false)
    setSelected(null)
  }

  const filteredTickets = tickets.filter(t=>filter==='all'||t.status===filter)
  const filteredDisputes = disputes.filter(d=>filter==='all'||d.status===filter)
  const openCount = tickets.filter(t=>t.status==='open').length + disputes.filter(d=>d.status==='open').length

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:14,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }

  return (
    <div>
      <TopBar title="Support Management" subtitle={`${openCount} open items requiring attention`} />
      <div style={{ padding:32 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[['Open Tickets',tickets.filter(t=>t.status==='open').length,'#ef4444'],['In Progress',tickets.filter(t=>t.status==='in_progress').length,'#f59e0b'],['Resolved',tickets.filter(t=>t.status==='resolved').length,'#10b981'],['Open Disputes',disputes.filter(d=>d.status==='open').length,'#8b5cf6']].map(([l,v,c])=>(
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:26, fontWeight:800, color:'#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {['tickets','disputes'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'10px 20px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, background:tab===t?'#6366f1':'#fff', color:tab===t?'#fff':'#64748b', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', textTransform:'capitalize' }}>{t} ({t==='tickets'?tickets.length:disputes.length})</button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            {['all','open','in_progress','resolved','closed'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:filter===f?'#0f172a':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize' }}>{f.replace('_',' ')}</button>
            ))}
          </div>
        </div>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          {loading ? <Loader /> : tab==='tickets' ? (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>{['Category','Subject','User','Priority','Status','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredTickets.map(t=>(
                    <tr key={t.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontSize:12, background:'#f1f5f9', padding:'3px 8px', borderRadius:6 }}>{t.category||'General'}</span></td>
                      <td style={td}><div style={{ fontWeight:600, maxWidth:200 }}>{t.subject||'-'}</div></td>
                      <td style={td}><div style={{ fontSize:12, color:'#64748b' }}>{t.user_email||'-'}</div></td>
                      <td style={td}><Badge status={t.priority||'medium'} /></td>
                      <td style={td}><Badge status={t.status||'open'} /></td>
                      <td style={{ ...td, fontSize:12 }}>{fmt(t.created_at)}</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>{ setSelected({...t,_type:'ticket'}); setReply(t.admin_reply||'') }} style={btnS('#6366f1','sm')}>Reply</button>
                          {t.status==='open' && <button onClick={()=>updateTicket(t.id,'in_progress',null)} style={btnS('#f59e0b','sm')}>Assign</button>}
                          {t.status!=='resolved' && <button onClick={()=>updateTicket(t.id,'resolved',t.admin_reply)} style={btnS('#10b981','sm')}>Resolve</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredTickets.length && <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No tickets found</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>{['Booking','Raised By','Reason','Status','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredDisputes.map(d=>(
                    <tr key={d.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><div style={{ fontWeight:600 }}>{d.bookings?.service||'-'}</div><div style={{ fontSize:11, color:'#94a3b8' }}>{d.bookings?.customer_name||'-'}</div></td>
                      <td style={td}><Badge status={d.raised_by_role||'customer'} /></td>
                      <td style={td}><div style={{ maxWidth:200, fontSize:13 }}>{d.reason||'-'}</div></td>
                      <td style={td}><Badge status={d.status||'open'} /></td>
                      <td style={{ ...td, fontSize:12 }}>{fmt(d.created_at)}</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>setSelected({...d,_type:'dispute'})} style={btnS('#6366f1','sm')}>View</button>
                          {d.status==='open' && <>
                            <button onClick={()=>updateDispute(d.id,'resolved','Resolved by admin')} style={btnS('#10b981','sm')}>Resolve</button>
                            <button onClick={()=>updateDispute(d.id,'closed','Escalated')} style={btnS('#ef4444','sm')}>Escalate</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredDisputes.length && <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No disputes found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {selected?._type==='ticket' && (
        <Modal title={`Ticket: ${selected.subject||'No subject'}`} onClose={()=>setSelected(null)} width={620}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {[['Category',selected.category],['Priority',<Badge status={selected.priority||'medium'} />],['Status',<Badge status={selected.status||'open'} />],['User',selected.user_email]].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}><div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:3 }}>{l}</div><div style={{ fontWeight:600, fontSize:13 }}>{v||'-'}</div></div>
            ))}
          </div>
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6 }}>Message</div>
            <div style={{ fontSize:14 }}>{selected.body||'-'}</div>
          </div>
          <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type your reply..." rows={4} style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', resize:'vertical', marginBottom:12 }} />
          <div style={{ display:'flex', gap:8 }}>
            <button disabled={saving} onClick={()=>updateTicket(selected.id,'in_progress',reply)} style={btnS('#6366f1')}>Send Reply</button>
            <button disabled={saving} onClick={()=>updateTicket(selected.id,'resolved',reply)} style={btnS('#10b981')}>Reply and Resolve</button>
            <button disabled={saving} onClick={()=>updateTicket(selected.id,'closed',reply)} style={btnS('#64748b')}>Close Ticket</button>
          </div>
        </Modal>
      )}
      {selected?._type==='dispute' && (
        <Modal title="Dispute Details" onClose={()=>setSelected(null)} width={580}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {[['Service',selected.bookings?.service],['Customer',selected.bookings?.customer_name],['Amount',`Rs.${selected.bookings?.amount||0}`],['Raised By',selected.raised_by_role],['Status',<Badge status={selected.status||'open'} />],['Date',fmt(selected.created_at)]].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}><div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:3 }}>{l}</div><div style={{ fontWeight:600, fontSize:13 }}>{v||'-'}</div></div>
            ))}
          </div>
          <div style={{ background:'#fff3cd', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#92400e', fontWeight:600, marginBottom:4 }}>Reason</div>
            <div style={{ fontSize:14 }}>{selected.reason||'-'}</div>
          </div>
          <textarea placeholder="Enter resolution notes..." rows={3} style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', resize:'vertical', marginBottom:12 }} id="dispute-res" />
          <div style={{ display:'flex', gap:8 }}>
            {selected.status==='open' && <>
              <button disabled={saving} onClick={()=>updateDispute(selected.id,'resolved',document.getElementById('dispute-res')?.value)} style={btnS('#10b981')}>Mark Resolved</button>
              <button disabled={saving} onClick={()=>updateDispute(selected.id,'closed','Escalated to senior team')} style={btnS('#ef4444')}>Escalate</button>
            </>}
          </div>
        </Modal>
      )}
    </div>
  )
}
