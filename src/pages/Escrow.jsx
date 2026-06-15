import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const C = { primary:'#FFD700', card:'#1A1A1A', border:'#2A2A2A', muted:'#B3B3B3', dim:'#666', success:'#22C55E', danger:'#EF4444' }

export default function Escrow({ showToast }) {
  return (
    <div>
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, padding:'32px 28px', marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#fff', marginBottom:6 }}>Escrow</h2>
        <p style={{ color:C.muted, fontSize:14 }}>This section is coming soon. Escrow management features will be available in the next update.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ background:C.card, border:'1px solid '+C.border, borderLeft:'3px solid '+C.primary, borderRadius:16, padding:'24px 20px' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{i===1?'🔄':i===2?'📊':'⚙️'}</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>Feature {i}</div>
            <div style={{ fontSize:12, color:C.muted }}>Coming soon in next release</div>
          </div>
        ))}
      </div>
    </div>
  )
}
