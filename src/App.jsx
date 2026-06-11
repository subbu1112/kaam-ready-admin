import { useState, useEffect, useCallback } from 'react'
import { sb } from './lib/supabase'

const Y = '#F5C000'
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'kaamready@admin'

const NAV = [
  { id: 'overview',  label: '📊 Overview'  },
  { id: 'bookings',  label: '📋 Bookings'  },
  { id: 'workers',   label: '👷 Workers'   },
  { id: 'kyc',       label: '🛡️ KYC Review' },
  { id: 'commissions', label: '💸 Commissions' },
  { id: 'disputes',  label: '⚠️ Disputes'  },
  { id: 'payouts',   label: '💰 Payouts'   },
  { id: 'pricing',   label: '🏷️ Pricing'   },
]

function Badge({ status }) {
  const map = {
    pending:   ['#2a1a00','#F5C000'],
    searching: ['#2a1a00','#F5C000'],
    assigned:  ['#0a1a2a','#60a5fa'],
    priced:    ['#241a00','#fbbf24'],
    claimed:   ['#0a1a2a','#60a5fa'],
    accepted:  ['#0a2a1a','#34d399'],
    arrived:   ['#0a1a2a','#60a5fa'],
    completed: ['#0a2a0a','#4ade80'],
    cancelled: ['#2a0a0a','#f87171'],
    open:      ['#2a1a00','#F5C000'],
    resolved:  ['#0a2a0a','#4ade80'],
    paid:      ['#0a2a0a','#4ade80'],
    failed:    ['#2a0a0a','#f87171'],
  }
  const [bg, color] = map[status] || ['#1a1a1a','#888']
  return <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{status}</span>
}

function Card({ children, style }) {
  return <div style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:12, padding:20, ...style }}>{children}</div>
}

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <p style={{ fontSize:13, color:'#666', marginBottom:6 }}>{label}</p>
      <p style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:'#555', marginTop:4 }}>{sub}</p>}
    </Card>
  )
}

function Table({ cols, rows, loading }) {
  if (loading) return <p style={{ color:'#555', padding:20 }}>Loading…</p>
  if (!rows.length) return <p style={{ color:'#555', padding:20 }}>No records found.</p>
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #2a2a2a' }}>
            {cols.map(c => <th key={c.key} style={{ padding:'10px 12px', textAlign:'left', color:'#666', fontWeight:600, whiteSpace:'nowrap' }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:'1px solid #1f1f1f' }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding:'10px 12px', color:'#ccc', whiteSpace: c.wrap ? 'normal' : 'nowrap' }}>
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmt(ts) { return ts ? new Date(ts).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—' }

// ── Screens ──────────────────────────────────────────────────────────────────

function Overview() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    Promise.all([
      sb.from('bookings').select('id, status, amount'),
      sb.from('workers').select('id, is_online, onboarding_done'),
      sb.from('profiles').select('id'),
      sb.from('disputes').select('id, status'),
    ]).then(([b, w, p, d]) => {
      const bookings = b.data || []
      const workers  = w.data || []
      const rev = bookings.filter(x => x.status === 'completed').reduce((s, x) => s + (x.amount || 0), 0)
      setStats({
        totalBookings: bookings.length,
        activeBookings: bookings.filter(x => ['searching','assigned','priced','scheduled'].includes(x.status)).length,
        completedBookings: bookings.filter(x => x.status === 'completed').length,
        revenue: rev,
        totalWorkers: workers.length,
        onlineWorkers: workers.filter(x => x.is_online).length,
        totalCustomers: (p.data || []).length,
        openDisputes: (d.data || []).filter(x => x.status === 'open').length,
      })
    })
  }, [])

  if (!stats) return <p style={{ color:'#555' }}>Loading…</p>
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Overview</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
        <StatCard label="Total Bookings"    value={stats.totalBookings}    sub={`${stats.activeBookings} active`} />
        <StatCard label="Completed Jobs"    value={stats.completedBookings} />
        <StatCard label="Revenue"           value={`₹${stats.revenue.toLocaleString()}`} sub="from completed jobs" />
        <StatCard label="Workers"           value={stats.totalWorkers}    sub={`${stats.onlineWorkers} online`} />
        <StatCard label="Customers"         value={stats.totalCustomers}  />
        <StatCard label="Open Disputes"     value={stats.openDisputes}    />
      </div>
    </div>
  )
}

