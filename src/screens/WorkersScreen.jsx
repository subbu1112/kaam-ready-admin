import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', G='#22c55e'

export default function WorkersScreen() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [busy,    setBusy]    = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('workers').select('*').eq('onboarding_done',true).order('is_online',{ascending:false}).order('total_jobs',{ascending:false})
    setWorkers(data||[])
    setLoading(false)
  }

  async function toggleOnline(w) {
    setBusy(w.id)
    await sb.from('workers').update({ is_online: !w.is_online }).eq('id', w.id)
    setWorkers(prev => prev.map(x => x.id===w.id ? {...x, is_online:!x.is_online} : x))
    setBusy(null)
  }

  async function deactivate(w) {
    if (!confirm(`Deactivate worker ${w.name}?`)) return
    setBusy(w.id)
    await sb.from('workers').update({ onboarding_done: false, is_online: false }).eq('id', w.id)
    load()
    setBusy(null)
  }

  const filtered = filter==='all' ? workers : filter==='online' ? workers.filter(w=>w.is_online) : workers.filter(w=>!w.is_online)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#0A0A0A' }}>
      <div style={{ background:'#111', padding:'16px 16px 0', borderBottom:'1px solid #1a1a1a', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <p style={{ color:'#fff', fontWeight:900, fontSize:18 }}>👷 Workers</p>
          <p style={{ color:'#555', fontSize:12 }}>{workers.filter(w=>w.is_online).length} online / {workers.length} total</p>
        </div>
        <div style={{ display:'flex', gap:6, paddingBottom:12 }}>
          {['all','online','offline'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:'5px 14px', borderRadius:20, border:'none', background:filter===f?Y:'#1a1a1a', color:filter===f?'#000':'#888', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 80px' }}>
        {loading ? <p style={{ color:'#555', textAlign:'center', padding:32 }}>Loading…</p> :
         filtered.length===0 ? <p style={{ color:'#555', textAlign:'center', padding:32 }}>No workers</p> :
         filtered.map(w => (
          <div key={w.id} style={{ background:'#111', borderRadius:14, border:'1px solid #1a1a1a', padding:'12px 14px', marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: w.is_online?G:'#555', flexShrink:0 }} />
                  <p style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{w.name}</p>
                  {w.aadhaar_verified && <span style={{ background:'#d1fae5', color:'#065f46', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4 }}>✓ KYC</span>}
                </div>
                <p style={{ color:'#555', fontSize:12, marginTop:4, marginLeft:16 }}>{w.skill} · {w.city} · ⭐{(w.rating||5).toFixed(1)} · {w.total_jobs||0} jobs</p>
                {w.phone && <p style={{ color:'#444', fontSize:11, marginTop:2, marginLeft:16 }}>{w.phone}</p>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>toggleOnline(w)} disabled={busy===w.id}
                  style={{ padding:'6px 12px', borderRadius:8, border:'none', background: w.is_online?'#ef444422':'#22c55e22', color:w.is_online?'#ef4444':'#22c55e', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {w.is_online ? 'Set Offline' : 'Set Online'}
                </button>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid #1a1a1a' }}>
              <div style={{ flex:1, textAlign:'center' }}>
                <p style={{ color:Y, fontWeight:800, fontSize:16 }}>₹{Math.round((w.price_min||300)*(1-0.1))}</p>
                <p style={{ color:'#555', fontSize:10 }}>Min earn</p>
              </div>
              <div style={{ flex:1, textAlign:'center' }}>
                <p style={{ color:'#fff', fontWeight:700, fontSize:16 }}>{w.total_jobs||0}</p>
                <p style={{ color:'#555', fontSize:10 }}>Total jobs</p>
              </div>
              <div style={{ flex:1, textAlign:'center' }}>
                <p style={{ color:'#fff', fontWeight:700, fontSize:16 }}>{(w.trust_score||60)}</p>
                <p style={{ color:'#555', fontSize:10 }}>Trust score</p>
              </div>
              <button onClick={()=>deactivate(w)} disabled={busy===w.id}
                style={{ padding:'4px 10px', borderRadius:8, border:'1px solid #333', background:'transparent', color:'#555', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
                Deactivate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
