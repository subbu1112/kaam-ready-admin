import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { sb } from './lib/supabase'
import AlertBell from './components/AlertBell'

const Login            = lazy(() => import('./pages/Login'))
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const PaymentApprovals = lazy(() => import('./pages/PaymentApprovals'))
const Workers          = lazy(() => import('./pages/Workers'))
const Approvals        = lazy(() => import('./pages/Approvals'))
const Users            = lazy(() => import('./pages/Users'))
const Bookings         = lazy(() => import('./pages/Bookings'))
const Reports          = lazy(() => import('./pages/Reports'))
const Support          = lazy(() => import('./pages/Support'))
const Settings         = lazy(() => import('./pages/Settings'))
const Payments         = lazy(() => import('./pages/Payments'))
const Payouts          = lazy(() => import('./pages/Payouts'))
const Withdrawals      = lazy(() => import('./pages/Withdrawals'))
const Logs             = lazy(() => import('./pages/Logs'))
const Escrow           = lazy(() => import('./pages/Escrow'))
const Wallets          = lazy(() => import('./pages/Wallets'))
const Finance          = lazy(() => import('./pages/Finance'))
const Complaints       = lazy(() => import('./pages/Complaints'))
const Services         = lazy(() => import('./pages/Services'))

const IDLE_MS = 30 * 60 * 1000

const C = {
  bg:       '#0F0F0F',
  sidebar:  '#111111',
  card:     '#1A1A1A',
  border:   '#2A2A2A',
  primary:  '#FFD700',
  primaryH: '#FFC107',
  success:  '#22C55E',
  danger:   '#EF4444',
  warning:  '#F59E0B',
  text:     '#FFFFFF',
  muted:    '#B3B3B3',
  dim:      '#666666',
}

