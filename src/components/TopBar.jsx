const Y = '#F5C000'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  users:     'User Management',
  workers:   'Worker Management',
  bookings:  'Booking Management',
  payments:  'Payment Operations',
  payouts:   'Worker Payouts',
  support:   'Support Tickets',
  reports:   'Reports & Analytics',
}

export default function TopBar({ page, session }) {
  const email = session?.user?.email || ''

  return (
    <header style={{
      height:60, background:'#0B1120', borderBottom:'1px solid #1E293B',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 28px', flexShrink:0
    }}>
      <h1 style={{ color:'#F1F5F9', fontSize:18, fontWeight:700, margin:0 }}>
        {PAGE_TITLES[page] || 'Admin'}
      </h1>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{
          background:'#1E293B', border:'1px solid #334155',
          borderRadius:8, padding:'6px 14px', display:'flex',
          alignItems:'center', gap:8
        }}>
          <div style={{
            width:28, height:28, borderRadius:'50%',
            background:Y, display:'flex', alignItems:'center',
            justifyContent:'center', color:'#0F172A', fontWeight:800, fontSize:12
          }}>
            {email.charAt(0).toUpperCase() || 'A'}
          </div>
          <span style={{ color:'#94A3B8', fontSize:13 }}>{email}</span>
        </div>
      </div>
    </header>
  )
}
