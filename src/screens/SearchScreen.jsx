import { useState } from 'react'
import { SERVICES } from '../constants'

const SVC_COLORS = {
  elec:{bg:'#FFF9E6',ico:'#D4A200'},plumb:{bg:'#EFF6FF',ico:'#2563EB'},clean:{bg:'#ECFDF5',ico:'#059669'},
  carpen:{bg:'#FFF7ED',ico:'#EA580C'},paint:{bg:'#F5F3FF',ico:'#7C3AED'},pest:{bg:'#FFF1F2',ico:'#E11D48'},
  mech:{bg:'#F1F5F9',ico:'#475569'},labor:{bg:'#EFF6FF',ico:'#1D4ED8'},emerg:{bg:'#FFF1F2',ico:'#DC2626'},
}
const MOCK_WORKERS = [
  { id:1, name:'Raju Kumar',  skill:'Electrician', skillId:'elec',  rating:4.8, dist:'0.8 km', eta:'6 min',  jobs:342, online:true  },
  { id:2, name:'Suresh M.',   skill:'Plumber',     skillId:'plumb', rating:4.9, dist:'0.5 km', eta:'4 min',  jobs:521, online:true  },
  { id:3, name:'Prakash B.',  skill:'Carpenter',   skillId:'carpen',rating:4.6, dist:'1.2 km', eta:'9 min',  jobs:198, online:false },
  { id:4, name:'Meena S.',    skill:'Cleaner',     skillId:'clean', rating:4.7, dist:'1.5 km', eta:'11 min', jobs:276, online:true  },
  { id:5, name:'Vinod K.',    skill:'Painter',     skillId:'paint', rating:4.5, dist:'2.1 km', eta:'14 min', jobs:87,  online:true  },
]

export default function SearchScreen({ city, setSelSvc, setTab, showToast }) {
  const [q,      setQ]      = useState('')
  const [filter, setFilter] = useState('all')

  const workers = MOCK_WORKERS.filter(w => {
    const mQ = !q || w.name.toLowerCase().includes(q.toLowerCase()) || w.skill.toLowerCase().includes(q.toLowerCase())
    const mF = filter==='all' || w.skill===filter
    return mQ && mF
  })

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#F5F5F8' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(145deg,#F5C000,#FFD740)', padding:'52px 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#1A1A1A', marginBottom:14 }}>Find Workers</h1>
        {/* Search bar */}
        <div style={{ background:'#fff', borderRadius:14, padding:'12px 14px',
          display:'flex', alignItems:'center', gap:10,
          boxShadow:'0 2px 12px rgba(0,0,0,.08)' }}>
          <span style={{ fontSize:17 }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={`Search workers or services in ${city}...`}
            style={{ flex:1, border:'none', background:'transparent', fontSize:14,
              outline:'none', fontFamily:'inherit' }} />
          {q && (
            <button type="button" onClick={() => setQ('')}
              style={{ background:'#F5F5F8', border:'none', borderRadius:8, width:26, height:26,
                cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {/* Filter chips */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, marginBottom:16 }}>
          {['all',...SERVICES.map(s=>s.lbl).slice(0,5)].map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              style={{ padding:'7px 15px', borderRadius:20, flexShrink:0,
                border:'none', fontFamily:'inherit',
                background: filter===f ? '#F5C000' : '#fff',
                fontSize:12, fontWeight:700, cursor:'pointer',
                color: filter===f ? '#1A1A1A' : '#6B7280',
                boxShadow: filter===f ? '0 2px 8px rgba(245,192,0,.3)' : '0 1px 3px rgba(0,0,0,.06)',
                transition:'.15s' }}>
              {f==='all' ? 'All services' : f}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#6B7280' }}>
            {workers.length} worker{workers.length!==1?'s':''} nearby
          </p>
          <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700,
            padding:'4px 10px', borderRadius:20 }}>
            ● {workers.filter(w=>w.online).length} online
          </span>
        </div>
      </div>

      {/* Worker cards */}
      <div style={{ padding:'0 16px 32px', display:'flex', flexDirection:'column', gap:10 }}>
        {workers.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🔍</div>
            <p style={{ fontWeight:700, fontSize:16, color:'#1A1A1A' }}>No workers found</p>
            <p style={{ fontSize:13, color:'#9CA3AF', marginTop:6 }}>Try a different search term</p>
          </div>
        ) : workers.map(w => {
          const c = SVC_COLORS[w.skillId] || { bg:'#f5f5f5', ico:'#555' }
          const svc = SERVICES.find(s=>s.lbl===w.skill)
          return (
            <div key={w.id}
              style={{ background:'#fff', borderRadius:18, padding:'14px 16px',
                boxShadow:'0 1px 3px rgba(0,0,0,.05), 0 4px 14px rgba(0,0,0,.04)',
                display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:54, height:54, borderRadius:16, background:c.bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:26, flexShrink:0, position:'relative' }}>
                {svc?.ico||'🔧'}
                {w.online && (
                  <div style={{ position:'absolute', bottom:2, right:2, width:11, height:11,
                    borderRadius:'50%', background:'#10B981', border:'2px solid #fff' }} />
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#1A1A1A' }}>{w.name}</p>
                <p style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
                  {w.skill} · {w.dist} away · ETA {w.eta}
                </p>
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  <span style={{ background:'#FFF8D6', color:'#B8900A', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                    ★ {w.rating}
                  </span>
                  <span style={{ background:'#F5F5F8', color:'#6B7280', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>
                    {w.jobs} jobs
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => {
                setSelSvc(SERVICES.find(s=>s.lbl===w.skill)||SERVICES[0])
                setTab('book')
                showToast('Finding '+w.name+'...')
              }} style={{ background:'#F5C000', border:'none', borderRadius:12, padding:'10px 14px',
                fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit',
                boxShadow:'0 2px 8px rgba(245,192,0,.35)', flexShrink:0 }}>
                Book
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