const NAV_GROUPS = [
  {
    label: 'OPERATIONS',
    items: [
      { id:'dashboard',   ico:'▣',  label:'Dashboard'    },
      { id:'bookings',    ico:'≡',  label:'Bookings'     },
      { id:'customers',   ico:'◉',  label:'Customers'    },
      { id:'workers',     ico:'◈',  label:'Workers'      },
      { id:'approvals',   ico:'✓',  label:'Approvals'    },
      { id:'services',    ico:'⬡',  label:'Services'     },
    ]
  },
  {
    label: 'FINANCE',
    items: [
      { id:'payments',    ico:'✦',  label:'Payments',    badge:true },
      { id:'escrow',      ico:'◆',  label:'Escrow'       },
      { id:'wallets',     ico:'◇',  label:'Wallets'      },
      { id:'withdrawals', ico:'↑',  label:'Withdrawals'  },
      { id:'payouts',     ico:'⇪',  label:'Payouts'      },
      { id:'finance',     ico:'$',  label:'Finance'      },
    ]
  },
  {
    label: 'SUPPORT',
    items: [
      { id:'support',     ico:'◎',  label:'Support'      },
      { id:'complaints',  ico:'⚑',  label:'Complaints'   },
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { id:'analytics',   ico:'◬',  label:'Analytics'    },
      { id:'reports',     ico:'▤',  label:'Reports'      },
      { id:'logs',        ico:'▦',  label:'Logs'         },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { id:'settings',    ico:'◉',  label:'Settings'     },
    ]
  },
]

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items)

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; background:#0F0F0F; color:#fff; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:#111; }
  ::-webkit-scrollbar-thumb { background:#333; border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:#FFD700; }
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes countUp { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
  @keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }
  .nav-item { transition: all .18s ease; }
  .nav-item:hover { background:rgba(255,215,0,.06) !important; color:#FFD700 !important; }
  .nav-item:hover span.ico { color:#FFD700 !important; }
  .page-content { animation: fadeIn .25s ease; }
`

function Spinner() {
  return (
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',minHeight:200}}>
      <div style={{width:36,height:36,border:'3px solid #2A2A2A',borderTop:'3px solid #FFD700',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
    </div>
  )
}

export default function App() {
  const [user,     setUser]     = useState(null)
  const [page,     setPage]     = useState('dashboard')
  const [toast,    setToast]    = useState(null)
  const [pending,  setPending]  = useState(0)
  const [collapsed,setCollapsed]= useState(false)
  // The admin panel is desktop-first, but it gets opened on a phone often
  // enough (approving a payment, checking a booking) that the sidebar has to
  // get out of the way rather than eat half the screen.
  const [narrow,   setNarrow]   = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024)
  const [drawer,   setDrawer]   = useState(false)
  const idleTimer = useRef(null)

  useEffect(() => {
    const onResize = () => {
      const isNarrow = window.innerWidth < 1024
      setNarrow(isNarrow)
      if (!isNarrow) setDrawer(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    sb.auth.getSession().then(({data}) => { if (data.session?.user) setUser(data.session.user) })
    const {data:{subscription}} = sb.auth.onAuthStateChange((_,s) => setUser(s?.user||null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const reset = () => { clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => sb.auth.signOut(), IDLE_MS) }
    const evs = ['mousemove','keydown','click','scroll','touchstart']
    evs.forEach(e => window.addEventListener(e,reset)); reset()
    return () => { evs.forEach(e => window.removeEventListener(e,reset)); clearTimeout(idleTimer.current) }
  }, [user])

  useEffect(() => {
    if (!user) return
    loadPending()
    const ch = sb.channel('admin-pay').on('postgres_changes',{event:'*',schema:'public',table:'bookings'},loadPending).subscribe()
    return () => sb.removeChannel(ch)
  }, [user])

  async function loadPending() {
    const {count} = await sb.from('bookings').select('id',{count:'exact',head:true}).eq('payment_status','pending_verification')
    setPending(count||0)
  }

  function showToast(msg, type='info') {
    setToast({msg,type})
    setTimeout(()=>setToast(null),3500)
  }

  if (!user) return (
    <>
      <style>{CSS}</style>
      <Suspense fallback={<Spinner/>}>
        <Login onLogin={setUser} showToast={showToast}/>
        {toast && <Toast toast={toast}/>}
      </Suspense>
    </>
  )

  const ctx = {user, showToast, loadPending, setPage}
  const pages = {
    dashboard:   <Dashboard        {...ctx}/>,
    bookings:    <Bookings         {...ctx}/>,
    customers:   <Users            {...ctx}/>,
    workers:     <Workers          {...ctx}/>,
    approvals:   <Approvals        {...ctx}/>,
    services:    <Services         {...ctx}/>,
    payments:    <PaymentApprovals {...ctx}/>,
    escrow:      <Escrow           {...ctx}/>,
    wallets:     <Wallets          {...ctx}/>,
    withdrawals: <Withdrawals      {...ctx}/>,
    payouts:     <Payouts          {...ctx}/>,
    finance:     <Finance          {...ctx}/>,
    support:     <Support          {...ctx}/>,
    complaints:  <Complaints       {...ctx}/>,
    analytics:   <Reports          {...ctx}/>,
    reports:     <Reports          {...ctx}/>,
    logs:        <Logs             {...ctx}/>,
    settings:    <Settings         {...ctx}/>,
  }

  const currentNav = ALL_NAV.find(n=>n.id===page)||ALL_NAV[0]
  const W = narrow ? 260 : (collapsed ? 64 : 240)
  const goto = id => { setPage(id); if (narrow) setDrawer(false) }

  return (
    <>
      <style>{CSS}</style>
      <div style={{display:'flex',height:'100dvh',background:C.bg,overflow:'hidden',fontFamily:"'Inter',sans-serif"}}>

        {/* Backdrop behind the mobile drawer */}
        {narrow && drawer && (
          <div onClick={()=>setDrawer(false)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:40}} />
        )}

        {/* ── Sidebar (fixed drawer on narrow screens) ── */}
        <aside style={{
          width:W, minWidth:W, background:C.sidebar, borderRight:'1px solid #1E1E1E',
          display:'flex', flexDirection:'column', overflow:'hidden',
          transition: narrow ? 'transform .22s cubic-bezier(.4,0,.2,1)' : 'width .2s cubic-bezier(.4,0,.2,1)',
          ...(narrow
            ? { position:'fixed', top:0, bottom:0, left:0, zIndex:50,
                transform: drawer ? 'translateX(0)' : 'translateX(-100%)',
                boxShadow: drawer ? '0 0 40px rgba(0,0,0,.5)' : 'none' }
            : { position:'relative', zIndex:10 }),
        }}>

          {/* Logo */}
          <div style={{padding: (collapsed && !narrow) ? '20px 0' : '24px 20px',borderBottom:'1px solid #1E1E1E',display:'flex',alignItems:'center',gap:12,flexShrink:0,justifyContent:(collapsed && !narrow)?'center':'flex-start'}}>
            {narrow && (
              <button onClick={()=>setDrawer(false)} aria-label="Close menu"
                style={{marginLeft:'auto',background:'none',border:'none',color:C.muted,fontSize:20,cursor:'pointer',fontFamily:'inherit'}}>✕</button>
            )}
            <img src="/icon-192.png" alt="KaamReady" style={{width:36,height:36,borderRadius:10,flexShrink:0,boxShadow:'0 4px 12px rgba(255,215,0,.3)'}} />
            {(!collapsed || narrow) && (
              <div>
                <div style={{fontWeight:900,fontSize:16,letterSpacing:1,background:'linear-gradient(90deg,#FFD700,#FFC107)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>KAAMREADY</div>
                <div style={{fontSize:9,color:C.dim,letterSpacing:.5,marginTop:1,lineHeight:1.3}}>India's Trusted Workforce Platform</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{flex:1,overflowY:'auto',padding:'12px 8px'}}>
            {NAV_GROUPS.map(group => (
              <div key={group.label} style={{marginBottom:8}}>
                {(!collapsed || narrow) && <div style={{fontSize:9,fontWeight:700,color:C.dim,letterSpacing:1.5,padding:'8px 10px 4px',marginBottom:2}}>{group.label}</div>}
                {group.items.map(n => {
                  const active = page===n.id
                  return (
                    <button key={n.id} className="nav-item" onClick={()=>goto(n.id)}
                      style={{
                        width:'100%', display:'flex', alignItems:'center', gap:10,
                        padding: (collapsed && !narrow) ? '10px 0' : '9px 12px',
                        justifyContent: (collapsed && !narrow) ? 'center' : 'flex-start',
                        marginBottom:2, borderRadius:10, border:'none', cursor:'pointer',
                        fontFamily:"'Inter',sans-serif",
                        background: active ? 'rgba(255,215,0,.12)' : 'transparent',
                        borderLeft: active ? '3px solid #FFD700' : '3px solid transparent',
                        color: active ? C.primary : C.muted,
                        fontWeight: active ? 700 : 500, fontSize:13,
                        transition:'all .15s ease',
                        position:'relative',
                      }}>
                      <span className="ico" style={{fontSize:15,color: active ? C.primary : C.dim,flexShrink:0,width:18,textAlign:'center'}}>{n.ico}</span>
                      {(!collapsed || narrow) && <span style={{flex:1,textAlign:'left'}}>{n.label}</span>}
                      {n.badge && pending>0 && (
                        <span style={{
                          background:C.danger, color:'#fff', borderRadius:10, fontSize:10,
                          fontWeight:800, padding:'1px 6px', minWidth:18, textAlign:'center',
                          flexShrink:0, animation:'badgePulse 2s infinite',
                          position: (collapsed && !narrow) ? 'absolute' : 'relative',
                          top: (collapsed && !narrow) ? 4 : 'auto', right: (collapsed && !narrow) ? 4 : 'auto'
                        }}>{pending}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div style={{padding:'12px 8px',borderTop:'1px solid #1E1E1E'}}>
            {!narrow && (
              <button onClick={()=>setCollapsed(p=>!p)}
                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:collapsed?'center':'flex-start',gap:10,padding:'9px 12px',background:'transparent',border:'none',cursor:'pointer',color:C.dim,fontSize:13,fontFamily:"'Inter',sans-serif",borderRadius:10,marginBottom:4,transition:'all .15s'}}>
                <span style={{fontSize:16}}>{collapsed?'▶':'◀'}</span>
                {!collapsed && <span>Collapse</span>}
              </button>
            )}
            <button onClick={()=>sb.auth.signOut()}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:(collapsed && !narrow)?'center':'flex-start',gap:10,padding:'9px 12px',background:'transparent',border:'none',cursor:'pointer',color:C.danger,fontSize:13,fontFamily:"'Inter',sans-serif",borderRadius:10,transition:'all .15s'}}>
              <span style={{fontSize:16}}>⏻</span>
              {(!collapsed || narrow) && <span style={{fontWeight:600}}>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

          {/* Top bar */}
          <header style={{background:'#141414',borderBottom:'1px solid #1E1E1E',padding: narrow ? '0 14px' : '0 28px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
              {narrow && (
                <button onClick={()=>setDrawer(true)} aria-label="Open menu"
                  style={{background:'rgba(255,255,255,.06)',border:'1px solid #262626',borderRadius:10,color:C.text,fontSize:18,lineHeight:1,padding:'8px 11px',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>☰</button>
              )}
              <div style={{minWidth:0}}>
                <div style={{fontSize:narrow?14:16,fontWeight:800,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{currentNav.ico} {currentNav.label}</div>
                {!narrow && <div style={{fontSize:11,color:C.dim,marginTop:1}}>KaamReady Admin · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <AlertBell setPage={setPage} narrow={narrow} />
              {pending>0 && (
                <button onClick={()=>setPage('payments')}
                  style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700,cursor:'pointer',color:C.danger,fontFamily:"'Inter',sans-serif",display:'flex',alignItems:'center',gap:6}}>
                  <span style={{animation:'pulse 1.5s infinite'}}>●</span> {pending}{narrow ? '' : ` pending payment${pending!==1?'s':''}`}
                </button>
              )}
              <div style={{background:'linear-gradient(135deg,#FFD700,#FFC107)',color:'#000',width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,boxShadow:'0 4px 12px rgba(255,215,0,.25)',cursor:'pointer',title:user?.email}}>
                {(user?.email||'A')[0].toUpperCase()}
              </div>
            </div>
          </header>

          {/* Page */}
          <main style={{flex:1,overflowY:'auto',padding: narrow ? 14 : 24,background:'#F1F5F9',color:'#1E293B',
            '--primary':C.primary,'--primary-h':C.primaryH,'--success':C.success,'--danger':C.danger,
            '--warning':C.warning,'--border':C.border,'--card':C.card,'--muted':C.muted,'--bg':C.bg,'--dim':C.dim}}>
            <div className="page-content" key={page}>
              <Suspense fallback={<Spinner/>}>
                {pages[page]||<Dashboard {...ctx}/>}
              </Suspense>
            </div>
          </main>
        </div>

        {toast && <Toast toast={toast}/>}
      </div>
    </>
  )
}

function Toast({toast}) {
  const colors = {error:C.danger, success:C.success, warning:C.warning, info:C.primary}
  const bg = colors[toast.type]||C.primary
  const textColor = (toast.type==='info'||!toast.type) ? '#000' : '#fff'
  return (
    <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',
      background:bg,color:textColor,borderRadius:14,padding:'13px 22px',
      fontSize:14,fontWeight:700,zIndex:9999,
      boxShadow:`0 8px 32px rgba(0,0,0,.4)`,
      maxWidth:380,textAlign:'center',animation:'fadeIn .2s ease',
      fontFamily:"'Inter',sans-serif",letterSpacing:.2}}>
      {toast.msg}
    </div>
  )
}
