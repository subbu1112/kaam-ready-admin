export default function Toast({ msg }) {
  return (
    <div style={{ position:'fixed', bottom:86, left:'50%', transform:'translateX(-50%)',
      background:'#1C1C1E', color:'#fff', padding:'12px 22px', borderRadius:14,
      fontSize:13, fontWeight:600, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,.3)',
      animation:'slideUp .3s ease', whiteSpace:'nowrap', maxWidth:'85%', textAlign:'center'
    }}>{msg}</div>
  )
}
