import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const INR = v => '₹' + (v||0).toLocaleString('en-IN')

export default function Users({ user, showToast }) {
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [selected,  setSelected]  = useState(null)
  const [bkgs,      setBkgs]      = useState([])
  const [saving,    setSaving]    = useState(false)
  const [page,      setPage]      = useState(0)
  const [total,     setTotal]     = useState(0)
  const PAGE = 50

  useEffect(() => { load(0) }, [])

  async function load(pg=0) {
    setLoading(true)
    setPage(pg)
    const from = pg * PAGE, to = from + PAGE - 1
    let q = sb.from('profiles').select('*', { count:'exact' }).order('created_at', { ascending: false }).range(from, to)
    const { data, count } = await q
    setUsers(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function openUser(u) {
    setSelected(u)
    const { data } = await sb.from('bookings').select('id,status,amount,service,created_at,worker_id').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10)
    setBkgs(data || [])
  }

  async function blockUser(id, blocked) {
    setSaving(true)
    await sb.from('profiles').update({ is_blocked: blocked }).eq('id', id)
    await sb.from('admin_logs').insert({ admin_id: user.id, action: blocked ? 'block_user' : 'unblock_user', target_id: id, details:{} }).then(()=>{})
    await load(page)
    setSaving(false)
    setSelected(s => s ? { ...s, is_blocked: blocked } : null)
    showToast(blocked ? 'User blocked' : 'User unblocked', blocked ? 'error' : 'success')
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const mQ = !q || (u.name||'').toLowerCase().includes(q) || (u.phone||'').includes(q) || (u.email||'').toLowerCase().includes(q)
    const mF = filter==='all' || (filter==='blocked' ? u.is_blocked : !u.is_blocked)
    return mQ && mF
  })

  const th = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, background:C.bg, borderBottom:'1px solid '+C.border }
  const td = { padding:'11px 14px', fontSize:13, color:C.text, borderBottom:'1px solid '+C.border }

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Customers</h2>
          <p style={{ fontSize:13, color:C.muted }}>{total} total registered customers</p>
        </div>
        <button onClick={()=>load(0)} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>↺ Refresh</button>
      </div>

      <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid '+C.border, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email..."
            style={{ padding:'9px 14px', border:'1.5px solid '+C.border, borderRadius:10, fontSize:13, width:250, outline:'none', fontFamily:'inherit', background:C.bg }} />
          <div style={{ display:'flex', gap:6 }}>
            {['all','active','blocked'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:'7px 13px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', textTransform:'capitalize',
                  background:filter===f?(f==='blocked'?C.danger:C.primary):C.bg, color:filter===f?'#fff':C.muted }}>{f}</button>
            ))}
          </div>
          <span style={{ marginLeft:'auto', fontSize:12, color:C.muted }}>{filtered.length} of {total}</span>
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.muted }}>Loading...</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Customer','Phone','Email','City','Joined','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(u=>(
                  <tr key={u.id}>
                    <td style={td}><p style={{ fontWeight:600 }}>{u.name||'—'}</p><p style={{ fontSize:11, color:C.muted }}>{u.id.slice(0,8)}…</p></td>
                    <td style={td}>{u.phone||'—'}</td>
                    <td style={td}>{u.email||'—'}</td>
                    <td style={td}>{u.city||'—'}</td>
                    <td style={td}>{fmt(u.created_at)}</td>
                    <td style={td}>
                      {u.is_blocked
                        ? <span style={{ background:'#FEE2E2', color:'#991B1B', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>🚫 Blocked</span>
                        : <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>✓ Active</span>
                      }
                    </td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>openUser(u)} style={{ background:C.primary, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>View</button>
                        {u.is_blocked
                          ? <button onClick={()=>blockUser(u.id,false)} style={{ background:C.success, color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Unblock</button>
                          : <button onClick={()=>blockUser(u.id,true)}  style={{ background:C.danger,  color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Block</button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div style={{ padding:48, textAlign:'center', color:C.muted }}>No customers found</div>}
          </div>
        )}

        {total > PAGE && (
          <div style={{ padding:'12px 18px', borderTop:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:C.muted }}>Showing {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span>
            <div style={{ display:'flex', gap:8 }}>
              <button disabled={page===0} onClick={()=>load(page-1)} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13, opacity:page===0?0.4:1 }}>← Prev</button>
              <button disabled={(page+1)*PAGE>=total} onClick={()=>load(page+1)} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13, opacity:(page+1)*PAGE>=total?0.4:1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:560, margin:'20px auto' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontWeight:800, fontSize:18 }}>{selected.name||'Customer'}</h3>
                <p style={{ fontSize:13, color:C.muted }}>{selected.phone}</p>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:C.bg, border:'none', borderRadius:10, width:36, height:36, fontSize:18, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[['Phone',selected.phone],['Email',selected.email],['City',selected.city],['Joined',fmt(selected.created_at)]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} style={{ background:C.bg, borderRadius:10, padding:'10px 14px' }}>
                    <p style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:3 }}>{l}</p>
                    <p style={{ fontWeight:600, fontSize:13 }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                {selected.is_blocked
                  ? <button onClick={()=>blockUser(selected.id,false)} disabled={saving}
                      style={{ background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✓ Unblock User</button>
                  : <button onClick={()=>blockUser(selected.id,true)} disabled={saving}
                      style={{ background:C.danger, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>🚫 Block User</button>
                }
              </div>
              {bkgs.length > 0 && (
                <div>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Recent Bookings ({bkgs.length})</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {bkgs.map(b=>(
                      <div key={b.id} style={{ background:C.bg, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between' }}>
                        <div><p style={{ fontWeight:600, fontSize:13 }}>{b.service||'Service'}</p><p style={{ fontSize:11, color:C.muted }}>{fmt(b.created_at)}</p></div>
                        <div style={{ textAlign:'right' }}><p style={{ fontWeight:700 }}>{INR(b.amount)}</p><p style={{ fontSize:11, color:C.muted }}>{b.status}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
