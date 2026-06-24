import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import Modal from '../components/Modal'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'
const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9', verticalAlign:'top' }
const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', marginBottom:12, boxSizing:'border-box' }
const btn = (bg) => ({ background:bg, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' })

export default function Complaints({ user, showToast }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('open')
  const [sel, setSel]         = useState(null)
  const [resolution, setResolution] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [d, r] = await Promise.all([
      sb.from('disputes').select('*').order('created_at',{ascending:false}),
      sb.from('reports').select('*').order('created_at',{ascending:false}),
    ])
    const disputes = (d.data||[]).map(x => ({
      kind:'dispute', id:x.id, table:'disputes', who:x.raised_by_role||'user',
      type:'Dispute', detail:x.reason||'—', booking_id:x.booking_id,
      status:x.status||'open', resolution:x.resolution, created_at:x.created_at,
    }))
    const reports = (r.data||[]).map(x => ({
      kind:'report', id:x.id, table:'reports', who:x.reported_by_role||'user',
      type:x.report_type||'Report', detail:x.description||'—', booking_id:x.booking_id,
      worker_name:x.worker_name, status:x.status||'open', resolution:x.resolution, created_at:x.created_at,
    }))
    setItems([...disputes, ...reports].sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')))
    setLoading(false)
  }

  function openResolve(it) { setSel(it); setResolution(it.resolution||'') }

  async function resolve(status) {
    if (!sel) return
    setSaving(true)
    const patch = { status, resolution: resolution.trim() || null, resolved_at: new Date().toISOString() }
    const { error } = await sb.from(sel.table).update(patch).eq('id', sel.id)
    if (!error) {
      await sb.from('admin_logs').insert({ admin_id:user?.id, action:'resolve_complaint', target_id:String(sel.id), details:{ kind:sel.kind, status } })
    }
    setSaving(false)
    if (error) { showToast?.('Update failed: ' + error.message, 'error'); return }
    showToast?.('Complaint updated', 'success')
    setSel(null); setResolution('')
    await load()
  }

  const filtered = items.filter(i => filter==='all' || (filter==='open' ? (i.status!=='resolved' && i.status!=='closed' && i.status!=='dismissed') : i.status===filter))
  const openCount = items.filter(i => i.status!=='resolved' && i.status!=='closed' && i.status!=='dismissed').length

  return (
    <div>
      <TopBar title="Complaints & Disputes" subtitle="Customer and worker complaints, disputes & reports" />
      <div style={{ padding:32 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {[['Open', openCount, '#f59e0b'],['Total', items.length, '#6366f1'],['Resolved', items.filter(i=>i.status==='resolved').length, '#10b981']].map(([l,v,c])=>(
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8 }}>
            {['open','resolved','all'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:filter===f?'#6366f1':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize' }}>{f}</button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b', lineHeight:'34px' }}>{filtered.length} items</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Type','Raised By','Details','Booking','Status','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(it => (
                    <tr key={it.kind+it.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontWeight:600, textTransform:'capitalize' }}>{it.type}</span></td>
                      <td style={td}><span style={{ textTransform:'capitalize' }}>{it.who}</span></td>
                      <td style={{ ...td, maxWidth:320 }}>{it.detail}{it.worker_name?` (worker: ${it.worker_name})`:''}</td>
                      <td style={{ ...td, fontFamily:'monospace', fontSize:12 }}>{it.booking_id ? '#'+String(it.booking_id).slice(0,8).toUpperCase() : '—'}</td>
                      <td style={td}><Badge status={it.status} /></td>
                      <td style={{ ...td, fontSize:12 }}>{fmt(it.created_at)}</td>
                      <td style={td}><button onClick={()=>openResolve(it)} style={{ ...btn('#6366f1'), padding:'5px 12px', fontSize:12 }}>Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No complaints in this view</div>}
            </div>
          )}
        </div>
      </div>

      {sel && (
        <Modal title={`Review ${sel.type}`} onClose={()=>setSel(null)} width={500}>
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:4 }}>RAISED BY {(sel.who||'').toUpperCase()}</div>
            <div style={{ fontSize:14, color:'#0f172a' }}>{sel.detail}</div>
            {sel.booking_id && <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>Booking #{String(sel.booking_id).slice(0,8).toUpperCase()}</div>}
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>{fmt(sel.created_at)}</div>
          </div>
          <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Resolution / Notes</label>
          <textarea style={{ ...inp, minHeight:90, resize:'vertical' }} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Describe how this was resolved..." />
          <div style={{ display:'flex', gap:8 }}>
            <button disabled={saving} onClick={()=>resolve('resolved')} style={{ ...btn('#10b981'), flex:1, opacity:saving?0.6:1 }}>{saving?'Saving...':'Mark Resolved'}</button>
            <button disabled={saving} onClick={()=>resolve('dismissed')} style={btn('#64748b')}>Dismiss</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
