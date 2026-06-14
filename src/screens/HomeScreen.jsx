import { useEffect, useState } from 'react'
import { SERVICES } from '../constants'

const SVC_COLORS = {
  elec:   { bg:'#FFF9E6', border:'#FFE066', ico:'#D4A200' },
  plumb:  { bg:'#EFF6FF', border:'#BFDBFE', ico:'#2563EB' },
  clean:  { bg:'#ECFDF5', border:'#A7F3D0', ico:'#059669' },
  carpen: { bg:'#FFF7ED', border:'#FED7AA', ico:'#EA580C' },
  paint:  { bg:'#F5F3FF', border:'#DDD6FE', ico:'#7C3AED' },
  pest:   { bg:'#FFF1F2', border:'#FECDD3', ico:'#E11D48' },
  mech:   { bg:'#F1F5F9', border:'#CBD5E1', ico:'#475569' },
  labor:  { bg:'#EFF6FF', border:'#BFDBFE', ico:'#1D4ED8' },
  emerg:  { bg:'#FFF1F2', border:'#FECDD3', ico:'#DC2626' },
}

export default function HomeScreen({ city, selSvc, setSelSvc, setTab, bookings, loadBookings, showToast, user }) {
  const [greeting, setGreeting] = useState('Good day')

  useEffect(() => {
    loadBookings()
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const activeBookings = bookings.filter(b => ['searching','assigned','priced'].includes(b.status))

  function getSvcIcon(service) {
    const s = SERVICES.find(x => x.lbl === service)
    return s?.ico || '🔧'
  }
  function getSvcId(service) {
    return SERVICES.find(x => x.lbl === service)?.id || 'elec'
  }

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#F5F5F8' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(145deg, #F5C000 0%, #FFD740 60%, #FFE780 100%)',
        padding: '52px 20px 36px',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.55)', marginBottom:4 }}>
              {greeting} 👋
            </p>
            <h1 style={{ fontSize:24, fontWeight:800, color:'#1A1A1A', lineHeight:1.2 }}>
              What needs<br/>fixing today?
            </h1>
          </div>
          <button type="button" aria-label="Profile" onClick={() => setTab('profile')}
            style={{ width:44, height:44, borderRadius:14, background:'rgba(0,0,0,.12)',
              border:'none', cursor:'pointer', fontSize:20,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            👤
          </button>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:6, marginTop:14,
          background:'rgba(0,0,0,.1)', borderRadius:20, padding:'7px 13px', width:'fit-content',
        }}>
          <span style={{ fontSize:12 }}>📍</span>
          <span style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.7)' }}>{city || 'Karnataka'}</span>
        </div>
      </div>

      {/* Stats card — overlaps header */}
      <div style={{ margin:'0 16px', transform:'translateY(-20px)' }}>
        <div style={{
          background:'#fff', borderRadius:18, padding:'14px 8px',
          display:'grid', gridTemplateColumns:'repeat(3,1fr)',
          boxShadow:'0 4px 24px rgba(0,0,0,.10)',
        }}>
          {[['12+','Workers online'],['~8 min','Avg arrival'],['4.8 ★','Avg rating']].map(([v,l]) => (
            <div key={l} style={{ textAlign:'center', padding:'0 4px' }}>
              <div style={{ fontSize:17, fontWeight:800, color:'#1A1A1A' }}>{v}</div>
              <div style={{ fontSize:10, color:'#9CA3AF', marginTop:2, fontWeight:500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active booking banner */}
      {activeBookings.length > 0 && (
        <div onClick={() => setTab('bookings')} style={{ margin:'-4px 16px 16px', cursor:'pointer' }}>
          <div style={{
            background:'#1A1A1A', borderRadius:16, padding:'14px 18px',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontSize:14 }}>
                🔄 Active booking
              </p>
              <p style={{ color:'#888', fontSize:12, marginTop:2 }}>
                {activeBookings[0].service} · {activeBookings[0].status.replace('searching','Searching...')}
              </p>
            </div>
            <span style={{ color:'#F5C000', fontSize:22, fontWeight:300 }}>›</span>
          </div>
        </div>
      )}

      {/* Services grid */}
      <div style={{ padding:'0 16px 8px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', letterSpacing:.7,
          textTransform:'uppercase', marginBottom:14 }}>
          Choose a service
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {SERVICES.map(s => {
            const c = SVC_COLORS[s.id] || { bg:'#f5f5f5', border:'#e0e0e0', ico:'#555' }
            const sel = selSvc?.id === s.id
            return (
              <div key={s.id} onClick={() => setSelSvc(s)}
                style={{
                  background: sel ? '#F5C000' : c.bg,
                  borderRadius: 16,
                  padding: '16px 8px 13px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: `2px solid ${sel ? '#D4A200' : c.border}`,
                  transform: sel ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all .16s ease',
                  boxShadow: sel ? '0 4px 16px rgba(245,192,0,.3)' : 'none',
                }}>
                <div style={{ fontSize:28, marginBottom:7 }}>{s.ico}</div>
                <div style={{ fontSize:11, fontWeight:700, color: sel ? '#1A1A1A' : '#374151', lineHeight:1.3 }}>
                  {s.lbl}
                </div>
                <div style={{ fontSize:10, color: sel ? '#78580A' : '#9CA3AF', marginTop:3, fontWeight:500 }}>
                  from {s.range.split('–')[0]}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => { if (!selSvc) { showToast('Select a service first'); return } setTab('book') }}
          style={{
            width:'100%', marginTop:16,
            background: selSvc ? '#F5C000' : '#E8E8EE',
            border:'none', borderRadius:16, padding:'17px 20px',
            fontWeight:800, fontSize:16, cursor: selSvc ? 'pointer' : 'default', fontFamily:'inherit',
            color: selSvc ? '#1A1A1A' : '#AEAEB2',
            transition: 'all .2s ease',
            boxShadow: selSvc ? '0 4px 18px rgba(245,192,0,.4)' : 'none',
          }}>
          {selSvc ? `Book ${selSvc.lbl} →` : 'Select a service above'}
        </button>
      </div>

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <div style={{ padding:'16px 16px 32px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', letterSpacing:.7, textTransform:'uppercase' }}>
              Recent bookings
            </p>
            <button type="button" onClick={() => setTab('bookings')}
              style={{ fontSize:13, fontWeight:700, color:'#D4A200', background:'none', border:'none',
                cursor:'pointer', fontFamily:'inherit' }}>
              See all ›
            </button>
          </div>
          <div style={{ background:'#fff', borderRadius:18, overflow:'hidden',
            boxShadow:'0 1px 4px rgba(0,0,0,.05), 0 4px 14px rgba(0,0,0,.04)' }}>
            {bookings.slice(0,3).map((b, i) => {
              const sid = getSvcId(b.service)
              const c = SVC_COLORS[sid] || { bg:'#f5f5f5' }
              const statusColor = b.status==='completed'
                ? { bg:'#D1FAE5', c:'#065F46' }
                : b.status==='cancelled'
                ? { bg:'#FEE2E2', c:'#991B1B' }
                : { bg:'#FFF8D6', c:'#B8900A' }
              return (
                <div key={b.id} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'13px 16px',
                  borderBottom: i < Math.min(bookings.length,3)-1 ? '1px solid #F5F5F8' : 'none',
                }}>
                  <div style={{ display:'flex', gap:11, alignItems:'center' }}>
                    <div style={{ width:38, height:38, borderRadius:11, background:c.bg,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
                      {getSvcIcon(b.service)}
                    </div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:'#1A1A1A' }}>{b.service}</p>
                      <p style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>
                        {new Date(b.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {b.amount ? <p style={{ fontSize:13, fontWeight:700, color:'#B8900A' }}>₹{b.amount}</p> : null}
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6,
                      background:statusColor.bg, color:statusColor.c }}>
                      {b.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
