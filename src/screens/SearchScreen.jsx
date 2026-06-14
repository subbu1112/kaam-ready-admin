import { useState, useEffect, useCallback } from 'react'
import { sb } from '../lib/supabase'
import { SERVICES } from '../constants'
import { Y } from '../theme'

// ── Design tokens (Stitch: Neo-brutalism) ──────────────────
const BK    = '#000000'
const YEL   = Y
const WHITE = '#ffffff'
const BG    = '#f9f9f9'
const SHADOW    = '4px 4px 0px 0px rgba(0,0,0,1)'
const SHADOW_SM = '2px 2px 0px 0px rgba(0,0,0,1)'

const CATS = [
  { id:'all',    lbl:'All'          },
  { id:'elec',   lbl:'Electrician'  },
  { id:'plumb',  lbl:'Plumber'      },
  { id:'clean',  lbl:'Cleaner'      },
  { id:'carpen', lbl:'Carpenter'    },
  { id:'paint',  lbl:'Painter'      },
  { id:'pest',   lbl:'Pest Control' },
  { id:'mech',   lbl:'Mechanic'     },
  { id:'labor',  lbl:'Labourer'     },
  { id:'emerg',  lbl:'Emergency'    },
]

function kmBetween(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function Avatar({ url, name, size=64 }) {
  const [err, setErr] = useState(false)
  const initials = name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?'
  if (url && !err) return (
    <img src={url} alt={name} onError={() => setErr(true)}
      style={{ width:size, height:size, borderRadius:14, objectFit:'cover', border:`2px solid ${BK}`, flexShrink:0 }} />
  )
  return (
    <div style={{ width:size, height:size, borderRadius:14, background:YEL, border:`2px solid ${BK}`,
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:800, flexShrink:0 }}>
      {initials}
    </div>
  )
}

function WorkerCard({ worker, userLat, userLng, onBook }) {
  const dist = kmBetween(userLat, userLng, worker.lat, worker.lng)
  const svc  = SERVICES.find(s => s.id === worker.skill)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background:WHITE, borderRadius:24, border:`2px solid ${BK}`, overflow:'hidden',
        boxShadow: pressed ? 'none' : SHADOW,
        transform: pressed ? 'translate(4px,4px)' : 'translate(0,0)',
        transition:'box-shadow .12s, transform .12s', cursor:'pointer',
      }}
    >
      {/* Header strip */}
      <div style={{ height:90, background:`linear-gradient(135deg, ${YEL}33, ${YEL}66)`,
        display:'flex', alignItems:'center', padding:'12px 16px', gap:14, position:'relative' }}>
        <Avatar url={worker.avatar_url} name={worker.name} size={60} />
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:15, fontWeight:800, color:BK, letterSpacing:'-0.02em', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {worker.name}
          </p>
          <p style={{ fontSize:11, color:'#555', marginTop:2, fontWeight:600 }}>
            {svc?.lbl ?? worker.skill} &middot; {worker.total_jobs ?? 0} jobs done
          </p>
        </div>
        {/* Rating badge */}
        <div style={{ position:'absolute', top:10, right:12, background:WHITE, border:`2px solid ${BK}`,
          borderRadius:12, padding:'3px 8px', boxShadow:SHADOW_SM, display:'flex', alignItems:'center', gap:3 }}>
          <span style={{ color:'#f59e0b', fontSize:13 }}>★</span>
          <span style={{ fontSize:12, fontWeight:800, color:BK }}>{worker.rating?.toFixed(1) ?? '5.0'}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {/* Tags */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {svc && (
            <span style={{ padding:'3px 10px', border:`1.5px solid ${BK}`, borderRadius:9999,
              fontSize:10, fontWeight:800, color:BK, textTransform:'uppercase', letterSpacing:'0.04em' }}>
              {svc.lbl}
            </span>
          )}
          {worker.kyc_verified && (
            <span style={{ padding:'3px 10px', border:`1.5px solid ${BK}`, borderRadius:9999,
              fontSize:10, fontWeight:800, color:BK, textTransform:'uppercase', letterSpacing:'0.04em' }}>
              Verified ✓
            </span>
          )}
          {worker.price_min && (
            <span style={{ padding:'3px 10px', border:`1.5px solid ${BK}`, borderRadius:9999,
              fontSize:10, fontWeight:800, color:BK, textTransform:'uppercase', letterSpacing:'0.04em' }}>
              ₹{worker.price_min}+
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop:`2px solid rgba(0,0,0,.06)`, paddingTop:10,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            {worker.is_online ? (
              <>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', flexShrink:0 }} />
                <span style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>Available Now</span>
              </>
            ) : (
              <span style={{ fontSize:12, fontWeight:700, color:'#888' }}>⏰ Offline</span>
            )}
            {dist != null && (
              <span style={{ fontSize:11, color:'#888', fontWeight:600 }}>
                &nbsp;&middot;&nbsp;{dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={`Book ${worker.name}`}
            onClick={() => onBook(worker)}
            disabled={!worker.is_online}
            style={{
              background: worker.is_online ? YEL : '#f3f3f3',
              color: BK, border:`2px solid ${BK}`, borderRadius:9999,
              padding:'7px 18px', fontSize:12, fontWeight:800,
              cursor: worker.is_online ? 'pointer' : 'not-allowed',
              textTransform:'uppercase', letterSpacing:'0.04em',
              boxShadow: worker.is_online ? SHADOW_SM : 'none',
              opacity: worker.is_online ? 1 : 0.55,
            }}>
            {worker.is_online ? 'Book Now' : 'Offline'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SearchScreen({ city, setSelSvc, setTab, showToast }) {
  const [q,       setQ]       = useState('')
  const [cat,     setCat]     = useState('all')
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {}
    )
  }, [])

  const loadWorkers = useCallback(async () => {
    setLoading(true)
    let req = sb.from('workers')
      .select('id,name,skill,city,is_online,kyc_verified,avatar_url,rating,total_jobs,lat,lng,price_min')
      .eq('onboarding_done', true)
    if (city) req = req.ilike('city', city)
    const { data } = await req.order('is_online', { ascending:false }).order('rating', { ascending:false }).limit(40)
    setWorkers(data || [])
    setLoading(false)
  }, [city])

  useEffect(() => { loadWorkers() }, [loadWorkers])

  const filtered = workers.filter(w => {
    const mQ = !q || w.name?.toLowerCase().includes(q.toLowerCase()) ||
      SERVICES.find(s => s.id === w.skill)?.lbl?.toLowerCase().includes(q.toLowerCase())
    const mC = cat === 'all' || w.skill === cat
    return mQ && mC
  })

  function handleBook(worker) {
    if (!worker.is_online) return
    const svc = SERVICES.find(s => s.id === worker.skill) || SERVICES[0]
    setSelSvc(svc)
    setTab('book')
    showToast(`Booking ${worker.name}…`)
  }

  return (
    <div style={{ flex:1, overflowY:'auto', background:BG, display:'flex', flexDirection:'column' }}>

      {/* ── Sticky header ── */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:`${BG}f0`,
        backdropFilter:'blur(12px)', borderBottom:'2px solid rgba(0,0,0,.06)', padding:'12px 16px 10px' }}>

        {/* Search bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, background:WHITE,
          border:`2px solid ${BK}`, borderRadius:9999, padding:'10px 14px',
          boxShadow:SHADOW, marginBottom:10 }}>
          <span style={{ fontSize:17, lineHeight:1 }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search workers or services…"
            style={{ flex:1, border:'none', background:'transparent', fontSize:14, fontWeight:600,
              outline:'none', fontFamily:'inherit', color:BK }} />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ('')}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#aaa', lineHeight:1, padding:0 }}>
              ✕
            </button>
          )}
        </div>

        {/* Category chips */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2 }}>
          {CATS.map(c => (
            <button key={c.id} type="button" aria-pressed={cat===c.id} onClick={() => setCat(c.id)}
              style={{
                padding:'7px 14px', borderRadius:9999, flexShrink:0,
                border:`2px solid ${BK}`,
                background: cat===c.id ? YEL : WHITE,
                color:BK, fontSize:11, fontWeight:800, cursor:'pointer',
                textTransform:'uppercase', letterSpacing:'0.04em',
                boxShadow: cat===c.id ? SHADOW_SM : 'none',
                transition:'box-shadow .12s',
              }}>
              {c.lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Count + refresh */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#555' }}>
            {loading ? 'Finding workers…' : `${filtered.length} worker${filtered.length!==1?'s':''} near ${city||'you'}`}
          </p>
          <button type="button" onClick={loadWorkers} aria-label="Refresh"
            style={{ background:WHITE, border:`2px solid ${BK}`, borderRadius:9999,
              padding:'4px 12px', fontSize:11, fontWeight:800, cursor:'pointer',
              textTransform:'uppercase', letterSpacing:'0.04em', boxShadow:SHADOW_SM }}>
            ↻ Refresh
          </button>
        </div>

        {/* Skeleton loaders */}
        {loading && [1,2,3].map(i => (
          <div key={i} style={{ background:WHITE, borderRadius:24, border:`2px solid ${BK}`,
            overflow:'hidden', boxShadow:SHADOW, opacity:0.5 }}>
            <div style={{ height:90, background:`${YEL}33` }} />
            <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ height:12, background:'#e5e5e5', borderRadius:6, width:'60%' }} />
              <div style={{ height:10, background:'#e5e5e5', borderRadius:6, width:'35%' }} />
            </div>
          </div>
        ))}

        {/* Cards */}
        {!loading && filtered.map(w => (
          <WorkerCard key={w.id} worker={w} userLat={userLat} userLng={userLng} onBook={handleBook} />
        ))}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <p style={{ fontSize:40 }}>🔍</p>
            <p style={{ fontSize:16, fontWeight:800, color:BK, marginTop:12,
              textTransform:'uppercase', letterSpacing:'-0.02em' }}>
              No workers found
            </p>
            <p style={{ fontSize:13, color:'#888', marginTop:6 }}>
              {q ? `No results for "${q}"` : `No workers available in ${city||'your area'} right now`}
            </p>
            <button type="button" onClick={() => { setQ(''); setCat('all'); loadWorkers() }}
              style={{ marginTop:20, background:YEL, border:`2px solid ${BK}`, borderRadius:9999,
                padding:'10px 24px', fontSize:13, fontWeight:800, cursor:'pointer',
                textTransform:'uppercase', letterSpacing:'0.04em', boxShadow:SHADOW }}>
              Clear Filters
            </button>
          </div>
        )}
        <div style={{ height:24 }} />
      </div>
    </div>
  )
}
