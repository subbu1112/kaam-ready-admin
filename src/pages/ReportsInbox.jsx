import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Loader from '../components/Loader'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

const TYPE_LABEL = {
  worker_misconduct:'Worker Misconduct', fraud:'Fraud', poor_service:'Poor Service', payment_issue:'Payment Issue',
  safety_concern:'Safety', customer_abuse:'Customer Abuse', fake_booking:'Fake Booking', payment_dispute:'Payment Dispute',
  app_issue:'App Issue', other:'Other'
}

const TYPE_COLOR = {
  worker_misconduct:'#ef4444', fraud:'#dc2626', poor_service:'#f59e0b', payment_issue:'#3b82f6',
  safety_concern:'#ef4444', customer_abuse:'#dc2626', fake_booking:'#f59e0b', payment_dispute:'#8b5cf6',
  app_issue:'#64748b', other:'#94a3b8'
}

export default function ReportsInbox() {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [resolution, setResolution] = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('reports')
      .select('*, profiles:user_id(full_name,phone), workers:user_id(name,phone)')
      .order('created_at', { ascending:false })
      .catch(() => ({ data:[] }))
    setReports(data||[])
    setLoading(false)
  }

  async function updateReport(id, status, res) {
    setSaving(true)
    await sb.from('reports').update({
      status,
      resolution: res || null,
      resolved_at: ['resolved','closed','dismissed'].includes(status) ? new Date().toISOString() : null
    }).eq('id', id).catch(()=>{})
    setSaving(false)
    setSelected(null)
    setResolution('')
    await load()
  }

  const filtered = reports.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (roleFilter !== 'all' && r.reported_by_role !== roleFilter) return false
    return true
  })

  const openCount = reports.filter(r=>r.status==='open').length
  const highPriorityTypes = ['fraud','worker_misconduct','safety_concern','customer_abuse']

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:13,color:'#1e293b',borderBottom:'1px solid #f1f5f9',verticalAlign:'top' }

  return (
    <div>
      <TopBar title="Reports Inbox" subtitle={`${openCount} open reports requiring review`} />
      <div style={{ padding:32 }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            ['Total Reports', reports.length, '#6366f1'],
            ['Open', reports.filter(r=>r.status==='open').length, '#ef4444'],
            ['In Review', reports.filter(r=>r.status==='in_review').length, '#f59e0b'],
            ['Resolved', reports.filter(r=>r.status==='resolved').length, '#10b981'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:24, fontWeight:800, color:'#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {['all','open','in_review','resolved','dismissed'].map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, background:filter===f?'#6366f1':'#fff', color:filter===f?'#fff':'#64748b', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', textTransform:'capitalize' }}>{f==='all'?'All':f.replace('_',' ')}</button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            {['all','customer','worker'].map(r => (
              <button key={r} onClick={()=>setRoleFilter(r)} style={{ padding:'8px 14px', borderRadius:8, border:'2px solid '+(roleFilter===r?'#6366f1':'#e2e8f0'), cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, background:roleFilter===r?'#eef2ff':'#fff', color:roleFilter===r?'#4f46e5':'#64748b', textTransform:'capitalize' }}>{r==='all'?'All Roles':'By '+r}</button>
            ))}
          </div>
        </div>

        {loading ? <Loader /> : (
          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Priority','Type','Reported By','Role','Booking ID','Status','Date','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isHigh = highPriorityTypes.includes(r.report_type)
                  const reporter = r.reported_by_role === 'worker' ? (r.workers?.name || 'Worker') : (r.profiles?.full_name || 'Customer')
                  return (
                    <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background: isHigh?'#ef4444':'#f59e0b' }} title={isHigh?'High':'Medium'} /></td>
                      <td style={td}><span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, fontWeight:700, background:(TYPE_COLOR[r.report_type]||'#94a3b8')+'20', color:TYPE_COLOR[r.report_type]||'#94a3b8' }}>{TYPE_LABEL[r.report_type]||r.report_type||'—'}</span></td>
                      <td style={td}><b>{reporter}</b></td>
                      <td style={td}><Badge label={r.reported_by_role||'customer'} color={r.reported_by_role==='worker'?'#8b5cf6':'#3b82f6'} /></td>
                      <td style={td}><span style={{fontFamily:'monospace',fontSize:12,color:'#64748b'}}>{r.booking_id||'—'}</span></td>
                      <td style={td}><Badge label={r.status||'open'} color={r.status==='resolved'?'#10b981':r.status==='in_review'?'#f59e0b':r.status==='dismissed'?'#94a3b8':'#ef4444'} /></td>
                      <td style={td}><span style={{fontSize:12,color:'#64748b'}}>{fmt(r.created_at)}</span></td>
                      <td style={td}>
                        <button onClick={()=>{ setSelected(r); setResolution(r.resolution||'') }} style={btnS('#6366f1','sm')}>Review</button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>
                    {reports.length===0 ? '🎉 No reports submitted yet' : 'No reports match current filters'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'auto', padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <h2 style={{ fontWeight:800, fontSize:18, color:'#0f172a', marginBottom:6 }}>Report #{selected.id?.slice(0,8)}</h2>
                <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:700, background:(TYPE_COLOR[selected.report_type]||'#94a3b8')+'20', color:TYPE_COLOR[selected.report_type]||'#94a3b8' }}>{TYPE_LABEL[selected.report_type]||selected.report_type}</span>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'#64748b', fontSize:13 }}>✕ Close</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {[
                ['Reported By', selected.reported_by_role==='worker'?(selected.workers?.name||'Worker'):(selected.profiles?.full_name||'Customer')],
                ['Role', selected.reported_by_role||'customer'],
                ['Booking ID', selected.booking_id||'—'],
                ['Submitted', fmt(selected.created_at)],
                ['Worker Named', selected.worker_name||'—'],
                ['Status', selected.status||'open'],
              ].map(([l,v]) => (
                <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                  <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{l}</p>
                  <p style={{ fontSize:13, color:'#0f172a', fontWeight:600 }}>{v}</p>
                </div>
              ))}
            </div>

            <div style={{ background:'#fef2f2', borderRadius:10, padding:'14px 16px', marginBottom:16, border:'1px solid #fecaca' }}>
              <p style={{ fontSize:11, color:'#dc2626', fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>Description</p>
              <p style={{ fontSize:13, color:'#1e293b', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{selected.description||'—'}</p>
            </div>

            {selected.evidence_notes && (
              <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>Evidence Notes</p>
                <p style={{ fontSize:13, color:'#1e293b', lineHeight:1.7 }}>{selected.evidence_notes}</p>
              </div>
            )}

            {selected.resolution && (
              <div style={{ background:'#f0fdf4', borderRadius:10, padding:'14px 16px', marginBottom:16, border:'1px solid #bbf7d0' }}>
                <p style={{ fontSize:11, color:'#16a34a', fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>Previous Resolution</p>
                <p style={{ fontSize:13, color:'#1e293b', lineHeight:1.7 }}>{selected.resolution}</p>
              </div>
            )}

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', display:'block', marginBottom:8 }}>Admin Resolution / Notes</label>
              <textarea value={resolution} onChange={e=>setResolution(e.target.value)} rows={3} placeholder="Add notes or resolution details..."
                style={{ width:'100%', border:'2px solid #e2e8f0', borderRadius:10, padding:12, fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box', color:'#0f172a' }} />
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={()=>updateReport(selected.id,'in_review',resolution)} disabled={saving} style={btnS('#f59e0b')}>Mark In Review</button>
              <button onClick={()=>updateReport(selected.id,'resolved',resolution)} disabled={saving} style={btnS('#10b981')}>Mark Resolved ✓</button>
              <button onClick={()=>updateReport(selected.id,'dismissed',resolution)} disabled={saving} style={{ ...btnS('#94a3b8'), marginLeft:'auto' }}>Dismiss</button>
              {saving && <span style={{ fontSize:12, color:'#64748b', alignSelf:'center' }}>Saving...</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
