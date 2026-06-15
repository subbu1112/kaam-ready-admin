export default function StatCard({ label, value, sub, color='#6366f1', icon, trend }) {
  const colors = { indigo:'#6366f1', green:'#10b981', amber:'#f59e0b', red:'#ef4444', blue:'#3b82f6', purple:'#8b5cf6' }
  const c = colors[color] || color
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', display:'flex', alignItems:'flex-start', gap:16, minWidth:0 }}>
      <div style={{ width:48, height:48, borderRadius:12, background:c+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:800, color:'#0f172a', lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:12, color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b', marginTop:4, fontWeight:500 }}>{sub}</div>}
      </div>
    </div>
  )
}
