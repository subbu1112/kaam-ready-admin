import { useState, useEffect, lazy, Suspense } from 'react'
import { sb } from './lib/supabase'
import Login   from './pages/Login'
import Sidebar from './components/Sidebar'

const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Users        = lazy(() => import('./pages/Users'))
const Workers      = lazy(() => import('./pages/Workers'))
const Bookings     = lazy(() => import('./pages/Bookings'))
const Payments     = lazy(() => import('./pages/Payments'))
const Payouts      = lazy(() => import('./pages/Payouts'))
const Support      = lazy(() => import('./pages/Support'))
const ReportsInbox = lazy(() => import('./pages/ReportsInbox'))
const Analytics    = lazy(() => import('./pages/Reports'))
const Referrals    = lazy(() => import('./pages/Referrals'))
const CMS          = lazy(() => import('./pages/CMS'))
const Logs         = lazy(() => import('./pages/Logs'))

function PageLoader() {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9' }}>
      <div style={{ width:36, height:36, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function App() {
  const [user,    setUser]    = useState(null)
  const [page,    setPage]    = useState('dashboard')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user)
      setChecked(true)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!checked) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a' }}>
      <div style={{ width:40, height:40, border:'3px solid #334155', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!user) return <Login onLogin={setUser} />

  const pages = {
    dashboard:    <Dashboard />,
    users:        <Users />,
    workers:      <Workers />,
    bookings:     <Bookings />,
    payments:     <Payments />,
    payouts:      <Payouts />,
    support:      <Support />,
    reportsinbox: <ReportsInbox />,
    referrals:    <Referrals />,
    cms:          <CMS />,
    analytics:    <Analytics />,
    logs:         <Logs />,
  }

  return (
    <div style={{ display:'flex', height:'100vh', background:'#f1f5f9', overflow:'hidden' }}>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={() => sb.auth.signOut()} />
      <main style={{ flex:1, overflowY:'auto' }}>
        <Suspense fallback={<PageLoader />}>
          {pages[page] || <Dashboard />}
        </Suspense>
      </main>
    </div>
  )
}
