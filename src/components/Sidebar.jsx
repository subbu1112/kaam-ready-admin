const NAV = [
  { id:'dashboard', label:'Dashboard', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id:'users',     label:'Users',     icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id:'workers',   label:'Workers',   icon:'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id:'bookings',  label:'Bookings',  icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id:'payments',  label:'Payments',  icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id:'payouts',   label:'Payouts',   icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id:'support',   label:'Support',   icon:'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { id:'reports',   label:'Reports',   icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id:'logs',      label:'Audit Logs', icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]

export default function Sidebar({ page, setPage, onLogout }) {
  return (
    <div style={{ width:240, minWidth:240, height:'100vh', background:'#0f172a', display:'flex', flexDirection:'column', position:'sticky', top:0 }}>
      <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid #1e293b' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:'#6366f1', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontWeight:900, fontSize:16 }}>K</span>
          </div>
          <div>
            <div style={{ color:'#f8fafc', fontWeight:800, fontSize:15 }}>KaamReady</div>
            <div style={{ color:'#475569', fontSize:11 }}>Admin Control Center</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:'12px 12px', overflowY:'auto' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
            marginBottom:2, borderRadius:8, border:'none', cursor:'pointer',
            background: page===n.id ? '#6366f1' : 'transparent',
            color: page===n.id ? '#fff' : '#94a3b8',
            fontWeight: page===n.id ? 700 : 500, fontSize:14, textAlign:'left',
            transition:'all 0.15s',
          }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
            </svg>
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:'16px 12px', borderTop:'1px solid #1e293b' }}>
        <button onClick={onLogout} style={{
          width:'100%', padding:'10px 12px', borderRadius:8, border:'none',
          background:'transparent', color:'#ef4444', cursor:'pointer',
          display:'flex', alignItems:'center', gap:10, fontSize:14, fontWeight:600
        }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
