import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }
const td = { padding:'10px 14px', fontSize:13, color:'#e2e8f0', borderBottom:'1px solid #0f172a' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await sb.from('customers')
        .select('id,name,phone,email,alternate_phone,city,address,created_at,total_bookings,avatar_url')
        .order('created_at', { ascending: false })
        .limit(300)
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.city?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  return (
    <div style={{ padding:24, fontFamily:'inherit' }}>
      <h1 style={{ color:'#f1f5f9', fontSize:22, fontWeight:800, marginBottom:4 }}>👥 Users</h1>
      <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>All registered customers</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Total Users', users.length, '#6366f1'],
          ['Active (Has Bookings)', users.filter(u => u.total_bookings > 0).length, '#22c55e'],
          ['New This Month', users.filter(u => u.created_at && new Date(u.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length, '#f59e0b'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#1e293b', borderRadius:12, padding:'16px 18px', border:'1px solid #334155' }}>
            <p style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:6 }}>{l}</p>
            <p style={{ color:c, fontSize:22, fontWeight:900 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, city, email..."
        style={{ width:'100%', maxWidth:400, background:'#1e293b', border:'1px solid #334155', borderRadius:10, padding:'8px 14px', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:16 }} />

      {/* Detail modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ background:'#1e293b', borderRadius:20, padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ color:'#f1f5f9', fontWeight:800, fontSize:18 }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)} style={{ background:'#334155', border:'none', borderRadius:8, padding:'6px 14px', color:'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Close</button>
            </div>

            {/* Contact Info Panel */}
            <div style={{ background:'#0f2847', borderRadius:12, padding:16, marginBottom:16, border:'1px solid #1e4d8c' }}>
              <p style={{ color:'#60a5fa', fontWeight:800, fontSize:13, marginBottom:12 }}>📞 Contact Information</p>
              {[
                ['Phone', selected.phone],
                ['Email', selected.email || '—'],
                ['Alternate Phone', selected.alternate_phone || '—'],
                ['City', selected.city || '—'],
                ['Address', selected.address || '—'],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', gap:12, marginBottom:8 }}>
                  <span style={{ color:'#64748b', fontSize:12, fontWeight:600, minWidth:120, flexShrink:0 }}>{l}</span>
                  <span style={{ color:'#e2e8f0', fontSize:13, fontWeight: l==='Phone'?700:400 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                ['Total Bookings', selected.total_bookings || 0, '#6366f1'],
                ['Member Since', fmtDate(selected.created_at), '#94a3b8'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:'#0f172a', borderRadius:10, padding:'12px 14px' }}>
                  <p style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:4 }}>{l}</p>
                  <p style={{ color:c, fontSize:16, fontWeight:800 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:32, height:32, border:'3px solid #1e293b', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ background:'#1e293b', borderRadius:14, border:'1px solid #334155', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Name','Phone','Email','City','Bookings','Joined',''].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, textAlign:'center', color:'#475569', padding:40 }}>No users found</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} style={{ cursor:'pointer' }} onClick={() => setSelected(u)}>
                  <td style={td}>
                    <p style={{ fontWeight:700, color:'#e2e8f0' }}>{u.name || '—'}</p>
                  </td>
                  <td style={td}>{u.phone || '—'}</td>
                  <td style={td}>{u.email || '—'}</td>
                  <td style={td}>{u.city || '—'}</td>
                  <td style={td}>
                    <span style={{ background:'#6366f122', color:'#a5b4fc', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>
                      {u.total_bookings || 0}
                    </span>
                  </td>
                  <td style={td}>{fmtDate(u.created_at)}</td>
                  <td style={td}><span style={{ color:'#6366f1', fontWeight:700, fontSize:12 }}>View →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:'10px 14px', color:'#475569', fontSize:12 }}>{filtered.length} users</div>
        </div>
      )}
    </div>
  )
}