function Bookings() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const statuses = ['all','searching','assigned','priced','completed','cancelled']
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Bookings</h2>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ background: filter===s ? Y : '#1a1a1a', color: filter===s ? '#000' : '#888',
              border:'1px solid #2a2a2a', borderRadius:20, padding:'5px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            {s}
          </button>
        ))}
      </div>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={filtered} cols={[
          { key:'created_at', label:'Date',    render: r => fmt(r.created_at) },
          { key:'service',    label:'Service'  },
          { key:'city',       label:'City'     },
          { key:'status',     label:'Status',  render: r => <Badge status={r.status} /> },
          { key:'amount',     label:'Amount',  render: r => r.amount ? `₹${r.amount}` : '—' },
          { key:'payment_status', label:'Payment', render: r => r.payment_status ? <Badge status={r.payment_status} /> : '—' },
          { key:'address',    label:'Address', wrap: true },
        ]} />
      </Card>
    </div>
  )
}

function Workers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sb.from('workers').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Workers ({rows.length})</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'name',           label:'Name'      },
          { key:'phone',          label:'Phone'     },
          { key:'city',           label:'City'      },
          { key:'skill',          label:'Skill'     },
          { key:'rating',         label:'Rating',   render: r => r.rating ? `⭐ ${r.rating}` : '—' },
          { key:'total_jobs',     label:'Jobs'      },
          { key:'wallet_balance', label:'Wallet',   render: r => `₹${r.wallet_balance || 0}` },
          { key:'commission_due', label:'Comm. Due', render: r => `₹${r.commission_due || 0}` },
          { key:'upi_id',         label:'UPI',      render: r => r.upi_id || '—' },
          { key:'price_max',      label:'Max ₹',    render: r => r.price_max ? `₹${r.price_max}` : '—' },
          { key:'is_online',      label:'Online',   render: r => r.is_online ? '🟢' : '🔴' },
          { key:'aadhaar_verified', label:'KYC',    render: r => r.aadhaar_verified ? '✅' : '❌' },
          { key:'onboarding_done',  label:'Onboarded', render: r => r.onboarding_done ? '✅' : '❌' },
        ]} />
      </Card>
    </div>
  )
}

function Disputes() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    sb.from('disputes').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])
  async function resolve(r) {
    const resolution = prompt('Resolution note (what was done):', r.resolution || '')
    if (resolution === null) return
    const { error } = await sb.from('disputes').update({ status:'resolved', resolution, resolved_at:new Date().toISOString() }).eq('id', r.id)
    if (error) { alert('Failed: '+error.message); return }
    load()
  }
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Disputes</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'created_at',    label:'Date',       render: r => fmt(r.created_at) },
          { key:'raised_by_role',label:'Raised By'   },
          { key:'reason',        label:'Reason',     wrap: true },
          { key:'status',        label:'Status',     render: r => <Badge status={r.status} /> },
          { key:'resolution',    label:'Resolution', wrap: true },
          { key:'_act', label:'', render: r => r.status!=='resolved' && (
            <button onClick={() => resolve(r)} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontWeight:700, cursor:'pointer', fontSize:12 }}>Resolve</button>
          )},
        ]} />
      </Card>
    </div>
  )
}

function Payouts() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sb.from('payouts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Payouts</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'created_at', label:'Date',   render: r => fmt(r.created_at) },
          { key:'amount',     label:'Amount', render: r => `₹${r.amount || 0}` },
          { key:'utr',        label:'UTR'    },
          { key:'status',     label:'Status', render: r => <Badge status={r.status} /> },
          { key:'paid_at',    label:'Paid At', render: r => fmt(r.paid_at) },
        ]} />
      </Card>
    </div>
  )
}

function Pricing() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sb.from('pricing').select('*').order('service_id')
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Pricing</h2>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'service_id',     label:'Service'          },
          { key:'city',           label:'City'             },
          { key:'base_price',     label:'Base (₹)',        render: r => `₹${r.base_price}` },
          { key:'per_hour',       label:'Per Hour (₹)',    render: r => r.per_hour ? `₹${r.per_hour}` : '—' },
          { key:'emergency_mult', label:'Emergency ×',     render: r => r.emergency_mult ? `${r.emergency_mult}×` : '—' },
          { key:'weekend_mult',   label:'Weekend ×',       render: r => r.weekend_mult ? `${r.weekend_mult}×` : '—' },
        ]} />
      </Card>
    </div>
  )
}

