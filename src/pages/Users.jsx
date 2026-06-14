import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import DataTable from '../components/DataTable'

const Y = '#F5C000'

function Badge({ text, color = '#334155', bg = '#1E293B' }) {
  return <span style={{ background: bg, color, fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6 }}>{text}</span>
}

export default function Users({ showToast }) {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [page,     setPage]     = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await sb
      .from('profiles')
      .select('id, name, phone, email, city, created_at, address')
      .order('created_at', { ascending: false })
    if (error) showToast(error.message, 'error')
    else setUsers(data || [])
    setLoading(false)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || (u.name||'').toLowerCase().includes(q)
      || (u.phone||'').includes(q)
      || (u.email||'').toLowerCase().includes(q)
      || (u.city||'').toLowerCase().includes(q)
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const columns = [
    { key:'name',       label:'Name',         render: v => <span style={{ color:'#F1F5F9', fontWeight:600 }}>{v || '—'}</span> },
    { key:'phone',      label:'Phone',         render: v => <span style={{ fontFamily:'monospace' }}>{v || '—'}</span> },
    { key:'email',      label:'Email',         render: v => v || '—' },
    { key:'city',       label:'City',          render: v => v ? <Badge text={v} color="#3b82f6" bg="#eff6ff20" /> : '—' },
    { key:'created_at', label:'Joined',        render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ color:'#94A3B8', fontSize:13 }}>{filtered.length} customers found</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input
            placeholder="Search name, phone, city…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            style={{
              background:'#1E293B', border:'1px solid #334155', borderRadius:8,
              padding:'8px 14px', color:'#F1F5F9', fontSize:13, outline:'none',
              fontFamily:'inherit', width:240
            }}
          />
          <button onClick={load} style={{
            background:'#334155', border:'none', borderRadius:8, padding:'8px 14px',
            color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13
          }}>↻ Refresh</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, overflow:'hidden' }}>
        <DataTable
          columns={columns} rows={paginated}
          loading={loading} emptyMsg="No users found"
          onRowClick={setSelected}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
          {Array.from({ length:totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              style={{
                width:32, height:32, borderRadius:6, border:'none',
                background: page===i ? Y : '#1E293B', color: page===i ? '#0F172A' : '#64748B',
                fontWeight: page===i ? 700 : 400, cursor:'pointer', fontSize:13, fontFamily:'inherit'
              }}>
              {i+1}
            </button>
          ))}
        </div>
      )}

      {/* User detail modal */}
      {selected && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:999,
          display:'flex', alignItems:'center', justifyContent:'center'
        }} onClick={() => setSelected(null)}>
          <div style={{
            background:'#1E293B', border:'1px solid #334155', borderRadius:20,
            padding:32, width:460, boxShadow:'0 24px 64px rgba(0,0,0,.5)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ color:'#F1F5F9', fontWeight:700, fontSize:18, margin:0 }}>👤 User Details</h2>
              <button onClick={() => setSelected(null)}
                style={{ background:'#334155', border:'none', borderRadius:8, color:'#94A3B8', padding:'6px 12px', cursor:'pointer', fontFamily:'inherit' }}>
                ✕ Close
              </button>
            </div>
            {[
              ['Name',    selected.name    || '—'],
              ['Phone',   selected.phone   || '—'],
              ['Email',   selected.email   || '—'],
              ['City',    selected.city    || '—'],
              ['Address', selected.address || '—'],
              ['Joined',  selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : '—'],
              ['User ID', selected.id],
            ].map(([k,v]) => (
              <div key={k} style={{
                display:'flex', gap:12, padding:'10px 0',
                borderBottom:'1px solid #334155'
              }}>
                <span style={{ color:'#64748B', fontSize:13, minWidth:80 }}>{k}</span>
                <span style={{ color:'#F1F5F9', fontSize:13, fontWeight:500, wordBreak:'break-all' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
