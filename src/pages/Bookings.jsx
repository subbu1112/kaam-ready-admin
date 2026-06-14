import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { exportCSV, exportExcel, exportPDF } from '../lib/export'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')
const STATUSES = ['searching','assigned','priced','completed','cancelled']

function btnS(bg,size='md') {
  return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' }
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('bookings').select('*').order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function updateStatus(id, newStatus) {
    await sb.from('bookings').update({ status: newStatus }).eq('id', id)
    await load()
    setSelected(s => s ? { ...s, status: newStatus } : null)
  }

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    const matchQ = !q || (b.service||'').toLowerCase().includes(q) || (b.customer_name||'').toLowerCase().includes(q) || (b.city||'').toLowerCase().includes(q) || (b.id||'').includes(q)
    const matchS = status === 'all' || b.status === status
    return matchQ && matchS
  })

  const stats = STATUSES.reduce((acc,s)=>({ ...acc, [s]: bookings.filter(b=>b.status===s).length }),{})
  const totalRevenue = bookings.filter(b=>b.status==='completed'&&b.amount).reduce((a,b)=>a+(b.amount||0),0)

  const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' }

  function doExport(type) {
    const rows = filtered.map(b=>({ ID:b.id.slice(0,8), Service:b.service, Customer:b.customer_name||'-', City:b.city||'-', Status:b.status, Amount:b.amount||0, Payment:b.payment_status||'pending', Date:fmt(b.created_at) }))
    if(type==='csv') exportCSV(rows,'bookings')
    else if(type==='excel') exportExcel(rows,'bookings','Bookings')
    else exportPDF(['ID','Service','Customer','City','Status','Amount','Payment','Date'],rows.map(r=>Object.values(r).map(String)),'Bookings Report','bookings')
  }

  return (
    <div>
      <TopBar title="Booking Management" subtitle={`${bookings.length} total bookings | Revenue: ${INR(totalRevenue)}`} actions={
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>doExport('csv')} style={btnS('#10b981')}>CSV</button>
          <button onClick={()=>doExport('excel')} style={btnS('#3b82f6')}>Excel</button>
          <button onClick={()=>doExport('pdf')} style={btnS('#ef4444')}>PDF</button>
        </div>
      } />
      <div style={{ padding:32 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {STATUSES.map(s=>(
            <div key={s} onClick={()=>setStatus(s===status?'all':s)} style={{ background:'#fff', borderRadius:10, padding:'14px 16px', cursor:'pointer', border: status===s ? '2px solid #6366f1' : '2px solid transparent', boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>{stats[s]||0}</div>
              <div style={{ fontSize:12, color:'#64748b', textTransform:'capitalize', marginTop:2 }}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'center' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search service, customer, city, ID..." style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, width:300, outline:'none' }} />
            <div style={{ display:'flex', gap:6 }}>
              {['all',...STATUSES].map(s=>(
                <button key={s} onClick={()=>setStatus(s)} style={{ padding:'7px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:status===s?'#6366f1':'#f1f5f9', color:status===s?'#fff':'#64748b', textTransform:'capitalize' }}>{s}</button>
              ))}
            </div>
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b' }}>{filtered.length} results</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>{['ID','Service','Customer','Worker','City','Status','Amount','Payment','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(b=>(
                    <tr key={b.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontFamily:'monospace', fontSize:12, color:'#6366f1' }}>{b.id.slice(0,8)}</span></td>
                      <td style={td}>{b.service||'-'}</td>
                      <td style={td}>{b.customer_name||'-'}</td>
                      <td style={td}>{b.worker?.name||'-'}</td>
                      <td style={td}>{b.city||'-'}</td>
                      <td style={td}><Badge status={b.status} /></td>
                      <td style={td}><span style={{ fontWeight:700 }}>{INR(b.amount)}</span></td>
                      <td style={td}><Badge status={b.payment_status||'pending'} /></td>
                      <td style={td} style={{ ...td, fontSize:12 }}>{fmt(b.created_at)}</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>setSelected(b)} style={btnS('#6366f1','sm')}>View</button>
                          {b.status!=='cancelled' && b.status!=='completed' && <button onClick={()=>updateStatus(b.id,'cancelled')} style={btnS('#ef4444','sm')}>Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No bookings found</div>}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <Modal title={`Booking: ${selected.id.slice(0,8)}`} onClose={()=>setSelected(null)} width={640}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['Service',selected.service],['Status',<Badge status={selected.status} />],['Payment Status',<Badge status={selected.payment_status||'pending'} />],['Amount',INR(selected.amount)],['Customer',selected.customer_name||'-'],['Customer Phone',selected.customer_phone||'-'],['Worker',selected.worker?.name||'-'],['City',selected.city||'-'],['Address',selected.address||'-'],['Created',fmt(selected.created_at)],['Completed',fmt(selected.completed_at)],['Payment ID',selected.payment_id||'-']].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:3 }}>{l}</div>
                <div style={{ fontWeight:600, fontSize:13 }}>{v||'-'}</div>
              </div>
            ))}
          </div>
          {selected.description && <div style={{ marginTop:16, padding:'12px 16px', background:'#f8fafc', borderRadius:8 }}><div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:4 }}>Description</div><div style={{ fontSize:13 }}>{selected.description}</div></div>}
          <div style={{ display:'flex', gap:8, marginTop:20 }}>
            {selected.status!=='completed' && <button onClick={()=>updateStatus(selected.id,'completed')} style={btnS('#10b981')}>Mark Completed</button>}
            {selected.status!=='cancelled' && <button onClick={()=>updateStatus(selected.id,'cancelled')} style={btnS('#ef4444')}>Cancel Booking</button>}
          </div>
        </Modal>
      )}
    </div>
  )
}
