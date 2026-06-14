import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import DataTable from '../components/DataTable'

const Y = '#F5C000'

const STATUS_STYLE = {
  searching:  { bg:'#3b82f620', color:'#3b82f6' },
  assigned:   { bg:'#f9731620', color:'#f97316' },
  priced:     { bg:'#a855f720', color:'#a855f7' },
  completed:  { bg:'#22c55e20', color:'#22c55e' },
  cancelled:  { bg:'#ef444420', color:'#ef4444' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg:'#33415520', color:'#64748B' }
  return (
    <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:6, textTransform:'capitalize' }}>
      {status || '—'}
    </span>
  )
}

export default function Bookings({ showToast }) {
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [page,      setPage]      = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await sb
      .from('bookings')
      .select('id, status, service, amount, user_id, worker_id, city, description, created_at, scheduled_at, address, customer_name, customer_phone, worker')
      .order('created_at', { ascending: false })
    if (error) showToast(error.message, 'error')
    else setBookings(data || [])
    setLoading(false)
  }

  const filtered = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (dateFrom && b.created_at < dateFrom) return false
    if (dateTo   && b.created_at > dateTo + 'T23:59:59') return false
    const workerName = b.worker?.name || ''
    const q = search.toLowerCase()
    return !q
      || (b.service||'').toLowerCase().includes(q)
      || (b.city||'').toLowerCase().includes(q)
      || (b.customer_name||'').toLowerCase().includes(q)
      || workerName.toLowerCase().includes(q)
      || (b.id||'').includes(q)
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const counts = {}
  ;['all','searching','assigned','priced','completed','cancelled'].forEach(s => {
    counts[s] = s === 'all' ? bookings.length : bookings.filter(b => b.status === s).length
  })

  const columns = [
    { key:'id',          label:'ID',       width:120, render: v => <span style={{ fontFamily:'monospace', fontSize:11, color:'#475569' }}>{v?.slice(0,12)}…</span> },
    { key:'service',     label:'Service',  render: v => <span style={{ color:Y, fontWeight:600 }}>{v || '—'}</span> },
    { key:'status',      label:'Status',   render: v => <StatusBadge status={v} /> },
    { key:'amount',      label:'Amount',   render: v => v ? <span style={{ color:'#22c55e', fontWeight:700 }}>₹{v}</span> : '—' },
    { key:'city',        label:'City'      },
    { key:'customer_name',label:'Customer',render: v => v || '—' },
    { key:'worker',      label:'Worker',   render: v => v?.name || <span style={{ color:'#475569' }}>Unassigned</span> },
    { key:'created_at',  label:'Created',  render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Status filter tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['all','searching','assigned','priced','completed','cancelled'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(0) }}
            style={{
              padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
              fontSize:12, fontWeight:600,
              background: filter===f ? Y : '#1E293B',
              color: filter===f ? '#0F172A' : '#64748B'
            }}>
            {f.charAt(0).toUpperCase()+f.slice(1)} ({counts[f]??0})
          </button>
        ))}
      </div>

      {/* Search + date filters */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <input placeholder="Search ID, service, city, customer…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 14px', color:'#F1F5F9', fontSize:13, outline:'none', fontFamily:'inherit', flex:1, minWidth:220 }} />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', color:'#94A3B8', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        <span style={{ color:'#475569' }}>→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', color:'#94A3B8', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setFilter('all') }}
          style={{ background:'#334155', border:'none', borderRadius:8, padding:'8px 14px', color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
          Clear
        </button>
        <button onClick={load}
          style={{ background:'#334155', border:'none', borderRadius:8, padding:'8px 14px', color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
          ↻
        </button>
      </div>

      {/* Summary bar */}
      <div style={{ display:'flex', gap:16 }}>
        {[
          { l:'Showing', v: filtered.length + ' bookings' },
          { l:'Revenue', v: '₹'+filtered.filter(b=>b.status==='completed').reduce((s,b)=>s+(b.amount||0),0).toLocaleString('en-IN') },
          { l:'Commission (10%)', v: '₹'+Math.round(filtered.filter(b=>b.status==='completed').reduce((s,b)=>s+(b.amount||0),0)*0.1).toLocaleString('en-IN') },
        ].map(({ l, v }) => (
          <div key={l} style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:10, padding:'10px 16px' }}>
            <div style={{ color:'#64748B', fontSize:11 }}>{l}</div>
            <div style={{ color:Y, fontWeight:700, fontSize:15, marginTop:2 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, overflow:'hidden' }}>
        <DataTable columns={columns} rows={paginated} loading={loading}
          emptyMsg="No bookings found" onRowClick={setSelected} />
      </div>

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:6 }}>
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}
            style={{ padding:'6px 12px', borderRadius:6, border:'none', background:'#1E293B', color:'#64748B', cursor:'pointer', fontFamily:'inherit' }}>
            ‹ Prev
          </button>
          <span style={{ color:'#64748B', padding:'6px 12px', fontSize:13 }}>Page {page+1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page===totalPages-1}
            style={{ padding:'6px 12px', borderRadius:6, border:'none', background:'#1E293B', color:'#64748B', cursor:'pointer', fontFamily:'inherit' }}>
            Next ›
          </button>
        </div>
      )}

      {/* Booking detail modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:20, padding:32, width:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ color:'#F1F5F9', fontWeight:700, fontSize:18, margin:'0 0 8px' }}>📋 Booking Detail</h2>
                <StatusBadge status={selected.status} />
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background:'#334155', border:'none', borderRadius:8, color:'#94A3B8', padding:'6px 12px', cursor:'pointer', fontFamily:'inherit' }}>✕</button>
            </div>
            {[
              ['Booking ID', selected.id],
              ['Service',    selected.service || '—'],
              ['Status',     selected.status  || '—'],
              ['Amount',     selected.amount ? '₹'+selected.amount : '—'],
              ['City',       selected.city    || '—'],
              ['Customer',   selected.customer_name  || '—'],
              ['Cust. Phone',selected.customer_phone || '—'],
              ['Worker',     selected.worker?.name   || 'Unassigned'],
              ['Address',    selected.address || '—'],
              ['Description',selected.description  || '—'],
              ['Created',    selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : '—'],
              ['Scheduled',  selected.scheduled_at ? new Date(selected.scheduled_at).toLocaleString('en-IN') : 'Immediate'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid #334155' }}>
                <span style={{ color:'#64748B', fontSize:13, minWidth:100, flexShrink:0 }}>{k}</span>
                <span style={{ color:'#F1F5F9', fontSize:13, wordBreak:'break-all' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
