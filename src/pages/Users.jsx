import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const INDIGO='#6366f1', RED='#ef4444', AMBER='#f59e0b', GREEN='#22c55e'
const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }
const td = { padding:'10px 14px', fontSize:13, color:'#e2e8f0', borderBottom:'1px solid #0f172a' }

export default function Users() {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all') // all|active|blocked
  const [selected, setSelected] = useState(null)
  const [acting,   setActing]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await sb.from('profiles')
      .select('id,full_name,name,phone,email,alternate_phone,city,state,address,created_at,total_bookings,avatar_url,is_blocked,role')
      .or('role.eq.customer,role.is.null')
      .order('created_at', { ascending: false })
      .limit(500)
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function blockUser(u, block) {
    setActing(true)
    await sb.from('profiles').update({ is_blocked: block }).eq('id', u.id)
    setUsers(prev => prev.map(x => x.id===u.id ? {...x, is_blocked: block} : x))
    if (selected?.id === u.id) setSelected(s => ({...s, is_blocked: block}))
    setActing(false)
  }

  async function deleteUser(u) {
    setActing(true)
    // Soft delete — mark as deleted, remove from future queries
    await sb.from('profiles').update({ is_deleted: true, is_blocked: true }).eq('id', u.id)
    setUsers(prev => prev.filter(x => x.id !== u.id))
    setSelected(null)
    setConfirmDel(null)
    setActing(false)
  }

  const displayName = u => u.full_name || u.name || '+91 '+(u.phone||'')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchQ = !q || displayName(u).toLowerCase().includes(q) || u.phone?.includes(q) || u.city?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchF = filter==='all' || (filter==='blocked' && u.is_blocked) || (filter==='active' && !u.is_blocked)
    return matchQ && matchF
  })

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'
  const stats = {
    total:   users.length,
    active:  users.filter(u=>!u.is_blocked).length,
    blocked: users.filter(u=>u.is_blocked).length,
    newThisMonth: users.filter(u=>u.created_at && new Date(u.created_at) > new Date(Date.now()-30*24*60*60*1000)).length,
  }

  return (
    <div style={{ padding:24, fontFamily:'inherit' }}>
      <h1 style={{ color:'#f1f5f9', fontSize:22, fontWeight:800, marginBottom:4 }}>👥 Users</h1>
      <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>Manage all registered customers</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          ['Total Users',    stats.total,        INDIGO],
          ['Active',         stats.active,        GREEN],
          ['Blocked',        stats.blocked,       RED],
          ['New This Month', stats.newThisMonth,  AMBER],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'#1e293b', borderRadius:12, padding:'14px 16px', border:'1px solid #334155' }}>
            <p style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:4 }}>{l}</p>
            <p style={{ color:c, fontSize:22, fontWeight:900 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, city, email..."
          style={{ flex:1, minWidth:200, background:'#1e293b', border:'1px solid #334155', borderRadius:10, padding:'8px 14px', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        <div style={{ display:'flex', gap:6 }}>
          {['all','active','blocked'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:'8px 14px', borderRadius:10, border:'1px solid', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                background: filter===f ? (f==='blocked'?RED:INDIGO) : 'transparent',
                color: filter===f ? '#fff' : '#94a3b8',
                borderColor: filter===f ? 'transparent' : '#334155' }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Delete confirm dialog */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#1e293b', borderRadius:20, padding:28, maxWidth:400, width:'100%', border:'1px solid #334155', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
            <h3 style={{ color:'#f1f5f9', fontWeight:800, fontSize:18, marginBottom:8 }}>Delete User?</h3>
            <p style={{ color:'#94a3b8', fontSize:14, marginBottom:20 }}>This will permanently delete <strong style={{color:'#f1f5f9'}}>{displayName(confirmDel)}</strong>. Their bookings remain for records.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setConfirmDel(null)} style={{ flex:1, background:'#334155', border:'none', borderRadius:10, padding:12, color:'#94a3b8', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={()=>deleteUser(confirmDel)} disabled={acting}
                style={{ flex:1, background:RED, border:'none', borderRadius:10, padding:12, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:acting?.6:1 }}>
                {acting?'Deleting...':'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelected(null) }}>
          <div style={{ background:'#1e293b', borderRadius:20, padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <h2 style={{ color:'#f1f5f9', fontWeight:800, fontSize:18 }}>{displayName(selected)}</h2>
                {selected.is_blocked && <span style={{ background:RED+'22', color:RED, fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6 }}>BLOCKED</span>}
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'#334155', border:'none', borderRadius:8, padding:'6px 14px', color:'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✕ Close</button>
            </div>

            <div style={{ background:'#0f172a', borderRadius:12, padding:16, marginBottom:14, border:'1px solid #1e293b' }}>
              <p style={{ color:'#60a5fa', fontWeight:800, fontSize:12, marginBottom:10 }}>📞 Contact Details</p>
              {[
                ['Phone',    selected.phone||'—'],
                ['Email',    selected.email||'—'],
                ['Alt Phone',selected.alternate_phone||'—'],
                ['City',     selected.city||'—'],
                ['State',    selected.state||'—'],
                ['Address',  selected.address||'—'],
                ['Joined',   fmtDate(selected.created_at)],
                ['Bookings', selected.total_bookings||0],
              ].map(([l,v])=>(
                <div key={l} style={{ display:'flex', gap:12, marginBottom:6 }}>
                  <span style={{ color:'#64748b', fontSize:12, fontWeight:600, minWidth:100, flexShrink:0 }}>{l}</span>
                  <span style={{ color:'#e2e8f0', fontSize:13, wordBreak:'break-all' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {selected.is_blocked ? (
                <button onClick={()=>blockUser(selected,false)} disabled={acting}
                  style={{ background:GREEN, border:'none', borderRadius:10, padding:12, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:acting?.6:1, fontSize:14 }}>
                  ✅ Unblock This User
                </button>
              ) : (
                <button onClick={()=>blockUser(selected,true)} disabled={acting}
                  style={{ background:AMBER, border:'none', borderRadius:10, padding:12, color:'#000', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:acting?.6:1, fontSize:14 }}>
                  🚫 Block This User
                </button>
              )}
              <button onClick={()=>{ setSelected(null); setConfirmDel(selected) }}
                style={{ background:RED+'22', border:'1px solid '+RED, borderRadius:10, padding:12, color:RED, fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>
                🗑️ Delete User Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:32, height:32, border:'3px solid #1e293b', borderTop:'3px solid '+INDIGO, borderRadius:'50%', animation:'spin .8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ background:'#1e293b', borderRadius:14, border:'1px solid #334155', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Name','Phone','Email','City','Bookings','Status','Joined','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={8} style={{...td,textAlign:'center',color:'#475569',padding:40}}>No users found</td></tr>}
              {filtered.map(u=>(
                <tr key={u.id} style={{ cursor:'pointer' }}>
                  <td style={td} onClick={()=>setSelected(u)}>
                    <p style={{ fontWeight:700, color:'#e2e8f0' }}>{displayName(u)}</p>
                  </td>
                  <td style={td}>{u.phone||'—'}</td>
                  <td style={td}>{u.email||'—'}</td>
                  <td style={td}>{u.city||'—'}</td>
                  <td style={td}>
                    <span style={{ background:INDIGO+'22', color:'#a5b4fc', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>{u.total_bookings||0}</span>
                  </td>
                  <td style={td}>
                    <span style={{ background:u.is_blocked?RED+'22':GREEN+'22', color:u.is_blocked?RED:GREEN, padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>
                      {u.is_blocked?'Blocked':'Active'}
                    </span>
                  </td>
                  <td style={td}>{fmtDate(u.created_at)}</td>
                  <td style={td}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>setSelected(u)} style={{ background:'#334155', border:'none', borderRadius:7, padding:'4px 10px', color:'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:11 }}>View</button>
                      <button onClick={()=>blockUser(u, !u.is_blocked)} disabled={acting}
                        style={{ background:u.is_blocked?GREEN+'22':RED+'22', border:'none', borderRadius:7, padding:'4px 10px', color:u.is_blocked?GREEN:RED, cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:11 }}>
                        {u.is_blocked?'Unblock':'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:'10px 14px', color:'#475569', fontSize:12 }}>{filtered.length} of {users.length} users</div>
        </div>
      )}
    </div>
  )
}