function KYCReview() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)        // worker being reviewed
  const [imgs, setImgs] = useState(null)      // { front, back } signed URLs
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    sb.from('workers').select('*').eq('aadhar_submitted', true).eq('aadhar_verified', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  async function open(w) {
    setSel(w); setImgs(null)
    const [f, b] = await Promise.all([
      sb.storage.from('kyc').createSignedUrl(`${w.id}/aadhaar-front.jpg`, 600),
      sb.storage.from('kyc').createSignedUrl(`${w.id}/aadhaar-back.jpg`, 600),
    ])
    setImgs({ front: f.data?.signedUrl, back: b.data?.signedUrl,
      err: f.error?.message || b.error?.message })
  }

  async function decide(approve) {
    if (!sel || busy) return
    setBusy(true)
    const patch = approve
      ? { aadhar_verified: true, aadhaar_verified: true, trust_score: Math.max(sel.trust_score||60, 80) }
      : { aadhar_submitted: false }   // rejected → worker must re-upload
    const { error } = await sb.from('workers').update(patch).eq('id', sel.id)
    setBusy(false)
    if (error) { alert('Failed: '+error.message+' (are you signed in as admin?)'); return }
    setSel(null); setImgs(null); load()
  }

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>KYC Review — {rows.length} pending</h2>
      {sel && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div>
              <p style={{ fontWeight:800, fontSize:16 }}>{sel.name}</p>
              <p style={{ fontSize:12, color:'#666' }}>{sel.skill} · {sel.city} · {sel.phone}</p>
            </div>
            <button onClick={() => { setSel(null); setImgs(null) }} style={{ background:'#222', border:'none', borderRadius:8, color:'#888', padding:'6px 12px', cursor:'pointer' }}>Close</button>
          </div>
          {!imgs ? <p style={{ color:'#555' }}>Loading documents…</p> : imgs.err ? (
            <p style={{ color:'#f87171', fontSize:13 }}>Could not load documents: {imgs.err}. Sign in as admin@kaamready.in to view KYC files.</p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {[['Front', imgs.front],['Back', imgs.back]].map(([lb,u]) => (
                <div key={lb}>
                  <p style={{ fontSize:12, color:'#666', marginBottom:6 }}>Aadhaar {lb}</p>
                  {u ? <img src={u} alt={lb} style={{ width:'100%', borderRadius:10, border:'1px solid #2a2a2a' }} /> : <p style={{ color:'#555' }}>Missing</p>}
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => decide(true)} disabled={busy}
              style={{ flex:1, background:'#16a34a', color:'#fff', border:'none', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', opacity:busy?.6:1 }}>✓ Approve</button>
            <button onClick={() => decide(false)} disabled={busy}
              style={{ flex:1, background:'#dc2626', color:'#fff', border:'none', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', opacity:busy?.6:1 }}>✕ Reject (re-upload)</button>
          </div>
        </Card>
      )}
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'name',  label:'Name'  },
          { key:'phone', label:'Phone' },
          { key:'city',  label:'City'  },
          { key:'skill', label:'Skill' },
          { key:'created_at', label:'Submitted', render: r => fmt(r.created_at) },
          { key:'_act', label:'', render: r => (
            <button onClick={() => open(r)} style={{ background:Y, border:'none', borderRadius:8, padding:'6px 14px', fontWeight:700, cursor:'pointer', fontSize:12 }}>Review</button>
          )},
        ]} />
      </Card>
    </div>
  )
}

function Commissions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const load = useCallback(() => {
    setLoading(true)
    sb.from('workers').select('id,name,phone,city,upi_id,commission_due,wallet_balance,total_jobs')
      .gt('commission_due', 0).order('commission_due', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])
  const total = rows.reduce((s,r) => s+(r.commission_due||0), 0)

  async function collect(w) {
    if (busy) return
    if (!confirm(`Mark ₹${w.commission_due} collected from ${w.name}?`)) return
    setBusy(w.id)
    const { error: pe } = await sb.from('payouts').insert({
      worker_id: w.id, amount: w.commission_due, status:'paid', paid_at:new Date().toISOString(), utr:'COMMISSION-COLLECTED',
    })
    const { error: we } = await sb.from('workers').update({ commission_due: 0 }).eq('id', w.id)
    setBusy(null)
    if (pe || we) { alert('Failed: '+(pe?.message||we?.message)+' (are you signed in as admin?)'); return }
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Commission Ledger</h2>
      <p style={{ fontSize:13, color:'#666', marginBottom:16 }}>10% platform fee per completed job, owed by workers. Total outstanding: <b style={{ color:Y }}>₹{total.toLocaleString('en-IN')}</b></p>
      <Card style={{ padding:0 }}>
        <Table loading={loading} rows={rows} cols={[
          { key:'name',  label:'Worker' },
          { key:'phone', label:'Phone'  },
          { key:'city',  label:'City'   },
          { key:'upi_id', label:'UPI'   },
          { key:'total_jobs', label:'Jobs' },
          { key:'commission_due', label:'Due', render: r => <b style={{ color:Y }}>₹{r.commission_due}</b> },
          { key:'_act', label:'', render: r => (
            <button onClick={() => collect(r)} disabled={busy===r.id}
              style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:700, cursor:'pointer', fontSize:12, opacity:busy===r.id?.6:1 }}>
              {busy===r.id ? '...' : 'Mark Collected'}
            </button>
          )},
        ]} />
      </Card>
    </div>
  )
}

const SCREENS = { overview: Overview, bookings: Bookings, workers: Workers, kyc: KYCReview, commissions: Commissions, disputes: Disputes, payouts: Payouts, pricing: Pricing }

// ── Login ─────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@kaamready.in'
function Login({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (busy) return
    setBusy(true); setErr('')
    const { data, error } = await sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pass })
    setBusy(false)
    if (error || !data?.session) { setErr('Incorrect password'); setPass(''); return }
    onLogin()
  }
  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f0f' }}>
      <div style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:16, padding:36, width:320, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:8 }}>⚡</div>
        <h1 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Kaam Ready Admin</h1>
        <p style={{ fontSize:13, color:'#555', marginBottom:24 }}>Restricted access</p>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Admin password"
          style={{ width:'100%', background:'#111', border:'1px solid #333', borderRadius:10, padding:'12px 14px',
            color:'#fff', fontSize:14, outline:'none', marginBottom:12, fontFamily:'inherit' }} />
        {err && <p style={{ color:'#f87171', fontSize:13, marginBottom:8 }}>{err}</p>}
        <button onClick={submit}
          style={{ width:'100%', background:Y, border:'none', borderRadius:10, padding:14,
            fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
          Sign In →
        </button>
        <p style={{ fontSize:11, color:'#444', marginTop:12 }}>Signs in as {ADMIN_EMAIL}</p>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false)
  const [active, setActive] = useState('overview')
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.email === ADMIN_EMAIL) setAuthed(true)
    })
  }, [])
  function login() { setAuthed(true) }
  function logout() { sb.auth.signOut(); setAuthed(false) }

  if (!authed) return <Login onLogin={login} />

  const Screen = SCREENS[active] || Overview

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Sidebar */}
      <div style={{ width:220, background:'#111', borderRight:'1px solid #1f1f1f', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid #1f1f1f' }}>
          <div style={{ fontSize:22 }}>⚡</div>
          <p style={{ fontSize:13, fontWeight:800, marginTop:4 }}>Kaam Ready</p>
          <p style={{ fontSize:11, color:'#555' }}>Admin Panel</p>
        </div>
        <nav style={{ flex:1, padding:'12px 8px' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)}
              style={{ display:'block', width:'100%', textAlign:'left', background: active===n.id ? '#1f1f1f' : 'transparent',
                color: active===n.id ? Y : '#888', border:'none', borderRadius:8, padding:'10px 12px',
                fontSize:13, fontWeight: active===n.id ? 700 : 400, cursor:'pointer', marginBottom:2, fontFamily:'inherit' }}>
              {n.label}
            </button>
          ))}
        </nav>
        <button onClick={logout}
          style={{ margin:'12px 8px', background:'transparent', border:'1px solid #2a2a2a',
            borderRadius:8, padding:'10px 12px', color:'#555', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:'auto', padding:28 }}>
        <Screen />
      </div>
    </div>
  )
}
