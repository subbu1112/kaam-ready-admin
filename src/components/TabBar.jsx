const TABS = [
  { id: 'home',     ico: '🏠', lbl: 'Home'     },
  { id: 'search',   ico: '🔍', lbl: 'Find'     },
  { id: 'bookings', ico: '📋', lbl: 'Bookings' },
  { id: 'profile',  ico: '👤', lbl: 'Me'       },
]
export default function TabBar({ tab, setTab }) {
  return (
    <div style={{
      background: '#fff',
      borderTop: '1px solid #F0F0F2',
      display: 'flex',
      padding: '10px 6px 18px',
      flexShrink: 0,
      boxShadow: '0 -4px 24px rgba(0,0,0,.06)',
    }}>
      {TABS.map(t => {
        const active = tab === t.id
        return (
          <button key={t.id} type="button" aria-label={t.lbl} aria-current={tab===t.id?"page":undefined} onClick={() => setTab(t.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
            }}>
            <div style={{
              width: active ? 48 : 34, height: 34, borderRadius: 12,
              background: active ? '#FFF8D6' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: active ? 21 : 19, transition: 'all .2s ease',
            }}>{t.ico}</div>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: active ? '#B8900A' : '#AEAEB2',
              transition: 'color .15s',
            }}>{t.lbl}</span>
          </button>
        )
      })}
    </div>
  )
}
