import { useState, useEffect } from 'react'
import { sb } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Workers from './pages/Workers'
import Bookings from './pages/Bookings'
import Payments from './pages/Payments'
import Payouts from './pages/Payouts'
import Support from './pages/Support'
import Reports from './pages/Reports'
import Sidebar from './components/Sidebar'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
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

  if (!user) return <Login onLogin={() => sb.auth.getSession().then(({data})=>setUser(data.session?.user))} />

  const PAGES = { dashboard:<Dashboard />, users:<Users />, workers:<Workers />, bookings:<Bookings />, payments:<Payments />, payouts:<Payouts />, support:<Support />, reports:<Reports /> }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar page={page} setPage={setPage} onLogout={() => sb.auth.signOut()} />
      <main style={{ flex:1, overflowY:'auto', background:'#f1f5f9' }}>
        {PAGES[page] || <Dashboard />}
      </main>
    </div>
  )
}
