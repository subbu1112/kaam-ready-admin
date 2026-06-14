import { useState, useEffect } from 'react'
import OneSignal from 'react-onesignal'
import { sb } from './lib/supabase'
import LoginScreen    from './screens/LoginScreen'
import OTPScreen      from './screens/OTPScreen'
import CityScreen     from './screens/CityScreen'
import HomeScreen     from './screens/HomeScreen'
import BookScreen     from './screens/BookScreen'
import SearchScreen   from './screens/SearchScreen'
import BookingsScreen from './screens/BookingsScreen'
import ProfileScreen  from './screens/ProfileScreen'
import TabBar         from './components/TabBar'
import Toast          from './components/Toast'
import TermsModal, { termsAccepted, acceptTerms } from './components/TermsModal'
import { SERVICES } from './constants'

export default function App() {
  const [screen,   setScreen]   = useState('login')
  const [tab,      setTab]      = useState('home')
  const [user,     setUser]     = useState(null)
  const [city,     setCity]     = useState(null)
  const [selSvc,   setSelSvc]   = useState(null)
  const [toast,    setToast]    = useState(null)
  const [bookings, setBookings] = useState([])
  const [showTerms, setShowTerms] = useState(false)
  const [resume,   setResume]   = useState(null)
  const [rebookWorker, setRebookWorker] = useState(null)

  // Restore an in-progress booking after refresh / returning from a UPI app
  useEffect(() => {
    if (!user?.id) return
    sb.from('bookings').select('*').eq('user_id', user.id)
      .in('status', ['assigned','priced']).order('created_at', { ascending:false }).limit(1)
      .then(({ data }) => {
        const b = data?.[0]
        if (!b) return
        setResume(b)
        setSelSvc(SERVICES.find(x => x.id === b.service_id) || { id:b.service_id, lbl:b.service, ico:'🔧', range:'' })
        setTab('book')
      })
  }, [user?.id])

  useEffect(() => {
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
      else { setUser(null); setScreen('login') }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data } = await sb.from('profiles').select('city').eq('id', uid).single()
    if (data?.city) { setCity(data.city); setScreen('main') }
    else setScreen('city')
    if (!termsAccepted()) setShowTerms(true)
    // Tag this user in OneSignal for targeted notifications
    try {
      await OneSignal.sendTags({ user_id: uid })
      await OneSignal.setExternalUserId(uid)
    } catch(e) { console.warn('OneSignal tag error:', e) }
  }

  async function loadBookings() {
    if (!user) return
    const { data } = await sb.from('bookings').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setBookings(data)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const ctx = { user, city, setCity, selSvc, setSelSvc, bookings, loadBookings, showToast, setScreen, setTab, resume, clearResume: () => setResume(null), rebookWorker, setRebookWorker, clearRebook: () => setRebookWorker(null) }

  if (screen === 'login') return <><LoginScreen {...ctx} setScreen={setScreen} />{toast && <Toast msg={toast} />}</>
  if (screen === 'otp')   return <><OTPScreen   {...ctx} setScreen={setScreen} />{toast && <Toast msg={toast} />}</>
  if (screen === 'city')  return <><CityScreen  {...ctx} setScreen={setScreen} />{toast && <Toast msg={toast} />}</>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column',
      background:'#F2F2F7', maxWidth:430, margin:'0 auto', overflow:'hidden', position:'relative' }}>
      {tab === 'home'     && <HomeScreen     {...ctx} setTab={setTab} />}
      {tab === 'search'   && <SearchScreen   {...ctx} setTab={setTab} />}
      {tab === 'book'     && <BookScreen     {...ctx} setTab={setTab} />}
      {tab === 'bookings' && <BookingsScreen {...ctx} setTab={setTab} />}
      {tab === 'profile'  && <ProfileScreen  {...ctx} setTab={setTab} />}
      <TabBar tab={tab} setTab={setTab} />
      {showTerms && <TermsModal onAccept={() => { acceptTerms(); setShowTerms(false) }} />}
      {toast && <Toast msg={toast} />}
    </div>
  )
}
