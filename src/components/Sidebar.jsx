import { useState } from 'react'

const NAV = [
  { id:'dashboard',    label:'Dashboard',     ico:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id:'users',        label:'Users',         ico:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id:'workers',      label:'Workers',       ico:'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id:'bookings',     label:'Bookings',      ico:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id:'payments',     label:'Payments',      ico:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id:'payouts',      label:'Payouts',       ico:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z' },
  { id:'support',      label:'Support',       ico:'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { id:'reportsinbox', label:'Reports',       ico:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { id:'referrals',    label:'Refer & Earn',  ico:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id:'cms',          label:'CMS',           ico:'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { id:'analytics',    label:'Analytics',     ico:'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id:'logs',         label:'Audit Logs',    ico:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]

export default function Sidebar({ page, setPage, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{ width: collapsed ? 64 : 220, background:'#0f172a', display:'flex', flexDirection:'column', flexShrink:0, transition:'width .2s', overflow:'hidden' }}>
      <div style={{ padding: collapsed ? '20px 14px' : '20px 16px', borderBottom:'1px solid #1e293b', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && <div><p style={{ color:'#f5c000', fontWeight:800, fontSize:16 }}>Kaam Ready</p><p style={{ color:'#475569', fontSize:11, marginTop:2 }}>Admin Panel</p></div>}
        <button onClick={() => setCollapsed(c => !c)} style={{ background:'#1e293b', border:'none', borderRadius:8, padding:8, cursor:'pointer', color:'#94a3b8', display:'flex' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
          </svg>
        </button>
      </div>
      <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
        {NAV.map(({ id, label, ico }) => {
          const active = page === id
          return (
            <button key={id} onClick={() => setPage(id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', marginBottom:2,
                background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#94a3b8', fontWeight: active ? 700 : 500, fontSize:13,
                transition:'all .15s' }}
              title={collapsed ? label : ''}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ico} />
              </svg>
              {!collapsed && label}
            </button>
          )
        })}
      </nav>
      {!collapsed && (
        <div style={{ padding:'12px 16px', borderTop:'1px solid #1e293b' }}>
          <p style={{ color:'#64748b', fontSize:11, marginBottom:4 }}>{user?.email || 'Admin'}</p>
        </div>
      )}
      <button onClick={onLogout} style={{ margin:'0 8px 12px', padding: collapsed ? '10px 0' : '10px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', background:'transparent', color:'#ef4444', display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:600, justifyContent: collapsed ? 'center' : 'flex-start' }} title="Logout">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {!collapsed && 'Logout'}
      </button>
    </aside>
  )
}
