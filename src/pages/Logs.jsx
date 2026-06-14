import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import { exportCSV, exportExcel } from '../lib/export'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

const ACTION_COLORS = {
  approve_kyc:'#10b981', reject_kyc:'#ef4444', suspend_worker:'#f59e0b', restore_worker:'#3b82f6',
  ban_user:'#ec4899', suspend_user:'#f59e0b', restore_user:'#3b82f6',
  verify_payment:'#10b981', reject_payment:'#ef4444', refund_payment:'#f59e0b',
  release_payout:'#10b981', fail_payout:'#ef4444', create_payout:'#6366f1',
  cancel_booking:'#ef4444', complete_booking:'#10b981',
  resolve_ticket:'#10b981', escalate_ticket:'#f59e0b', close_ticket:'#64748b',
}

export default function Logs() {
  const [tab,   setTab]   = useState('audit')
  const [audit, setAudit] = useState([])
  const [notif, setNotif] = useState([])
  const [activ, setActiv] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    if (tab === 'audit') {
      const { data } = await sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(500)
      setAudit(data||[])
    } else if (tab === 'notifications') {
      const { data } = await sb.from('notification_logs').select('*').order('created_at',{ascending:false}).limit(500)
      setNotif(data||[])
    } else {
      const { data } = await sb.from('activity_logs').select('*').order('created_at',{ascending:false}).limit(500)
      setActiv(data||[])
    }
    setLoading(false)
  }

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'11px 16px',fontSize:13,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }

  const auditFiltered = audit.filter(l => {
    const q = search.toLowerCase()
    return !q || l.action?.includes(q) || l.admin_email?.toLowerCase().includes(q) || l.entity_type?.includes(q) || l.entity_id?.includes(q)
  })
  const notifFiltered = notif.filter(l => {
    const q = search.toLowerCase()
    return !q || l.event?.includes(q) || l.recipient?.includes(q) || l.channel?.includes(q)
  })
  const activFiltered = activ.filter(l => {
    const q = search.toLowerCase()
    return !q || l.event?.includes(q) || l.user_type?.includes(q)
  })

  return (
    <div>
      <TopBar
        title="Audit & Activity Logs"
        subtitle="Full audit trail of all admin actions, notifications, and user activity"
        actions={
          <div style={{ display:'flex', gap:8 }}>
            {tab==='audit' && <>
              <button onClick={()=>exportCSV(auditFiltered.map(l=>({Admin:l.admin_email,Action:l.action,Entity:l.entity_type,ID:l.entity_id,Date:fmt(l.created_at)})),'audit-logs')} style={btnS('#10b981')}>CSV</button>
              <button onClick={()=>exportExcel(auditFiltered.map(l=>({Admin:l.admin_email,Action:l.action,Entity:l.entity_type,ID:l.entity_id,Date:fmt(l.created_at)})),'audit-logs','Audit')} style={btnS('#3b82f6')}>Excel</button>
            </>}
          </div>
        }
      />
      <div style={{ padding:32 }}>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {[['audit','Admin Audit Log'],['notifications','Notification Log'],['activity','Activity Log']].map(([key,label])=>(
            <button key={key} onClick={()=>{ setTab(key); setSearch('') }} style={{ padding:'9px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:tab===key?'#6366f1':'#fff', color:tab===key?'#fff':'#64748b', boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>{label}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom:16 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs..." style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, width:300, outline:'none' }} />
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          {loading ? <Loader /> : (

            /* ── AUDIT LOG ─────────────────────── */
            tab === 'audit' ? (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Time','Admin','Action','Entity','Entity ID','Details'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {auditFiltered.map(l=>(
                      <tr key={l.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={{ ...td, fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>{fmt(l.created_at)}</td>
                        <td style={td}><span style={{ fontSize:12 }}>{l.admin_email}</span></td>
                        <td style={td}>
                          <span style={{ background:(ACTION_COLORS[l.action]||'#6366f1')+'22', color:ACTION_COLORS[l.action]||'#6366f1', padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>
                            {l.action?.replace(/_/g,' ')}
                          </span>
                        </td>
                        <td style={td}><span style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600 }}>{l.entity_type}</span></td>
                        <td style={td}><span style={{ fontFamily:'monospace', fontSize:11 }}>{l.entity_id?.slice(0,12)}…</span></td>
                        <td style={{ ...td, maxWidth:240 }}>
                          {l.details && Object.keys(l.details).length > 0 && (
                            <span style={{ fontSize:11, color:'#64748b' }}>
                              {Object.entries(l.details).slice(0,3).map(([k,v])=>`${k}: ${v}`).join(' · ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!auditFiltered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No audit logs found</div>}
              </div>
            ) :

            /* ── NOTIFICATION LOG ──────────────── */
            tab === 'notifications' ? (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Time','Recipient','Channel','Event','Status','Provider Ref','Error'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {notifFiltered.map(l=>(
                      <tr key={l.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={{ ...td, fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>{fmt(l.created_at)}</td>
                        <td style={td}>{l.recipient}</td>
                        <td style={td}>
                          <span style={{ background:l.channel==='sms'?'#dbeafe':l.channel==='whatsapp'?'#dcfce7':'#fef9c3', color:l.channel==='sms'?'#1d4ed8':l.channel==='whatsapp'?'#166534':'#713f12', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>
                            {l.channel}
                          </span>
                        </td>
                        <td style={td}><span style={{ fontSize:12 }}>{l.event?.replace(/_/g,' ')}</span></td>
                        <td style={td}>
                          <span style={{ color:l.status==='sent'?'#10b981':'#ef4444', fontWeight:700, fontSize:12 }}>
                            {l.status==='sent'?'✓ Sent':'✗ Failed'}
                          </span>
                        </td>
                        <td style={td}><span style={{ fontFamily:'monospace', fontSize:11 }}>{l.provider_ref||'—'}</span></td>
                        <td style={{ ...td, fontSize:11, color:'#ef4444', maxWidth:180 }}>{l.error||''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!notifFiltered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No notification logs found</div>}
              </div>
            ) :

            /* ── ACTIVITY LOG ──────────────────── */
            (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Time','User Type','Event','User ID','Metadata'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {activFiltered.map(l=>(
                      <tr key={l.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={{ ...td, fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>{fmt(l.created_at)}</td>
                        <td style={td}><span style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600 }}>{l.user_type||'—'}</span></td>
                        <td style={td}><span style={{ fontSize:12 }}>{l.event?.replace(/_/g,' ')}</span></td>
                        <td style={td}><span style={{ fontFamily:'monospace', fontSize:11 }}>{l.user_id?.slice(0,8)||'—'}</span></td>
                        <td style={{ ...td, fontSize:11, color:'#64748b', maxWidth:200 }}>
                          {l.metadata && Object.keys(l.metadata).length > 0
                            ? Object.entries(l.metadata).slice(0,3).map(([k,v])=>`${k}: ${v}`).join(' · ')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!activFiltered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No activity logs found</div>}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
