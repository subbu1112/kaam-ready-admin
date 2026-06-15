import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { sb } from './lib/supabase'

const Login           = lazy(() => import('./pages/Login'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const PaymentApprovals= lazy(() => import('./pages/PaymentApprovals'))
const Workers         = lazy(() => import('./pages/Workers'))
const Users           = lazy(() => import('./pages/Users'))
const Bookings        = lazy(() => import('./pages/Bookings'))
const Reports         = lazy(() => import('./pages/Reports'))
const Support         = lazy(() => import('./pages/Support'))
const Settings        = lazy(() => import('./pages/Settings'))

const IDLE_MS = 30 * 60 * 1000

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:       '#0F0F0F',
  sidebar:  '#1C1C1E',
  primary:  '#F5C000',     // yellow
  primaryD: '#D4A017',
  accent:   '#F5C000',
  success:  '#22c55e',
  danger:   '#EF4444',
  text:     '#FFFFFF',
  muted:    '#636366',
  border:   '#2a2a2a',
  card:     '#1a1a1a',
}

const NAV = [
  { id:'dashboard',  ico:'📊', label:'Dashboard'         },
  { id:'payments',   ico:'✅', label:'Payment Approvals', badge:true },
  { id:'workers',    ico:'👷', label:'Workers'            },
  { id:'users',      ico:'👥', label:'Customers'          },
  { id:'bookings',   ico:'📋', label:'Bookings'           },
  { id:'reports',    ico:'📈', label:'Analytics'          },
  { id:'support',    ico:'🎧', label:'Support'            },
  { id:'settings',   ico:'⚙️', label:'Settings'          },
]

function Loader() {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'3px solid '+C.border, borderTop:'3px solid '+C.primary, borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function App() {
  const [user,       setUser]       = useState(null)
  const [page,       setPage]       = useState('dashboard')
  const [toast,      setToast]      = useState(null)
  const [pending,    setPending]    = useState(0)
  const [sideOpen,   setSideOpen]   = useState(true)
  const idleTimer = useRef(null)

  // Auth
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { if (data.session?.user) setUser(data.session.user) })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Idle auto-logout
  useEffect(() => {
    if (!user) return
    const reset = () => {
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => sb.auth.signOut(), IDLE_MS)
    }
    const evs = ['mousemove','keydown','click','scroll','touchstart']
    evs.forEach(e => window.addEventListener(e, reset))
    reset()
    return () => { evs.forEach(e => window.removeEventListener(e, reset)); clearTimeout(idleTimer.current) }
  }, [user])

  // Live pending payment count
  useEffect(() => {
    if (!user) return
    loadPending()
    const ch = sb.channel('admin-payments')
      .on('postgres_changes',{ event:'*', schema:'public', table:'bookings' }, loadPending)
      .subscribe()
    return () => sb.removeChannel(ch)
  }, [user])

  async function loadPending() {
    const { count } = await sb.from('bookings').select('id', { count:'exact', head:true })
      .eq('payment_status','pending_verification')
    setPending(count || 0)
  }

  function showToast(msg, type='info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (!user) return (
    <Suspense fallback={<Loader />}>
      <Login onLogin={setUser} showToast={showToast} />
      {toast && <ToastBar toast={toast} />}
    </Suspense>
  )

  const ctx = { user, showToast, loadPending }
  const pages = {
    dashboard: <Dashboard  {...ctx} setPage={setPage} />,
    payments:  <PaymentApprovals {...ctx} />,
    workers:   <Workers    {...ctx} />,
    users:     <Users      {...ctx} />,
    bookings:  <Bookings   {...ctx} />,
    reports:   <Reports    {...ctx} />,
    support:   <Support    {...ctx} />,
    settings:  <Settings   {...ctx} />,
  }

  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color:C.text, overflow:'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: sideOpen ? 240 : 64, background:C.sidebar, borderRight:'1px solid '+C.border, display:'flex', flexDirection:'column', transition:'width .2s', flexShrink:0, overflow:'hidden' }}>
        {/* Logo */}
        <div style={{ padding:'20px 16px', borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:36, height:36, background:C.primary, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>⚡</div>
          {sideOpen && <div><p style={{ fontWeight:800, fontSize:15, color:C.text }}>KaamReady</p><p style={{ fontSize:11, color:C.muted }}>Admin Panel</p></div>}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, overflowY:'auto', padding:'12px 8px' }}>
          {NAV.map(n => {
            const active = page === n.id
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 10px', marginBottom:2,
                  background: active ? C.primary : 'transparent',
                  borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit',
                  color: active ? '#000' : C.muted, fontWeight: active ? 700 : 500, fontSize:14,
                  position:'relative', transition:'background .15s' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{n.ico}</span>
                {sideOpen && <span style={{ flex:1, textAlign:'left' }}>{n.label}</span>}
                {n.badge && pending > 0 && (
                  <span style={{ background: active ? '#fff' : C.danger, color: active ? C.danger : '#fff',
                    borderRadius:10, fontSize:10, fontWeight:800, padding:'1px 6px', minWidth:18, textAlign:'center', flexShrink:0 }}>
                    {pending}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: collapse + logout */}
        <div style={{ padding:'12px 8px', borderTop:'1px solid '+C.border }}>
          <button onClick={() => setSideOpen(p=>!p)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 10px', background:'transparent', border:'none', cursor:'pointer', color:C.muted, fontSize:14, fontFamily:'inherit', borderRadius:10, marginBottom:4 }}>
            <span style={{ fontSize:18 }}>{sideOpen ? '◀' : '▶'}</span>
            {sideOpen && <span>Collapse</span>}
          </button>
          <button onClick={() => sb.auth.signOut()} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 10px', background:'transparent', border:'none', cursor:'pointer', color:C.danger, fontSize:14, fontFamily:'inherit', borderRadius:10 }}>
            <span style={{ fontSize:18 }}>🚪</span>
            {sideOpen && <span style={{ fontWeight:600 }}>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Top bar */}
        <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h1 style={{ fontSize:18, fontWeight:800, color:C.text }}>
            {NAV.find(n=>n.id===page)?.ico} {NAV.find(n=>n.id===page)?.label}
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {pending > 0 && (
              <button onClick={() => setPage('payments')}
                style={{ background:'#2d0a0a', border:'1px solid #7f1d1d', borderRadius:10, padding:'6px 14px',
                  fontSize:12, fontWeight:700, cursor:'pointer', color:C.danger, fontFamily:'inherit' }}>
                🔔 {pending} payment{pending!==1?'s':''} pending approval
              </button>
            )}
            <div style={{ background:C.primary, color:'#000', width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800 }}>
              A
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflowY:'auto', padding:24, '--primary':C.primary, '--accent':C.accent, '--success':C.success, '--danger':C.danger, '--border':C.border, '--card':C.card, '--muted':C.muted, '--bg':C.bg }}>
          <Suspense fallback={<Loader />}>
            {pages[page] || <Dashboard {...ctx} setPage={setPage} />}
          </Suspense>
        </div>
      </div>

      {toast && <ToastBar toast={toast} />}
    </div>
  )
}

function ToastBar({ toast }) {
  const bg = toast.type==='error' ? '#EF4444' : toast.type==='success' ? '#22c55e' : '#F5C000'
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:bg, color: bg==='#F5C000' ? '#000' : '#fff', borderRadius:12, padding:'12px 20px', fontSize:14, fontWeight:600, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,.2)', maxWidth:360, textAlign:'center' }}>
      {toast.msg}
    </div>
  )
}
