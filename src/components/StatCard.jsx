export default function StatCard({ ico, label, value, sub, color = '#F5C000', trend }) {
  return (
    <div style={{
      background:'#1E293B', border:'1px solid #334155', borderRadius:16,
      padding:'20px 22px', display:'flex', flexDirection:'column', gap:10
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{
          width:44, height:44, borderRadius:12,
          background: color + '20', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:22
        }}>
          {ico}
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize:12, fontWeight:700, color: trend >= 0 ? '#22c55e' : '#ef4444',
            background: trend >= 0 ? '#dcfce7' : '#fee2e2',
            padding:'3px 8px', borderRadius:6
          }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div style={{ color:'#94A3B8', fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:'.5px' }}>
          {label}
        </div>
        <div style={{ color:'#F1F5F9', fontSize:28, fontWeight:800, lineHeight:1.2, marginTop:4 }}>
          {value}
        </div>
        {sub && <div style={{ color:'#475569', fontSize:12, marginTop:4 }}>{sub}</div>}
      </div>
    </div>
  )
}
