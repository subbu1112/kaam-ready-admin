import { sb } from '../lib/supabase'

const Y = '#F5C000'

const NAV = [
  { id:'dashboard', ico:'📊', label:'Dashboard'  },
  { id:'users',     ico:'👥', label:'Users'       },
  { id:'workers',   ico:'🔧', label:'Workers'     },
  { id:'bookings',  ico:'📋', label:'Bookings'    },
  { id:'payments',  ico:'💳', label:'Payments'    },
  { id:'payouts',   ico:'💸', label:'Payouts'     },
  { id:'support',   ico:'🎫', label:'Support'     },
  { id:'reports',   ico:'📈', label:'Reports'     },
]

export default function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      width:220, background:'#0B1120', display:'flex',
      flexDirection:'column', borderRight:'1px solid #1E293B',
      flexShrink:0
    }}>
      {/* Logo */}
      <div style={{
        padding:'24px 20px 20px', borderBottom:'1px solid #1E293B',
        display:'flex', alignItems:'center', gap:10
      }}>
        <div style={{ fontSize:24 }}>⚡</div>
        <div>
          <div style={{ color:Y, fontWeight:800, fontSize:15, lineHeight:1 }}>KaamReady</div>
          <div style={{ color:'#475569', fontSize:11, marginTop:3 }}>Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'12px 10px', overflowY:'auto' }}>
        {NAV.map(n => {
          const active = page === n.id
          return (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:10, border:'none',
                background: active ? 'rgba(245,192,0,.12)' : 'transparent',
                color: active ? Y : '#64748B',
                fontWeight: active ? 700 : 500, fontSize:14,
                cursor:'pointer', fontFamily:'inherit',
                marginBottom:2, textAlign:'left',
                transition:'all .15s',
                borderLeft: active ? `3px solid ${Y}` : '3px solid transparent'
              }}
            >
              <span style={{ fontSize:16, lineHeight:1 }}>{n.ico}</span>
              {n.label}
            </button>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid #1E293B' }}>
        <button
          onClick={() => sb.auth.signOut()}
          style={{
            width:'100%', padding:'10px 12px', borderRadius:10,
            border:'none', background:'transparent', color:'#475569',
            cursor:'pointer', fontFamily:'inherit', fontSize:14,
            display:'flex', alignItems:'center', gap:10,
            transition:'color .15s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
