import { useState, useEffect } from 'react'
import { sb } from './lib/supabase'
import LoginPage    from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Users        from './pages/Users'
import Workers      from './pages/Workers'
import Bookings     from './pages/Bookings'
import Payments     from './pages/Payments'
import Payouts      from './pages/Payouts'
import Support      from './pages/Support'
import Reports      from './pages/Reports'
import Sidebar      from './components/Sidebar'
import TopBar       from './components/TopBar'

const PAGES = {
  dashboard: Dashboard,
  users:     Users,
  workers:   Workers,
  bookings:  Bookings,
  payments:  Payments,
  payouts:   Payouts,
  support:   Support,
  reports:   Reports,
}

export default function App() {
  const [session,  setSession]  = useState(null)
  const [checking, setChecking] = useState(true)
  const [page,     setPage]     = useState('dashboard')
  const [toast,    setToast]    = useState(null)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  if (checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0F172A' }}>
      <div style={{ color:'#F5C000', fontSize:32, fontWeight:800 }}>⚡ KaamReady Admin</div>
    </div>
  )

  if (!session) return <LoginPage onLogin={s => setSession(s)} showToast={showToast} />

  const PageComponent = PAGES[page] || Dashboard

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0F172A', overflow:'hidden' }}>
      <Sidebar page={page} setPage={setPage} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar page={page} session={session} showToast={showToast} />
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          <PageComponent showToast={showToast} />
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:28, right:28, zIndex:9999,
          background: toast.type === 'error' ? '#ef4444' : '#22c55e',
          color:'#fff', padding:'12px 20px', borderRadius:12, fontWeight:600,
          fontSize:14, boxShadow:'0 8px 32px rgba(0,0,0,.4)',
          animation:'slideUp .25s ease'
        }}>
          {toast.msg}
        </div>
      )}
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
