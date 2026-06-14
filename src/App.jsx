import { useState, useEffect, Component } from 'react'
import { sb } from './lib/supabase'
import LoginScreen    from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import BookingsScreen  from './screens/BookingsScreen'
import WorkersScreen   from './screens/WorkersScreen'

class TabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Admin tab crash:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, background:'#0A0A0A' }}>
          <p style={{ fontSize:36, marginBottom:12 }}>⚠️</p>
          <p style={{ color:'#fff', fontWeight:800, fontSize:16, marginBottom:8 }}>Something went wrong</p>
          <p style={{ color:'#555', fontSize:13, marginBottom:20 }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => this.setState({ error: null })}
            style={{ background:'#F5C000', border:'none', borderRadius:12, padding:'12px 28px', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const TABS = [
  { id:'dashboard', label:'Dashboard', icon:'📊' },
  { id:'bookings',  label:'Bookings',  icon:'📋' },
  { id:'workers',   label:'Workers',   icon:'👷' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [tab,     setTab]     = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0A0A0A' }}>
        <p style={{ color:'#555', fontSize:14 }}>Loading…</p>
      </div>
    )
  }

  if (!session) return <LoginScreen onLogin={setSession} />

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0A0A0A', maxWidth:480, margin:'0 auto', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ background:'#111', padding:'14px 16px', borderBottom:'1px solid #1a1a1a', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <p style={{ color:'#F5C000', fontWeight:900, fontSize:18, letterSpacing:'-0.5px' }}>⚡ KaamReady Admin</p>
        <button onClick={() => sb.auth.signOut()}
          style={{ background:'transparent', border:'1px solid #333', borderRadius:8, padding:'5px 12px', color:'#888', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TabErrorBoundary key={tab}>
          {tab==='dashboard' && <DashboardScreen />}
          {tab==='bookings'  && <BookingsScreen  />}
          {tab==='workers'   && <WorkersScreen   />}
        </TabErrorBoundary>
      </div>

      {/* Tab Bar */}
      <div style={{ background:'#111', borderTop:'1px solid #1a1a1a', display:'flex', flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, background:'transparent', border:'none', padding:'12px 0 10px', cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color: tab===t.id ? '#F5C000' : '#555', letterSpacing:'0.3px' }}>{t.label.toUpperCase()}</span>
            {tab===t.id && <div style={{ width:20, height:2, background:'#F5C000', borderRadius:2 }} />}
          </button>
        ))}
      </div>
    </div>
  )
}
