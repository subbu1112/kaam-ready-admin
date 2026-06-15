import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { exportCSV, exportExcel, exportPDF } from '../lib/export'

const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '-'
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [bookings, setBookings] = useState([])
  const [saving,    setSaving]    = useState(false)
  const [page,      setPage]      = useState(0)
  const [totalCount,setTotalCount]= useState(0)
  const PAGE_SIZE = 50

  useEffect(() => { load(0) }, [])

  async function load(pg = 0) {
    setLoading(true)
    const from = pg * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    const { data, count } = await sb.from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    setUsers(data || [])
    setTotalCount(count || 0)
    setPage(pg)
    setLoading(false)
  }

  async function openUser(u) {
    setSelected(u)
    const { data } = await sb.from('bookings').select('*').eq('user_id', u.id).order('created_at', { ascending: false })
    setBookings(data || [])
  }

  async function updateStatus(id, status) {
    setSaving(true)
    await sb.from('profiles').update({ account_status: status }).eq('id', id)
    await load()
    setSelected(s => s ? { ...s, account_status: status } : null)
    setSaving(false)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchQ = !q || (u.name||'').toLowerCase().includes(q) || (u.phone||'').includes(q)
    const matchF = filter === 'all' || (u.account_status || 'active') === filter
    return matchQ && matchF
  })

  const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' }

  function doExport(type) {
    const rows = filtered.map(u => ({ Name: u.name||'-', Phone: u.phone||'-', City: u.city||'-', Status: u.account_status||'active', Bookings: u.total_bookings||0, Joined: fmt(u.created_at) }))
    if (type==='csv') exportCSV(rows, 'users')
    else if (type==='excel') exportExcel(rows, 'users', 'Users')
    else exportPDF(['Name','Phone','City','Status','Bookings','Joined'], rows.map(r=>Object.values(r)), 'Users Report', 'users')
  }

  return (
    <div>
      <TopBar title="User Management" subtitle={`${users.length} registered customers`} actions={
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>doExport('csv')} style={btnS('#10b981')}>CSV</button>
          <button onClick={()=>doExport('excel')} style={btnS('#3b82f6')}>Excel</button>
          <button onClick={()=>doExport('pdf')} style={btnS('#ef4444')}>PDF</button>
        </div>
      } />
      <div style={{ padding:32 }}>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, width:260, outline:'none' }} />
            {['all','active','suspended','banned'].map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: filter===f ? '#6366f1' : '#f1f5f9', color: filter===f ? '#fff' : '#64748b', textTransform:'capitalize' }}>{f}</button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b' }}>{filtered.length} results</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>
                  {['Name','Phone','City','Bookings','Joined','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={{ cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><div style={{ fontWeight:600 }}>{u.name||'No name'}</div><div style={{ fontSize:11, color:'#94a3b8' }}>{u.id.slice(0,8)}...</div></td>
                      <td style={td}>{u.phone||'-'}</td>
                      <td style={td}>{u.city||'-'}</td>
                      <td style={td}><span style={{ fontWeight:700, color:'#6366f1' }}>{u.total_bookings||0}</span></td>
                      <td style={td}>{fmt(u.created_at)}</td>
                      <td style={td}><Badge status={u.account_status||'active'} /></td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>openUser(u)} style={btnS('#6366f1','sm')}>View</button>
                          {(u.account_status||'active')==='active' && <button onClick={()=>updateStatus(u.id,'suspended')} style={btnS('#f59e0b','sm')}>Suspend</button>}
                          {(u.account_status||'active')!=='banned' && <button onClick={()=>updateStatus(u.id,'banned')} style={btnS('#ef4444','sm')}>Ban</button>}
                          {(u.account_status||'active')!=='active' && <button onClick={()=>updateStatus(u.id,'active')} style={btnS('#10b981','sm')}>Restore</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No users found</div>}
              {/* Pagination controls */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderTop:'1px solid #e2e8f0', background:'#f8fafc' }}>
                <span style={{ fontSize:13, color:'#64748b' }}>
                  Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, totalCount)} of {totalCount} users
                </span>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>load(page-1)} disabled={page===0||loading}
                    style={{ padding:'7px 16px', borderRadius:7, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151', opacity:page===0?0.4:1 }}>
                    ← Prev
                  </button>
                  <span style={{ padding:'7px 12px', fontSize:13, color:'#64748b' }}>Page {page+1} / {Math.ceil(totalCount/PAGE_SIZE)||1}</span>
                  <button onClick={()=>load(page+1)} disabled={(page+1)*PAGE_SIZE>=totalCount||loading}
                    style={{ padding:'7px 16px', borderRadius:7, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151', opacity:(page+1)*PAGE_SIZE>=totalCount?0.4:1 }}>
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {selected && (
        <Modal title={`User: ${selected.name||'No name'}`} onClose={()=>setSelected(null)} width={700}>
          {/* Contact Info */}
          <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 16px', marginBottom:16, border:'1px solid #bfdbfe' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#3b82f6', marginBottom:8 }}>📞 Contact Information</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Phone',selected.phone],['Email',selected.email],['Alternate Phone',selected.alternate_phone],['City',selected.city],['Address',selected.address]].map(([l,v])=>v?(
                <div key={l} style={{ background:'#fff', borderRadius:7, padding:'8px 12px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>{l}</div>
                  <div style={{ fontWeight:600, fontSize:13, color:'#1e293b', marginTop:2 }}>{v}</div>
                </div>
              ):null)}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            {[['Status',selected.account_status||'active'],['Joined',fmt(selected.created_at)],['Total Bookings',selected.total_bookings||0]].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'12px 16px' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:4 }}>{l}</div>
                <div style={{ fontWeight:700, color:'#0f172a' }}>{v||'-'}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontWeight:700, marginBottom:12 }}>Booking History ({bookings.length})</h3>
          <div style={{ maxHeight:300, overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:8 }}>
            <table>
              <thead><tr>{['Service','Status','Amount','Payment','Date'].map(h=><th key={h} style={{...th,background:'#fff'}}>{h}</th>)}</tr></thead>
              <tbody>
                {bookings.map(b=>(
                  <tr key={b.id}>
                    <td style={td}>{b.service||'-'}</td>
                    <td style={td}><Badge status={b.status} /></td>
                    <td style={td}>{INR(b.amount)}</td>
                    <td style={td}><Badge status={b.payment_status||'pending'} /></td>
                    <td style={td}>{fmt(b.created_at)}</td>
                  </tr>
                ))}
                {!bookings.length && <tr><td colSpan={5} style={{ padding:20, textAlign:'center', color:'#94a3b8' }}>No bookings</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:20 }}>
      