import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import DataTable from '../components/DataTable'

const Y = '#F5C000'

export default function Payments({ showToast }) {
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await sb
      .from('bookings')
      .select('id, amount, status, service, customer_name, worker, city, created_at, payment_confirmed_at')
      .eq('status', 'completed')
      .order('created_at', { ascending:false })
    if (error) showToast(error.message, 'error')
    else setBookings(data || [])
    setLoading(false)
  }

  const filtered = bookings.filter(b => {
    if (dateFrom && b.created_at < dateFrom) return false
    if (dateTo   && b.created_at > dateTo + 'T23:59:59') return false
    const q = search.toLowerCase()
    return !q
      || (b.customer_name||'').toLowerCase().includes(q)
      || (b.worker?.name||'').toLowerCase().includes(q)
      || (b.service||'').toLowerCase().includes(q)
      || (b.city||'').toLowerCase().includes(q)
  })

  const totalGMV        = filtered.reduce((s,b) => s + (b.amount||0), 0)
  const totalCommission = Math.round(totalGMV * 0.10)
  const totalWorkerPay  = Math.round(totalGMV * 0.90)

  const columns = [
    { key:'id',          label:'Booking ID', width:130, render: v => <span style={{ fontFamily:'monospace', fontSize:11, color:'#475569' }}>{v?.slice(0,12)}…</span> },
    { key:'service',     label:'Service',    render: v => <span style={{ color:Y }}>{v||'—'}</span> },
    { key:'customer_name',label:'Customer'  },
    { key:'worker',      label:'Worker',     render: v => v?.name || '—' },
    { key:'city',        label:'City'       },
    { key:'amount',      label:'GMV',        render: v => <span style={{ color:'#F1F5F9', fontWeight:700 }}>₹{v||0}</span> },
    { key:'amount',      label:'Commission', render: v => <span style={{ color:'#a855f7', fontWeight:700 }}>₹{Math.round((v||0)*0.10)}</span> },
    { key:'amount',      label:'Worker Pay', render: v => <span style={{ color:'#22c55e', fontWeight:700 }}>₹{Math.round((v||0)*0.90)}</span> },
    { key:'created_at',  label:'Date',       render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ]

  function exportCSV() {
    const header = 'Booking ID,Service,Customer,Worker,City,GMV,Commission,Worker Pay,Date\n'
    const rows = filtered.map(b =>
      [b.id, b.service, b.customer_name, b.worker?.name, b.city,
       b.amount, Math.round((b.amount||0)*.10), Math.round((b.amount||0)*.90),
       b.created_at?.slice(0,10)].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'kaamready-payments.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exported ✓')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { l:'Transactions',  v: filtered.length,                 color:'#3b82f6' },
          { l:'Total GMV',     v: '₹'+totalGMV.toLocaleString(),  color: Y        },
          { l:'Platform (10%)',v: '₹'+totalCommission.toLocaleString(), color:'#a855f7' },
          { l:'Worker Pay',    v: '₹'+totalWorkerPay.toLocaleString(),  color:'#22c55e' },
        ].map(({ l,v,color }) => (
          <div key={l} style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:12, padding:'16px 20px' }}>
            <div style={{ color:'#64748B', fontSize:11, textTransform:'uppercase' }}>{l}</div>
            <div style={{ color, fontSize:22, fontWeight:800, marginTop:6 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <input placeholder="Search customer, worker, city…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 14px', color:'#F1F5F9', fontSize:13, outline:'none', fontFamily:'inherit', flex:1 }} />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', color:'#94A3B8', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', color:'#94A3B8', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        <button onClick={exportCSV}
          style={{ background:Y, border:'none', borderRadius:8, padding:'8px 16px', color:'#0F172A', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13, whiteSpace:'nowrap' }}>
          ↓ Export CSV
        </button>
        <button onClick={load}
          style={{ background:'#334155', border:'none', borderRadius:8, padding:'8px 14px', color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
          ↻
        </button>
      </div>

      <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:16, overflow:'hidden' }}>
        <DataTable columns={columns} rows={filtered} loading={loading} emptyMsg="No completed payments" />
      </div>
    </div>
  )
}
