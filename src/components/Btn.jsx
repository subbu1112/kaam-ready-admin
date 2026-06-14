const VARIANTS = {
  y:       { background:'#F5C000', color:'#1A1A1A', border:'none', shadow:'0 4px 14px rgba(245,192,0,.35)' },
  dark:    { background:'#1A1A1A', color:'#fff',    border:'none', shadow:'0 4px 14px rgba(0,0,0,.18)' },
  outline: { background:'transparent', color:'#1A1A1A', border:'2px solid #F5C000', shadow:'none' },
  ghost:   { background:'#F5F5F8', color:'#555',    border:'none', shadow:'none' },
}
export default function Btn({ label, onClick, variant='y', style={}, disabled=false }) {
  const v = VARIANTS[variant] || VARIANTS.y
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        width:'100%', ...v, borderRadius:14, padding:'15px 20px', fontSize:15, fontWeight:700,
        cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit',
        opacity:disabled?0.6:1, transition:'all .15s ease',
        boxShadow: disabled?'none':v.shadow,
        ...style,
      }}>
      {label}
    </button>
  )
}
