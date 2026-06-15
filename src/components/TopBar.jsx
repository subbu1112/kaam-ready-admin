export default function TopBar({ title, subtitle, actions }) {
  return (
    <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>{title}</h1>
        {subtitle && <p style={{ fontSize:13, color:'#64748b', marginTop:2 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display:'flex', gap:8, alignItems:'center' }}>{actions}</div>}
    </div>
  )
}
